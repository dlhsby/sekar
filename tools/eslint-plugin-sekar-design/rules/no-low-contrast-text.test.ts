import { RuleTester } from '@typescript-eslint/rule-tester';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rule = require('./no-low-contrast-text');

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const tester = new RuleTester({
  languageOptions: {
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

tester.run('no-low-contrast-text', rule, {
  valid: [
    { code: `<div className="text-nb-gray-500" />` },
    { code: `<div className="text-nb-gray-600 text-xs" />` },
    // Decorative fills and borders are NOT governed by contrast rules — the rule
    // must stay out of their way or it becomes noise people disable.
    { code: `<div className="bg-nb-gray-400" />` },
    { code: `<div className="border-nb-gray-400 bg-nb-gray-300" />` },
    // A near-miss substring must not trip it.
    { code: `<div className="text-nb-gray-50" />` },
    { code: `<div className={cn('text-nb-gray-500', on && 'font-bold')} />` },
    // WCAG exempts INACTIVE controls (1.4.3 / 1.4.11), and darkening a disabled
    // input would make it read as enabled.
    { code: `<div className="disabled:text-nb-gray-300" />` },
    { code: `<div className={cn('px-3 disabled:text-nb-gray-300 hover:text-nb-black')} />` },
    { code: `<div className="hover:disabled:text-nb-gray-400" />` },
  ],
  invalid: [
    {
      code: `<div className="text-nb-gray-400" />`,
      errors: [{ messageId: 'lowContrast' }],
    },
    {
      code: `<div className="text-xs text-nb-gray-300 italic" />`,
      errors: [{ messageId: 'lowContrast' }],
    },
    {
      code: `<div className={"text-nb-gray-400"} />`,
      errors: [{ messageId: 'lowContrast' }],
    },
    {
      code: `<div className={\`text-nb-gray-400 \${x}\`} />`,
      errors: [{ messageId: 'lowContrast' }],
    },
    // `cn(...)` is the dominant shape in this codebase; a JSXAttribute-only walk
    // would miss every one of these.
    {
      code: `<div className={cn('text-nb-gray-400', 'p-2')} />`,
      errors: [{ messageId: 'lowContrast' }],
    },
    {
      code: `<div className={cn('p-2', active && 'text-nb-gray-400')} />`,
      errors: [{ messageId: 'lowContrast' }],
    },
    {
      code: `<div className={cn('p-2', on ? 'text-nb-gray-300' : 'text-nb-gray-600')} />`,
      errors: [{ messageId: 'lowContrast' }],
    },
  ],
});
