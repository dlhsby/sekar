import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class ForceDeleteDto {
  @ApiProperty({
    description: 'The record name typed by the operator (users: username) — must match exactly',
    example: 'Rayon Timur',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  confirm_name: string;

  @ApiProperty({
    description: 'Why this in-use record is being deleted — stored on the audit trail',
    example: 'Rayon digabung ke Rayon Timur 2 per SK Kepala Dinas',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({
    description: 'Role / location type to move dependants to (required when any exist)',
  })
  @IsOptional()
  @IsUUID()
  replacement_id?: string;
}
