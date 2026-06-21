import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import type { AppPlatform, ReleaseChannel } from '../entities/app-release.entity';

/** Query params for the public "latest" + "download" endpoints. */
export class QueryAppReleaseDto {
  @ApiPropertyOptional({ enum: ['android', 'ios', 'android_x86'], default: 'android' })
  @IsOptional()
  @IsIn(['android', 'ios', 'android_x86'])
  platform?: AppPlatform;

  @ApiPropertyOptional({
    enum: ['staging', 'production'],
    description: 'Defaults to the server NODE_ENV channel.',
  })
  @IsOptional()
  @IsIn(['staging', 'production'])
  channel?: ReleaseChannel;
}

/** Shape returned by GET /app-releases/latest. */
export class AppReleaseResponseDto {
  platform: AppPlatform;
  channel: ReleaseChannel;
  version: string;
  buildNumber: string;
  versionCode: number | null;
  fileSize: number | null;
  notes: string | null;
  publishedAt: Date;
  /** Stable public link that 302-redirects to a fresh presigned S3 URL. */
  downloadUrl: string;
}
