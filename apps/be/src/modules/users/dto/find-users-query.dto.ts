import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/**
 * Query params for `GET /users` — pagination plus optional server-side filters
 * (name/username search + role narrowing). Extends PaginationDto so the global
 * whitelist ValidationPipe accepts these fields.
 */
export class FindUsersQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by name or username (ILIKE)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Comma-separated role codes' })
  @IsOptional()
  @IsString()
  roles?: string;

  @ApiPropertyOptional({ description: 'Single role code' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({
    description:
      'Only active (`true`) or only deactivated (`false`) accounts. Omit for both — ' +
      'assignment pickers (scheduling, tasks) pass `true`, the admin grid omits it.',
  })
  @IsOptional()
  @IsBooleanString()
  is_active?: string;
}
