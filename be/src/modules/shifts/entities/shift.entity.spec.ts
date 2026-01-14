import { Shift } from './shift.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { Area } from '../../areas/entities/area.entity';

describe('Shift Entity', () => {
  it('should be defined', () => {
    const shift = new Shift();
    expect(shift).toBeDefined();
  });

  it('should have all required properties', () => {
    const shift = new Shift();

    shift.id = 'shift-uuid-123';
    shift.worker_id = 'worker-uuid-456';
    shift.area_id = 'area-uuid-789';
    shift.clock_in_time = new Date('2026-01-09T08:00:00Z');
    shift.clock_in_gps_lat = -7.2905;
    shift.clock_in_gps_lng = 112.7398;
    shift.clock_in_photo_url = 'https://s3.amazonaws.com/photo.jpg';
    shift.clock_out_time = new Date('2026-01-09T16:00:00Z');
    shift.clock_out_gps_lat = -7.2906;
    shift.clock_out_gps_lng = 112.7399;
    shift.created_at = new Date();
    shift.updated_at = new Date();

    expect(shift.id).toBe('shift-uuid-123');
    expect(shift.worker_id).toBe('worker-uuid-456');
    expect(shift.area_id).toBe('area-uuid-789');
    expect(shift.clock_in_time).toBeInstanceOf(Date);
    expect(shift.clock_in_gps_lat).toBe(-7.2905);
    expect(shift.clock_in_gps_lng).toBe(112.7398);
    expect(shift.clock_in_photo_url).toBe('https://s3.amazonaws.com/photo.jpg');
    expect(shift.clock_out_time).toBeInstanceOf(Date);
    expect(shift.clock_out_gps_lat).toBe(-7.2906);
    expect(shift.clock_out_gps_lng).toBe(112.7399);
    expect(shift.created_at).toBeInstanceOf(Date);
    expect(shift.updated_at).toBeInstanceOf(Date);
  });

  it('should support worker relation', () => {
    const shift = new Shift();
    const mockWorker: User = {
      id: 'worker-uuid-456',
      username: 'worker1',
      password_hash: 'hashed',
      full_name: 'Worker One',
      role: UserRole.WORKER,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    shift.worker = mockWorker;
    expect(shift.worker).toBe(mockWorker);
    expect(shift.worker.username).toBe('worker1');
  });

  it('should support area relation', () => {
    const shift = new Shift();
    const mockArea: Area = {
      id: 'area-uuid-789',
      name: 'Test Area',
      area_type_id: 'type-uuid-123',
      areaType: null as any,
      gps_lat: -7.2905,
      gps_lng: 112.7398,
      radius_meters: 100,
      address: 'Test Address',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    shift.area = mockArea;
    expect(shift.area).toBe(mockArea);
    expect(shift.area.name).toBe('Test Area');
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
    const mockWorker: User = {
      id: 'worker-uuid-456',
      username: 'worker1',
      password_hash: 'hashed',
      full_name: 'Worker One',
      role: UserRole.WORKER,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
    const mockArea: Area = {
      id: 'area-uuid-789',
      name: 'Taman Bungkul',
      area_type_id: 'type-uuid-123',
      areaType: null as any,
      gps_lat: -7.2905,
      gps_lng: 112.7398,
      radius_meters: 150,
      address: 'Test Address',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    shift.id = 'shift-uuid-123';
    shift.worker_id = mockWorker.id;
    shift.worker = mockWorker;
    shift.area_id = mockArea.id;
    shift.area = mockArea;
    shift.clock_in_time = new Date('2026-01-09T08:00:00Z');
    shift.clock_in_gps_lat = -7.2905;
    shift.clock_in_gps_lng = 112.7398;
    shift.clock_in_photo_url = 'https://s3.amazonaws.com/clock-in.jpg';
    shift.clock_out_time = new Date('2026-01-09T16:00:00Z');
    shift.clock_out_gps_lat = -7.2906;
    shift.clock_out_gps_lng = 112.7399;
    shift.created_at = new Date();
    shift.updated_at = new Date();

    expect(shift.id).toBe('shift-uuid-123');
    expect(shift.worker_id).toBe(mockWorker.id);
    expect(shift.worker).toBe(mockWorker);
    expect(shift.area_id).toBe(mockArea.id);
    expect(shift.area).toBe(mockArea);
    expect(shift.clock_in_time).toBeInstanceOf(Date);
    expect(shift.clock_out_time).toBeInstanceOf(Date);
  });
});
