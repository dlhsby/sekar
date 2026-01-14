import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateAreaDto } from './create-area.dto';

/**
 * DTO for updating an existing area
 *
 * All fields are optional. Cannot update area_type_id (must delete and recreate).
 */
export class UpdateAreaDto extends PartialType(
  OmitType(CreateAreaDto, ['area_type_id'] as const),
) {}
