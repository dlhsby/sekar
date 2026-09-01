import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventsGateway } from './events.gateway';
import { RoomJoinService } from './services/room-join.service';
import { User } from '../modules/users/entities/user.entity';
import { UserLocationsModule } from '../modules/user-locations/user-locations.module';
import { MonitoringModule } from '../modules/monitoring/monitoring.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
    UserLocationsModule,
    forwardRef(() => MonitoringModule),
  ],
  providers: [EventsGateway, RoomJoinService],
  exports: [EventsGateway],
})
export class EventsModule {}
