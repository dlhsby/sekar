import { DeniedAccessRecorder } from './denied-access.recorder';
import { auditContext } from '../../common/context/audit-context';

describe('DeniedAccessRecorder', () => {
  const flush = () => new Promise((r) => setImmediate(r));
  let log: jest.Mock;
  let recorder: DeniedAccessRecorder;

  beforeEach(() => {
    log = jest.fn().mockResolvedValue(undefined);
    recorder = new DeniedAccessRecorder({ log } as never);
  });

  const req = (method: string) => ({
    method,
    route: { path: '/api/v1/districts/:id' },
    originalUrl: '/api/v1/districts/abc?x=1',
    user: { id: 'u-1', role: 'kepala_rayon', full_name: 'Kepala Barat' },
    ip: '10.1.1.1',
    headers: { 'user-agent': 'jest' },
  });

  it('records a refused write with actor snapshot, route pattern and required grants', async () => {
    let seen: unknown;
    log.mockImplementation(async (params) => {
      seen = { params, ctx: auditContext.get() };
    });
    recorder.record(req('DELETE'), ['district:delete']);
    await flush();
    expect(seen).toEqual({
      params: {
        entity_type: 'http',
        action: 'denied_write',
        outcome: 'denied',
        metadata: {
          method: 'DELETE',
          path: '/api/v1/districts/:id',
          required: ['district:delete'],
        },
      },
      ctx: expect.objectContaining({ userId: 'u-1', role: 'kepala_rayon', ip: '10.1.1.1' }),
    });
  });

  it.each(['GET', 'HEAD', 'OPTIONS'])('ignores refused %s (reads change nothing)', async (m) => {
    recorder.record(req(m), ['district:read']);
    await flush();
    expect(log).not.toHaveBeenCalled();
  });

  it('ignores anonymous requests (401 territory, not an authorization decision)', async () => {
    recorder.record({ method: 'POST' }, ['x:y']);
    await flush();
    expect(log).not.toHaveBeenCalled();
  });

  it('never throws when the audit write fails', async () => {
    log.mockRejectedValue(new Error('db down'));
    expect(() => recorder.record(req('POST'), ['x:y'])).not.toThrow();
    await flush();
  });
});
