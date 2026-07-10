import { IsString, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateTeamTypeDto {
  @ApiProperty({ example: 'Penyulaman' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;
}

export class UpdateTeamTypeDto extends PartialType(CreateTeamTypeDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
