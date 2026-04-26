'use strict';

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'React Native: forbid shadowRadius > 0 (NB stamp invariant — all shadows are hard-edge, radius 0). Use nbShadow().',
      url: 'https://sekar.docs/eslint/rn-no-shadow-radius',
    },
    messages: {
      nonZeroRadius:
        'shadowRadius must be 0 (hard-edge NB invariant). Use nbShadow(level) from generated tokens.',
    },
    schema: [],
  },
  create(context) {
    return {
      Property(node) {
        const k = node.key;
        const isShadowRadiusKey =
          (k.type === 'Identifier' && k.name === 'shadowRadius') ||
          (k.type === 'Literal' && k.value === 'shadowRadius');
        if (!isShadowRadiusKey) return;
        const v = node.value;
        if (v.type === 'Literal' && typeof v.value === 'number' && v.value > 0) {
          context.report({ node, messageId: 'nonZeroRadius' });
        }
      },
    };
  },
};
