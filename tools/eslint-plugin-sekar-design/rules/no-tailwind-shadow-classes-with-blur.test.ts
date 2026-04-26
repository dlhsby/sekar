import { RuleTester } from '@typescript-eslint/rule-tester';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rule = require('./no-tailwind-shadow-classes-with-blur');

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const tester = new RuleTester({
  languageOptions: {
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

tester.run('no-tailwind-shadow-classes-with-blur', rule, {
  valid: [
    { code: `<div className="shadow-nb-md" />` },
    { code: `<div className="shadow-nb-sm border-2" />` },
    { code: `<div className={"shadow-nb-lg"} />` },
    { code: `<div className={\`shadow-nb-md \${active ? "ring-2" : ""}\`} />` },
  ],
  invalid: [
    {
      code: `<div className="shadow-md" />`,
      errors: [{ messageId: 'forbiddenShadow' }],
    },
    {
      code: `<div className="border shadow-lg p-4" />`,
      errors: [{ messageId: 'forbiddenShadow' }],
    },
    {
      code: `<div className={\`p-4 shadow-xl\`} />`,
      errors: [{ messageId: 'forbiddenShadow' }],
    },
    {
      code: `<div className="drop-shadow-md" />`,
      errors: [{ messageId: 'forbiddenShadow' }],
    },
  ],
});
