import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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

@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database module
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || 'sekar_db',
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
