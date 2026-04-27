import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AreaTypesModule } from './modules/area-types/area-types.module';
import { AreasModule } from './modules/areas/areas.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { LocationModule } from './modules/location/location.module';
import { SupervisorModule } from './modules/supervisor/supervisor.module';
import { SharedModule } from './shared/shared.module';
// Phase 2 modules
import { RayonsModule } from './modules/rayons/rayons.module';
import { ShiftDefinitionsModule } from './modules/shift-definitions/shift-definitions.module';
import { ActivityTypesModule } from './modules/activity-types/activity-types.module';
import { AreaStaffRequirementsModule } from './modules/area-staff-requirements/area-staff-requirements.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { SpecialDayOverridesModule } from './modules/special-day-overrides/special-day-overrides.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { ImportModule } from './modules/import/import.module';
import { EventsModule } from './gateways/events.module';
import { OvertimeModule } from './modules/overtime/overtime.module';
import { UserAreasModule } from './modules/user-areas/user-areas.module';
import { AuditModule } from './modules/audit/audit.module';
import { CommonModule } from './common/common.module';
// Phase 3 entity modules (stub — full controllers/services added in sub-phases 3-6+)
import { PlantsModule } from './modules/plants/plants.module';
import { PruningRequestsModule } from './modules/pruning-requests/pruning-requests.module';
import { ServiceCapacityModule } from './modules/service-capacity/service-capacity.module';
import { PlantSeedsModule } from './modules/plant-seeds/plant-seeds.module';

@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting module (high limits in test environment to prevent interference)
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10), // Time window in milliseconds
        limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10), // Maximum requests per time window
      },
    ]),

    // Schedule module for cron jobs (Phase 2D)
    ScheduleModule.forRoot(),

    // Event emitter for internal events (Phase 2D)
    EventEmitterModule.forRoot(),

    // Database module with connection pooling
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || 'sekar_db',
      autoLoadEntities: true,

      // SSL configuration for RDS
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,

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
        connectionTimeoutMillis: 5000,
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
    CommonModule, // Global shared infrastructure (Redis, etc.) — Phase 3
    SharedModule, // Shared services (S3, etc.)
    AuthModule, // Must be first (provides guards)
    UsersModule,
    AreaTypesModule, // Needed by Areas
    AreasModule, // Needed by Shifts
    ShiftsModule,
    ActivitiesModule, // Depends on Shifts, SharedModule (Phase 2C: renamed from ReportsModule)
    LocationModule, // Depends on Shifts
    SupervisorModule, // Depends on all above modules
    // Phase 2 modules
    RayonsModule, // Geographic sectors
    ShiftDefinitionsModule, // Fixed shift definitions
    ActivityTypesModule, // Activity types with role filtering
    AreaStaffRequirementsModule, // Staff requirements per area/shift
    SchedulesModule, // Worker scheduling
    SpecialDayOverridesModule, // Special day overrides (holidays, etc.)
    TasksModule, // Task management for workers
    NotificationsModule, // Push notifications and FCM token management
    MonitoringModule, // Real-time monitoring and statistics
    ImportModule, // KMZ/KML import for areas
    EventsModule, // WebSocket real-time events
    OvertimeModule, // Overtime submission and approval
    UserAreasModule, // User-area assignment management (Phase 2E)
    AuditModule, // Audit logging (Phase 2E)
    // Phase 3 entity registration modules
    PlantsModule,
    PruningRequestsModule,
    ServiceCapacityModule,
    PlantSeedsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global rate limiting guard (disabled in test environment)
    ...(process.env.NODE_ENV !== 'test'
      ? [
          {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
          },
        ]
      : []),
  ],
})
export class AppModule {}
