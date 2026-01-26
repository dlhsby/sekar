import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for unregistering FCM device token
 */
export class UnregisterTokenDto {
  @ApiProperty({
    description: 'FCM device token to unregister',
    example: 'dGhpcyBpcyBhIHRlc3QgdG9rZW4...',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  fcm_token: string;
}
