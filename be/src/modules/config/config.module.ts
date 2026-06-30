import { Module } from '@nestjs/common';
import { ConfigController } from './config.controller';

/**
 * Runtime client-config module. Exposes maps API keys to the authenticated
 * web client (Google Maps + Mapbox) so keys are served at runtime, not baked
 * into the build. No providers — keys come from process.env.
 */
@Module({
  controllers: [ConfigController],
})
export class ConfigModule {}
