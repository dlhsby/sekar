import { RuleTester } from '@typescript-eslint/rule-tester';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rule = require('./rn-no-shadow-radius');

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const tester = new RuleTester();

tester.run('rn-no-shadow-radius', rule, {
  valid: [
    { code: `const s = { shadowRadius: 0 };` },
    { code: `const s = { shadowOffset: { width: 4, height: 4 } };` },
    { code: `const s = { ...nbShadow('md') };` },
  ],
  invalid: [
    {
      code: `const s = { shadowRadius: 4 };`,
      errors: [{ messageId: 'nonZeroRadius' }],
    },
    {
      code: `const s = { shadowRadius: 1 };`,
      errors: [{ messageId: 'nonZeroRadius' }],
    },
    {
      code: `const s = { 'shadowRadius': 6 };`,
      errors: [{ messageId: 'nonZeroRadius' }],
    },
  ],
});
