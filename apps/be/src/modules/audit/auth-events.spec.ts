import { maskIdentifier, recordAuthEvent } from './auth-events';
import { auditContext } from '../../common/context/audit-context';

describe('auth events', () => {
  describe('maskIdentifier', () => {
    it('keeps usernames', () => expect(maskIdentifier('satgas1')).toBe('satgas1'));
    it('masks phone numbers except the last 3 digits', () => {
      expect(maskIdentifier('081200000006')).toBe('*********006');
      expect(maskIdentifier('+62 812-0000-0006')).toBe('**********006');
    });
    it('caps very long input', () => expect(maskIdentifier('x'.repeat(80))).toHaveLength(50));
  });

  describe('recordAuthEvent', () => {
    it('attributes a login to the authenticated account, keeping request context', async () => {
      const seen: unknown[] = [];
      const log = jest.fn(async (p) => {
        seen.push({ p, ctx: auditContext.get() });
      });
      await auditContext.run({ ip: '10.0.0.5', requestId: 'r-9' }, () =>
        recordAuthEvent({ log } as never, 'login', {
          id: 'u-1',
          role: 'satgas',
          full_name: 'Satgas Satu',
          username: 'satgas1',
        }),
      );
      expect(seen[0]).toEqual({
        p: expect.objectContaining({
          entity_type: 'auth',
          entity_id: 'u-1',
          action: 'login',
          outcome: 'success',
        }),
        ctx: expect.objectContaining({
          userId: 'u-1',
          role: 'satgas',
          ip: '10.0.0.5',
          requestId: 'r-9',
        }),
      });
    });

    it('records a failure with a masked identifier and no actor when the account is unknown', async () => {
      const log = jest.fn().mockResolvedValue(undefined);
      await recordAuthEvent({ log } as never, 'login_failed', null, {
        identifier: '081200000006',
        reason: 'invalid_credentials',
      });
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'login_failed',
          outcome: 'failed',
          entity_id: null,
          metadata: { identifier: '*********006', reason: 'invalid_credentials' },
        }),
      );
    });

    it('never throws', async () => {
      const log = jest.fn().mockRejectedValue(new Error('db down'));
      await expect(
        recordAuthEvent({ log } as never, 'logout', { id: 'u-1' }),
      ).resolves.toBeUndefined();
    });
  });

  it('a failed login against a known account targets it without naming it as actor', async () => {
    const seen: unknown[] = [];
    const log = jest.fn(async (p) => {
      seen.push({ p, ctx: auditContext.get() });
    });
    await recordAuthEvent(
      { log } as never,
      'login_failed',
      { id: 'u-1', username: 'budi', role: 'satgas' },
      {
        identifier: 'budi',
        reason: 'invalid_password',
      },
    );
    expect(seen[0]).toEqual({
      p: expect.objectContaining({
        entity_id: 'u-1',
        entity_label: 'budi',
        action: 'login_failed',
      }),
      ctx: expect.objectContaining({ userId: undefined, role: undefined }),
    });
  });
});
