# Encrypted Secrets (dotenvx)

**Status:** Live for **staging** as of 2026-06-18 — backend + web build and run from encrypted
env (see §6). Mobile staging encrypted. **Production** env files (root `.env.production` + web +
mobile, all encrypted) prepared with generated starter secrets — finalize real on-prem values
(domain, etc.) with `dotenvx set` before go-live. Production is not yet deployed.

SEKAR commits its `.env.staging` / `.env.production` files to git **encrypted** with
[dotenvx](https://dotenvx.com), and decrypts them at runtime/build. This replaces the old
"every secret is a separate GitHub Secret / SSM parameter" model with: **all config lives in
one committed (encrypted) file per environment; the only secret kept out of git is a single
private key per file.**

## 1. How it works

dotenvx uses public-key encryption (ECIES / secp256k1):

- `dotenvx encrypt -f .env.staging` rewrites each value as `encrypted:…` ciphertext and writes a
  **public key** into the file header (`DOTENV_PUBLIC_KEY_STAGING=…`). The public key only
  *encrypts*, so it is safe to commit. Adding or changing a value later needs only the public key.
- The matching **private key** (`DOTENV_PRIVATE_KEY_STAGING=…`) is written to a gitignored
  `.env.keys` file. It is the **one secret** — it *decrypts*. Never commit it.
- At runtime, code calls `dotenvx` with `DOTENV_PRIVATE_KEY_STAGING` present in the environment
  (or a local `.env.keys`) and the `encrypted:…` values are decrypted in memory.

Plaintext values pass through untouched, so the gitignored **`.env.local`** used for local dev
needs no key and no encryption.

## 2. Key topology — per workspace, per environment

Each workspace encrypts its own files, producing **independent** keypairs. A leaked mobile key
therefore cannot decrypt backend secrets. Six private keys total:

| Workspace | `.env.staging` key | `.env.production` key |
|-----------|--------------------|------------------------|
| `be` | `DOTENV_PRIVATE_KEY_STAGING` (`be/.env.staging`) | — *(see note)* |
| **root** | — | `DOTENV_PRIVATE_KEY_PRODUCTION` (`./.env.production`) |
| `fe/web` | `DOTENV_PRIVATE_KEY_STAGING` | `DOTENV_PRIVATE_KEY_PRODUCTION` |
| `fe/mobile` | `DOTENV_PRIVATE_KEY_STAGING` | `DOTENV_PRIVATE_KEY_PRODUCTION` |

> **Note — backend production env lives at the repo root, not `be/`.** The on-prem stack
> (`docker-compose.prod.yml`) feeds the backend via `env_file: .env.production` (root) and also
> uses that file's values for Postgres/MinIO `${...}` substitution. So there is no
> `be/.env.production`; the encrypted **root `./.env.production`** is the backend's production
> source. `be/.env.staging` (baked into the staging image) remains the staging source.

The env-var **name** repeats across workspaces but the **value differs**. These are stored as
**GitHub Environment secrets** (not repo-level), so the same secret name carries a different
value per environment and a job selects which by declaring `environment:`:

| GitHub Environment | Secrets (storage names — each is that env's private key) |
|--------------------|----------------------------------------------------------|
| `staging` | `BE_DOTENV_PRIVATE_KEY`, `WEB_DOTENV_PRIVATE_KEY` |
| `production` | `BE_DOTENV_PRIVATE_KEY`, `WEB_DOTENV_PRIVATE_KEY` |

**Storage name vs runtime name.** The GitHub/SSM *storage* names are prefixed by workspace
(`BE_`/`WEB_`/`MOBILE_`) for clarity. The *runtime* variable dotenvx actually needs is derived
from the filename — `DOTENV_PRIVATE_KEY_STAGING` for `.env.staging`,
`DOTENV_PRIVATE_KEY_PRODUCTION` for `.env.production` — so each consumer maps storage→runtime
(e.g. the web build feeds `BE_/WEB_DOTENV_PRIVATE_KEY` into the BuildKit secret; the box writes
the SSM value out as `DOTENV_PRIVATE_KEY_STAGING`).

Notes:
- The **backend staging** key also lives in SSM (`/sekar/staging/BE_DOTENV_PRIVATE_KEY`) — that
  is the *live* source the AWS staging box reads via its instance role; the GitHub `staging` copy
  is parity/backup. The web key is in GitHub because the web *image is built in Actions*.
- **Mobile** keys are intentionally **not** in GitHub yet (no release workflow consumes them);
  they stay in the local `fe/mobile/.env.keys` and will be added when the release workflow is set up.
- Android signing + Sentry secrets stay **repo-level** (used by `mobile-release.yml`, not env-scoped).

## 3. How each workspace consumes the encrypted file

| Workspace | When | Mechanism |
|-----------|------|-----------|
| **be** (NestJS) | runtime | `src/config/load-env.ts` calls `dotenvx.config()` (drop-in for dotenv). Decrypts if `DOTENV_PRIVATE_KEY_<ENV>` is set; plaintext `.env.local` still works with no key. |
| **fe/web** (Next.js) | build (`NEXT_PUBLIC_*` inlined) + server runtime | `npm run build:staging` / `start:staging` = `dotenvx run -f .env.staging -- next …`. |
| **fe/mobile** (RN) | build (babel inlines `@env`) | `react-native-dotenv` reads files directly and can't decrypt, so `scripts/decrypt-env.js` decrypts to a gitignored `.env.runtime`, and `npm run build:android:staging` points `ENVFILE` at it, then deletes it. |

## 4. First-time setup (you run this — keys never leave your machine)

> Do this once per workspace. The private keys are generated locally into `.env.keys`; **they are
> printed to your terminal, not committed**. Keep them — you'll paste them into GitHub/SSM (§6).

```bash
# 1. Create plaintext runtime files from the templates and fill in REAL values.
cd be
cp .env.staging.example .env.staging        # edit: DB password, JWT secrets, etc.
cp .env.production.example .env.production
# (repeat the cp+edit in fe/web and fe/mobile)

# 2. Encrypt in place. This generates the keypairs and writes private keys to .env.keys.
npm run env:encrypt                          # = dotenvx encrypt -f .env.staging -f .env.production

# 3. Inspect the result:
cat .env.staging        # values are now encrypted:… ; DOTENV_PUBLIC_KEY_STAGING in header (committable)
cat .env.keys           # the 2 private keys for THIS workspace — SECRET, gitignored

# 4. Repeat steps 1–3 in fe/web and fe/mobile.
```

> **Running the CLI.** `dotenvx` is a *workspace* dependency, not a global command — bare
> `dotenvx …` will say "command not found". Use `npx dotenvx …` from inside a workspace, the npm
> scripts below, or `npm i -g @dotenvx/dotenvx` to install it globally.

Editing / inspecting a secret (never writes plaintext to disk). Per-workspace npm scripts wrap
the staging file (`be`, `fe/web` have `env:get` / `env:decrypt`; `fe/web` also `env:decrypt:prod`):

```bash
npm run env:get -- DATABASE_PASSWORD      # one decrypted value (or all as JSON if no key)
npm run env:decrypt                       # whole staging file decrypted to stdout
# or directly:
npx dotenvx set GOOGLE_MAPS_API_KEY "AIza…" -f .env.staging   # set + encrypt one value
npx dotenvx get GOOGLE_MAPS_API_KEY --env-file=.env.staging   # read one value (note: --env-file= form)
```

Safety net — a **pre-commit hook** blocks committing a plaintext `.env.*` or any `.env.keys`.
It is installed at `.git/hooks/pre-commit` (per clone, not committed). This repo's hook blocks
staged `.env.keys` and runs `dotenvx ext precommit` via a workspace-local dotenvx binary (no
global install needed). To (re)install in a fresh clone, recreate that file — or run
`dotenvx ext precommit` manually before committing to check (`dotenvx ext precommit --install`
only works if a `pre-commit` hook already exists to append to).

## 5. Committing

After §4, the encrypted files are safe to commit (the `.gitignore` in each workspace already
allows `.env.staging` / `.env.production` and blocks `.env.keys`, `.env.local`, `.env.runtime`):

```bash
git add be/.env.staging be/.env.production \
        fe/web/.env.staging fe/web/.env.production \
        fe/mobile/.env.staging fe/mobile/.env.production
git status   # confirm NO .env.keys / .env.local is staged
git commit -m "chore(secrets): commit dotenvx-encrypted staging + production env"
```

## 6. Where the private keys go (deploy/CI cutover)

**Staging is implemented** (`.github/workflows/deploy-staging.yml`). Details below; production
follows the same shapes once `.env.production` exists.

### Web build (GitHub Actions) — DONE for staging
The web image build decrypts `fe/web/.env.staging` during `next build`. The job is scoped to the
`staging` **GitHub Environment** and reads its env secret **`WEB_DOTENV_PRIVATE_KEY`**, passed as
a **BuildKit secret** `dotenv_private_key` (not a build-arg, so it never lands in an image layer).
`fe/web/Dockerfile` is env-agnostic (`ARG DOTENV_ENV=staging`):

```dockerfile
ARG DOTENV_ENV=staging
RUN --mount=type=secret,id=dotenv_private_key \
    DOTENV_PRIVATE_KEY_STAGING="$(cat /run/secrets/dotenv_private_key)" \
    DOTENV_PRIVATE_KEY_PRODUCTION="$(cat /run/secrets/dotenv_private_key)" \
    npx dotenvx run -f ".env.${DOTENV_ENV}" -- next build
```
and the workflow's `docker/build-push-action` step (job has `environment: staging`):
```yaml
build-args: |
  DOTENV_ENV=staging
secrets: |
  dotenv_private_key=${{ secrets.WEB_DOTENV_PRIVATE_KEY }}
```
This **replaced** the `NEXT_PUBLIC_*` build-args + the `NEXT_PUBLIC_MAPBOX_TOKEN` GitHub Secret —
the Mapbox token now lives inside the encrypted `fe/web/.env.staging`.

### AWS box (backend staging runtime) — DONE for staging
The encrypted `be/.env.staging` is **baked into the backend image** (`be/Dockerfile` COPYs it;
`be/.dockerignore` allows it). The box fetches only the decryption key from a single SSM
SecureString and writes it to `/opt/sekar/.env` (`infra/seed-env-from-ssm.sh`); compose injects
it + `NODE_ENV=staging`, and `load-env.ts` decrypts the baked file at boot:

```bash
aws ssm put-parameter --profile sekar --region ap-southeast-3 \
  --name /sekar/staging/BE_DOTENV_PRIVATE_KEY --type SecureString --overwrite \
  --value "<be DOTENV_PRIVATE_KEY_STAGING>"     # already done
```

The per-secret SSM params (`/sekar/staging/DATABASE_PASSWORD`, `JWT_SECRET`,
`JWT_REFRESH_SECRET`) and the old `NEXT_PUBLIC_MAPBOX_TOKEN` GitHub Secret were **retired**
2026-06-18 (superseded by the encrypted files). Only `/sekar/staging/BE_DOTENV_PRIVATE_KEY` remains.

### On-prem production box (prepared, not yet deployed)
No SSM. The single secret the operator supplies is `DOTENV_PRIVATE_KEY_PRODUCTION` (keep it in a
password manager / a root-only `.env.keys` / a host env var — it's in your local `.env.keys`
from when the files were encrypted). `docker-compose.prod.yml` is already wired:

- **Postgres/MinIO** read `${DATABASE_PASSWORD}` / `${AWS_ACCESS_KEY_ID}` etc. — these need
  *plaintext* at compose-parse time, so deploy through `dotenvx run` (it decrypts the root
  `.env.production` into the deploy shell's environment).
- **Backend** gets the encrypted values via `env_file: .env.production` and decrypts them
  in-process (`load-env.ts`) using `DOTENV_PRIVATE_KEY_PRODUCTION`, passed through in its
  `environment:`.
- **Web** image build decrypts `fe/web/.env.production` via the BuildKit secret
  `dotenv_private_key` (sourced from `DOTENV_PRIVATE_KEY_PRODUCTION`) with build arg
  `DOTENV_ENV=production`.

One command does all three:

```bash
export DOTENV_PRIVATE_KEY_PRODUCTION=<from your .env.keys>
dotenvx run -f .env.production -- docker compose -f docker-compose.prod.yml up -d --build
```

Before go-live, finalize real values (the generated starters cover DB/JWT/MinIO secrets; set the
real domain): `dotenvx set CORS_ORIGIN "https://<prod-domain>" -f .env.production`, and the
matching `NEXT_PUBLIC_*` in `fe/web/.env.production` + `API_BASE_URL` in `fe/mobile/.env.production`.

## 7. Rotation

To rotate a key (e.g. after suspected exposure): `dotenvx rotate -f .env.staging`
(regenerates the keypair and re-encrypts in place), commit the file, then update the private key
in every place it lives (GitHub Secret / SSM / host). Rotate the underlying API keys themselves
(Mapbox, Google Maps, DB password) at their providers as well.

## 8. Security notes

- The **only** real secret is the private key. Everything in git is ciphertext or a public key.
- Mobile client keys (Mapbox `pk.*`, Google Maps) are inlined into the app bundle and are
  extractable from any APK — encryption keeps them out of plaintext git history but is **not**
  true secrecy. Restrict them at the provider (referrer / package + SHA-1) and rotate the
  previously-exposed Google Maps key.
- `.env.local` (dev) stays plaintext + gitignored; never encrypt it.
- Never negate `.env.keys` in a `.gitignore`. Verify with `git check-ignore .env.keys`.
