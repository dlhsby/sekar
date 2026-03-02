import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class DeclineTaskDto {
  @ApiProperty({ description: 'Alasan penolakan tugas' })
  @IsString()
  @IsNotEmpty({ message: 'Alasan penolakan wajib diisi' })
  @MaxLength(1000)
  reason: string;
}
