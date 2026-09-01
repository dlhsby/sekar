import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SpecialDayOverride,
  SpecialDayType,
} from '../../special-day-overrides/entities/special-day-override.entity';
import { DayType } from '../../location-staff-requirements/entities/location-staff-requirement.entity';
import { MonitoringCacheService, DayTypeEnum } from './monitoring-cache.service';
import { TimezoneUtil } from '../../../common/utils/timezone.util';

const DAY_TYPE_LABELS: Record<DayType, string> = {
  [DayType.WEEKDAY]: 'Hari Kerja',
  [DayType.WEEKEND]: 'Akhir Pekan',
  [DayType.HOLIDAY]: 'Hari Libur',
};

@Injectable()
export class DayTypeService implements OnModuleInit {
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

  /**
   * Resolve an instant's staffing day type in WIB — never in server-local time.
   * Containers set no `TZ`, so they run UTC while the business day is Asia/Jakarta
   * (UTC+7); reading the server's local fields resolved the *previous* day's
   * override between 00:00 and 07:00 WIB, disagreeing with the web board (which
   * resolves from an ISO date string).
   */
  private async resolveDayType(date: Date): Promise<DayType> {
    const dateStr = TimezoneUtil.jakartaDateOf(date);

    const override = await this.specialDayOverrideRepo.findOne({
      where: { date: dateStr as any },
    });

    if (override) {
      return this.mapSpecialDayType(override.day_type);
    }

    // jakartaNow shifts the instant so its UTC fields read as WIB wall-clock,
    // so the weekday must be read with getUTCDay().
    const day = TimezoneUtil.jakartaNow(date).getUTCDay();
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
}
