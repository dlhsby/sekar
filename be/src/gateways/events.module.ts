import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventsGateway } from './events.gateway';

/**
 * Module for WebSocket events
 *
 * Provides real-time event broadcasting for:
 * - Worker location updates
 * - Clock-in/clock-out events
 * - Area staffing changes
 * - Task assignments and completions
 *
 * Clients can subscribe to:
 * - Specific areas (area:{areaId})
 * - Specific rayons (rayon:{rayonId})
 * - City-wide events (Admin/TopManagement only)
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
