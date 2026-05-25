import { emitWebCss, emitMobileTs, loadAndValidate } from './build-tokens';

describe('scripts/build-tokens', () => {
  const tokens = loadAndValidate();

  describe('schema validation', () => {
    it('validates the canonical specs/ui-ux/tokens.json', () => {
      expect(tokens._meta.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('rejects malformed input', () => {
      const ajv = require('ajv/dist/2020.js').default;
      const addFormats = require('ajv-formats').default;
      const schema = require('../specs/ui-ux/tokens.schema.json');
      const v = new ajv({ allErrors: true, strict: false });
      addFormats(v);
      const validate = v.compile(schema);
      // Missing required `_meta` group
      expect(validate({ color: {} })).toBe(false);
    });
  });

  describe('emitWebCss', () => {
    const css = emitWebCss(tokens);

    it('starts with banner and :root block', () => {
      expect(css).toMatch(/^\/\*\n \* GENERATED FILE/);
      expect(css).toContain(':root {');
    });

    it('emits canonical primary color from tokens.json', () => {
      expect(css).toContain('--color-nb-primary: #7FBC8C;');
    });

    it('emits hard-edge shadow utilities (zero blur)', () => {
      expect(css).toContain('--shadow-nb-md: 4px 4px 0 #1C1917;');
    });

    it('terminates with newline (LF)', () => {
      expect(css.endsWith('\n')).toBe(true);
      expect(css).not.toMatch(/\r/);
    });

    it('is deterministic across re-runs', () => {
      expect(emitWebCss(tokens)).toBe(css);
    });

    it('sorts keys alphabetically (deterministic ordering)', () => {
      // primary appears before secondary alphabetically
      const idxPrimary = css.indexOf('--color-nb-primary:');
      const idxSecondary = css.indexOf('--color-nb-secondary:');
      expect(idxPrimary).toBeGreaterThan(-1);
      expect(idxSecondary).toBeGreaterThan(-1);
      expect(idxPrimary).toBeLessThan(idxSecondary);
    });
  });

  describe('emitMobileTs', () => {
    const ts = emitMobileTs(tokens);

    it('starts with banner and react-native import', () => {
      expect(ts).toMatch(/^\/\*\*\n \* GENERATED FILE/);
      expect(ts).toContain(`import type { ViewStyle } from 'react-native';`);
    });

    it('emits canonical primary color from tokens.json', () => {
      expect(ts).toContain(`primary: "#7FBC8C"`);
    });

    it('emits hard-edge shadows with shadowRadius: 0 and shadowOpacity: 1', () => {
      expect(ts).toContain('shadowRadius: 0');
      expect(ts).toContain('shadowOpacity: 1');
    });

    it('exports nbTokens aggregate', () => {
      expect(ts).toContain('export const nbTokens = {');
      expect(ts).toContain('colors: nbColors');
    });

    it('is deterministic across re-runs', () => {
      expect(emitMobileTs(tokens)).toBe(ts);
    });
  });
});
