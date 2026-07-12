import { encryptSecret, decryptSecret, encryptionAvailable } from './settings-encryption';

describe('settings-encryption (AES-256-GCM)', () => {
  const KEY = Buffer.alloc(32, 7).toString('base64');
  let prev: string | undefined;

  beforeAll(() => {
    prev = process.env.SETTINGS_ENCRYPTION_KEY;
  });
  afterAll(() => {
    if (prev === undefined) delete process.env.SETTINGS_ENCRYPTION_KEY;
    else process.env.SETTINGS_ENCRYPTION_KEY = prev;
  });

  it('reports availability based on a valid 32-byte key', () => {
    process.env.SETTINGS_ENCRYPTION_KEY = KEY;
    expect(encryptionAvailable()).toBe(true);
    process.env.SETTINGS_ENCRYPTION_KEY = 'too-short';
    expect(encryptionAvailable()).toBe(false);
    delete process.env.SETTINGS_ENCRYPTION_KEY;
    expect(encryptionAvailable()).toBe(false);
  });

  it('round-trips a secret and produces iv:tag:ciphertext', () => {
    process.env.SETTINGS_ENCRYPTION_KEY = KEY;
    const enc = encryptSecret('AIzaSy-super-secret');
    expect(enc.split(':')).toHaveLength(3);
    expect(enc).not.toContain('AIzaSy-super-secret');
    expect(decryptSecret(enc)).toBe('AIzaSy-super-secret');
  });

  it('throws when no key is configured', () => {
    delete process.env.SETTINGS_ENCRYPTION_KEY;
    expect(() => encryptSecret('x')).toThrow();
  });
});
