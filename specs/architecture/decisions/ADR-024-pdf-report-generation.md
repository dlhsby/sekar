# ADR-024: PDF Report Generation — Puppeteer

**Date:** March 13, 2026
**Status:** Accepted
**Deciders:** Technical Lead
**Related:** Phase 4 Sub-Phase 4-1 (Reporting Module)

---

## Context

Phase 4 introduces a reporting module that generates formatted PDF reports (daily operations, weekly performance, monthly summary, worker performance, area status, overtime utilization). These reports include tables, charts, headers, footers, and DLH Surabaya branding. We need a reliable PDF generation strategy for the NestJS backend.

## Decision Drivers

- **Visual fidelity** — Reports must look professional with charts, tables, logos
- **Template flexibility** — 6 report types with different layouts
- **Maintenance** — Templates should be easy to update by developers
- **Performance** — PDF generation under 30 seconds
- **Dependencies** — Minimize native/binary dependencies on production server

## Options Considered

### Option A: Puppeteer (Headless Chrome) — **Selected**

Generate HTML/CSS templates with Handlebars, render via headless Chrome, export as PDF.

**Pros:**
- Full HTML/CSS rendering — any layout achievable
- Charts via inline SVG (no external chart library needed)
- Handlebars templates are easy to maintain
- `page.pdf()` produces high-quality output with headers/footers
- Active maintenance, widely used

**Cons:**
- Chromium binary required on server (~300 MB)
- Higher memory usage during generation (~100-200 MB per instance)
- Needs concurrency limiting (semaphore)

### Option B: PDFKit

Programmatic PDF construction with JavaScript API.

**Pros:**
- No binary dependency
- Lower memory usage
- Fine-grained control

**Cons:**
- No HTML/CSS — layout is manual coordinate positioning
- Charts require custom drawing code
- Template changes require code changes, not markup
- Development time 3-5x higher for complex layouts

### Option C: jsPDF + html2canvas

Client-side PDF generation, could run on server with jsdom.

**Pros:**
- No Chromium dependency
- Familiar API

**Cons:**
- html2canvas produces raster output (blurry at zoom)
- jsdom rendering is unreliable for complex CSS
- Poor table pagination support
- Not production-grade for server-side use

## Decision

**Option A: Puppeteer** with Handlebars templates.

Rationale:
- Professional-quality output justifies the Chromium dependency
- Template-based approach allows non-developer updates to report layouts
- SVG charts avoid additional chart library dependencies
- Concurrency semaphore (max 3 simultaneous generations) controls memory

## Implementation

```typescript
// PdfGeneratorService pattern — singleton browser for performance
@Injectable()
export class PdfGeneratorService implements OnModuleInit, OnModuleDestroy {
  private browser: Browser;
  private semaphore = new Semaphore(3); // Max 3 concurrent PDFs

  async onModuleInit() {
    this.browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  async onModuleDestroy() {
    await this.browser?.close();
  }

  async generatePdf(template: string, data: object): Promise<Buffer> {
    return this.semaphore.acquire(async () => {
      const html = Handlebars.compile(templateSource)(data);
      const page = await this.browser.newPage();
      try {
        await page.setContent(html, { waitUntil: 'networkidle0' });
        return await page.pdf({ format: 'A4', printBackground: true });
      } finally {
        await page.close();
      }
    });
  }
}
```

> **Note:** Uses `puppeteer-core` (not `puppeteer`) to avoid bundling Chromium. Requires system Chromium installed (`apt-get install chromium-browser`) and `PUPPETEER_EXECUTABLE_PATH` environment variable.

## Server Requirements

- Chromium installed: `apt-get install chromium-browser`
- Set `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`
- Minimum 1 GB free RAM for PDF generation

## Consequences

- **Positive:** Professional PDF output, flexible templates, maintainable
- **Negative:** Chromium binary on server, higher memory during generation
- **Mitigation:** Semaphore limits concurrency; generated reports cached in S3
- **Disk-leak guard (2026-07-13):** each `puppeteer.launch()` creates a
  `/tmp/puppeteer_dev_chrome_profile-*` dir (~82MB) that is only removed on a clean
  `close()`. Ungraceful exits (OOM/crash/restart) orphan them; enough accumulate to
  fill the disk and crash-loop the API (this caused a staging outage). Mitigations:
  `PdfGeneratorService` now sweeps stale profile dirs on startup, force-kills a
  hung browser (timeout → SIGKILL) on recycle/shutdown, and runs a periodic
  (30-min) background sweep that drops orphaned profiles while keeping the live
  browser's dir. A RAM-backed `/tmp` tmpfs was **rejected** — the staging box
  (t3.micro, shared, ~80MB free RAM, already swapping) would OOM, which is the very
  failure that orphans profiles. Defense-in-depth is instead the code sweeps above +
  a root-disk >80% CloudWatch alarm (SNS email). See
  `specs/deployment/operations.md` → "Disk Space Full" and
  `specs/deployment/monitoring.md`.

## Changelog
- 2026-07-13 — Follow-up hardening: periodic in-app profile sweep (RAM-free,
  chosen over a risky tmpfs) + staging root-disk >80% alarm.
- 2026-07-13 — Fixed Puppeteer temp-profile disk leak (startup sweep + guarded
  close); root-caused a staging ENOSPC outage.

---

**Last Updated:** 2026-07-13
