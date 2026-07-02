import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AssignAreasDto } from './assign-areas.dto';

describe('AssignAreasDto', () => {
  const build = (area_ids: unknown) => plainToInstance(AssignAreasDto, { area_ids });

  it('accepts deterministic v5 area ids (the shape every seeded area uses)', async () => {
    // e.g. Taman 10 Nopember — minted as UUID v5 from `rayon:name`.
    const dto = build(['80a29989-f5cf-55bd-9386-86338b413bfc']);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts v4 area ids too', async () => {
    const dto = build(['12f49a74-1d1a-4cf7-b74e-b36ef5eea718']);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects non-uuid values', async () => {
    const dto = build(['not-a-uuid']);
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('rejects an empty array', async () => {
    const dto = build([]);
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
