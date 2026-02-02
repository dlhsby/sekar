import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DevicePlatform } from '../entities/notification-token.entity';

/**
 * DTO for registering FCM device token
 */
export class RegisterTokenDto {
  @ApiProperty({
    description: 'FCM device token',
    example: 'dGhpcyBpcyBhIHRlc3QgdG9rZW4...',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  fcm_token: string;

  @ApiProperty({
    description: 'Device platform',
    enum: DevicePlatform,
    example: DevicePlatform.ANDROID,
  })
  @IsEnum(DevicePlatform)
  @IsNotEmpty()
  platform: DevicePlatform;

  @ApiPropertyOptional({
    description: 'Unique device identifier',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  device_id?: string;

  @ApiPropertyOptional({
    description: 'Device name',
    example: 'Samsung Galaxy S21',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  device_name?: string;

  @ApiPropertyOptional({
    description: 'Device model',
    example: 'SM-G991B',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  device_model?: string;

  @ApiPropertyOptional({
    description: 'App version',
    example: '1.0.0',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  app_version?: string;
}
