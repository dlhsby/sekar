import { RuleTester } from '@typescript-eslint/rule-tester';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rule = require('./prefer-nb-shadow-utility');

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const tester = new RuleTester();

tester.run('prefer-nb-shadow-utility', rule, {
  valid: [
    { code: `const style = { padding: 8 };` },
    { code: `const style = { ...nbShadow('md'), padding: 8 };` },
    { code: `const style = { backgroundColor: 'var(--color-nb-primary)' };` },
  ],
  invalid: [
    {
      code: `const style = { boxShadow: '4px 4px 0 #000' };`,
      errors: [{ messageId: 'rawBoxShadow' }],
    },
    {
      code: `const style = { 'box-shadow': '4px 4px 0 #000' };`,
      errors: [{ messageId: 'rawBoxShadow' }],
    },
  ],
});
