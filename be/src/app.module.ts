import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AreaTypesModule } from './modules/area-types/area-types.module';
import { AreasModule } from './modules/areas/areas.module';
import { WorkerAssignmentsModule } from './modules/worker-assignments/worker-assignments.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { ReportsModule } from './modules/reports/reports.module';
import { LocationModule } from './modules/location/location.module';
import { SupervisorModule } from './modules/supervisor/supervisor.module';
import { SharedModule } from './shared/shared.module';
import { SeedModule } from './database/seeds/seed.module';
// Phase 2 modules
import { RayonsModule } from './modules/rayons/rayons.module';
import { ShiftDefinitionsModule } from './modules/shift-definitions/shift-definitions.module';
import { ActivityTypesModule } from './modules/activity-types/activity-types.module';
import { AreaStaffRequirementsModule } from './modules/area-staff-requirements/area-staff-requirements.module';
import { WorkerSchedulesModule } from './modules/worker-schedules/worker-schedules.module';
import { SpecialDayOverridesModule } from './modules/special-day-overrides/special-day-overrides.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { ImportModule } from './modules/import/import.module';
import { EventsModule } from './gateways/events.module';

@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting module
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // Time window in milliseconds (60 seconds)
        limit: 100, // Maximum requests per time window
      },
    ]),

    // Database module with connection pooling
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || 'sekar_db',
      autoLoadEntities: true,

      // Control synchronize via environment variable for flexibility
      synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
      logging: process.env.NODE_ENV === 'development',

      // Connection pooling configuration
      extra: {
        // Maximum number of connections in pool
        max: process.env.NODE_ENV === 'production' ? 15 : 10,
        // Minimum number of connections to maintain
        min: process.env.NODE_ENV === 'production' ? 5 : 2,
        // How long a connection can be idle before being released (ms)
        idleTimeoutMillis: process.env.NODE_ENV === 'production' ? 60000 : 30000,
        // Maximum time to wait for connection from pool (ms)
        connectionTimeoutMillis: 3000,
      },

      // TypeORM connection pool size (for backwards compatibility)
      poolSize: 15,

      // Log slow queries (queries taking longer than 1 second)
      maxQueryExecutionTime: 1000,

      // Migrations configuration
      migrations: ['dist/database/migrations/*.js'],
      migrationsRun: process.env.DATABASE_MIGRATIONS_RUN === 'true',
    }),

    // Feature modules (order matters due to dependencies)
    SharedModule, // Shared services (S3, etc.)
    AuthModule, // Must be first (provides guards)
    UsersModule, // Needed by WorkerAssignments
    AreaTypesModule, // Needed by Areas
    AreasModule, // Needed by WorkerAssignments & Shifts
    WorkerAssignmentsModule, // Needed by Shifts
    ShiftsModule,
    ReportsModule, // Depends on Shifts, SharedModule
    LocationModule, // Depends on Shifts
    SupervisorModule, // Depends on all above modules
    SeedModule,
    // Phase 2 modules
    RayonsModule, // Geographic sectors
    ShiftDefinitionsModule, // Fixed shift definitions
    ActivityTypesModule, // Activity types with role filtering
    AreaStaffRequirementsModule, // Staff requirements per area/shift
    WorkerSchedulesModule, // Worker scheduling
    SpecialDayOverridesModule, // Special day overrides (holidays, etc.)
    TasksModule, // Task management for workers
    NotificationsModule, // Push notifications and FCM token management
    MonitoringModule, // Real-time monitoring and statistics
    ImportModule, // KMZ/KML import for areas
    EventsModule, // WebSocket real-time events
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
