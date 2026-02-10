import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectOvertimeDto {
  @ApiProperty({
    description: 'Reason for rejection',
    example: 'Overtime not pre-approved',
  })
  @IsString()
  @IsNotEmpty({ message: 'Rejection reason is required' })
  reason: string;
}
