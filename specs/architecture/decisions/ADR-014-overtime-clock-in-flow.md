# ADR-014: Overtime as Clock-In/Clock-Out Shift Flow

## Status

Accepted

## Context

Client feedback (March 10, 2026) requested that overtime follow the same clock-in/clock-out flow as regular shifts, rather than the current approach where overtime is a standalone record with manually entered start/end times.

The current overtime model (`overtimes` table) stores:
- `date`, `start_time`, `end_time` — manually entered
- `status` — pending/approved/rejected
- `reason`, `approved_by`, `area_id`

This model has problems:
1. No GPS tracking during overtime (no shift = no location pings)
2. No photo verification (no clock-in selfie)
3. Times are self-reported, not system-captured
4. Inconsistent UX — different flow from normal shifts

Two approaches were considered:

1. **Separate overtime shift table** — Create a new `overtime_shifts` table mirroring `shifts`
2. **Reuse shifts table with flag** — Add `is_overtime` boolean to existing `shifts` table

Approach 2 was chosen because:
- Reuses all existing shift infrastructure (GPS tracking, status calculation, photo upload)
- Single status update code path (StatusCalculatorService works for both)
- Simpler monitoring — overtime workers appear on map just like regular workers

## Decision

Implement overtime as a **flagged shift** reusing existing shift infrastructure:

1. **`shifts.is_overtime` column** — Boolean flag (default false) distinguishing overtime shifts from normal shifts.

2. **`overtimes.shift_id` column** — Links the overtime approval record to the corresponding overtime shift. Legacy overtime records (pre-2E) have `shift_id = NULL`.

3. **Overtime lifecycle**:
   ```
   Worker ends normal shift → Clock out (normal)
   Worker starts overtime   → POST /overtime/start
     → Creates overtime record (status: in_progress)
     → Creates shift (is_overtime: true) via ShiftsService.clockInOvertime()
     → Links shift.id to overtime.shift_id
     → StatusCalculatorService.onClockIn() triggers (same as normal)
     → GPS tracking begins (same as normal shift)

   Worker ends overtime     → POST /overtime/end
     → Validates mandatory activity submission
     → Creates/links activity record
     → Calls ShiftsService.clockOut() for overtime shift
     → StatusCalculatorService.onClockOut() triggers
     → Updates overtime: end_time, status → pending_approval

   Supervisor approves/rejects → Existing approval flow (unchanged)
   ```

4. **Validation rules**:
   - Cannot start overtime while normal shift is active
   - Cannot start normal shift while overtime is active
   - Overtime clock-out requires activity submission (mandatory)
   - Normal clock-out does not require activity (existing behavior)

5. **Clockable roles for overtime** — All roles in `CLOCKABLE_ROLES`: satgas, linmas, korlap, admin_data, kepala_rayon.

6. **Selfie is optional** for both normal and overtime clock-in/clock-out (feedback item #7).

7. **Boundary tracking during overtime** — Same rules as normal shift. The overtime shift uses the same area detection and boundary checking logic.

## Consequences

### Positive
- Consistent UX — overtime feels like a natural extension of the workday
- Full GPS tracking during overtime (for the first time)
- Photo verification available (optional selfie)
- System-captured timestamps (not self-reported)
- Monitoring dashboard shows overtime workers on map with real-time status
- Reuses all existing shift infrastructure (no duplication)

### Negative
- Breaking change to overtime API endpoints and mobile screens
- Legacy overtime records (pre-2E) lack `shift_id` and GPS data
- Overtime now has two records: `shifts` row + `overtimes` row (linked)
- Mandatory activity on overtime clock-out adds friction (but client explicitly requested this)

### Migration
- Add `is_overtime` column to shifts (default false, no impact on existing)
- Add `shift_id` column to overtimes (nullable, legacy records have NULL)
- Deploy frontend and backend simultaneously (new overtime screens)
- Legacy overtime records remain functional for viewing/reporting
