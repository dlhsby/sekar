import { validate } from 'class-validator';
import { IsNotInlineMedia } from './is-not-inline-media.validator';

class Holder {
  @IsNotInlineMedia()
  photos!: string[];
}

class Single {
  @IsNotInlineMedia()
  photo!: string;
}

async function errorsFor(value: unknown): Promise<number> {
  const h = new Holder();
  h.photos = value as string[];
  const res = await validate(h);
  return res.length;
}

describe('IsNotInlineMedia', () => {
  it('accepts storage keys and http(s) URLs', async () => {
    expect(
      await errorsFor([
        'sekar-media/2026/07/24/activities/abc.jpg',
        'https://sekar-media-staging.s3.ap-southeast-3.amazonaws.com/x.jpg',
        'http://localhost:9000/sekar-media-dev/y.png',
      ]),
    ).toBe(0);
  });

  it('rejects a data: URI anywhere in the array', async () => {
    expect(await errorsFor(['https://ok/x.jpg', 'data:image/jpeg;base64,AAAA'])).toBe(1);
  });

  it('rejects a blob: URI and is case/whitespace insensitive', async () => {
    expect(await errorsFor([' DATA:image/png;base64,BB'])).toBe(1);
    expect(await errorsFor(['blob:http://x/123'])).toBe(1);
  });

  it('works on a single string field too', async () => {
    const s = new Single();
    s.photo = 'data:image/jpeg;base64,AAAA';
    expect((await validate(s)).length).toBe(1);
    s.photo = 'sekar-media/x.jpg';
    expect((await validate(s)).length).toBe(0);
  });

  it('passes empty/undefined (presence is other validators’ job)', async () => {
    expect(await errorsFor([])).toBe(0);
    expect(await errorsFor(undefined)).toBe(0);
  });
});
