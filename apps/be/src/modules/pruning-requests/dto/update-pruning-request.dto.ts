import { IsString, IsOptional, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating editable fields on a pruning request.
 *
 * Restricted to non-workflow fields:
 * - address, notes, tree details, contact information
 *
 * NOT editable:
 * - status (use review/cancel/assign-to-task endpoints)
 * - GPS coordinates (audit trail)
 * - photos (immutable)
 * - workflow timestamps (submittedAt, reviewedAt, etc.)
 * - reference code, submitted by, etc. (audit)
 *
 * Used by admin_data, kepala_rayon, top_management, admin_system, and superadmin.
 */
export class UpdatePruningRequestDto {
  @ApiPropertyOptional({
    description: 'Physical address of the pruning site',
    example: 'Jalan Darmo No. 123, Surabaya',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MinLength(5)
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({
    description: 'Additional notes or details',
    example: 'Updated: now includes access gate code',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Number of trees to prune at this location',
    example: 5,
  })
  @IsOptional()
  treeCount?: number;

  @ApiPropertyOptional({
    description: 'Free-text estimate of tree height (e.g., "5-7 meter")',
    example: '5-7 meter',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  treeHeightEstimate?: string;

  @ApiPropertyOptional({
    description: 'Free-text estimate of trunk diameter (e.g., "30-50 cm")',
    example: '30-50 cm',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  treeDiameterEstimate?: string;

  @ApiPropertyOptional({
    description: 'Requester contact name',
    example: 'Budi Santoso',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  requesterName?: string;

  @ApiPropertyOptional({
    description: 'Requester contact phone',
    example: '081234567890',
    maxLength: 30,
  })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  requesterPhone?: string;

  @ApiPropertyOptional({
    description: 'RT (neighborhood) leader contact name',
    example: 'Pak Joko',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  rtLeaderName?: string;

  @ApiPropertyOptional({
    description: 'RT (neighborhood) leader contact phone',
    example: '081298765432',
    maxLength: 30,
  })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  rtLeaderPhone?: string;
}
