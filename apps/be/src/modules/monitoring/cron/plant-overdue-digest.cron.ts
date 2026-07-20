import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../users/entities/user.entity';
import {
  AreaPlantStatusService,
  DistrictPlantStatusSummary,
} from '../services/area-plant-status.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';
import { RedisService } from '../../../common/services/redis.service';

/**
 * Plant-overdue digest cron (Phase 3-8 close-out).
 *
 * Daily at 08:00 WIB: aggregates areas with overdue plant maintenance via
 * AreaPlantStatusService.getSummary() and pushes one AREA_PLANT_OVERDUE
 * digest per recipient:
 *  - management: city-wide digest (every district with overdue species)
 *  - kepala_rayon:   own-district digest only
 * Preference enforcement happens inside NotificationsService.sendToUser.
 * Redis SET-NX dedup (per user per Jakarta date) guards against re-fires.
 */
@Injectable()
export class PlantOverdueDigestCron {
  private readonly logger = new Logger(PlantOverdueDigestCron.name);
  private static readonly JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
  private static readonly DEDUP_TTL_SECONDS = 86_400;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly areaPlantStatusService: AreaPlantStatusService,
    private readonly notificationsService: NotificationsService,
    private readonly redisService: RedisService,
  ) {}

  @Cron('0 8 * * *', { name: 'plant-overdue-digest', timeZone: 'Asia/Jakarta' })
  async run(): Promise<void> {
    try {
      await this.sendDigest();
    } catch (err) {
      this.logger.error(`Plant overdue digest failed: ${(err as Error).message}`);
    }
  }

  /** Core logic, extracted for deterministic testing with an injected `now`. */
  async sendDigest(now: Date = new Date()): Promise<number> {
    const jakarta = new Date(now.getTime() + PlantOverdueDigestCron.JAKARTA_OFFSET_MS);
    const dateStr = jakarta.toISOString().slice(0, 10);

    const summary = await this.areaPlantStatusService.getSummary();
    const overdueDistricts = summary.districts.filter((r) => r.overdue > 0);
    if (overdueDistricts.length === 0) {
      this.logger.debug('Plant overdue digest: nothing overdue today');
      return 0;
    }

    const recipients = await this.userRepository.find({
      where: [
        { role: UserRole.MANAGEMENT, is_active: true },
        { role: UserRole.KEPALA_RAYON, is_active: true },
      ],
      select: ['id', 'role', 'district_id'],
    });

    let sent = 0;
    for (const user of recipients) {
      const scoped =
        user.role === UserRole.KEPALA_RAYON
          ? overdueDistricts.filter((r) => r.district_id === user.district_id)
          : overdueDistricts;
      if (scoped.length === 0) continue;

      const dedupKey = `plant-overdue:${dateStr}:${user.id}`;
      if (!(await this.claimOnce(dedupKey))) continue;

      await this.notificationsService
        .sendToUser({
          user_id: user.id,
          title: 'Tanaman melewati jadwal perantingan',
          body: this.buildBody(scoped),
          type: NotificationType.AREA_PLANT_OVERDUE,
          data: {
            date: dateStr,
            districts: scoped.map((r) => ({
              district_id: r.district_id,
              district_name: r.district_name,
              overdue: r.overdue,
              top_areas: r.overdue_areas.slice(0, 3),
            })),
          },
        })
        .catch((err) =>
          this.logger.warn(
            `Plant overdue digest send failed for user ${user.id}: ${(err as Error).message}`,
          ),
        );
      sent++;
    }

    if (sent > 0) {
      this.logger.log(`PlantOverdueDigestCron: sent ${sent} digest(s) for ${dateStr}`);
    }
    return sent;
  }

  /** Indonesian one-line digest body, e.g. "12 jenis tanaman terlambat dipangkas di 3 district." */
  private buildBody(districts: DistrictPlantStatusSummary[]): string {
    const totalOverdue = districts.reduce((sum, r) => sum + r.overdue, 0);
    if (districts.length === 1) {
      const r = districts[0];
      const topArea = r.overdue_areas[0]?.location_name;
      return (
        `${r.overdue} jenis tanaman terlambat dipangkas di ${r.district_name ?? 'district Anda'}` +
        (topArea ? `, terbanyak di ${topArea}.` : '.')
      );
    }
    return `${totalOverdue} jenis tanaman terlambat dipangkas di ${districts.length} district.`;
  }

  /** Atomic once-per-key claim (SET NX EX); fails safe on Redis errors. */
  private async claimOnce(key: string): Promise<boolean> {
    try {
      const res = await this.redisService
        .getClient()
        .set(key, '1', 'EX', PlantOverdueDigestCron.DEDUP_TTL_SECONDS, 'NX');
      return res === 'OK';
    } catch (err) {
      this.logger.warn(`Plant overdue dedup claim failed (${key}): ${(err as Error).message}`);
      return false;
    }
  }
}
