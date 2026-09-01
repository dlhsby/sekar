import { AttendanceDerivationService, DerivablePunch } from './attendance-derivation.service';
import { PunchLabel } from '../enums/punch-label.enum';

/**
 * ADR-055 derivation — the single source of "what the punches mean". These cases
 * are the executable spec for Jam Masuk/Keluar, open?, segment pairing, and
 * worked minutes across every scenario the user asked to support: unlimited
 * clock-in, re-entry, redundant taps, breaks, multi-punch, out-of-order sync.
 */
describe('AttendanceDerivationService', () => {
  let service: AttendanceDerivationService;

  beforeEach(() => {
    service = new AttendanceDerivationService();
  });

  const at = (hhmm: string): Date => new Date(`2026-07-25T${hhmm}:00.000Z`);
  const punch = (
    label: PunchLabel,
    time: string,
    extra: Partial<DerivablePunch> = {},
  ): DerivablePunch => ({ label, punched_at: at(time), ...extra });
  const clockIn = (time: string, extra?: Partial<DerivablePunch>) =>
    punch(PunchLabel.CLOCK_IN, time, extra);
  const clockOut = (time: string, extra?: Partial<DerivablePunch>) =>
    punch(PunchLabel.CLOCK_OUT, time, extra);

  describe('empty / single', () => {
    it('no punches → empty closed session', () => {
      const s = service.deriveSession([]);
      expect(s.firstIn).toBeNull();
      expect(s.lastOut).toBeNull();
      expect(s.isOpen).toBe(false);
      expect(s.segments).toEqual([]);
      expect(s.workedMinutes).toBe(0);
      expect(s.clockInTime).toBeNull();
      expect(s.clockOutTime).toBeNull();
    });

    it('single clock-in → open, no segments, Jam Keluar null', () => {
      const s = service.deriveSession([clockIn('08:00')]);
      expect(s.isOpen).toBe(true);
      expect(s.clockInTime).toEqual(at('08:00'));
      expect(s.clockOutTime).toBeNull();
      expect(s.workedMinutes).toBe(0);
      expect(s.segments).toEqual([]);
    });
  });

  describe('closed session (in → out)', () => {
    it('one segment; Jam Masuk=first-in, Jam Keluar=last-out', () => {
      const s = service.deriveSession([clockIn('08:00'), clockOut('16:00')]);
      expect(s.isOpen).toBe(false);
      expect(s.clockInTime).toEqual(at('08:00'));
      expect(s.clockOutTime).toEqual(at('16:00'));
      expect(s.segments).toHaveLength(1);
      expect(s.workedMinutes).toBe(8 * 60);
    });
  });

  describe('re-entry (unlimited clock-in)', () => {
    it('in → out → in reopens the SAME session (open again, Jam Keluar back to null)', () => {
      const s = service.deriveSession([clockIn('08:00'), clockOut('12:00'), clockIn('13:00')]);
      expect(s.isOpen).toBe(true);
      expect(s.clockInTime).toEqual(at('08:00')); // still the first-in
      expect(s.clockOutTime).toBeNull(); // reopened
      expect(s.segments).toHaveLength(1); // only the closed 08–12 segment so far
      expect(s.workedMinutes).toBe(4 * 60);
    });

    it('in → out → in → out yields two segments, worked = sum (break excluded)', () => {
      const s = service.deriveSession([
        clockIn('08:00'),
        clockOut('12:00'), // 4h
        clockIn('13:00'),
        clockOut('17:00'), // 4h — 1h lunch NOT counted
      ]);
      expect(s.isOpen).toBe(false);
      expect(s.clockInTime).toEqual(at('08:00'));
      expect(s.clockOutTime).toEqual(at('17:00'));
      expect(s.segments).toHaveLength(2);
      expect(s.workedMinutes).toBe(8 * 60); // NOT 9h (08→17)
    });
  });

  describe('redundant taps (absorbed)', () => {
    it('in, in, out → one segment from the EARLIEST in (user example IN1,IN2,OUT1)', () => {
      const s = service.deriveSession([clockIn('08:00'), clockIn('08:05'), clockOut('16:00')]);
      expect(s.segments).toHaveLength(1);
      expect(s.segments[0].in).toEqual(at('08:00')); // earliest, IN2 absorbed
      expect(s.segments[0].out).toEqual(at('16:00'));
      expect(s.workedMinutes).toBe(8 * 60);
      expect(s.isOpen).toBe(false);
    });

    it('double clock-out: the second (unpaired) clock-out is ignored', () => {
      const s = service.deriveSession([clockIn('08:00'), clockOut('16:00'), clockOut('16:05')]);
      expect(s.segments).toHaveLength(1);
      expect(s.clockOutTime).toEqual(at('16:00')); // the paired one
      expect(s.isOpen).toBe(false);
    });
  });

  describe('defensive / ordering', () => {
    it('leading unpaired clock-out is ignored (never throws)', () => {
      const s = service.deriveSession([clockOut('07:00'), clockIn('08:00'), clockOut('16:00')]);
      expect(s.segments).toHaveLength(1);
      expect(s.clockInTime).toEqual(at('08:00'));
      expect(s.clockOutTime).toEqual(at('16:00'));
    });

    it('orders by punched_at, not array order (offline sync arrives shuffled)', () => {
      const s = service.deriveSession([clockOut('16:00'), clockIn('08:00')]);
      expect(s.isOpen).toBe(false);
      expect(s.clockInTime).toEqual(at('08:00'));
      expect(s.clockOutTime).toEqual(at('16:00'));
      expect(s.workedMinutes).toBe(8 * 60);
    });
  });

  describe('field selection', () => {
    it('firstIn carries the first clock-in context; lastOut the closing one', () => {
      const s = service.deriveSession([
        clockIn('08:00', { location_id: 'area-A', photo_url: 'in.jpg', outside_boundary: false }),
        clockOut('16:00', { location_id: 'area-B', photo_url: 'out.jpg', outside_boundary: true }),
      ]);
      expect(s.firstIn?.location_id).toBe('area-A');
      expect(s.firstIn?.photo_url).toBe('in.jpg');
      expect(s.lastOut?.photo_url).toBe('out.jpg');
      expect(s.lastOut?.outside_boundary).toBe(true);
    });
  });

  describe('earliestOpenClockIn (min-duration guard support)', () => {
    it('returns the open clock-in instant while open', () => {
      expect(service.earliestOpenClockIn([clockIn('08:00')])).toEqual(at('08:00'));
    });
    it('returns the re-entry clock-in after a completed segment', () => {
      const p = [clockIn('08:00'), clockOut('12:00'), clockIn('13:00')];
      expect(service.earliestOpenClockIn(p)).toEqual(at('13:00'));
    });
    it('returns null when closed', () => {
      expect(service.earliestOpenClockIn([clockIn('08:00'), clockOut('16:00')])).toBeNull();
    });
    it('returns the EARLIEST of redundant open ins', () => {
      expect(service.earliestOpenClockIn([clockIn('08:00'), clockIn('08:05')])).toEqual(
        at('08:00'),
      );
    });
  });
});
