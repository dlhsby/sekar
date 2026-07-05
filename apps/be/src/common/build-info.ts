import { readFileSync } from 'fs';
import { join } from 'path';

export interface BuildInfo {
  /** Semver from package.json. */
  version: string;
  /** Git short SHA baked at image build (GIT_SHA), or 'dev' locally. */
  gitSha: string;
  /** ISO build timestamp baked at image build (BUILD_TIME), or 'dev' locally. */
  builtAt: string;
}

let cached: BuildInfo | null = null;

function readVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
      version?: string;
    };
    return typeof pkg.version === 'string' ? pkg.version : 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Identifies the running build: package.json version + the git SHA / build time
 * baked into the image at build (CI passes them as Docker build args → env).
 * Surfaced on `GET /health/live` and the root info endpoint for deploy verification.
 */
export function getBuildInfo(): BuildInfo {
  if (!cached) {
    cached = {
      version: readVersion(),
      gitSha: process.env.GIT_SHA || 'dev',
      builtAt: process.env.BUILD_TIME || 'dev',
    };
  }
  return cached;
}
