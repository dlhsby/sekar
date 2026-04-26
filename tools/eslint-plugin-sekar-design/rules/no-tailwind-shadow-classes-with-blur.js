'use strict';

const FORBIDDEN = /\b(shadow-(?:sm|md|lg|xl|2xl|inner)|drop-shadow(?:-(?:sm|md|lg|xl|2xl))?)\b/;

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid stock Tailwind shadow utilities (which use blur). NB identity is hard-edge — use shadow-nb-{xs,sm,md,lg,xl,hover,active}.',
      url: 'https://sekar.docs/eslint/no-tailwind-shadow-classes-with-blur',
    },
    messages: {
      forbiddenShadow:
        'Tailwind shadow utility `{{cls}}` introduces blur. Use `shadow-nb-*` instead (hard-edge NB invariant, ADR-036).',
    },
    schema: [],
  },
  create(context) {
    function checkClassName(node, raw) {
      const m = raw.match(FORBIDDEN);
      if (m) context.report({ node, messageId: 'forbiddenShadow', data: { cls: m[0] } });
    }
    return {
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier') return;
        if (node.name.name !== 'className' && node.name.name !== 'class') return;
        const v = node.value;
        if (!v) return;
        if (v.type === 'Literal' && typeof v.value === 'string') {
          checkClassName(v, v.value);
        }
        if (v.type === 'JSXExpressionContainer') {
          const expr = v.expression;
          if (expr.type === 'Literal' && typeof expr.value === 'string') {
            checkClassName(expr, expr.value);
          }
          if (expr.type === 'TemplateLiteral') {
            for (const q of expr.quasis) checkClassName(q, q.value.raw);
          }
        }
      },
    };
  },
};
