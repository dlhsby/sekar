/**
 * Offline queue: surviving a FORCED session expiry.
 *
 * The governing constraint on session handling is "make sure no data is lost".
 * A forced logout differs from a voluntary one in exactly the way that
 * threatens the queue: it arrives mid-shift with no chance to sync, and it
 * wipes `user_data` from EncryptedStorage *before* the tracker has stopped, so
 * anything queued in that gap is written with no `user_id`.
 *
 * That is survivable on its own — `syncManager.processQueue` reads
 * `getQueuedItems()`, every item regardless of owner, so an unattributed ping
 * still syncs. What was NOT survivable is the orphan sweep deleting it first.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addToQueue, clearOrphanedItems, getQueuedItems, type QueueItem } from '../offlineQueue';
import { getUser } from '../../storage/secureStorage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('react-native-uuid', () => ({ v4: jest.fn(() => 'queued-after-expiry') }));

jest.mock('../../storage/secureStorage', () => ({
  getUser: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockGetUser = getUser as jest.MockedFunction<typeof getUser>;

/** A real in-memory AsyncStorage, so reads see what writes actually stored. */
const storage = new Map<string, string>();

describe('offline queue across a forced session expiry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storage.clear();
    mockAsyncStorage.getItem.mockImplementation(
      async (key: string) => storage.get(key) ?? null,
    );
    mockAsyncStorage.setItem.mockImplementation(async (key: string, value: string) => {
      storage.set(key, value);
    });
  });

  it('keeps a ping queued after the credentials are wiped, and keeps it PENDING', async () => {
    mockGetUser.mockResolvedValue({ id: 'worker-1', username: 'satgas1' } as any);
    await addToQueue('location', { shift_id: 's-1' });

    // The 401 path calls `clearAll()`, which empties EncryptedStorage. A ping
    // the tracker manages to queue before it stops now resolves no user.
    mockGetUser.mockResolvedValue(null);
    await addToQueue('location', { shift_id: 's-1' });

    const queue = await getQueuedItems();
    expect(queue).toHaveLength(2);
    // It is unattributed, which is fine — `syncManager` syncs by status, not by
    // owner. What matters is that it is still here and still pending.
    expect(queue[1].status).toBe('pending');
  });

  it('does not delete un-attributed work when sweeping orphans', async () => {
    // The actual data-loss path. The sweep used to drop anything merely missing
    // a `user_id`, conflating "no owner recorded" with "belongs to nobody" — so
    // the pings above were deleted at the NEXT voluntary logout, silently and
    // hours later. Only an item explicitly marked orphaned is safe to delete;
    // a pending item is unsent work.
    const existing: QueueItem[] = [
      { id: 'a', type: 'location', data: {}, timestamp: 1, retryCount: 0, status: 'pending' },
      {
        id: 'b',
        type: 'clock-in',
        data: {},
        timestamp: 2,
        retryCount: 0,
        status: 'orphaned',
        user_id: 'someone-else',
      },
      {
        id: 'c',
        type: 'activity',
        data: {},
        timestamp: 3,
        retryCount: 0,
        status: 'pending',
        user_id: 'worker-1',
      },
    ];
    storage.set('OFFLINE_QUEUE', JSON.stringify(existing));
    mockGetUser.mockResolvedValue({ id: 'worker-1', username: 'satgas1' } as any);

    await clearOrphanedItems();

    const remaining = (await getQueuedItems()).map((i) => i.id);
    expect(remaining).toContain('a'); // ownerless but still PENDING work
    expect(remaining).toContain('c');
    expect(remaining).not.toContain('b'); // explicitly marked orphaned
  });
});
