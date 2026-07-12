import { PartialType } from '@nestjs/swagger';
import { CreateRoleDto } from './create-role.dto';

/**
 * All fields optional. `code` and `is_system` are never editable via the API —
 * `code` is immutable (JWT + guards reference it) and `is_system` is set by the
 * seeder.
 */
export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
