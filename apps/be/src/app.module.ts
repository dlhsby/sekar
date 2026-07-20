import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getEnvFilePaths } from './config/load-env';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UsersModule } from './modules/users/users.module';
import { LocationTypesModule } from './modules/location-types/location-types.module';
import { LocationsModule } from './modules/locations/locations.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { LocationModule } from './modules/location/location.module';
import { SupervisorModule } from './modules/supervisor/supervisor.module';
import { SharedModule } from './shared/shared.module';
// Phase 2 modules
import { DistrictsModule } from './modules/districts/districts.module';
import { RegionsModule } from './modules/regions/regions.module';
import { TeamsModule } from './modules/teams/teams.module';
import { KecamatansModule } from './modules/kecamatans/kecamatans.module';
import { ShiftDefinitionsModule } from './modules/shift-definitions/shift-definitions.module';
import { ActivityTypesModule } from './modules/activity-types/activity-types.module';
import { LocationStaffRequirementsModule } from './modules/location-staff-requirements/location-staff-requirements.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { SpecialDayOverridesModule } from './modules/special-day-overrides/special-day-overrides.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { ImportModule } from './modules/import/import.module';
import { ExportModule } from './modules/export/export.module';
import { EventsModule } from './gateways/events.module';
import { OvertimeModule } from './modules/overtime/overtime.module';
import { UserLocationsModule } from './modules/user-locations/user-locations.module';
import { AuditModule } from './modules/audit/audit.module';
import { CommonModule } from './common/common.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
// Phase 3 entity modules (stub — full controllers/services added in sub-phases 3-6+)
import { PlantsModule } from './modules/plants/plants.module';
import { PruningRequestsModule } from './modules/pruning-requests/pruning-requests.module';
import { ServiceCapacityModule } from './modules/service-capacity/service-capacity.module';
import { PlantSeedsModule } from './modules/plant-seeds/plant-seeds.module';
// Phase 4 sub-phase 4-1: production hardening
import { HealthModule } from './modules/health/health.module';
// Phase 4 sub-phase 4-3 (M2): BullMQ-backed FCM retry queue
import { QueueModule } from './modules/queue/queue.module';
// Phase 5: Asset management, Reporting, Analytics
import { AssetsModule } from './modules/assets/assets.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
// Mobile app release registry (dynamic download links on web)
import { AppReleasesModule } from './modules/app-releases/app-releases.module';
import { ConfigModule as ClientConfigModule } from './modules/config/config.module';

@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvFilePaths(),
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
      migrations: ['dist/src/database/migrations/*.js'],
      migrationsRun: process.env.DATABASE_MIGRATIONS_RUN === 'true',
    }),

    // Feature modules (order matters due to dependencies)
    CommonModule, // Global shared infrastructure (Redis, etc.) — Phase 3
    SharedModule, // Shared services (S3, etc.)
    RbacModule, // Dynamic RBAC — global PermissionsGuard + RolePermissionsService (ADR-044)
    SettingsModule, // System settings + personal preferences (ADR-049)
    AuthModule, // Must be first (provides guards)
    UsersModule,
    LocationTypesModule, // Needed by Locations
    LocationsModule, // Needed by Shifts
    ShiftsModule,
    ActivitiesModule, // Depends on Shifts, SharedModule (Phase 2C: renamed from ReportsModule)
    LocationModule, // Depends on Shifts
    SupervisorModule, // Depends on all above modules
    // Phase 2 modules
    DistrictsModule, // Geographic sectors
    RegionsModule, // Kawasan — level between district and area (ADR-045)
    TeamsModule, // Teams (crews) + team-category catalog (ADR-048)
    KecamatansModule, // Surabaya kecamatans (FK to district)
    ShiftDefinitionsModule, // Fixed shift definitions
    ActivityTypesModule, // Activity types with role filtering
    LocationStaffRequirementsModule, // Staff requirements per area/shift
    SchedulesModule, // Materialized per-day roster (the single schedule concept, ADR-013)
    SpecialDayOverridesModule, // Special day overrides (holidays, etc.)
    TasksModule, // Task management for workers
    QueueModule, // Phase 4-3 (M2): BullMQ wiring — must precede NotificationsModule
    NotificationsModule, // Push notifications and FCM token management
    MonitoringModule, // Real-time monitoring and statistics
    ImportModule, // KMZ/KML import for areas
    ExportModule, // Phase 4-5: CSV/XLSX/KMZ data export
    EventsModule, // WebSocket real-time events
    OvertimeModule, // Overtime submission and approval
    UserLocationsModule, // User-location assignment management (Phase 2E)
    AuditModule, // Audit logging (Phase 2E)
    // Phase 3 entity registration modules
    PlantsModule,
    PruningRequestsModule,
    ServiceCapacityModule,
    PlantSeedsModule,
    HealthModule,
    // Phase 5 modules
    AssetsModule,
    ReportingModule,
    AnalyticsModule,
    AppReleasesModule, // Mobile app release registry (public download links)
    ClientConfigModule, // Runtime client config — serves maps API keys (GET /config/maps)
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global rate limiting guard (disabled in test environment). Resolves
    // limits from SystemConfigService at request time (ADR-049).
    ...(process.env.NODE_ENV !== 'test'
      ? [
          {
            provide: APP_GUARD,
            useClass: AppThrottlerGuard,
          },
        ]
      : []),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Assign a correlation id to every request (Phase 4 §B2).
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
