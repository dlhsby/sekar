import { RuleTester } from '@typescript-eslint/rule-tester';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rule = require('./no-untranslated-literal');

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const tester = new RuleTester({
  languageOptions: {
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

tester.run('no-untranslated-literal', rule, {
  valid: [
    // Localized text
    { code: `<span>{t('common:actions.save')}</span>` },
    { code: `<button aria-label={t('common:a11y.close')}>{t('x:y')}</button>` },
    // Non-UI / identifiers / brand / formats
    { code: `<div className="flex items-center" data-testid="foo" />` },
    { code: `<Icon name="chevron-right" />` },
    { code: `<a href="/rayons/123">{name}</a>` },
    { code: `<span>{count} / {total}</span>` },
    { code: `<time>{format(d, 'dd/MM/yyyy')}</time>` },
    { code: `<span>WhatsApp</span>` },
    { code: `<span>SEKAR</span>` },
    // <Trans> fallback children are i18n copy, not hardcoded
    { code: `<Trans i18nKey="auth:login.help">Hubungi <b>Admin</b> jika ada kendala.</Trans>` },
    // enum-ish all-caps / short tokens
    { code: `<Badge>{'ACTIVE'}</Badge>` },
    { code: `<span>OK</span>` },
  ],
  invalid: [
    {
      code: `<span>Tidak ada data ditemukan</span>`,
      errors: [{ messageId: 'jsxText' }],
    },
    {
      code: `<span>Simpan</span>`,
      errors: [{ messageId: 'jsxText' }],
    },
    {
      code: `<input placeholder="Masukkan nama pengguna" />`,
      errors: [{ messageId: 'attr' }],
    },
    {
      code: `<button aria-label="Simpan perubahan">x</button>`,
      errors: [{ messageId: 'attr' }],
    },
    {
      code: `<img alt="Foto profil" />`,
      errors: [{ messageId: 'attr' }],
    },
  ],
});
