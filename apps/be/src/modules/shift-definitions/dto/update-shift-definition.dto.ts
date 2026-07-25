import { PartialType } from '@nestjs/swagger';
import { CreateShiftDefinitionDto } from './create-shift-definition.dto';

/**
 * Update a shift definition — every field optional (ADR-055). Name/code stay
 * unique; times keep their format; the attribution window stays ≥ 0.
 */
export class UpdateShiftDefinitionDto extends PartialType(CreateShiftDefinitionDto) {}
