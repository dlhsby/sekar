import { Report, ReportType } from './report.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { Shift } from '../../shifts/entities/shift.entity';

describe('Report Entity', () => {
  it('should be defined', () => {
    const report = new Report();
    expect(report).toBeDefined();
  });

  it('should have all required properties', () => {
    const report = new Report();

    report.id = 'report-uuid-123';
    report.worker_id = 'worker-uuid-456';
    report.shift_id = 'shift-uuid-789';
    report.report_type = ReportType.TASK_COMPLETION;
    report.description = 'Completed cleaning';
    report.photo_url = 'https://s3.amazonaws.com/photo.jpg';
    report.gps_lat = -7.2905;
    report.gps_lng = 112.7398;
    report.created_at = new Date();
    report.updated_at = new Date();

    expect(report.id).toBe('report-uuid-123');
    expect(report.worker_id).toBe('worker-uuid-456');
    expect(report.shift_id).toBe('shift-uuid-789');
    expect(report.report_type).toBe(ReportType.TASK_COMPLETION);
    expect(report.description).toBe('Completed cleaning');
    expect(report.photo_url).toBe('https://s3.amazonaws.com/photo.jpg');
    expect(report.gps_lat).toBe(-7.2905);
    expect(report.gps_lng).toBe(112.7398);
    expect(report.created_at).toBeInstanceOf(Date);
    expect(report.updated_at).toBeInstanceOf(Date);
  });

  it('should support worker relation', () => {
    const report = new Report();
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

    report.worker = mockWorker;
    expect(report.worker).toBe(mockWorker);
    expect(report.worker.username).toBe('worker1');
  });

  it('should support shift relation', () => {
    const report = new Report();
    const mockShift: Shift = {
      id: 'shift-uuid-789',
      worker_id: 'worker-uuid-456',
      area_id: 'area-uuid-123',
      clock_in_time: new Date('2026-01-09T08:00:00Z'),
      clock_in_gps_lat: -7.2905,
      clock_in_gps_lng: 112.7398,
      clock_in_photo_url: 'https://s3.amazonaws.com/clock-in.jpg',
      created_at: new Date(),
      updated_at: new Date(),
    } as Shift;

    report.shift = mockShift;
    expect(report.shift).toBe(mockShift);
    expect(report.shift.id).toBe('shift-uuid-789');
  });

  it('should support all report types', () => {
    const report1 = new Report();
    report1.report_type = ReportType.TASK_COMPLETION;
    expect(report1.report_type).toBe(ReportType.TASK_COMPLETION);

    const report2 = new Report();
    report2.report_type = ReportType.INCIDENT;
    expect(report2.report_type).toBe(ReportType.INCIDENT);

    const report3 = new Report();
    report3.report_type = ReportType.MAINTENANCE_REQUEST;
    expect(report3.report_type).toBe(ReportType.MAINTENANCE_REQUEST);
  });

  it('should handle report without photo', () => {
    const report = new Report();
    report.id = 'report-uuid-123';
    report.description = 'Completed task';

    expect(report.id).toBe('report-uuid-123');
    expect(report.photo_url).toBeUndefined();
  });
});
