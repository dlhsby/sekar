import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as puppeteer from 'puppeteer-core';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { Semaphore } from './semaphore';

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
      try {
        await this.browser.close();
        this.logger.log('PDF generator browser closed');
      } catch (error) {
        this.logger.error(`Failed to close browser: ${(error as Error).message}`);
      }
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
        await this.browser.close();
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
}
