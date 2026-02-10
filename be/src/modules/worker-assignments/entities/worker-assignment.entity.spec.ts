import { WorkerAssignment } from './worker-assignment.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { Area } from '../../areas/entities/area.entity';

describe('WorkerAssignment Entity', () => {
  it('should be defined', () => {
    const assignment = new WorkerAssignment();
    expect(assignment).toBeDefined();
  });

  it('should have all required properties', () => {
    const assignment = new WorkerAssignment();

    assignment.id = 'assignment-uuid-123';
    assignment.worker_id = 'worker-uuid-456';
    assignment.area_id = 'area-uuid-789';
    assignment.assigned_at = new Date();

    expect(assignment.id).toBe('assignment-uuid-123');
    expect(assignment.worker_id).toBe('worker-uuid-456');
    expect(assignment.area_id).toBe('area-uuid-789');
    expect(assignment.assigned_at).toBeInstanceOf(Date);
  });

  it('should support worker relation', () => {
    const assignment = new WorkerAssignment();
    const mockWorker: User = {
      id: 'worker-uuid-456',
      username: 'worker1',
      password_hash: 'hashed',
      full_name: 'Worker One',
      role: UserRole.SATGAS,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    assignment.worker = mockWorker;
    expect(assignment.worker).toBe(mockWorker);
    expect(assignment.worker.username).toBe('worker1');
  });

  it('should support area relation', () => {
    const assignment = new WorkerAssignment();
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

    assignment.area = mockArea;
    expect(assignment.area).toBe(mockArea);
    expect(assignment.area.name).toBe('Test Area');
  });

  it('should create assignment with all properties', () => {
    const assignment = new WorkerAssignment();
    const mockWorker: User = {
      id: 'worker-uuid-456',
      username: 'worker1',
      password_hash: 'hashed',
      full_name: 'Worker One',
      role: UserRole.SATGAS,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
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

    assignment.id = 'assignment-uuid-123';
    assignment.worker_id = mockWorker.id;
    assignment.worker = mockWorker;
    assignment.area_id = mockArea.id;
    assignment.area = mockArea;
    assignment.assigned_at = new Date();

    expect(assignment.id).toBe('assignment-uuid-123');
    expect(assignment.worker_id).toBe(mockWorker.id);
    expect(assignment.worker).toBe(mockWorker);
    expect(assignment.area_id).toBe(mockArea.id);
    expect(assignment.area).toBe(mockArea);
    expect(assignment.assigned_at).toBeInstanceOf(Date);
  });
});
