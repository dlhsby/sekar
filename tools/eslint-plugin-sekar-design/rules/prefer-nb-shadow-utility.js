'use strict';

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid raw box-shadow / boxShadow literals in component source. Use NB shadow utilities backed by generated tokens.',
      url: 'https://sekar.docs/eslint/prefer-nb-shadow-utility',
    },
    messages: {
      rawBoxShadow:
        'Raw {{kind}} literal is forbidden. Use shadow-nb-* utility (web) or nbShadow(level) helper (mobile).',
    },
    schema: [],
  },
  create(context) {
    return {
      Property(node) {
        const k = node.key;
        if (k.type === 'Identifier' && k.name === 'boxShadow') {
          context.report({ node, messageId: 'rawBoxShadow', data: { kind: 'boxShadow' } });
        } else if (k.type === 'Literal' && k.value === 'box-shadow') {
          context.report({ node, messageId: 'rawBoxShadow', data: { kind: 'box-shadow' } });
        }
      },
    };
  },
};
