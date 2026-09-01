import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSettingDto {
  @ApiProperty({
    description: 'Raw string value; coerced/validated against the key value type',
    example: '10',
  })
  @IsString()
  value: string;
}
