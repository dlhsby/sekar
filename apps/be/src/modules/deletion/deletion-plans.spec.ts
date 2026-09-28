import { DELETE_PLANS } from './deletion-plans';

/**
 * Execution-time guard: the replacement is re-read under `FOR SHARE` inside the
 * delete transaction. If it vanished after validation, the delete must fail with
 * the clean DELETE_REPLACEMENT_REQUIRED — never a TypeError on `target.code`.
 */
describe('DELETE_PLANS replacement re-check', () => {
  const ctx = (query: jest.Mock) => ({
    manager: { query, softRemove: jest.fn() } as never,
    cascade: {} as never,
    actorId: 'admin-1',
    replacementId: 'r-gone',
  });

  it.each([
    ['role', { id: 'r-1', code: 'uji', name: 'Uji' }],
    ['location_type', { id: 't-1', name: 'Taman' }],
  ] as const)(
    '%s: a replacement gone at execution time → 409, nothing moved',
    async (type, row) => {
      const query = jest.fn().mockResolvedValueOnce([]); // FOR SHARE re-read finds nothing
      await expect(DELETE_PLANS[type].execute(ctx(query), row)).rejects.toMatchObject({
        code: 'DELETE_REPLACEMENT_REQUIRED',
      });
      expect(query).toHaveBeenCalledTimes(1);
      expect(query.mock.calls[0][0]).toMatch(/FOR SHARE/);
    },
  );

  it('role: moves users to the locked replacement', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ code: 'satgas' }])
      .mockResolvedValueOnce([[], 3]);
    const c = ctx(query);
    await expect(
      DELETE_PLANS.role.execute(c, { id: 'r-1', code: 'uji', name: 'Uji' }),
    ).resolves.toEqual({ users_moved: 3 });
    expect(query.mock.calls[1][1]).toEqual(['uji', 'satgas']);
  });
});
