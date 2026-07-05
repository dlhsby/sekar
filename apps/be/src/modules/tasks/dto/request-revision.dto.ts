import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class RequestRevisionDto {
  @ApiProperty({ description: 'Alasan revisi' })
  @IsString()
  @IsNotEmpty({ message: 'Revision reason is required' })
  @MaxLength(1000)
  reason: string;
}
