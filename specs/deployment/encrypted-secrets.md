# Encrypted Secrets (dotenvx)

**Status:** Live for **staging** as of 2026-06-18 — backend + web build and run from encrypted
env (see §6). Mobile staging encrypted; production (`.env.production`) still to be generated.

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
| `be` | `DOTENV_PRIVATE_KEY_STAGING` | `DOTENV_PRIVATE_KEY_PRODUCTION` |
| `fe/web` | `DOTENV_PRIVATE_KEY_STAGING` | `DOTENV_PRIVATE_KEY_PRODUCTION` |
| `fe/mobile` | `DOTENV_PRIVATE_KEY_STAGING` | `DOTENV_PRIVATE_KEY_PRODUCTION` |

The env-var **name** repeats across workspaces but the **value differs**. Each build job only
ever has the one key it needs, so there is no collision. In GitHub Secrets, store them under
workspace-scoped names and map to the canonical name in the job (see §6):

```
BE_DOTENV_PRIVATE_KEY_STAGING        WEB_DOTENV_PRIVATE_KEY_STAGING        MOBILE_DOTENV_PRIVATE_KEY_STAGING
BE_DOTENV_PRIVATE_KEY_PRODUCTION     WEB_DOTENV_PRIVATE_KEY_PRODUCTION     MOBILE_DOTENV_PRIVATE_KEY_PRODUCTION
```

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

Editing a secret later (never writes plaintext to disk):

```bash
dotenvx set GOOGLE_MAPS_API_KEY "AIza…" -f .env.staging   # sets + encrypts one value
dotenvx get GOOGLE_MAPS_API_KEY -f .env.staging           # read one decrypted value
```

Safety net — install the dotenvx pre-commit hook so a *plaintext* `.env.*` can never be
committed by accident:

```bash
dotenvx ext precommit --install     # writes .git/hooks/pre-commit (per clone, not committed)
```

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
The web image build decrypts `fe/web/.env.staging` during `next build`. The private key is the
GitHub Secret **`WEB_DOTENV_PRIVATE_KEY_STAGING`**, passed as a **BuildKit secret** (not a
build-arg, so it never lands in an image layer). `fe/web/Dockerfile`:

```dockerfile
RUN --mount=type=secret,id=DOTENV_PRIVATE_KEY_STAGING \
    DOTENV_PRIVATE_KEY_STAGING="$(cat /run/secrets/DOTENV_PRIVATE_KEY_STAGING)" \
    npm run build:staging
```
and the workflow's `docker/build-push-action` step:
```yaml
secrets: |
  DOTENV_PRIVATE_KEY_STAGING=${{ secrets.WEB_DOTENV_PRIVATE_KEY_STAGING }}
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
  --name /sekar/staging/DOTENV_PRIVATE_KEY --type SecureString --overwrite \
  --value "<be DOTENV_PRIVATE_KEY_STAGING>"     # already done
```

The per-secret SSM params (`/sekar/staging/DATABASE_PASSWORD`, `JWT_SECRET`,
`JWT_REFRESH_SECRET`) are now superseded by the encrypted file and can be retired once a deploy
is confirmed healthy.

### On-prem production box
No SSM. Provide the private keys via the host's environment / a root-only `.env.keys`, e.g. a
systemd `EnvironmentFile` or a Docker secret containing `DOTENV_PRIVATE_KEY_PRODUCTION`.

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
