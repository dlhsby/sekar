import { LocationLog } from './location-log.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { Shift } from '../../shifts/entities/shift.entity';

describe('LocationLog Entity', () => {
  it('should be defined', () => {
    const locationLog = new LocationLog();
    expect(locationLog).toBeDefined();
  });

  it('should have all required properties', () => {
    const locationLog = new LocationLog();

    locationLog.id = 'location-uuid-123';
    locationLog.user_id = 'user-uuid-456';
    locationLog.shift_id = 'shift-uuid-789';
    locationLog.gps_lat = -7.2905;
    locationLog.gps_lng = 112.7398;
    locationLog.accuracy_meters = 12.5;
    locationLog.battery_level = 85;
    locationLog.logged_at = new Date('2026-01-09T10:30:00Z');

    expect(locationLog.id).toBe('location-uuid-123');
    expect(locationLog.user_id).toBe('user-uuid-456');
    expect(locationLog.shift_id).toBe('shift-uuid-789');
    expect(locationLog.gps_lat).toBe(-7.2905);
    expect(locationLog.gps_lng).toBe(112.7398);
    expect(locationLog.accuracy_meters).toBe(12.5);
    expect(locationLog.battery_level).toBe(85);
    expect(locationLog.logged_at).toBeInstanceOf(Date);
  });

  it('should support user relation', () => {
    const locationLog = new LocationLog();
    const mockUser: User = {
      id: 'user-uuid-456',
      username: 'user1',
      password_hash: 'hashed',
      full_name: 'User One',
      role: UserRole.SATGAS,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    locationLog.user = mockUser;
    expect(locationLog.user).toBe(mockUser);
    expect(locationLog.user.username).toBe('user1');
  });

  it('should support shift relation', () => {
    const locationLog = new LocationLog();
    const mockShift: Shift = {
      id: 'shift-uuid-789',
      user_id: 'user-uuid-456',
      area_id: 'area-uuid-123',
      clock_in_time: new Date('2026-01-09T08:00:00Z'),
      clock_in_gps_lat: -7.2905,
      clock_in_gps_lng: 112.7398,
      clock_in_photo_url: 'https://s3.amazonaws.com/clock-in.jpg',
      created_at: new Date(),
      updated_at: new Date(),
    } as Shift;

    locationLog.shift = mockShift;
    expect(locationLog.shift).toBe(mockShift);
    expect(locationLog.shift.id).toBe('shift-uuid-789');
  });

  it('should handle optional fields', () => {
    const locationLog = new LocationLog();
    locationLog.id = 'location-uuid-123';
    locationLog.gps_lat = -7.2905;
    locationLog.gps_lng = 112.7398;

    expect(locationLog.id).toBe('location-uuid-123');
    expect(locationLog.accuracy_meters).toBeUndefined();
    expect(locationLog.battery_level).toBeUndefined();
  });

  it('should handle different battery levels', () => {
    const locationLog1 = new LocationLog();
    locationLog1.battery_level = 0;
    expect(locationLog1.battery_level).toBe(0);

    const locationLog2 = new LocationLog();
    locationLog2.battery_level = 100;
    expect(locationLog2.battery_level).toBe(100);

    const locationLog3 = new LocationLog();
    locationLog3.battery_level = 50;
    expect(locationLog3.battery_level).toBe(50);
  });
});
