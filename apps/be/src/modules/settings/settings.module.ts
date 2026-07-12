import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemConfig } from './entities/system-config.entity';
import { User } from '../users/entities/user.entity';
import { SystemConfigService } from './services/system-config.service';
import { SettingsController } from './settings.controller';
import { PreferencesController } from './preferences.controller';
import { AuditModule } from '../audit/audit.module';

/**
 * SettingsModule (ADR-049) — system settings (catalog-driven, permission-gated)
 * + personal preferences. `SystemConfigService` is exported so other modules can
 * resolve runtime config with DB → env → default precedence.
 */
@Module({
  imports: [TypeOrmModule.forFeature([SystemConfig, User]), AuditModule],
  controllers: [SettingsController, PreferencesController],
  providers: [SystemConfigService],
  exports: [SystemConfigService],
})
export class SettingsModule {}
