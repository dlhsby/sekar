/**
 * Stub for `puppeteer-core` in the e2e suite.
 *
 * `puppeteer-core` ships ESM, and Jest does not transform `node_modules`. Any
 * e2e that boots `AppModule` pulls in the reporting module → `pdf.generator` →
 * `puppeteer-core`, and the whole suite died on `SyntaxError: Unexpected token
 * 'export'` before a single test ran. That is why there were no working e2e
 * tests at all — including the kind that would have caught a route being
 * shadowed across controllers, or a DTO rejecting a field the web sends.
 *
 * No e2e drives PDF generation (it would need a real Chrome), so the module is
 * stubbed rather than transformed: transforming a large ESM dependency with
 * ts-jest is slow and buys nothing here. A test that genuinely needs puppeteer
 * should mock it explicitly instead of relying on this.
 */
export const launch = async (): Promise<never> => {
  throw new Error(
    'puppeteer-core is stubbed in the e2e suite (test/puppeteer-core.stub.ts). ' +
      'Mock it explicitly if a test needs PDF generation.',
  );
};

export default { launch };
