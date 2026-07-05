import { Module } from '@nestjs/common';
import { ConfigController } from './config.controller';

/**
 * Runtime client-config module. Exposes the Google Maps API key to the
 * authenticated web client so it's served at runtime, not baked into the build.
 * No providers — the key comes from process.env.
 */
@Module({
  controllers: [ConfigController],
})
export class ConfigModule {}
