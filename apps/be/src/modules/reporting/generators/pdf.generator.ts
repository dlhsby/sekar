import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as puppeteer from 'puppeteer-core';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Semaphore } from './semaphore';

/** Prefix puppeteer uses for the temp Chrome user-data dir it creates per launch. */
const PROFILE_PREFIX = 'puppeteer_dev_chrome_profile-';
/** Hard cap on how long we wait for a graceful browser close before force-killing. */
const CLOSE_TIMEOUT_MS = 5000;

/**
 * PDF Generator Service
 *
 * Uses puppeteer-core + Handlebars to render HTML templates as PDF.
 * Maintains a singleton browser instance with concurrency semaphore
 * to limit resource usage. Recycles browser every ~100 renders.
 *
 * Per ADR-024, Chromium is invoked with --no-sandbox and
 * --disable-setuid-sandbox for containerized environments.
 */
@Injectable()
export class PdfGeneratorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PdfGeneratorService.name);
  private browser: puppeteer.Browser | null = null;
  private semaphore = new Semaphore(3);
  private renderCount = 0;
  private readonly recycleThreshold = 100;
  private readonly templatesDir = path.join(__dirname, 'templates');

  async onModuleInit(): Promise<void> {
    // Sweep any Chrome profile dirs orphaned by a previous ungraceful exit
    // (OOM/crash/restart). No browser of ours is running yet, so this is safe.
    // Without it, each crash-loop restart leaves an ~82MB profile behind and the
    // accumulation eventually fills the disk (ENOSPC → API down).
    this.cleanupStaleProfiles();

    try {
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';
      this.browser = await puppeteer.launch({
        executablePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
      });
      this.logger.log(`PDF generator initialized with browser at ${executablePath}`);
    } catch (error) {
      // Do NOT crash the whole API if the headless browser is unavailable (e.g. the
      // Chromium binary is missing). PDF generation degrades gracefully — generatePdf()
      // throws "PDF generator not initialized" per-request — while the rest of the API
      // stays up. The browser is re-attempted lazily on the next recycle.
      this.browser = null;
      this.logger.error(
        `PDF generator unavailable (browser failed to launch): ${(error as Error).message}. ` +
          'Report PDF generation will be disabled until a Chromium binary is present.',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      await this.closeBrowserSafely(this.browser);
      this.browser = null;
      this.logger.log('PDF generator browser closed');
    }
  }

  /**
   * Generate PDF from Handlebars template and data
   *
   * @param templateName Name of the template file (without .hbs extension)
   * @param data Data object to pass to the template
   * @returns PDF buffer
   */
  async generatePdf(templateName: string, data: Record<string, any>): Promise<Buffer> {
    if (!this.browser) {
      throw new Error('PDF generator not initialized');
    }

    return this.semaphore.acquire(async () => {
      const html = this.renderTemplate(templateName, data);
      const page = await this.browser!.newPage();

      try {
        await page.setContent(html, { waitUntil: 'domcontentloaded' });
        const pdf = (await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
        })) as Buffer;

        this.renderCount++;

        // Recycle browser periodically to prevent memory leaks
        if (this.renderCount >= this.recycleThreshold) {
          await this.recycleBrowser();
        }

        return pdf;
      } finally {
        try {
          await page.close();
        } catch (error) {
          this.logger.warn(`Failed to close page: ${(error as Error).message}`);
        }
      }
    });
  }

  /**
   * Render Handlebars template with data
   *
   * Loads template from templates/ directory and compiles with data.
   */
  private renderTemplate(templateName: string, data: Record<string, any>): string {
    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templateName}`);
    }

    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const template = Handlebars.compile(templateSource);
    return template(data);
  }

  /**
   * Recycle browser instance to prevent memory leaks
   *
   * Closes the current browser and launches a new one.
   */
  private async recycleBrowser(): Promise<void> {
    try {
      this.logger.log(`Recycling browser after ${this.renderCount} renders`);
      if (this.browser) {
        // Guarded close ensures the old browser's temp profile dir is released even
        // if Chrome hangs; a plain close() that times out would orphan an ~82MB dir.
        await this.closeBrowserSafely(this.browser);
        this.browser = null;
      }

      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';
      this.browser = await puppeteer.launch({
        executablePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
      });

      this.renderCount = 0;
    } catch (error) {
      this.logger.error(`Failed to recycle browser: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Close a browser, force-killing the underlying process if the graceful close
   * does not complete within CLOSE_TIMEOUT_MS.
   *
   * A hung `browser.close()` leaves Chrome running and its temp profile dir on
   * disk. Racing close() against a timeout and falling back to SIGKILL on the
   * child process guarantees the process (and thus its profile dir) is released.
   */
  private async closeBrowserSafely(browser: puppeteer.Browser): Promise<void> {
    const proc = browser.process();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        browser.close(),
        new Promise<void>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('browser.close() timed out')),
            CLOSE_TIMEOUT_MS,
          );
        }),
      ]);
    } catch (error) {
      this.logger.warn(
        `Graceful browser close failed (${(error as Error).message}); force-killing process`,
      );
      try {
        proc?.kill('SIGKILL');
      } catch (killError) {
        this.logger.error(`Failed to force-kill browser process: ${(killError as Error).message}`);
      }
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /**
   * Remove leftover `puppeteer_dev_chrome_profile-*` dirs from the OS temp dir.
   *
   * Puppeteer normally removes the temp profile it created on a clean close(), so
   * these only exist when a prior process died ungracefully. Called at startup
   * (no browser running → safe to remove all matches).
   */
  private cleanupStaleProfiles(): void {
    const tmpDir = os.tmpdir();
    let removed = 0;
    try {
      for (const entry of fs.readdirSync(tmpDir)) {
        if (!entry.startsWith(PROFILE_PREFIX)) continue;
        try {
          fs.rmSync(path.join(tmpDir, entry), { recursive: true, force: true });
          removed++;
        } catch (error) {
          this.logger.warn(`Failed to remove stale profile ${entry}: ${(error as Error).message}`);
        }
      }
      if (removed > 0) {
        this.logger.log(`Cleaned ${removed} stale puppeteer profile dir(s) from ${tmpDir}`);
      }
    } catch (error) {
      this.logger.warn(`Stale-profile sweep skipped: ${(error as Error).message}`);
    }
  }
}
