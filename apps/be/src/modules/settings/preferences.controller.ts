import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';

interface PreferencesView {
  theme: string | null;
  language: string | null;
}

/**
 * Personal preferences (ADR-049) — self-service for any authenticated user.
 * No special permission; a user only ever edits their own theme + language.
 */
@ApiTags('preferences')
@ApiBearerAuth('JWT-auth')
@Controller('me')
@UseGuards(JwtAuthGuard)
export class PreferencesController {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @Get('preferences')
  @ApiOperation({ summary: 'Get my theme + language preferences' })
  @ApiResponse({ status: 200, description: 'Preferences' })
  get(@GetUser() user: User): PreferencesView {
    return { theme: user.preference_theme ?? null, language: user.preferred_language ?? null };
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update my theme + language preferences' })
  @ApiResponse({ status: 200, description: 'Updated preferences' })
  async update(@GetUser() user: User, @Body() dto: UpdatePreferencesDto): Promise<PreferencesView> {
    const patch: Partial<User> = {};
    if (dto.theme !== undefined) patch.preference_theme = dto.theme;
    if (dto.language !== undefined) patch.preferred_language = dto.language;
    if (Object.keys(patch).length > 0) {
      await this.userRepo.update({ id: user.id }, patch);
    }
    return {
      theme: patch.preference_theme ?? user.preference_theme ?? null,
      language: patch.preferred_language ?? user.preferred_language ?? null,
    };
  }
}
