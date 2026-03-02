import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class RequestRevisionDto {
  @ApiProperty({ description: 'Alasan revisi' })
  @IsString()
  @IsNotEmpty({ message: 'Alasan revisi wajib diisi' })
  @MaxLength(1000)
  reason: string;
}
