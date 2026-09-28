import { Module } from '@nestjs/common';
import { DeletionController } from './deletion.controller';
import { DeletionService } from './deletion.service';

/** Force delete with impact preview (ADR-062). AuditModule and RbacModule are global. */
@Module({
  controllers: [DeletionController],
  providers: [DeletionService],
})
export class DeletionModule {}
