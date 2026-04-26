import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StaffingDebouncerService } from './staffing-debouncer.service';

describe('StaffingDebouncerService', () => {
  let service: StaffingDebouncerService;

  beforeEach(async () => {
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffingDebouncerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def?: number) =>
              key === 'STAFFING_DEBOUNCE_SECONDS' ? 30 : def,
            ),
          },
        },
      ],
    }).compile();

    service = module.get<StaffingDebouncerService>(StaffingDebouncerService);
  });

  afterEach(() => {
    // Flush all pending timers to prevent leaking into subsequent tests
    jest.runAllTimers();
    jest.useRealTimers();
  });

  describe('flag', () => {
    it('should not call emitter before debounce window closes', () => {
      const emitter = jest.fn();
      service.setEmitter(emitter);

      service.flag('area-1', { active_count: 3 });

      // Advance 29 s — emitter must not fire yet
      jest.advanceTimersByTime(29_000);
      expect(emitter).not.toHaveBeenCalled();
    });

    it('should call emitter once after debounce window expires', () => {
      const emitter = jest.fn();
      service.setEmitter(emitter);
      const state = { active_count: 5, required_count: 10 };

      service.flag('area-1', state);
      jest.advanceTimersByTime(30_000);

      expect(emitter).toHaveBeenCalledTimes(1);
      expect(emitter).toHaveBeenCalledWith('area-1', state);
    });

    it('should reset the timer when flagged again before window closes', () => {
      const emitter = jest.fn();
      service.setEmitter(emitter);

      service.flag('area-1', { active_count: 1 });
      jest.advanceTimersByTime(20_000);
      // Re-flag with updated state
      service.flag('area-1', { active_count: 2 });
      jest.advanceTimersByTime(20_000);

      // 40 s total — only 20 s since last flag, so emitter should NOT have fired yet
      expect(emitter).not.toHaveBeenCalled();

      jest.advanceTimersByTime(10_000); // 30 s since last flag
      expect(emitter).toHaveBeenCalledTimes(1);
      expect(emitter).toHaveBeenCalledWith('area-1', { active_count: 2 });
    });

    it('should handle multiple areas independently', () => {
      const emitter = jest.fn();
      service.setEmitter(emitter);

      service.flag('area-1', { active_count: 1 });
      service.flag('area-2', { active_count: 2 });
      jest.advanceTimersByTime(30_000);

      expect(emitter).toHaveBeenCalledTimes(2);
    });
  });

  describe('flush', () => {
    it('should immediately emit pending state and clear the timer', () => {
      const emitter = jest.fn();
      service.setEmitter(emitter);
      const state = { active_count: 4 };

      service.flag('area-1', state);
      service.flush('area-1');

      expect(emitter).toHaveBeenCalledTimes(1);
      expect(emitter).toHaveBeenCalledWith('area-1', state);

      // Advance past the original debounce window — no second call
      jest.advanceTimersByTime(35_000);
      expect(emitter).toHaveBeenCalledTimes(1);
    });

    it('should be a no-op when there is no pending state', () => {
      const emitter = jest.fn();
      service.setEmitter(emitter);

      service.flush('area-nonexistent');
      expect(emitter).not.toHaveBeenCalled();
    });
  });

  describe('pendingCount', () => {
    it('should return 0 initially', () => {
      expect(service.pendingCount()).toBe(0);
    });

    it('should increment on flag and decrement after timer fires', () => {
      service.setEmitter(jest.fn());

      service.flag('area-1', {});
      service.flag('area-2', {});
      expect(service.pendingCount()).toBe(2);

      jest.advanceTimersByTime(30_000);
      expect(service.pendingCount()).toBe(0);
    });

    it('should decrement immediately on flush', () => {
      service.setEmitter(jest.fn());

      service.flag('area-1', {});
      expect(service.pendingCount()).toBe(1);

      service.flush('area-1');
      expect(service.pendingCount()).toBe(0);
    });
  });
});
