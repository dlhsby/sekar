/**
 * no-i18n-literal-fallback
 *
 * Forbids the literal default-value argument on a translation call:
 *
 *   t('common:actions.remove', 'Remove')   // ✗
 *   t('common:actions.delete')             // ✓
 *
 * Why: `npm run i18n:check` validates that the id/en JSON files hold the same
 * KEY SET — it cannot see call sites. So a `t(key, 'English')` whose key does
 * not exist renders the English literal to Indonesian users and the parity check
 * still passes. The fallback silently converts a loud, catchable failure (a
 * missing key rendering as the raw key) into a quiet wrong-language bug.
 *
 * This is not hypothetical: `common:actions.decrease` / `common:actions.increase`
 * shipped exactly this way — the capacity stepper's aria-labels read "Decrease"
 * and "Increase" in the Indonesian UI, with i18n:check green.
 *
 * The fix is always the same: add the key to BOTH locales and drop the argument.
 *
 * Only a *hardcoded* fallback is a problem. A COMPUTED one is graceful
 * degradation for an unknown key and is allowed:
 *
 *   t(`roles:${user.role}`, { defaultValue: user.role.replace(/_/g, ' ') })  // ✓
 *   t(`settings:system.groups.${group}`, { defaultValue: group })            // ✓
 *
 * Those render the raw code when an enum grows a value the locales don't cover
 * yet — there is no English copy being smuggled in, because there is no copy at
 * all. What this rule forbids is a literal: an author typing the English
 * sentence at the call site instead of into both locale files.
 *
 * Non-goals:
 *  - Interpolation is untouched: `t('k', { count })` is not a fallback.
 *  - Non-literal second args are untouched: `t(key, opts)`.
 */
'use strict';

/** Translation callees: `t(...)`, `i18n.t(...)`, `this.t(...)`. */
function isTranslationCall(node) {
  const callee = node.callee;
  if (callee.type === 'Identifier') return callee.name === 't';
  if (callee.type === 'MemberExpression' && !callee.computed) {
    return callee.property.type === 'Identifier' && callee.property.name === 't';
  }
  return false;
}

/**
 * A hardcoded string: `'Remove'` or `` `Remove` ``. A template WITH expressions
 * is computed, not copy, so it isn't the hazard.
 */
function isHardcodedString(node) {
  if (node.type === 'Literal') return typeof node.value === 'string';
  if (node.type === 'TemplateLiteral') return node.expressions.length === 0;
  return false;
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow a literal fallback/defaultValue on t() — a missing key must fail loudly, not render English past i18n:check',
    },
    schema: [],
    messages: {
      literalFallback:
        'Remove the literal fallback from t(). If "{{key}}" is missing, add it to BOTH id and en locales — a fallback ships English to Indonesian users while i18n:check stays green.',
      defaultValueOption:
        'Remove `defaultValue` from the t() options. Add the key to BOTH id and en locales instead — defaultValue ships English while i18n:check stays green.',
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        if (!isTranslationCall(node) || node.arguments.length < 2) return;

        const [keyArg, second] = node.arguments;
        const key =
          keyArg.type === 'Literal' && typeof keyArg.value === 'string' ? keyArg.value : 'this key';

        // t('key', 'Some English')
        if (isHardcodedString(second)) {
          context.report({ node: second, messageId: 'literalFallback', data: { key } });
          return;
        }

        // t('key', { defaultValue: 'Some English', count })
        if (second.type === 'ObjectExpression') {
          for (const prop of second.properties) {
            if (
              prop.type === 'Property' &&
              !prop.computed &&
              ((prop.key.type === 'Identifier' && prop.key.name === 'defaultValue') ||
                (prop.key.type === 'Literal' && prop.key.value === 'defaultValue'))
            ) {
              // A computed default (`group`, `user.role.replace(...)`) degrades
              // to the raw code for an unmapped enum value — no copy, no hazard.
              if (isHardcodedString(prop.value)) {
                context.report({ node: prop, messageId: 'defaultValueOption' });
              }
            }
          }
        }
      },
    };
  },
};
