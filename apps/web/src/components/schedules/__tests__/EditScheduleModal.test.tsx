/**
 * Unit Tests: EditScheduleModal
 *
 * Regression coverage for two UAT-reported bugs:
 * 1. The worker (Pekerja) field must be READ-ONLY — changing the assigned
 *    worker via this modal used to call replaceWorker(), which is a data
 *    integrity risk. Reassignment is now only offered via delete + Tambah
 *    Jadwal, so this modal must never expose a way to change the worker.
 * 2. The worker field must correctly display the current worker's name for
 *    EVERY role (kepala_rayon, admin_data, top_management, etc.), not just
 *    satgas/linmas/korlap — it used to look up the name in a role-filtered
 *    list and silently show nothing for other roles.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { EditScheduleModal } from '../EditScheduleModal';
import type { Schedule } from '@/lib/api/schedules';

function makeRoster(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: 'sched-1',
    user_id: 'user-1',
    schedule_date: '2026-07-05',
    rayon_id: 'rayon-1',
    shift_definition_id: 'shift-1',
    status: 'planned',
    replacement_user_id: null,
    original_user_id: null,
    source: 'manual',
    is_overtime: false,
    notes: null,
    user: { id: 'user-1', full_name: 'Budi Santoso', username: 'budi_s', role: 'satgas' },
    shift_definition: { id: 'shift-1', name: 'Shift 1', start_time: '06:00', end_time: '14:00' },
    replacement_user: null,
    schedule_areas: [{ id: 'sa-1', location_id: 'area-1', location: { id: 'area-1', name: 'Taman A', code: 'A' } }],
    ...overrides,
  };
}

const shifts = [{ id: 'shift-1', name: 'Shift 1', start_time: '06:00', end_time: '14:00' }];
const allRayons = [{ id: 'rayon-1', name: 'Rayon Pusat' }];
const allAreas = [{ id: 'area-1', name: 'Taman A', rayon_id: 'rayon-1' }];

describe('EditScheduleModal', () => {
  const baseProps = {
    open: true,
    onClose: jest.fn(),
    onUpdateShift: jest.fn().mockResolvedValue(undefined),
    onUpdateAreas: jest.fn().mockResolvedValue(undefined),
    shifts,
    allRayons,
    allAreas,
  };

  it('shows the worker field as disabled — cannot be changed here', () => {
    render(<EditScheduleModal {...baseProps} roster={makeRoster()} />);
    const workerField = screen.getByRole('combobox', { name: /pekerja/i });
    expect(workerField).toBeDisabled();
  });

  it.each([
    ['satgas', 'Budi Santoso'],
    ['kepala_rayon', 'Siti Rahma'],
    ['admin_data', 'Agus Wijaya'],
    ['top_management', 'Dewi Lestari'],
  ] as const)(
    'displays the current worker name for role=%s (not just satgas/linmas/korlap)',
    (role, name) => {
      render(
        <EditScheduleModal
          {...baseProps}
          roster={makeRoster({ user: { id: 'user-1', full_name: name, username: 'u1', role } })}
        />
      );
      expect(screen.getByText(new RegExp(name))).toBeInTheDocument();
    }
  );

  it('does not offer any worker-change control (no onReplaceWorker prop, no editable options)', () => {
    render(<EditScheduleModal {...baseProps} roster={makeRoster()} />);
    // Only field-level interaction available; the worker combobox has exactly
    // one, disabled option — the current worker — with no way to pick another.
    const workerField = screen.getByRole('combobox', { name: /pekerja/i });
    expect(workerField).toBeDisabled();
    expect(screen.getByText(/tidak dapat diubah|cannot be changed/i)).toBeInTheDocument();
  });

  it('submits an area change via onUpdateAreas, never a worker-replace call', async () => {
    const user = userEvent.setup();
    const onUpdateAreas = jest.fn().mockResolvedValue(undefined);
    render(
      <EditScheduleModal
        {...baseProps}
        onUpdateAreas={onUpdateAreas}
        roster={makeRoster({ schedule_areas: [] })}
        allAreas={[...allAreas, { id: 'area-2', name: 'Taman B', rayon_id: 'rayon-1' }]}
      />
    );

    const submit = screen.getByRole('button', { name: /simpan|save/i });
    expect(submit).toBeDisabled();

    // The roster's rayon_id ('rayon-1') is preselected on mount, so its areas
    // are already in the cascade — just open the area field and pick one.
    await user.click(screen.getByRole('combobox', { name: /area/i }));
    await user.click(screen.getByRole('option', { name: 'Taman B' }));

    expect(submit).not.toBeDisabled();
    await user.click(submit);
    expect(onUpdateAreas).toHaveBeenCalledWith('sched-1', ['area-2']);
  });
});
