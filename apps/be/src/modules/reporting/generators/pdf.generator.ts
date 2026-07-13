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
 * How often to sweep orphaned profile dirs while the service is running. The
 * startup sweep + guarded close handle the common cases; this periodic pass is a
 * RAM-free backstop for profiles orphaned by a crash that happens mid-run (the
 * process stays up, so the startup sweep never fires). Chosen over a RAM-backed
 * `/tmp` tmpfs, which would consume the box's scarce memory.
 */
const SWEEP_INTERVAL_MS = 30 * 60 * 1000;

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
  /** Profile dir name of the currently-live browser; never swept while in use. */
  private currentProfile: string | null = null;
  /** Handle for the periodic background sweep, cleared on shutdown. */
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  async onModuleInit(): Promise<void> {
    // Sweep any Chrome profile dirs orphaned by a previous ungraceful exit
    // (OOM/crash/restart). No browser of ours is running yet, so this is safe.
    // Without it, each crash-loop restart leaves an ~82MB profile behind and the
    // accumulation eventually fills the disk (ENOSPC → API down).
    this.cleanupStaleProfiles();

    try {
      await this.launchBrowser();
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

    // Background backstop: periodically drop profiles orphaned mid-run. unref() so
    // it never keeps the process alive on shutdown.
    this.sweepTimer = setInterval(() => this.cleanupStaleProfiles(), SWEEP_INTERVAL_MS);
    this.sweepTimer.unref?.();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
    if (this.browser) {
      await this.closeBrowserSafely(this.browser);
      this.browser = null;
      this.logger.log('PDF generator browser closed');
    }
  }

  /**
   * Launch the singleton browser and record which temp profile dir it owns.
   *
   * Puppeteer creates a fresh `puppeteer_dev_chrome_profile-*` dir per launch; we
   * diff the temp dir before/after so the periodic sweep never deletes the dir the
   * live browser is actively using.
   */
  private async launchBrowser(): Promise<void> {
    const before = this.listProfiles();
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';
    this.browser = await puppeteer.launch({
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    });
    const after = this.listProfiles();
    this.currentProfile = after.find((p) => !before.includes(p)) ?? null;
    this.logger.log(`PDF generator initialized with browser at ${executablePath}`);
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
        this.currentProfile = null;
      }

      await this.launchBrowser();

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

  /** List `puppeteer_dev_chrome_profile-*` dir names currently in the OS temp dir. */
  private listProfiles(): string[] {
    try {
      return fs.readdirSync(os.tmpdir()).filter((e) => e.startsWith(PROFILE_PREFIX));
    } catch {
      return [];
    }
  }

  /**
   * Remove leftover `puppeteer_dev_chrome_profile-*` dirs from the OS temp dir,
   * except the one the live browser is currently using (`this.currentProfile`).
   *
   * Puppeteer normally removes the temp profile it created on a clean close(), so
   * leftovers only exist when a process died ungracefully. Called at startup (no
   * browser yet → `currentProfile` is null → removes all) and periodically while
   * running (keeps the live profile).
   */
  private cleanupStaleProfiles(): void {
    const tmpDir = os.tmpdir();
    let removed = 0;
    try {
      for (const entry of fs.readdirSync(tmpDir)) {
        if (!entry.startsWith(PROFILE_PREFIX)) continue;
        if (entry === this.currentProfile) continue;
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
