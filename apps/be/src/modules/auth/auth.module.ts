import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../users/entities/user.entity';
import { Location } from '../locations/entities/location.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { CommonModule } from '../../common/common.module';
import { UserLocationsModule } from '../user-locations/user-locations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Location]),
    UserLocationsModule, // ADR-013: effective-area lookup for login (replaces schedules)
    PassportModule.register({ defaultStrategy: 'jwt' }),
    CommonModule, // Phase 4-7 (M2): exposes RedisService for refresh-token blacklist
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<string>('JWT_EXPIRATION') || '7d';
        return {
          secret: configService.get<string>('JWT_SECRET') || 'default-secret-key-for-development',
          signOptions: {
            expiresIn: expiresIn as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy, PassportModule],
})
export class AuthModule {}
