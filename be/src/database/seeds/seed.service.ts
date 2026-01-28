import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User, UserRole } from '../../modules/users/entities/user.entity';
import { AreaType } from '../../modules/area-types/entities/area-type.entity';
import { Area } from '../../modules/areas/entities/area.entity';
import { WorkerAssignment } from '../../modules/worker-assignments/entities/worker-assignment.entity';
import { Shift } from '../../modules/shifts/entities/shift.entity';
import { Report, ReportType } from '../../modules/reports/entities/report.entity';
import { LocationLog } from '../../modules/location/entities/location-log.entity';
import { AuthService } from '../../modules/auth/auth.service';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AreaType)
    private areaTypeRepository: Repository<AreaType>,
    @InjectRepository(Area)
    private areaRepository: Repository<Area>,
    @InjectRepository(WorkerAssignment)
    private workerAssignmentRepository: Repository<WorkerAssignment>,
    @InjectRepository(Shift)
    private shiftRepository: Repository<Shift>,
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
    @InjectRepository(LocationLog)
    private locationLogRepository: Repository<LocationLog>,
    private authService: AuthService,
  ) {}

  async seedDatabase() {
    console.log('🌱 Seeding database...');

    await this.clearDatabase();
    await this.seedUsers();
    await this.seedAreaTypes();
    await this.seedAreas();
    await this.seedWorkerAssignments();
    await this.seedShifts();
    await this.seedReports();
    await this.seedLocationLogs();

    console.log('✅ Database seeded successfully!');
  }

  private async clearDatabase() {
    console.log('🗑️  Clearing existing data...');

    // First, trigger table creation by querying each repository
    // This is necessary when using TypeORM synchronize=true on an empty database
    // TypeORM only creates tables when entities are first accessed
    await Promise.all([
      this.locationLogRepository.find({ take: 1 }).catch(() => []),
      this.reportRepository.find({ take: 1 }).catch(() => []),
      this.shiftRepository.find({ take: 1 }).catch(() => []),
      this.workerAssignmentRepository.find({ take: 1 }).catch(() => []),
      this.areaRepository.find({ take: 1 }).catch(() => []),
      this.areaTypeRepository.find({ take: 1 }).catch(() => []),
      this.userRepository.find({ take: 1 }).catch(() => []),
    ]);

    // Now delete all records (tables should exist now)
    // Clear in reverse FK order to avoid constraint violations
    // IMPORTANT: Delete tasks first (if table exists) as it references areas, area_types, and users
    try {
      await this.userRepository.manager.query('DELETE FROM tasks');
      console.log('  ✓ Cleared tasks table');
    } catch (error) {
      // Table may not exist if Phase 2 not deployed
      console.log('  ⚠️  No tasks to clear (table may not exist - Phase 2 feature)');
    }

    try {
      await this.locationLogRepository.createQueryBuilder().delete().execute();
    } catch (error) {
      console.log('  ⚠️  No location_logs to clear (table may be empty)');
    }

    try {
      await this.reportRepository.createQueryBuilder().delete().execute();
    } catch (error) {
      console.log('  ⚠️  No reports to clear (table may be empty)');
    }

    try {
      await this.shiftRepository.createQueryBuilder().delete().execute();
    } catch (error) {
      console.log('  ⚠️  No shifts to clear (table may be empty)');
    }

    try {
      await this.workerAssignmentRepository.createQueryBuilder().delete().execute();
    } catch (error) {
      console.log('  ⚠️  No worker_assignments to clear (table may be empty)');
    }

    try {
      await this.areaRepository.createQueryBuilder().delete().execute();
    } catch (error) {
      console.log('  ⚠️  No areas to clear (table may be empty)');
    }

    try {
      await this.areaTypeRepository.createQueryBuilder().delete().execute();
    } catch (error) {
      console.log('  ⚠️  No area_types to clear (table may be empty)');
    }

    try {
      await this.userRepository.createQueryBuilder().delete().execute();
    } catch (error) {
      console.log('  ⚠️  No users to clear (table may be empty)');
    }
  }

  private async seedUsers() {
    console.log('👥 Seeding users...');

    const users = [
      {
        username: 'admin',
        password: 'admin123',
        full_name: 'System Administrator',
        role: UserRole.ADMIN,
      },
      {
        username: 'supervisor1',
        password: 'supervisor123',
        full_name: 'Supervisor Satu',
        role: UserRole.SUPERVISOR,
      },
      {
        username: 'supervisor2',
        password: 'supervisor123',
        full_name: 'Supervisor Dua',
        role: UserRole.SUPERVISOR,
      },
      {
        username: 'worker1',
        password: 'worker123',
        full_name: 'Pekerja Satu',
        role: UserRole.WORKER,
      },
      {
        username: 'worker2',
        password: 'worker123',
        full_name: 'Pekerja Dua',
        role: UserRole.WORKER,
      },
      {
        username: 'worker3',
        password: 'worker123',
        full_name: 'Pekerja Tiga',
        role: UserRole.WORKER,
      },
    ];

    for (const userData of users) {
      const password_hash = await this.authService.hashPassword(userData.password);
      const user = this.userRepository.create({
        username: userData.username,
        password_hash,
        full_name: userData.full_name,
        role: userData.role,
      });
      await this.userRepository.save(user);
      console.log(`  ✓ Created ${userData.role}: ${userData.username}`);
    }
  }

  private async seedAreaTypes() {
    console.log('🏷️  Seeding area types...');

    const areaTypes = [
      {
        code: 'park',
        name: 'Taman',
        description: 'Taman kota dan ruang terbuka hijau publik',
      },
      {
        code: 'pedestrian',
        name: 'Trotoar',
        description: 'Jalur pejalan kaki di sepanjang jalan raya',
      },
      {
        code: 'mini_garden',
        name: 'Taman Mini',
        description: 'Taman kecil di area pemukiman atau perumahan',
      },
      {
        code: 'street',
        name: 'Jalanan',
        description: 'Jalanan umum yang memerlukan pemeliharaan kebersihan',
      },
    ];

    for (const areaTypeData of areaTypes) {
      const areaType = this.areaTypeRepository.create(areaTypeData);
      await this.areaTypeRepository.save(areaType);
      console.log(`  ✓ Created area type: ${areaTypeData.name}`);
    }
  }

  private async seedAreas() {
    console.log('📍 Seeding areas...');

    // Get area types for reference
    const parkType = await this.areaTypeRepository.findOne({
      where: { code: 'park' },
    });
    if (!parkType) {
      throw new Error('Park area type not found. Ensure area types are seeded first.');
    }

    const pedestrianType = await this.areaTypeRepository.findOne({
      where: { code: 'pedestrian' },
    });
    if (!pedestrianType) {
      throw new Error('Pedestrian area type not found. Ensure area types are seeded first.');
    }

    const areas = [
      {
        name: 'Taman Bungkul',
        area_type_id: parkType.id,
        gps_lat: -7.2905,
        gps_lng: 112.7398,
        radius_meters: 150,
        address: 'Jl. Taman Bungkul, Darmo, Surabaya',
        is_active: true,
      },
      {
        name: 'Jalan Raya Darmo',
        area_type_id: pedestrianType.id,
        gps_lat: -7.2844,
        gps_lng: 112.7915,
        radius_meters: 200,
        address: 'Jl. Raya Darmo, Surabaya',
        is_active: true,
      },
      {
        name: 'Taman Harmoni',
        area_type_id: parkType.id,
        gps_lat: -7.3037,
        gps_lng: 112.7375,
        radius_meters: 100,
        address: 'Jl. Ketintang, Surabaya',
        is_active: true,
      },
    ];

    for (const areaData of areas) {
      const area = this.areaRepository.create(areaData);
      await this.areaRepository.save(area);
      console.log(`  ✓ Created area: ${areaData.name}`);
    }
  }

  private async seedWorkerAssignments() {
    console.log('👷 Seeding worker assignments...');

    // Get workers (they should exist from seedUsers)
    const worker1 = await this.userRepository.findOne({
      where: { username: 'worker1' },
    });
    if (!worker1) {
      throw new Error('Worker 1 not found. Ensure users are seeded first.');
    }

    const worker2 = await this.userRepository.findOne({
      where: { username: 'worker2' },
    });
    if (!worker2) {
      throw new Error('Worker 2 not found. Ensure users are seeded first.');
    }

    const worker3 = await this.userRepository.findOne({
      where: { username: 'worker3' },
    });
    if (!worker3) {
      throw new Error('Worker 3 not found. Ensure users are seeded first.');
    }

    // Get areas (they should exist from seedAreas)
    const area1 = await this.areaRepository.findOne({
      where: { name: 'Taman Bungkul' },
    });
    if (!area1) {
      throw new Error('Area Taman Bungkul not found. Ensure areas are seeded first.');
    }

    const area2 = await this.areaRepository.findOne({
      where: { name: 'Jalan Raya Darmo' },
    });
    if (!area2) {
      throw new Error('Area Jalan Raya Darmo not found. Ensure areas are seeded first.');
    }

    const area3 = await this.areaRepository.findOne({
      where: { name: 'Taman Harmoni' },
    });
    if (!area3) {
      throw new Error('Area Taman Harmoni not found. Ensure areas are seeded first.');
    }

    const assignments = [
      {
        worker_id: worker1.id,
        area_id: area1.id,
        workerName: worker1.username,
        areaName: area1.name,
      },
      {
        worker_id: worker2.id,
        area_id: area2.id,
        workerName: worker2.username,
        areaName: area2.name,
      },
      {
        worker_id: worker3.id,
        area_id: area3.id,
        workerName: worker3.username,
        areaName: area3.name,
      },
    ];

    for (const assignmentData of assignments) {
      const assignment = this.workerAssignmentRepository.create({
        worker_id: assignmentData.worker_id,
        area_id: assignmentData.area_id,
      });
      await this.workerAssignmentRepository.save(assignment);
      console.log(`  ✓ Assigned ${assignmentData.workerName} to ${assignmentData.areaName}`);
    }
  }

  private async seedShifts() {
    console.log('⏰ Seeding shifts...');

    // Get workers
    const worker1 = await this.userRepository.findOne({
      where: { username: 'worker1' },
    });
    const worker2 = await this.userRepository.findOne({
      where: { username: 'worker2' },
    });
    const worker3 = await this.userRepository.findOne({
      where: { username: 'worker3' },
    });

    if (!worker1 || !worker2 || !worker3) {
      throw new Error('Workers not found. Ensure users are seeded first.');
    }

    // Get areas
    const area1 = await this.areaRepository.findOne({
      where: { name: 'Taman Bungkul' },
    });
    const area2 = await this.areaRepository.findOne({
      where: { name: 'Jalan Raya Darmo' },
    });
    const area3 = await this.areaRepository.findOne({
      where: { name: 'Taman Harmoni' },
    });

    if (!area1 || !area2 || !area3) {
      throw new Error('Areas not found. Ensure areas are seeded first.');
    }

    // Create timestamps relative to current time
    // Active shift should be 2 hours ago so worker can clock out
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(8, 0, 0, 0);

    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(16, 0, 0, 0);

    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(8, 15, 0, 0);

    const twoDaysAgoEnd = new Date(twoDaysAgo);
    twoDaysAgoEnd.setHours(16, 30, 0, 0);

    const shifts = [
      // Completed shifts from yesterday
      {
        worker_id: worker1.id,
        area_id: area1.id,
        clock_in_time: yesterday,
        clock_in_gps_lat: -7.2905,
        clock_in_gps_lng: 112.7398,
        clock_in_photo_url:
          'https://sekar-media.s3.ap-southeast-1.amazonaws.com/sekar-media/2026/01/08/clock-in/worker1-abc123.jpg',
        clock_out_time: yesterdayEnd,
        clock_out_gps_lat: -7.2906,
        clock_out_gps_lng: 112.7399,
        workerName: worker1.username,
        areaName: area1.name,
      },
      {
        worker_id: worker2.id,
        area_id: area2.id,
        clock_in_time: new Date(yesterday.getTime() - 30 * 60 * 1000), // 7:30 AM
        clock_in_gps_lat: -7.2844,
        clock_in_gps_lng: 112.7915,
        clock_in_photo_url:
          'https://sekar-media.s3.ap-southeast-1.amazonaws.com/sekar-media/2026/01/08/clock-in/worker2-def456.jpg',
        clock_out_time: new Date(yesterdayEnd.getTime() - 30 * 60 * 1000), // 3:30 PM
        clock_out_gps_lat: -7.2845,
        clock_out_gps_lng: 112.7916,
        workerName: worker2.username,
        areaName: area2.name,
      },
      // Completed shift from 2 days ago
      {
        worker_id: worker3.id,
        area_id: area3.id,
        clock_in_time: twoDaysAgo,
        clock_in_gps_lat: -7.3037,
        clock_in_gps_lng: 112.7375,
        clock_in_photo_url:
          'https://sekar-media.s3.ap-southeast-1.amazonaws.com/sekar-media/2026/01/07/clock-in/worker3-ghi789.jpg',
        clock_out_time: twoDaysAgoEnd,
        clock_out_gps_lat: -7.3038,
        clock_out_gps_lng: 112.7376,
        workerName: worker3.username,
        areaName: area3.name,
      },
      // Active shift for today (worker1 clocked in 2 hours ago, can clock out now)
      {
        worker_id: worker1.id,
        area_id: area1.id,
        clock_in_time: twoHoursAgo,
        clock_in_gps_lat: -7.2905,
        clock_in_gps_lng: 112.7398,
        clock_in_photo_url:
          'https://sekar-media.s3.ap-southeast-1.amazonaws.com/sekar-media/2026/01/09/clock-in/worker1-jkl012.jpg',
        clock_out_time: null,
        clock_out_gps_lat: null,
        clock_out_gps_lng: null,
        workerName: worker1.username,
        areaName: area1.name,
      },
    ];

    for (const shiftData of shifts) {
      await this.shiftRepository.save({
        worker_id: shiftData.worker_id,
        area_id: shiftData.area_id,
        clock_in_time: shiftData.clock_in_time,
        clock_in_gps_lat: shiftData.clock_in_gps_lat,
        clock_in_gps_lng: shiftData.clock_in_gps_lng,
        clock_in_photo_url: shiftData.clock_in_photo_url,
        clock_out_time: shiftData.clock_out_time,
        clock_out_gps_lat: shiftData.clock_out_gps_lat,
        clock_out_gps_lng: shiftData.clock_out_gps_lng,
      } as any);
      const status = shiftData.clock_out_time ? 'completed' : 'active';
      console.log(
        `  ✓ Created ${status} shift for ${shiftData.workerName} at ${shiftData.areaName}`,
      );
    }
  }

  private async seedReports() {
    console.log('📝 Seeding reports...');

    // Get workers
    const worker1 = await this.userRepository.findOne({
      where: { username: 'worker1' },
    });
    const worker2 = await this.userRepository.findOne({
      where: { username: 'worker2' },
    });

    if (!worker1 || !worker2) {
      throw new Error('Workers not found. Ensure users are seeded first.');
    }

    // Get active shift for worker1 (today)
    const activeShift = await this.shiftRepository.findOne({
      where: { worker_id: worker1.id, clock_out_time: IsNull() },
    });

    if (!activeShift) {
      throw new Error('Active shift not found for worker1');
    }

    const reports = [
      // Report for active shift (today)
      {
        worker_id: worker1.id,
        shift_id: activeShift.id,
        area_id: activeShift.area_id,
        report_type: ReportType.TASK_COMPLETION,
        description:
          'Completed cleaning main area of Taman Bungkul. All trash collected and disposed properly.',
        photo_url:
          'https://sekar-media.s3.ap-southeast-1.amazonaws.com/sekar-media/2026/01/09/reports/report1-abc123.jpg',
        gps_lat: -7.2905,
        gps_lng: 112.7398,
      },
      {
        worker_id: worker1.id,
        shift_id: activeShift.id,
        area_id: activeShift.area_id,
        report_type: ReportType.MAINTENANCE_REQUEST,
        description: 'Bench near playground needs repair. One leg is loose and unstable.',
        photo_url:
          'https://sekar-media.s3.ap-southeast-1.amazonaws.com/sekar-media/2026/01/09/reports/report2-def456.jpg',
        gps_lat: -7.2906,
        gps_lng: 112.7399,
      },
    ];

    for (const reportData of reports) {
      await this.reportRepository.save(reportData);
      console.log(`  ✓ Created ${reportData.report_type} report`);
    }
  }

  private async seedLocationLogs() {
    console.log('📍 Seeding location logs...');

    // Get worker1 (active shift)
    const worker1 = await this.userRepository.findOne({
      where: { username: 'worker1' },
    });

    if (!worker1) {
      throw new Error('Worker1 not found. Ensure users are seeded first.');
    }

    // Get active shift for worker1
    const activeShift = await this.shiftRepository.findOne({
      where: { worker_id: worker1.id, clock_out_time: IsNull() },
    });

    if (!activeShift) {
      throw new Error('Active shift not found for worker1');
    }

    // Create 10 location logs for active shift (simulate 5-minute intervals)
    const baseTime = activeShift.clock_in_time.getTime();
    const baseLat = -7.2905;
    const baseLng = 112.7398;

    for (let i = 0; i < 10; i++) {
      const locationLog = {
        worker_id: worker1.id,
        shift_id: activeShift.id,
        gps_lat: baseLat + (Math.random() - 0.5) * 0.001, // Random within ~100m
        gps_lng: baseLng + (Math.random() - 0.5) * 0.001,
        accuracy_meters: 10 + Math.random() * 5, // 10-15 meters
        battery_level: 95 - i * 2, // Decreasing battery
        logged_at: new Date(baseTime + i * 5 * 60 * 1000), // Every 5 minutes
      };

      await this.locationLogRepository.save(locationLog);
    }

    console.log('  ✓ Created 10 location logs for worker1 active shift');
  }
}
