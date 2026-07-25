import { PartialType } from '@nestjs/swagger';
import { CreateShiftDefinitionDto } from './create-shift-definition.dto';

/**
 * Update a shift definition — every field optional (ADR-055). The name stays
 * unique; times keep their format; the attribution/reminder windows stay ≥ 0.
 */
export class UpdateShiftDefinitionDto extends PartialType(CreateShiftDefinitionDto) {}
