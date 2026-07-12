import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateLocationDto } from './create-location.dto';

/**
 * DTO for updating an existing area
 *
 * All fields are optional. Cannot update location_type_id (must delete and recreate).
 */
export class UpdateLocationDto extends PartialType(
  OmitType(CreateLocationDto, ['location_type_id'] as const),
) {}
