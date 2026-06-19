import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { S3Service } from '../../shared/services/s3.service';
import { CreateAppReleaseDto } from './dto/create-app-release.dto';
import { AppReleaseResponseDto } from './dto/query-app-release.dto';
import { AppPlatform, AppRelease, ReleaseChannel } from './entities/app-release.entity';

@Injectable()
export class AppReleasesService {
  private readonly logger = new Logger(AppReleasesService.name);
  /** Presigned download links live 1 hour — long enough for the download to start. */
  private readonly presignTtlSeconds = 3600;

  constructor(
    @InjectRepository(AppRelease)
    private readonly releaseRepository: Repository<AppRelease>,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
  ) {}

  /** The channel a request defaults to when none is given — derived from the server env. */
  private defaultChannel(): ReleaseChannel {
    return this.configService.get<string>('NODE_ENV') === 'production' ? 'production' : 'staging';
  }

  /** Register a new published build (called by CI after uploading to S3). */
  async create(dto: CreateAppReleaseDto): Promise<AppRelease> {
    const release = this.releaseRepository.create({
      platform: dto.platform,
      channel: dto.channel ?? this.defaultChannel(),
      version: dto.version,
      build_number: dto.buildNumber,
      version_code: dto.versionCode ?? null,
      storage_key: dto.storageKey,
      file_size: dto.fileSize != null ? String(dto.fileSize) : null,
      notes: dto.notes ?? null,
      is_published: true,
    });
    const saved = await this.releaseRepository.save(release);
    this.logger.log(
      `Registered ${saved.platform}/${saved.channel} release ${saved.version} (build ${saved.build_number})`,
    );
    return saved;
  }

  /** Newest published release for a platform/channel, or null. */
  async findLatest(platform: AppPlatform, channel?: ReleaseChannel): Promise<AppRelease | null> {
    return this.releaseRepository.findOne({
      where: { platform, channel: channel ?? this.defaultChannel(), is_published: true },
      order: { created_at: 'DESC' },
    });
  }

  /** Like findLatest but throws 404 when nothing has been published yet. */
  async getLatestOrThrow(platform: AppPlatform, channel?: ReleaseChannel): Promise<AppRelease> {
    const release = await this.findLatest(platform, channel);
    if (!release) {
      throw new NotFoundException(`No published ${platform} release available`);
    }
    return release;
  }

  /** Fresh presigned S3 URL for the latest artifact (used by the download redirect). */
  async getLatestDownloadUrl(platform: AppPlatform, channel?: ReleaseChannel): Promise<string> {
    const release = await this.getLatestOrThrow(platform, channel);
    return this.s3Service.getPresignedUrl(release.storage_key, this.presignTtlSeconds);
  }

  /** Map an entity to the public response, embedding the stable download link. */
  toResponse(release: AppRelease, baseUrl: string): AppReleaseResponseDto {
    const base = baseUrl.replace(/\/$/, '');
    return {
      platform: release.platform,
      channel: release.channel,
      version: release.version,
      buildNumber: release.build_number,
      versionCode: release.version_code,
      fileSize: release.file_size != null ? Number(release.file_size) : null,
      notes: release.notes,
      publishedAt: release.created_at,
      downloadUrl: `${base}/api/v1/app-releases/latest/download?platform=${release.platform}`,
    };
  }
}
