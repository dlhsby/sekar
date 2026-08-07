import { mockedLocationAllowed } from './integrity-overrides';

describe('mockedLocationAllowed', () => {
  it('allows mocked fixes when the flag is set outside production', () => {
    expect(mockedLocationAllowed({ NODE_ENV: 'development', ALLOW_MOCKED_LOCATION: 'true' })).toBe(
      true,
    );
  });

  it('allows mocked fixes in test environments too', () => {
    expect(mockedLocationAllowed({ NODE_ENV: 'test', ALLOW_MOCKED_LOCATION: 'true' })).toBe(true);
  });

  // The whole point of the second gate: a production deployment that somehow
  // acquires the flag must still enforce. Misconfiguration must not be able to
  // disable anti-spoofing on the live system.
  it('refuses in production even when the flag is set', () => {
    expect(mockedLocationAllowed({ NODE_ENV: 'production', ALLOW_MOCKED_LOCATION: 'true' })).toBe(
      false,
    );
  });

  it('is off when the flag is absent', () => {
    expect(mockedLocationAllowed({ NODE_ENV: 'development' })).toBe(false);
  });

  // Fails closed on anything that is not exactly "true" — a typo must not be
  // read as consent.
  it.each(['TRUE', 'True', '1', 'yes', '', ' true'])('is off for %p', (value) => {
    expect(mockedLocationAllowed({ NODE_ENV: 'development', ALLOW_MOCKED_LOCATION: value })).toBe(
      false,
    );
  });

  it('is off when NODE_ENV is unset and the flag is unset', () => {
    expect(mockedLocationAllowed({})).toBe(false);
  });
});
