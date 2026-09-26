import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditController } from './audit.controller';
import { AuditLogService } from './audit.service';
import { AuditChainService } from './audit-chain.service';
import { AuditTrailSubscriber } from './capture/audit-trail.subscriber';
import { AuditLog } from './entities/audit-log.entity';
import { DeniedAccessRecorder } from './denied-access.recorder';

/**
 * Global so RolesGuard/PermissionsGuard (used by every module) can inject the
 * DeniedAccessRecorder, and any service can inject AuditLogService.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditController],
  providers: [AuditLogService, AuditChainService, AuditTrailSubscriber, DeniedAccessRecorder],
  exports: [AuditLogService, DeniedAccessRecorder],
})
export class AuditModule {}
