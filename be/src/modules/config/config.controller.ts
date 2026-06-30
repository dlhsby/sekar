import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/** Client-facing maps configuration (keys served at runtime, not baked). */
export interface MapsConfigDto {
  /** Google Maps JS API key (browser/referer-restricted) — null when unset. */
  googleMapsApiKey: string | null;
  /** Mapbox public token — null when unset. */
  mapboxToken: string | null;
}

/**
 * Runtime client config. Serves the maps API keys to the authenticated web
 * client so they aren't baked at build time (per ADR: maps key from backend).
 * Google Maps JS keys are browser/referer-restricted, so exposing to a logged-in
 * client is safe.
 */
@ApiTags('config')
@ApiBearerAuth('JWT-auth')
@Controller('config')
@UseGuards(JwtAuthGuard)
export class ConfigController {
  @Get('maps')
  @ApiOperation({ summary: 'Maps API keys for the web client (Google Maps + Mapbox)' })
  @ApiResponse({ status: 200, description: 'Maps config' })
  getMapsConfig(): MapsConfigDto {
    return {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || null,
      mapboxToken: process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || null,
    };
  }
}
