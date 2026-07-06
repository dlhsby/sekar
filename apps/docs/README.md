# SEKAR — Panduan Pengguna (docs site)

Public, no-login user manual for SEKAR, built with [Docusaurus](https://docusaurus.io/).
Content is plain Bahasa Indonesia markdown in [`docs/`](./docs). Served as a static site at
`docs.sekar.wahyutrip.com`.

This is an **independent workspace** — `npm install` here touches nothing else in the repo.
It is **end-user** documentation, separate from the developer-facing `specs/`.

## Preview locally

```bash
cd apps/docs
npm install
npm start          # http://localhost:3002 (live reload)
```

## Build static output

```bash
npm run build      # → ./build (static HTML/CSS/JS); fails on broken links
npm run serve      # serve the built output locally to sanity-check
```

## Add or edit a page (no coding needed)

1. Add a markdown file under the right folder in `docs/` (e.g. `docs/satgas/absen.md`).
2. Add front matter at the top:
   ```markdown
   ---
   title: Absen Masuk & Keluar
   sidebar_position: 2
   ---
   ```
3. The sidebar updates automatically (it is auto-generated from the folder tree +
   each folder's `_category_.json`). Add screenshots to `static/img/` and reference
   them as `![alt](/img/your-screenshot.png)`.
4. Open a PR into `main` (the quality gate runs on it). The live site updates on the
   next **staging release** — i.e. when `main` is merged to the `staging` branch
   (`git push origin staging`) and the deploy is approved. A push to `main` alone does
   not deploy. See [`specs/deployment/ci-cd.md`](../../specs/deployment/ci-cd.md).

## How it ships

- **Staging (AWS):** on a staging release the `deploy-staging` workflow builds the
  `sekar-docs` image (alongside backend + web), pushes it to ECR, and brings it up behind
  the shared Caddy edge (`infra/Caddyfile.staging`, `infra/compose.staging.yml`).
- **Production (self-hosted):** the `docs` service in `docker-compose.prod.yml`, fronted by
  the host Nginx (`infra/nginx.conf`).

Because the output is static markdown-derived HTML, the content is fully portable — moving to
GitBook / Cloudflare Pages / Vercel later is a content copy, not a rewrite.

Site URLs are build-time env vars (`DOCS_URL`, `DOCS_BASE_URL`, `APP_URL`) — see
`docusaurus.config.ts` and the Dockerfile build args.
