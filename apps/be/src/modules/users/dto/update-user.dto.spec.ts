/**
 * UpdateUserDto — field acceptance.
 *
 * The global ValidationPipe runs with `forbidNonWhitelisted: true`, so a field
 * the DTO does not declare is a hard 400, not a silently ignored extra. The web
 * form was renamed to `location_ids` (ADR-052) while the DTO still only accepted
 * `area_ids`, which turned EVERY user create and edit from the web into
 * "property location_ids should not exist" — reported as "cannot change the
 * phone number", though the phone was never involved.
 *
 * Both names are accepted: `location_ids` is the canonical one going forward,
 * `area_ids` stays so existing clients keep working.
 */
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateUserDto } from './update-user.dto';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';

async function validateDto(payload: Record<string, unknown>) {
  const dto = plainToInstance(UpdateUserDto, payload, {
    excludeExtraneousValues: false,
  });
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
}

describe('UpdateUserDto', () => {
  it('accepts location_ids — the name the web sends', async () => {
    const errors = await validateDto({ location_ids: [UUID_A, UUID_B] });
    expect(errors).toHaveLength(0);
  });

  it('still accepts area_ids, so existing clients keep working', async () => {
    const errors = await validateDto({ area_ids: [UUID_A] });
    expect(errors).toHaveLength(0);
  });

  it('accepts the exact payload the web user form submits', async () => {
    // Verbatim shape from UserForm.submitData — this is what 400'd.
    const errors = await validateDto({
      full_name: 'Kastubi',
      username: 'kastubi',
      phone_number: '081246536898',
      role: 'satgas',
      district_id: null,
      region_id: null,
      shift_definition_id: null,
      location_ids: [],
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects a non-UUID in location_ids', async () => {
    const errors = await validateDto({ location_ids: ['not-a-uuid'] });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('normalizes +62 phone input to the local 08 format', async () => {
    const dto = plainToInstance(UpdateUserDto, { phone_number: '+6281246536898' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.phone_number).toBe('081246536898');
  });
});
