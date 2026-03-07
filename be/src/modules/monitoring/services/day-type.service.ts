import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SpecialDayOverride,
  SpecialDayType,
} from '../../special-day-overrides/entities/special-day-override.entity';
import { DayType } from '../../area-staff-requirements/entities/area-staff-requirement.entity';
import { MonitoringCacheService, DayTypeEnum } from './monitoring-cache.service';

const DAY_TYPE_LABELS: Record<DayType, string> = {
  [DayType.WEEKDAY]: 'Hari Kerja',
  [DayType.WEEKEND]: 'Akhir Pekan',
  [DayType.HOLIDAY]: 'Hari Libur',
};

@Injectable()
export class DayTypeService implements OnModuleInit {
  private readonly logger = new Logger(DayTypeService.name);

  constructor(
    @InjectRepository(SpecialDayOverride)
    private readonly specialDayOverrideRepo: Repository<SpecialDayOverride>,
    private readonly cacheService: MonitoringCacheService,
  ) {}

  onModuleInit(): void {
    this.cacheService.setLoaders({
      dayType: () => this.loadDayType(),
    });
  }

  async getCurrentDayType(date?: Date): Promise<DayType> {
    if (!date) {
      const cached = await this.cacheService.getDayType();
      return cached as unknown as DayType;
    }

    return this.resolveDayType(date);
  }

  getDayTypeLabel(dayType: DayType): string {
    return DAY_TYPE_LABELS[dayType] ?? dayType;
  }

  async loadDayType(): Promise<DayTypeEnum> {
    const today = new Date();
    const dayType = await this.resolveDayType(today);
    return dayType as unknown as DayTypeEnum;
  }

  private async resolveDayType(date: Date): Promise<DayType> {
    const dateStr = this.formatDate(date);

    const override = await this.specialDayOverrideRepo.findOne({
      where: { date: dateStr as any },
    });

    if (override) {
      return this.mapSpecialDayType(override.day_type);
    }

    const day = date.getDay();
    return day === 0 || day === 6 ? DayType.WEEKEND : DayType.WEEKDAY;
  }

  private mapSpecialDayType(specialType: SpecialDayType): DayType {
    switch (specialType) {
      case SpecialDayType.HOLIDAY:
      case SpecialDayType.SPECIAL:
        return DayType.HOLIDAY;
      case SpecialDayType.WEEKEND:
        return DayType.WEEKEND;
      default:
        return DayType.WEEKDAY;
    }
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
