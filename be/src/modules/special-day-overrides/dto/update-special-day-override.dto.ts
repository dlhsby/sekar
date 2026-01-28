import { PartialType } from '@nestjs/swagger';
import { CreateSpecialDayOverrideDto } from './create-special-day-override.dto';

export class UpdateSpecialDayOverrideDto extends PartialType(CreateSpecialDayOverrideDto) {}
