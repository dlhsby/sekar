import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventsGateway } from './events.gateway';
import { RoomJoinService } from './services/room-join.service';
import { User } from '../modules/users/entities/user.entity';
import { UserAreasModule } from '../modules/user-areas/user-areas.module';
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
    UserAreasModule,
    forwardRef(() => MonitoringModule),
  ],
  providers: [EventsGateway, RoomJoinService],
  exports: [EventsGateway],
})
export class EventsModule {}
