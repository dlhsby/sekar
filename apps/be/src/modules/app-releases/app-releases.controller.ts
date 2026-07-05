import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AppReleasesService } from './app-releases.service';
import { CreateAppReleaseDto } from './dto/create-app-release.dto';
import { AppReleaseResponseDto, QueryAppReleaseDto } from './dto/query-app-release.dto';
import type { AppPlatform } from './entities/app-release.entity';
import { PublishTokenGuard } from './guards/publish-token.guard';

/**
 * Mobile app release registry. The two GET routes are intentionally PUBLIC
 * (no JWT guard) so the login page and the /android · /ios pages can read them
 * while logged out. Publishing is restricted to CI via the publish token.
 */
@ApiTags('app-releases')
@Controller('app-releases')
export class AppReleasesController {
  constructor(private readonly appReleasesService: AppReleasesService) {}

  private resolvePlatform(query: QueryAppReleaseDto): AppPlatform {
    return query.platform ?? 'android';
  }

  @Get('latest')
  @ApiOperation({ summary: 'Latest published mobile release (public)' })
  @ApiResponse({ status: 200, description: 'Latest release metadata + download link' })
  @ApiResponse({ status: 404, description: 'No release published for this platform yet' })
  async getLatest(
    @Query() query: QueryAppReleaseDto,
    @Req() req: Request,
  ): Promise<AppReleaseResponseDto> {
    const release = await this.appReleasesService.getLatestOrThrow(
      this.resolvePlatform(query),
      query.channel,
    );
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.appReleasesService.toResponse(release, baseUrl);
  }

  @Get('latest/download')
  @ApiOperation({ summary: 'Redirect to the signed download URL for the latest release (public)' })
  @ApiResponse({ status: 302, description: 'Redirect to a presigned S3 URL' })
  @ApiResponse({ status: 404, description: 'No release published for this platform yet' })
  async downloadLatest(@Query() query: QueryAppReleaseDto, @Res() res: Response): Promise<void> {
    const url = await this.appReleasesService.getLatestDownloadUrl(
      this.resolvePlatform(query),
      query.channel,
    );
    res.redirect(HttpStatus.FOUND, url);
  }

  @Post()
  @UseGuards(PublishTokenGuard)
  @ApiSecurity('publish-token')
  @ApiOperation({ summary: 'Register a new release (CI only — X-Publish-Token)' })
  @ApiResponse({ status: 201, description: 'Release registered' })
  @ApiResponse({ status: 401, description: 'Missing/invalid publish token' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateAppReleaseDto,
    @Req() req: Request,
  ): Promise<AppReleaseResponseDto> {
    const release = await this.appReleasesService.create(dto);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.appReleasesService.toResponse(release, baseUrl);
  }
}
