import { Shift } from './shift.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { Location } from '../../locations/entities/location.entity';

describe('Shift Entity', () => {
  it('should be defined', () => {
    const shift = new Shift();
    expect(shift).toBeDefined();
  });

  it('should have all required properties', () => {
    const shift = new Shift();

    shift.id = 'shift-uuid-123';
    shift.user_id = 'user-uuid-456';
    shift.location_id = 'area-uuid-789';
    shift.clock_in_time = new Date('2026-01-09T08:00:00Z');
    shift.clock_in_gps_lat = -7.2905;
    shift.clock_in_gps_lng = 112.7398;
    shift.clock_in_photo_url = 'https://s3.amazonaws.com/photo.jpg';
    shift.clock_in_outside_boundary = false;
    shift.clock_out_time = new Date('2026-01-09T16:00:00Z');
    shift.clock_out_gps_lat = -7.2906;
    shift.clock_out_gps_lng = 112.7399;
    shift.clock_out_outside_boundary = false;
    shift.created_at = new Date();
    shift.updated_at = new Date();

    expect(shift.id).toBe('shift-uuid-123');
    expect(shift.user_id).toBe('user-uuid-456');
    expect(shift.location_id).toBe('area-uuid-789');
    expect(shift.clock_in_time).toBeInstanceOf(Date);
    expect(shift.clock_in_gps_lat).toBe(-7.2905);
    expect(shift.clock_in_gps_lng).toBe(112.7398);
    expect(shift.clock_in_photo_url).toBe('https://s3.amazonaws.com/photo.jpg');
    expect(shift.clock_in_outside_boundary).toBe(false);
    expect(shift.clock_out_time).toBeInstanceOf(Date);
    expect(shift.clock_out_gps_lat).toBe(-7.2906);
    expect(shift.clock_out_gps_lng).toBe(112.7399);
    expect(shift.clock_out_outside_boundary).toBe(false);
    expect(shift.created_at).toBeInstanceOf(Date);
    expect(shift.updated_at).toBeInstanceOf(Date);
  });

  it('should support user relation', () => {
    const shift = new Shift();
    const mockUser: User = {
      id: 'user-uuid-456',
      username: 'user1',
      password_hash: 'hashed',
      full_name: 'User One',
      phone_number: null,
      profile_picture_url: null,
      role: UserRole.SATGAS,
      is_active: true,
      password_must_change: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    shift.user = mockUser;
    expect(shift.user).toBe(mockUser);
    expect(shift.user.username).toBe('user1');
  });

  it('should support area relation', () => {
    const shift = new Shift();
    const mockArea: Location = {
      id: 'area-uuid-789',
      name: 'Test Location',
      location_type_id: 'type-uuid-123',
      locationType: null as any,
      gps_lat: -7.2905,
      gps_lng: 112.7398,
      address: 'Test Address',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    shift.area = mockArea;
    expect(shift.area).toBe(mockArea);
    expect(shift.area.name).toBe('Test Location');
  });

  it('should handle active shift without clock-out', () => {
    const shift = new Shift();
    shift.id = 'shift-uuid-123';
    shift.clock_in_time = new Date('2026-01-09T08:00:00Z');

    expect(shift.clock_in_time).toBeInstanceOf(Date);
    expect(shift.clock_out_time).toBeUndefined();
  });

  it('should create completed shift with all properties', () => {
    const shift = new Shift();
    const mockUser: User = {
      id: 'user-uuid-456',
      username: 'user1',
      password_hash: 'hashed',
      full_name: 'User One',
      phone_number: null,
      profile_picture_url: null,
      role: UserRole.SATGAS,
      is_active: true,
      password_must_change: false,
      created_at: new Date(),
      updated_at: new Date(),
    };
    const mockArea: Location = {
      id: 'area-uuid-789',
      name: 'Taman Bungkul',
      location_type_id: 'type-uuid-123',
      locationType: null as any,
      gps_lat: -7.2905,
      gps_lng: 112.7398,
      address: 'Test Address',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    shift.id = 'shift-uuid-123';
    shift.user_id = mockUser.id;
    shift.user = mockUser;
    shift.location_id = mockArea.id;
    shift.area = mockArea;
    shift.clock_in_time = new Date('2026-01-09T08:00:00Z');
    shift.clock_in_gps_lat = -7.2905;
    shift.clock_in_gps_lng = 112.7398;
    shift.clock_in_photo_url = 'https://s3.amazonaws.com/clock-in.jpg';
    shift.clock_in_outside_boundary = false;
    shift.clock_out_time = new Date('2026-01-09T16:00:00Z');
    shift.clock_out_gps_lat = -7.2906;
    shift.clock_out_gps_lng = 112.7399;
    shift.clock_out_outside_boundary = false;
    shift.created_at = new Date();
    shift.updated_at = new Date();

    expect(shift.id).toBe('shift-uuid-123');
    expect(shift.user_id).toBe(mockUser.id);
    expect(shift.user).toBe(mockUser);
    expect(shift.location_id).toBe(mockArea.id);
    expect(shift.area).toBe(mockArea);
    expect(shift.clock_in_time).toBeInstanceOf(Date);
    expect(shift.clock_out_time).toBeInstanceOf(Date);
    expect(shift.clock_in_outside_boundary).toBe(false);
    expect(shift.clock_out_outside_boundary).toBe(false);
  });
});
