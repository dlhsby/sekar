'use strict';

const HEX_RE = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid inline hex color literals. Tokens come from generated/ files produced by scripts/build-tokens.ts (ADR-036).',
      url: 'https://sekar.docs/eslint/no-inline-hex-colors',
    },
    messages: {
      inlineHex:
        'Inline hex literal `{{hex}}` is forbidden. Use a design token from generated/ (web: var(--color-nb-*); mobile: nbColors.*). See ADR-036.',
    },
    schema: [],
  },
  create(context) {
    function reportIfHex(node, raw) {
      const m = raw.match(HEX_RE);
      if (m) {
        context.report({ node, messageId: 'inlineHex', data: { hex: m[0] } });
      }
    }
    return {
      Literal(node) {
        if (typeof node.value !== 'string') return;
        reportIfHex(node, node.value);
      },
      TemplateElement(node) {
        reportIfHex(node, node.value.raw);
      },
    };
  },
};
