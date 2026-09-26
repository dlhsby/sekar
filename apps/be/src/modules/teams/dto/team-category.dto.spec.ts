import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { CreateTeamCategoryDto, UpdateTeamCategoryDto } from './team-category.dto';

/**
 * Runs the DTOs through the same ValidationPipe options as main.ts. Service
 * specs bypass the pipe, which is how "the web sends is_active on create"
 * shipped as a 400 on every Kategori Tim create without any test noticing.
 */
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

const validate = (metatype: unknown, value: unknown) =>
  pipe.transform(value, { type: 'body', metatype: metatype as never });

describe('Team category DTOs (global ValidationPipe)', () => {
  // Exactly what TeamCategoryFormModal submits on create.
  const webCreatePayload = {
    name: 'Penyiraman',
    marker_color: '#22C55E',
    marker_opacity: 0.8,
    marker_icon: 'droplets',
    is_active: true,
  };

  it('accepts the web create payload including is_active', async () => {
    await expect(validate(CreateTeamCategoryDto, webCreatePayload)).resolves.toMatchObject(
      webCreatePayload,
    );
  });

  it('accepts a partial update', async () => {
    await expect(validate(UpdateTeamCategoryDto, { is_active: false })).resolves.toMatchObject({
      is_active: false,
    });
  });

  it.each([
    ['a one-character name', { name: 'P' }],
    ['a partial hex colour', { name: 'Penyiraman', marker_color: '#12' }],
    ['an unknown field', { name: 'Penyiraman', team_type: 'x' }],
  ])('rejects %s', async (_label, payload) => {
    await expect(validate(CreateTeamCategoryDto, payload)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
