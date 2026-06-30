import { PartialType } from '@nestjs/swagger';
import { CreateRayonDto } from './create-rayon.dto';

/**
 * Data Transfer Object for updating an existing rayon.
 * All fields optional (name, description, color, center_lat, center_lng).
 */
export class UpdateRayonDto extends PartialType(CreateRayonDto) {}
