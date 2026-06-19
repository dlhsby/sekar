import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import type { AppPlatform, ReleaseChannel } from '../entities/app-release.entity';

/**
 * Payload the CI release workflow POSTs after uploading the signed artifact to
 * S3. Guarded by the publish token (see PublishTokenGuard).
 */
export class CreateAppReleaseDto {
  @ApiProperty({ enum: ['android', 'ios'] })
  @IsIn(['android', 'ios'])
  platform: AppPlatform;

  @ApiPropertyOptional({
    enum: ['staging', 'production'],
    description: 'Defaults to the server NODE_ENV channel.',
  })
  @IsOptional()
  @IsIn(['staging', 'production'])
  channel?: ReleaseChannel;

  @ApiProperty({ example: '0.0.1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  version: string;

  @ApiProperty({ example: '202606191609', description: 'CI build code, unique per build.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  buildNumber: string;

  @ApiPropertyOptional({ example: 1, description: 'Android versionCode (omit for iOS).' })
  @IsOptional()
  @IsInt()
  @Min(1)
  versionCode?: number;

  @ApiProperty({ example: 'app-releases/android/sekar-0.0.1-202606191609.apk' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  storageKey: string;

  @ApiPropertyOptional({ description: 'Artifact size in bytes.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;

  @ApiPropertyOptional({ description: 'Release notes (Markdown/plain).' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}
