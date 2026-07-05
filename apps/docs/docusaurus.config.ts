import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import { themes as prismThemes } from 'prism-react-renderer';

// Public-facing user manual for SEKAR. Content lives in ./docs as plain markdown
// (Bahasa Indonesia). Builds to fully static HTML/CSS/JS (see `npm run build`),
// served by a tiny nginx container — no app/runtime coupling, trivially portable.
//
// URLs are environment-overridable so the same source builds for staging, prod,
// and local previews without code edits:
//   DOCS_URL       — canonical site origin           (default: staging origin)
//   DOCS_BASE_URL  — base path ('/' subdomain, or '/docs/' path-routed)
//   APP_URL        — link back to the logged-in dashboard
const DOCS_URL = process.env.DOCS_URL ?? 'https://docs.sekar.wahyutrip.com';
const DOCS_BASE_URL = process.env.DOCS_BASE_URL ?? '/';
const APP_URL = process.env.APP_URL ?? 'https://sekar.wahyutrip.com';

const config: Config = {
  title: 'Panduan SEKAR',
  tagline: 'Sistem Evaluasi Kinerja Satgas RTH — DLH Kota Surabaya',
  favicon: 'img/logo.svg',

  url: DOCS_URL,
  baseUrl: DOCS_BASE_URL,

  // No GitHub Pages deploy — served from our own container. These satisfy config
  // validation only.
  organizationName: 'dlh-surabaya',
  projectName: 'sekar-docs',

  // Broken links are a build failure — keeps the manual honest as it grows.
  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  // Bahasa Indonesia is the primary locale (default); English is a secondary
  // translation. English content lives under
  // i18n/en/docusaurus-plugin-content-docs/current/ and builds to the /en/ path.
  i18n: {
    defaultLocale: 'id',
    locales: ['id', 'en'],
    localeConfigs: {
      id: { label: 'Bahasa Indonesia', htmlLang: 'id-ID' },
      en: { label: 'English', htmlLang: 'en-US' },
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          // Docs-only site: the manual is served at the site root.
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          // No "edit this page" link — content is edited via normal repo PRs.
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themes: [
    [
      // Offline/local full-text search — no Algolia account or API keys needed.
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexBlog: false,
        docsRouteBasePath: '/',
        language: ['en'], // Latin tokenizer; works for Bahasa content.
        highlightSearchTermsOnTargetPage: true,
      },
    ],
  ],

  themeConfig: {
    image: 'img/logo.svg',
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Panduan SEKAR',
      logo: {
        alt: 'SEKAR',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Panduan',
        },
        {
          // Language switcher (Bahasa Indonesia ⇄ English).
          type: 'localeDropdown',
          position: 'right',
        },
        {
          href: APP_URL,
          label: 'Buka Aplikasi',
          position: 'right',
        },
        {
          href: `${APP_URL}/android`,
          label: 'Unduh APK',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Panduan',
          items: [
            { label: 'Memulai', to: '/memulai/login' },
            { label: 'FAQ & Bantuan', to: '/faq' },
          ],
        },
        {
          title: 'Aplikasi',
          items: [
            { label: 'Buka Dashboard', href: APP_URL },
            { label: 'Unduh Aplikasi Android', href: `${APP_URL}/android` },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} Dinas Lingkungan Hidup Kota Surabaya. SEKAR.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
