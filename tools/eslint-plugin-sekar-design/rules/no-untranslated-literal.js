'use strict';

/**
 * no-untranslated-literal
 *
 * Enforces the i18n mandate (CLAUDE.md §Internationalization): user-facing UI
 * strings must go through `t()` / `i18n.t()`, never be hardcoded. Flags:
 *   - JSX text nodes containing human-readable words, and
 *   - string literals passed to display-oriented JSX attributes
 *     (label, placeholder, title, aria-label, accessibilityLabel, alt, …).
 *
 * Deliberately conservative to avoid false positives: only plain string literals
 * (an attribute written as `{t('…')}` is an expression, not a Literal, so it is
 * never flagged), only text that contains a lowercase letter, and never
 * identifiers/enum values, URLs/paths, icon names, or date-format tokens.
 *
 * Fix by moving the string to `locales/{id,en}/<ns>.json` and using
 * `t('<ns>:<key>')`. For a rare genuine non-UI literal, add an inline
 * `// eslint-disable-next-line sekar-design/no-untranslated-literal` with a reason,
 * or scope it off in the eslint config (see the allowlist blocks).
 */

// Attributes whose string value is rendered to the user.
const UI_ATTRS = new Set([
  'label',
  'placeholder',
  'title',
  'description',
  'subtitle',
  'header',
  'heading',
  'message',
  'body',
  'text',
  'helperText',
  'emptyText',
  'emptyTitle',
  'emptyDescription',
  'ctaLabel',
  'confirmLabel',
  'cancelLabel',
  'submitText',
  'submitLabel',
  'tooltip',
  'alt',
  'aria-label',
  'accessibilityLabel',
  'accessibilityHint',
]);

// A "word" of ≥2 letters that contains a lowercase letter — the signal for human copy.
const HUMAN_WORD = /[A-Za-z]*[a-z][A-Za-z]/;

// Brand / proper nouns that read identically in every language — never localized.
const BRAND = new Set([
  'WhatsApp',
  'SEKAR',
  'Google',
  'Google Play',
  'App Store',
  'Android',
  'iOS',
  'Adminer',
  'MinIO',
]);

/** True when `s` looks like user-facing copy (vs an identifier / url / format token). */
function isHumanText(s) {
  const t = s.trim();
  if (t.length < 3) return false;
  if (BRAND.has(t)) return false;
  if (!HUMAN_WORD.test(t)) return false; // no lowercase-bearing word → enum/const/brand
  // URLs, paths, mime-ish, template/format tokens
  if (/[/\\]|:\/\//.test(t)) return false;
  if (t.startsWith('@') || t.startsWith('#') || t.startsWith('.')) return false;
  // date/time or numeric format patterns (e.g. dd/MM/yyyy, HH:mm) — already excluded by the
  // slash test, but also catch dot/space variants
  if (/^[dDmMyYhHsS0-9:.\-\s]+$/.test(t)) return false;
  // a single identifier-ish token: camelCase, snake_case, kebab-case, dotted key
  if (!/\s/.test(t) && /^[a-zA-Z0-9]+([._-][a-zA-Z0-9]+)*$/.test(t) && !/[A-Z][a-z]+[A-Z]?/.test(t.replace(/[._-].*/, ''))) {
    // no whitespace + identifier shape → treat single lowercase/camel tokens as code,
    // but still flag a lone capitalized real word like "Simpan"
    if (!/^[A-Z][a-z]{2,}$/.test(t)) return false;
  }
  return true;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Forbid hardcoded user-facing UI strings; use react-i18next t()/i18n.t() with id/en keys (CLAUDE.md §Internationalization).',
      url: 'https://sekar.docs/eslint/no-untranslated-literal',
    },
    messages: {
      jsxText:
        'Hardcoded UI text "{{text}}". Localize it: use t(\'<ns>:<key>\') and add the key to locales/{id,en}. See CLAUDE.md §Internationalization.',
      attr:
        'Hardcoded UI string in `{{attr}}`="{{text}}". Localize it: `{{attr}}={t(\'<ns>:<key>\')}` and add the key to locales/{id,en}.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreAttributes: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const opts = context.options[0] || {};
    const ignore = new Set(opts.ignoreAttributes || []);

    function short(s) {
      const t = s.trim().replace(/\s+/g, ' ');
      return t.length > 40 ? t.slice(0, 40) + '…' : t;
    }

    // JSXText inside <Trans>…</Trans> is the i18n fallback copy, not hardcoded text.
    function insideTrans(node) {
      for (let p = node.parent; p; p = p.parent) {
        if (
          p.type === 'JSXElement' &&
          p.openingElement &&
          p.openingElement.name &&
          p.openingElement.name.name === 'Trans'
        ) {
          return true;
        }
      }
      return false;
    }

    return {
      JSXText(node) {
        const raw = node.value;
        if (isHumanText(raw) && !insideTrans(node)) {
          context.report({ node, messageId: 'jsxText', data: { text: short(raw) } });
        }
      },
      JSXAttribute(node) {
        const name = node.name && node.name.name;
        if (typeof name !== 'string' || !UI_ATTRS.has(name) || ignore.has(name)) return;
        const v = node.value;
        // Only plain string literals — `{t('…')}` / `{expr}` are JSXExpressionContainer, skip.
        if (v && v.type === 'Literal' && typeof v.value === 'string' && isHumanText(v.value)) {
          context.report({ node: v, messageId: 'attr', data: { attr: name, text: short(v.value) } });
        }
      },
    };
  },
};
