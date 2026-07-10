# SEKAR — Deployment Documentation

Everything needed to **run, deploy, and operate** SEKAR. Start with the hub
([`deployment-guide.md`](deployment-guide.md)) — it walks every scenario end-to-end and
links the focused guides below.

## Start here

| You want to… | Read |
|--------------|------|
| **The whole picture** (local → staging → prod) | [`deployment-guide.md`](deployment-guide.md) — the hub |

## Guides (by task)

| Topic | Doc |
|-------|-----|
| Run the stack on your machine (Docker infra, MinIO, per-workspace run, WSL2 device networking) | [`local-development.md`](local-development.md) |
| Obtain & install keys — Firebase/FCM, Google Maps, AWS S3, APNs | [`credentials-setup.md`](credentials-setup.md) |
| Every environment variable, per workspace & environment | [`environment-variables.md`](environment-variables.md) |
| Day-2 operations — migrations, backup/restore, rollback, incident runbooks | [`operations.md`](operations.md) |
| Monitoring — dashboards, CloudWatch alarms, log queries | [`monitoring.md`](monitoring.md) |
| CI/CD + **releases** — GitHub Actions pipelines, secrets, versioned `sekar-v*` / `mobile-v*` releases, `scripts/release.sh` | [`ci-cd.md`](ci-cd.md) |
| AWS managed-services deep-dive — VPC, RDS, S3, IAM, CloudFront, cost, DR | [`infrastructure.md`](infrastructure.md) |
| Android release — keystore, build, Play Store | [`android-release-guide.md`](android-release-guide.md) |
| iOS release (needs a Mac) — Xcode, capabilities, APNs, TestFlight | [`ios-release-guide.md`](ios-release-guide.md) |
| Nginx reverse-proxy template | [`nginx-web.conf.template`](nginx-web.conf.template) |

## Environment model at a glance

| | **Local dev** | **Staging** | **Production** |
|--|--------------|-------------|----------------|
| Env file | `.env.local` (per workspace) | `.env.staging` | `.env.production` (root) |
| Object storage | MinIO (in `infra/`) | real AWS S3 | MinIO (in `docker-compose.prod.yml`) or AWS S3 |
| Seeder | `db:seed` (destructive) | `db:seed:staging:prod` | `db:seed:production:prod` |
| Guide section | [`deployment-guide.md`](deployment-guide.md) §A | §D | §E |

> Historical per-phase deployment records were retired in the product-docs restructure; the build
> timeline lives in [`../history/CHANGELOG.md`](../history/CHANGELOG.md).

## Conventions

- Filenames are lowercase-kebab `.md`. Templates are committed as `*.example`; never commit real `.env.local` / `.env.staging` / `.env.production`.
- Local dev uses **MinIO** for S3 (replaced LocalStack); staging uses **real AWS S3**.
- The single source of truth for project status is [`../COMPLETION_STATUS.md`](../COMPLETION_STATUS.md), not these docs.
