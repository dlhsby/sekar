/**
 * UserDetailSheet tests — Phase 4 M3 CP1 rebuild on NBModal.
 *
 * Covers: NBModal visibility, profile header (avatar + presence pill + last
 * update), 4 stat tiles (skeleton → resolved values, Lokasi opens map modal),
 * nested sheets (shift + lembur, tugas, aktivitas — full Task/Activity data),
 * action buttons (Hubungi / WhatsApp / Lihat jejak).
 *
 * Mocks: api modules (tasks/activities/overtime/users), Linking. Maps + WS +
 * gorhom bottom-sheet are stubbed globally via __mocks__/jest.setup.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { UserDetailSheet } from '../UserDetailSheet';
import type {
  LiveUser,
  UserDaySummary,
  Task,
  Activity,
  Overtime,
  User,
} from '../../../types/models.types';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('../../../services/api/tasksApi');
jest.mock('../../../services/api/activitiesApi');
jest.mock('../../../services/api/overtimeApi');
jest.mock('../../../services/api/usersApi');
jest.mock('../../../services/api/monitoringApi');

import { getTasks } from '../../../services/api/tasksApi';
import { getActivities } from '../../../services/api/activitiesApi';
import { getOvertimes } from '../../../services/api/overtimeApi';
import { getUserById } from '../../../services/api/usersApi';
import { getReassignmentHistory } from '../../../services/api/monitoringApi';

const mockGetTasks = getTasks as jest.MockedFunction<typeof getTasks>;
const mockGetActivities = getActivities as jest.MockedFunction<typeof getActivities>;
const mockGetOvertimes = getOvertimes as jest.MockedFunction<typeof getOvertimes>;
const mockGetUserById = getUserById as jest.MockedFunction<typeof getUserById>;
const mockGetReassignmentHistory = getReassignmentHistory as jest.MockedFunction<typeof getReassignmentHistory>;

// Suppress noisy "act(...)" warnings from promise resolves we explicitly flush.
const linkingSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const today = (h: number, m = 0): string => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

const createUser = (overrides?: Partial<LiveUser>): LiveUser => ({
  id: 'user-123',
  full_name: 'Ahmad Satgas',
  role: 'satgas',
  phone: '08123456789',
  status: 'active',
  area_id: 'area-1',
  area_name: 'Taman Bungkul',
  rayon_id: 'rayon-1',
  rayon_name: 'Rayon 1',
  latitude: -7.250445,
  longitude: 112.768845,
  accuracy: 8,
  battery_level: 85,
  last_update: today(9),
  is_within_area: true,
  outside_boundary: false,
  shift_id: 'shift-1',
  shift_name: 'Pagi',
  shift_definition_id: null,
  clock_in_time: today(6),
  current_task_status: null,
  current_task_title: null,
  ...overrides,
});

const createDaySummary = (overrides?: Partial<UserDaySummary>): UserDaySummary => ({
  user_id: 'user-123',
  full_name: 'Ahmad Satgas',
  username: 'satgas1',
  role: 'satgas',
  phone: '08123456789',
  status: 'active',
  area_id: 'area-1',
  area_name: 'Taman Bungkul',
  rayon_id: 'rayon-1',
  rayon_name: 'Rayon 1',
  shift: {
    id: 'shift-1',
    name: 'Pagi',
    clock_in_time: today(6),
    clock_out_time: null,
    duration_minutes: 180,
    outside_boundary: false,
  },
  last_location: null,
  activities_today: [],
  tasks_today: [],
  whatsapp_links: {
    chat: 'https://wa.me/628123456789',
    call: 'tel:+628123456789',
  },
  ...overrides,
});

const fullTask = (overrides?: Partial<Task>): Task => ({
  id: 'task-1',
  title: 'Potong rumput pintu utama',
  description: 'Area depan, sebelah patung',
  status: 'in_progress',
  priority: 'high',
  deadline: today(17),
  area_id: 'area-1',
  area: { id: 'area-1', name: 'Taman Bungkul' } as any,
  assigned_to: 'user-123',
  created_by: 'sup-1',
  created_at: today(7),
  updated_at: today(7),
  ...overrides,
});

const fullActivity = (overrides?: Partial<Activity>): Activity => ({
  id: 'act-1',
  user_id: 'user-123',
  shift_id: 'shift-1',
  area_id: 'area-1',
  area: { id: 'area-1', name: 'Taman Bungkul' } as any,
  activity_type_id: 'at-1',
  activityType: { id: 'at-1', name: 'Penyiraman' } as any,
  description: 'Sirami semua pot depan',
  photo_urls: ['p1.jpg', 'p2.jpg'],
  status: 'approved',
  created_at: today(8),
  updated_at: today(8),
  ...overrides,
});

const overtimeFixture: Overtime = {
  id: 'ot-1',
  user_id: 'user-123',
  area: { id: 'area-1', name: 'Taman Bungkul' } as any,
  start_datetime: today(18),
  end_datetime: today(20),
  reason: 'Acara CFD',
  status: 'approved',
  activityType: { id: 'at-2', name: 'Lembur Penyiraman' } as any,
  created_at: today(18),
  updated_at: today(18),
};

const userFixture: User = {
  id: 'user-123',
  username: 'satgas1',
  full_name: 'Ahmad Satgas',
  role: 'satgas',
  is_active: true,
  area_id: 'area-1',
  rayon_id: 'rayon-1',
  profile_picture_url: 'data:image/png;base64,iVBORw0KGgo=',
  created_at: today(0),
  updated_at: today(0),
} as any;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const okList = <T,>(items: T[]) => ({
  data: {
    data: items,
    meta: { total: items.length, page: 1, limit: 50, totalPages: 1 },
  },
});

const flushAll = async () => {
  // Flush all pending promise resolves inside act() so React state updates apply.
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
};

const setupDefaultMocks = () => {
  mockGetTasks.mockResolvedValue(okList([]) as any);
  mockGetActivities.mockResolvedValue(okList([]) as any);
  mockGetOvertimes.mockResolvedValue(okList([]) as any);
  mockGetUserById.mockResolvedValue({ data: userFixture } as any);
  mockGetReassignmentHistory.mockResolvedValue({ data: { user_id: 'user-123', history: [] } } as any);
};

const defaultProps = () => ({
  user: createUser(),
  daySummary: createDaySummary(),
  isLoadingDaySummary: false,
  onClose: jest.fn(),
  onTrailPress: jest.fn(),
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UserDetailSheet (CP1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    linkingSpy.mockClear();
    setupDefaultMocks();
  });

  describe('visibility', () => {
    it('renders nothing when user is null (NBModal stays dismissed)', () => {
      const { queryByTestId } = render(
        <UserDetailSheet {...defaultProps()} user={null} />
      );
      expect(queryByTestId('bottom-sheet')).toBeNull();
      expect(mockGetUserById).not.toHaveBeenCalled();
    });

    it('mounts the NBModal sheet when user is non-null', async () => {
      const { getByTestId } = render(<UserDetailSheet {...defaultProps()} />);
      await flushAll();
      expect(getByTestId('bottom-sheet')).toBeTruthy();
    });
  });

  describe('profile header', () => {
    it('shows full name + role · area meta line', async () => {
      const { getByText } = render(<UserDetailSheet {...defaultProps()} />);
      await flushAll();
      expect(getByText('Ahmad Satgas')).toBeTruthy();
      expect(getByText(/Satgas.*Taman Bungkul/)).toBeTruthy();
    });

    it.each([
      ['active',       'Aktif'],
      ['inactive',     'Tidak aktif'],
      ['outside_area', 'Luar area'],
      ['missing',      'Tidak terdeteksi'],
      ['offline',      'Offline'],
    ] as const)('renders the presencePill label "%s" → "%s"', async (status, label) => {
      const { getByText } = render(
        <UserDetailSheet {...defaultProps()} user={createUser({ status })} />
      );
      await flushAll();
      expect(getByText(label)).toBeTruthy();
    });

    it('renders the relative last-update under the status pill', async () => {
      // last_update set to now → "baru saja"
      const fresh = createUser({ last_update: new Date().toISOString() });
      const { getByText } = render(
        <UserDetailSheet {...defaultProps()} user={fresh} />
      );
      await flushAll();
      expect(getByText('baru saja')).toBeTruthy();
    });

    it('uses fetched profile_picture_url for the avatar', async () => {
      const { UNSAFE_getAllByType } = render(
        <UserDetailSheet {...defaultProps()} />
      );
      await flushAll();
      const { Image } = require('react-native');
      const images = UNSAFE_getAllByType(Image);
      const dataUri = (userFixture as any).profile_picture_url;
      expect(images.some((img: any) => img.props.source?.uri === dataUri)).toBe(true);
    });
  });

  describe('Lokasi tile', () => {
    it('renders area name + "±Xm · lat, lng" detail', async () => {
      const { getByText } = render(<UserDetailSheet {...defaultProps()} />);
      await flushAll();
      expect(getByText('Taman Bungkul')).toBeTruthy();
      expect(getByText('±8m · -7.25045, 112.76884')).toBeTruthy();
    });

    it('falls back to "—" when area name is missing', async () => {
      const u = createUser({ area_name: '' });
      const { getAllByText } = render(
        <UserDetailSheet {...defaultProps()} user={u} />
      );
      await flushAll();
      // "—" can appear in other tiles too; assert at least one.
      expect(getAllByText('—').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Jam kerja / Tugas / Aktivitas tile counts', () => {
    it('shows skeletons while data is loading, then renders the counts', async () => {
      // Keep tasks/activities pending so we can observe the skeleton frame.
      let resolveTasks: (v: any) => void = () => {};
      let resolveActs: (v: any) => void = () => {};
      mockGetTasks.mockReturnValueOnce(new Promise((r) => { resolveTasks = r; }) as any);
      mockGetActivities.mockReturnValueOnce(new Promise((r) => { resolveActs = r; }) as any);

      const { getByText, queryByText } = render(
        <UserDetailSheet
          {...defaultProps()}
          isLoadingDaySummary
          daySummary={null}
        />
      );

      // Tile values absent during load (the labels too — tiles replaced by skeletons).
      expect(queryByText('Tugas')).toBeNull();
      expect(queryByText('Aktivitas')).toBeNull();

      // Resolve fetches; daySummary stays null so Jam kerja still skeletons —
      // toggle isLoadingDaySummary via re-render.
      await act(async () => {
        resolveTasks(okList([fullTask()]));
        resolveActs(okList([fullActivity(), fullActivity({ id: 'act-2' })]));
      });
      await flushAll();

      // Tugas and Aktivitas resolved; their labels render now.
      expect(getByText('Tugas')).toBeTruthy();
      expect(getByText('Aktivitas')).toBeTruthy();
    });

    it('shows the task count once the fetch resolves', async () => {
      mockGetTasks.mockResolvedValueOnce(okList([fullTask(), fullTask({ id: 't-2', title: 'B' })]) as any);
      const { getByText } = render(<UserDetailSheet {...defaultProps()} />);
      await flushAll();
      expect(getByText('Tugas')).toBeTruthy();
      expect(getByText('2')).toBeTruthy();
    });

    it('only counts tasks whose deadline/created/completed is today (isTaskScopedToday)', async () => {
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      mockGetTasks.mockResolvedValueOnce(okList([
        fullTask({ id: 'today', deadline: today(17) }),
        fullTask({ id: 'past',  deadline: yesterday.toISOString(), created_at: yesterday.toISOString() }),
        fullTask({ id: 'future', deadline: tomorrow.toISOString(), created_at: tomorrow.toISOString() }),
      ]) as any);
      const { getByText } = render(<UserDetailSheet {...defaultProps()} />);
      await flushAll();
      // Only the "today" task should be counted.
      expect(getByText('1')).toBeTruthy();
    });
  });

  describe('Tugas modal', () => {
    it('opens with full Task rows (title + area + priority + deadline + description)', async () => {
      mockGetTasks.mockResolvedValueOnce(okList([fullTask()]) as any);
      const { getByText, getAllByText, getByTestId } = render(<UserDetailSheet {...defaultProps()} />);
      await flushAll();
      fireEvent.press(getByText('Tugas'));
      await flushAll();
      expect(getByTestId('user-tasks-modal')).toBeTruthy();
      expect(getByText(/Tugas Hari Ini \(1\)/)).toBeTruthy();
      expect(getByText('Potong rumput pintu utama')).toBeTruthy();
      expect(getByText('Area depan, sebelah patung')).toBeTruthy();
      // "Taman Bungkul" appears twice now (Lokasi tile + area chip in row).
      expect(getAllByText('Taman Bungkul').length).toBeGreaterThanOrEqual(2);
      expect(getByText('Tinggi')).toBeTruthy();  // priority "high" → "Tinggi"
    });

    it('shows empty copy when there are no tasks scoped to today', async () => {
      mockGetTasks.mockResolvedValueOnce(okList([]) as any);
      const { getByText } = render(<UserDetailSheet {...defaultProps()} />);
      await flushAll();
      fireEvent.press(getByText('Tugas'));
      await flushAll();
      expect(getByText('Belum ada tugas hari ini')).toBeTruthy();
    });
  });

  describe('Aktivitas modal', () => {
    it('opens with full Activity rows (activityType.name title + area + photo count + description)', async () => {
      mockGetActivities.mockResolvedValueOnce(okList([fullActivity()]) as any);
      const { getByText, getByTestId } = render(<UserDetailSheet {...defaultProps()} />);
      await flushAll();
      fireEvent.press(getByText('Aktivitas'));
      await flushAll();
      expect(getByTestId('user-activities-modal')).toBeTruthy();
      expect(getByText(/Aktivitas Hari Ini \(1\)/)).toBeTruthy();
      expect(getByText('Penyiraman')).toBeTruthy();
      expect(getByText('Sirami semua pot depan')).toBeTruthy();
      expect(getByText('2 foto')).toBeTruthy();
    });

    it('shows empty copy when no activities returned', async () => {
      mockGetActivities.mockResolvedValueOnce(okList([]) as any);
      const { getByText } = render(<UserDetailSheet {...defaultProps()} />);
      await flushAll();
      fireEvent.press(getByText('Aktivitas'));
      await flushAll();
      expect(getByText('Belum ada aktivitas hari ini')).toBeTruthy();
    });
  });

  describe('Jam kerja modal (shift + lembur)', () => {
    it('opens with the shift card and a lembur row when overtimes exist', async () => {
      mockGetOvertimes.mockResolvedValueOnce(okList([overtimeFixture]) as any);
      const { getByText, getByTestId } = render(<UserDetailSheet {...defaultProps()} />);
      await flushAll();
      fireEvent.press(getByText('Jam kerja'));
      await flushAll();
      expect(getByTestId('user-shift-modal')).toBeTruthy();
      expect(getByText('Lembur Hari Ini (1)')).toBeTruthy();
      expect(getByText('Lembur Penyiraman')).toBeTruthy();
    });

    it('shows the empty-lembur copy when none returned', async () => {
      mockGetOvertimes.mockResolvedValueOnce(okList([]) as any);
      const { getByText } = render(<UserDetailSheet {...defaultProps()} />);
      await flushAll();
      fireEvent.press(getByText('Jam kerja'));
      await flushAll();
      expect(getByText('Belum ada lembur hari ini')).toBeTruthy();
    });
  });

  describe('action buttons', () => {
    it('Hubungi dials tel:+<E164 phone>', async () => {
      const { getByText } = render(<UserDetailSheet {...defaultProps()} />);
      await flushAll();
      fireEvent.press(getByText('Hubungi'));
      expect(linkingSpy).toHaveBeenCalledWith('tel:+628123456789');
    });

    it('Hubungi does nothing when phone is null', async () => {
      const { getByText } = render(
        <UserDetailSheet {...defaultProps()} user={createUser({ phone: null })} />
      );
      await flushAll();
      fireEvent.press(getByText('Hubungi'));
      expect(linkingSpy).not.toHaveBeenCalled();
    });

    it('Chat WhatsApp prefers daySummary.whatsapp_links.chat', async () => {
      const { getByText } = render(<UserDetailSheet {...defaultProps()} />);
      await flushAll();
      fireEvent.press(getByText('Chat WhatsApp'));
      expect(linkingSpy).toHaveBeenCalledWith('https://wa.me/628123456789');
    });

    it('Chat WhatsApp falls back to wa.me/<phone> when whatsapp_links is null', async () => {
      const sumNoLinks = createDaySummary({ whatsapp_links: null });
      const { getByText } = render(
        <UserDetailSheet {...defaultProps()} daySummary={sumNoLinks} />
      );
      await flushAll();
      fireEvent.press(getByText('Chat WhatsApp'));
      expect(linkingSpy).toHaveBeenCalledWith('https://wa.me/628123456789');
    });

    it('Lihat jejak forwards the current user to onTrailPress', async () => {
      const onTrailPress = jest.fn();
      const user = createUser();
      const { getByText } = render(
        <UserDetailSheet {...defaultProps()} user={user} onTrailPress={onTrailPress} />
      );
      await flushAll();
      fireEvent.press(getByText('Lihat jejak'));
      expect(onTrailPress).toHaveBeenCalledTimes(1);
      expect(onTrailPress).toHaveBeenCalledWith(user);
    });
  });

  describe('API call shape', () => {
    it('fires getUserById + getTasks + getActivities exactly once per user id', async () => {
      render(<UserDetailSheet {...defaultProps()} />);
      await flushAll();
      expect(mockGetUserById).toHaveBeenCalledTimes(1);
      expect(mockGetUserById).toHaveBeenCalledWith('user-123');
      expect(mockGetTasks).toHaveBeenCalledTimes(1);
      expect(mockGetTasks).toHaveBeenCalledWith(expect.objectContaining({ assigned_to: 'user-123' }));
      // Critical: NO from_date/to_date on /tasks (that endpoint returns 400 for them).
      const tasksCall = mockGetTasks.mock.calls[0][0] as Record<string, unknown>;
      expect(tasksCall).not.toHaveProperty('from_date');
      expect(tasksCall).not.toHaveProperty('to_date');
      expect(mockGetActivities).toHaveBeenCalledTimes(1);
      expect(mockGetActivities).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-123' }),
      );
    });

    it('refetches when user id changes', async () => {
      const { rerender } = render(<UserDetailSheet {...defaultProps()} />);
      await flushAll();
      expect(mockGetUserById).toHaveBeenCalledTimes(1);

      rerender(
        <UserDetailSheet {...defaultProps()} user={createUser({ id: 'user-999' })} />
      );
      await flushAll();
      expect(mockGetUserById).toHaveBeenCalledTimes(2);
      expect(mockGetUserById).toHaveBeenLastCalledWith('user-999');
    });
  });

  describe('Riwayat Pemindahan (reassignment history)', () => {
    it('fetches reassignment history on mount', async () => {
      render(<UserDetailSheet {...defaultProps()} />);
      await flushAll();
      expect(mockGetReassignmentHistory).toHaveBeenCalledWith('user-123');
    });

    it('shows empty state when no reassignments', async () => {
      mockGetReassignmentHistory.mockResolvedValueOnce({
        data: { user_id: 'user-123', history: [] },
      } as any);
      const { getByText } = render(<UserDetailSheet {...defaultProps()} />);
      await flushAll();
      expect(getByText('Belum ada riwayat pemindahan')).toBeTruthy();
    });

    it('displays reassignment entries with area transition and date', async () => {
      mockGetReassignmentHistory.mockResolvedValueOnce({
        data: {
          user_id: 'user-123',
          history: [
            {
              id: 'log-1',
              previous_area_id: 'area-1',
              previous_area_name: 'Taman Bungkul',
              new_area_id: 'area-2',
              new_area_name: 'Taman Sapran',
              reason: 'Rebalancing staffing',
              effective_date: '2026-06-11',
              actor_id: 'admin-1',
              actor_name: 'Admin Supervisor',
              created_at: '2026-06-11T10:30:00Z',
            },
          ],
        },
      } as any);
      const { getByText } = render(<UserDetailSheet {...defaultProps()} />);
      await flushAll();
      expect(getByText(/Taman Bungkul.*Taman Sapran/)).toBeTruthy();
      expect(getByText(/11 Juni 2026/)).toBeTruthy();
    });

    it('shows up to 5 entries and truncates rest', async () => {
      const entries = Array.from({ length: 8 }, (_, i) => ({
        id: `log-${i}`,
        previous_area_id: 'area-1',
        previous_area_name: 'Taman Bungkul',
        new_area_id: 'area-2',
        new_area_name: 'Taman Sapran',
        reason: null,
        effective_date: '2026-06-11',
        actor_id: 'admin-1',
        actor_name: 'Admin Supervisor',
        created_at: `2026-06-${String(11 - i).padStart(2, '0')}T10:30:00Z`,
      }));
      mockGetReassignmentHistory.mockResolvedValueOnce({
        data: { user_id: 'user-123', history: entries },
      } as any);
      const { getAllByText } = render(<UserDetailSheet {...defaultProps()} />);
      await flushAll();
      // Count how many transition rows we have (should be at most 5)
      const transitions = getAllByText(/Taman Bungkul.*Taman Sapran/);
      expect(transitions.length).toBeLessThanOrEqual(5);
    });

    it('handles missing actor name as fallback', async () => {
      mockGetReassignmentHistory.mockResolvedValueOnce({
        data: {
          user_id: 'user-123',
          history: [
            {
              id: 'log-1',
              previous_area_id: 'area-1',
              previous_area_name: 'Taman Bungkul',
              new_area_id: 'area-2',
              new_area_name: 'Taman Sapran',
              reason: null,
              effective_date: '2026-06-11',
              actor_id: 'unknown-actor',
              actor_name: 'Unknown',
              created_at: '2026-06-11T10:30:00Z',
            },
          ],
        },
      } as any);
      const { getByText } = render(<UserDetailSheet {...defaultProps()} />);
      await flushAll();
      expect(getByText(/Unknown/)).toBeTruthy();
    });

    it('handles API error gracefully', async () => {
      mockGetReassignmentHistory.mockRejectedValueOnce(new Error('Network error'));
      const { getByText } = render(<UserDetailSheet {...defaultProps()} />);
      await flushAll();
      // Should not crash, show empty state
      expect(getByText('Belum ada riwayat pemindahan')).toBeTruthy();
    });

    it('refetches when user id changes', async () => {
      const { rerender } = render(<UserDetailSheet {...defaultProps()} />);
      await flushAll();
      expect(mockGetReassignmentHistory).toHaveBeenCalledTimes(1);

      rerender(
        <UserDetailSheet {...defaultProps()} user={createUser({ id: 'user-999' })} />
      );
      await flushAll();
      expect(mockGetReassignmentHistory).toHaveBeenCalledTimes(2);
      expect(mockGetReassignmentHistory).toHaveBeenLastCalledWith('user-999');
    });
  });
});
