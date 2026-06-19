import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '../../shared/shared.module';
import { AppReleasesController } from './app-releases.controller';
import { AppReleasesService } from './app-releases.service';
import { AppRelease } from './entities/app-release.entity';
import { PublishTokenGuard } from './guards/publish-token.guard';

/**
 * Mobile app release registry — backs the dynamic "Download the SEKAR app
 * (vX.Y.Z)" links on web (login + dashboard + public /android · /ios pages).
 * SharedModule provides S3Service for presigned download URLs.
 */
@Module({
  imports: [TypeOrmModule.forFeature([AppRelease]), SharedModule, ConfigModule],
  controllers: [AppReleasesController],
  providers: [AppReleasesService, PublishTokenGuard],
  exports: [AppReleasesService],
})
export class AppReleasesModule {}
