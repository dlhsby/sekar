import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsDateString, MaxLength, IsIn } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export const AUDIT_OUTCOMES = ['success', 'denied', 'failed'] as const;

export class AuditFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by entity type (e.g. district, user)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  entity_type?: string;

  @ApiPropertyOptional({ description: 'Filter by a single entity id' })
  @IsOptional()
  @IsUUID()
  entity_id?: string;

  @ApiPropertyOptional({ description: 'Filter by action (create, update, delete, restore, …)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  action?: string;

  @ApiPropertyOptional({ description: 'Filter by actor ID' })
  @IsOptional()
  @IsUUID()
  actor_id?: string;

  @ApiPropertyOptional({ description: 'Filter by the actor role at the time of the action' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  actor_role?: string;

  @ApiPropertyOptional({ enum: AUDIT_OUTCOMES })
  @IsOptional()
  @IsIn(AUDIT_OUTCOMES)
  outcome?: (typeof AUDIT_OUTCOMES)[number];

  @ApiPropertyOptional({ description: 'Free-text search on entity label and actor name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ description: 'Filter from date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from_date?: string;

  @ApiPropertyOptional({ description: 'Filter to date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  to_date?: string;
}
