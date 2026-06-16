import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';
import { PdfGeneratorService } from './generators/pdf.generator';
import { ReportTemplate } from './entities/report-template.entity';
import { GeneratedReport } from './entities/generated-report.entity';
import { ReportSchedule } from './entities/report-schedule.entity';
import { ReportSchedulerCron } from './cron/report-scheduler.cron';
import { ReportCleanupCron } from './cron/report-cleanup.cron';
import { SharedModule } from '../../shared/shared.module';
import { AuditModule } from '../audit/audit.module';
import { ExportModule } from '../export/export.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReportTemplate, GeneratedReport, ReportSchedule]),
    BullModule.registerQueue({ name: 'reporting' }),
    SharedModule,
    AuditModule,
    ExportModule,
  ],
  controllers: [ReportingController],
  providers: [ReportingService, PdfGeneratorService, ReportSchedulerCron, ReportCleanupCron],
  exports: [ReportingService, PdfGeneratorService],
})
export class ReportingModule {}
