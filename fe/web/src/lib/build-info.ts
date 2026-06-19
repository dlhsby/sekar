/**
 * Build identity for the web bundle — inlined at build via next.config `env`.
 * Surfaced in the sidebar footer so you can confirm which build is deployed.
 */
export const BUILD_INFO = {
  version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0',
  sha: process.env.NEXT_PUBLIC_BUILD_SHA ?? 'dev',
  builtAt: process.env.NEXT_PUBLIC_BUILD_TIME ?? 'dev',
} as const;

/** Short label, e.g. "v0.0.1 · 4f98c5d". */
export const BUILD_LABEL = `v${BUILD_INFO.version}${
  BUILD_INFO.sha && BUILD_INFO.sha !== 'dev' ? ` · ${BUILD_INFO.sha}` : ''
}`;
