import { BadRequestException } from '@nestjs/common';
import { ScheduleIdPipe } from './schedule-id.pipe';

describe('ScheduleIdPipe', () => {
  const pipe = new ScheduleIdPipe();

  it('accepts a row uuid', () => {
    const id = '526f882d-d82b-4966-b720-929ee4e0a9d3';
    expect(pipe.transform(id)).toBe(id);
  });

  // The reason `ParseUUIDPipe` cannot be used on these routes: a projected
  // occurrence has no row, and its synthetic key is the only way to tombstone it.
  it('accepts a projected occurrence key', () => {
    const id =
      'projected:5e610665-359e-4e21-b2cc-85bc1991d20e:7cef2fae-f9c0-52f4-b657-ad5f60e79d86:2026-11-15';
    expect(pipe.transform(id)).toBe(id);
  });

  // Unvalidated, these reached Postgres and came back as `22P02 invalid input
  // syntax for type uuid` — reported to the caller as a 500.
  it.each([
    ['not-an-id'],
    ['NONE'],
    ['projected:nope'],
    [
      'projected:5e610665-359e-4e21-b2cc-85bc1991d20e:7cef2fae-f9c0-52f4-b657-ad5f60e79d86:15-11-2026',
    ],
    [''],
  ])('rejects %s with 400, not a database error', (bad) => {
    expect(() => pipe.transform(bad)).toThrow(BadRequestException);
  });
});
