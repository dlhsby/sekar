'use strict';

/**
 * Forbid text/icon colours that cannot meet WCAG 2.1 AA on the surfaces this app
 * actually paints.
 *
 * Measured against the app's real backgrounds (white #FFFFFF, gray-50 #FAFAF9,
 * gray-100 #F5F5F4):
 *
 *   text-nb-gray-300  1.49 : 1   — fails even the 3:1 non-text bar
 *   text-nb-gray-400  2.52 : 1   — fails 4.5:1 (text) AND 3:1 (icons/graphics)
 *   text-nb-gray-500  4.80 : 1   — passes on white and gray-50
 *   text-nb-gray-600  7.63 : 1   — passes everywhere
 *
 * 54 `text-nb-gray-400` usages were swept out of `apps/web` at once; without a
 * rule the next one just reappears, since nothing about the class name says it
 * is unreadable. This is the guard for that sweep.
 *
 * Scope note: only the FOREGROUND utilities are forbidden. `bg-nb-gray-400`,
 * `border-nb-gray-400` and friends are fine — contrast rules govern text and
 * meaningful graphics, not decorative fills.
 *
 * `disabled:` variants are also allowed: WCAG 1.4.3 and 1.4.11 both exempt
 * INACTIVE controls, and forcing a disabled input darker would make it look
 * enabled — the opposite of the affordance it needs to give.
 */

/** Strip `disabled:`-variant occurrences before testing; see the note above. */
const DISABLED_VARIANT = /(?:[\w-]+:)*disabled:text-nb-gray-\d+/g;
const FORBIDDEN = /\btext-nb-gray-(300|400)\b/;

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid text-nb-gray-300/400 as a foreground colour: both fail WCAG 2.1 AA on every surface this app paints. Use text-nb-gray-500 or darker.',
      url: 'https://sekar.docs/eslint/no-low-contrast-text',
    },
    messages: {
      lowContrast:
        '`{{cls}}` fails WCAG AA as a foreground colour ({{ratio}} on white; 4.5:1 is required for text and 3:1 for icons). Use `text-nb-gray-500` (4.80:1) or darker.',
    },
    schema: [],
  },
  create(context) {
    const RATIOS = { 300: '1.49:1', 400: '2.52:1' };

    function check(node, raw) {
      const m = raw.replace(DISABLED_VARIANT, '').match(FORBIDDEN);
      if (m) {
        context.report({
          node,
          messageId: 'lowContrast',
          data: { cls: m[0], ratio: RATIOS[m[1]] },
        });
      }
    }

    return {
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier') return;
        if (node.name.name !== 'className' && node.name.name !== 'class') return;
        const v = node.value;
        if (!v) return;
        if (v.type === 'Literal' && typeof v.value === 'string') {
          check(v, v.value);
        }
        if (v.type === 'JSXExpressionContainer') {
          const expr = v.expression;
          if (expr.type === 'Literal' && typeof expr.value === 'string') {
            check(expr, expr.value);
          }
          if (expr.type === 'TemplateLiteral') {
            for (const q of expr.quasis) check(q, q.value.raw);
          }
          // `cn('text-nb-gray-400', cond && '...')` — the common shape here, and
          // the one a JSXAttribute-only walk would miss entirely.
          if (expr.type === 'CallExpression') {
            for (const arg of expr.arguments) {
              if (arg.type === 'Literal' && typeof arg.value === 'string') check(arg, arg.value);
              if (arg.type === 'TemplateLiteral') {
                for (const q of arg.quasis) check(q, q.value.raw);
              }
              if (arg.type === 'LogicalExpression' || arg.type === 'ConditionalExpression') {
                for (const side of [arg.right, arg.consequent, arg.alternate]) {
                  if (side && side.type === 'Literal' && typeof side.value === 'string') {
                    check(side, side.value);
                  }
                }
              }
            }
          }
        }
      },
    };
  },
};
