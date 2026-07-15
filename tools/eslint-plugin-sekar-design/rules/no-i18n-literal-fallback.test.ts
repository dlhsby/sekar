import { RuleTester } from '@typescript-eslint/rule-tester';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rule = require('./no-i18n-literal-fallback');

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const tester = new RuleTester({
  languageOptions: {
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

tester.run('no-i18n-literal-fallback', rule, {
  valid: [
    // The only correct shape: the key alone.
    { code: `t('common:actions.delete')` },
    { code: `i18n.t('errors:AUTH_INVALID')` },
    { code: `<span>{t('schedules:board.team')}</span>` },
    // Interpolation is not a fallback.
    { code: `t('schedules:board.petugasCount', { count: 3 })` },
    { code: `t('schedules:search.noResults', { q: query })` },
    { code: `t('board.roleShort', { shift: s.name, role })` },
    // A non-literal second arg can't hardcode English copy.
    { code: `t(key, opts)` },
    // COMPUTED defaults are graceful degradation for an unknown enum value —
    // they render the raw code, not English copy, so they are allowed.
    { code: 't(`roles:${user.role}`, { defaultValue: user.role.replace(/_/g, \' \') })' },
    { code: 't(`settings:system.groups.${group}`, { defaultValue: group })' },
    { code: 't(`x:${k}`, { defaultValue: `${a}-${b}` })' },
    // Not a translation call.
    { code: `format(date, 'dd/MM/yyyy')` },
    { code: `foo.bar('a', 'b')` },
  ],
  invalid: [
    // The exact shape that shipped English past i18n:check.
    {
      code: `t('common:actions.remove', 'Remove')`,
      errors: [{ messageId: 'literalFallback' }],
    },
    {
      code: `t('common:actions.decrease', 'Decrease')`,
      errors: [{ messageId: 'literalFallback' }],
    },
    {
      code: `i18n.t('common:loading', 'Loading…')`,
      errors: [{ messageId: 'literalFallback' }],
    },
    // Template literal fallback — same hazard.
    {
      code: 't(\'common:x\', `Load more`)',
      errors: [{ messageId: 'literalFallback' }],
    },
    // defaultValue in the options object is the same thing wearing a hat.
    {
      code: `t('common:x', { defaultValue: 'Remove' })`,
      errors: [{ messageId: 'defaultValueOption' }],
    },
    // ...and it must still be caught alongside real interpolation.
    {
      code: `t('common:x', { count, defaultValue: 'Items' })`,
      errors: [{ messageId: 'defaultValueOption' }],
    },
    // A template with no expressions is just a string in disguise.
    {
      code: 't(`common:x`, { defaultValue: `Items` })',
      errors: [{ messageId: 'defaultValueOption' }],
    },
  ],
});
