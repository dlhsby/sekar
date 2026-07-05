import { generateTempPassword } from './password.util';

describe('generateTempPassword', () => {
  it('returns a dash-grouped string at/above the minimum length', () => {
    const pw = generateTempPassword();
    expect(pw).toContain('-');
    expect(pw.replace('-', '').length).toBeGreaterThanOrEqual(8);
  });

  it('excludes visually ambiguous characters (0 O 1 l I)', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateTempPassword(16)).not.toMatch(/[0O1lI]/);
    }
  });

  it('produces different values on successive calls', () => {
    const set = new Set(Array.from({ length: 25 }, () => generateTempPassword()));
    expect(set.size).toBeGreaterThan(20);
  });

  it('honours a requested length (min 8 enforced)', () => {
    expect(generateTempPassword(4).replace('-', '').length).toBe(8);
    expect(generateTempPassword(14).replace('-', '').length).toBe(14);
  });
});
