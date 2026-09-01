// puppeteer-core ships ESM that jest does not transform (transformIgnorePatterns
// excludes node_modules); a factory mock avoids loading the real module.
jest.mock('puppeteer-core', () => ({ launch: jest.fn() }));
// fs built-ins are non-configurable (can't jest.spyOn); mock the module instead.
jest.mock('fs');

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as puppeteer from 'puppeteer-core';
import { Semaphore } from './semaphore';
import { PdfGeneratorService } from './pdf.generator';

const mockReaddir = fs.readdirSync as jest.Mock;
const mockRm = fs.rmSync as jest.Mock;

describe('PdfGeneratorService', () => {
  let service: PdfGeneratorService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReaddir.mockReturnValue([]);
    service = new PdfGeneratorService();
  });

  afterEach(async () => {
    // Clears the periodic-sweep interval created by onModuleInit.
    await service.onModuleDestroy();
    jest.useRealTimers();
  });

  describe('onModuleInit stale-profile sweep', () => {
    it('removes leftover puppeteer profile dirs and ignores unrelated entries', async () => {
      mockReaddir.mockReturnValue([
        'puppeteer_dev_chrome_profile-aaa',
        'puppeteer_dev_chrome_profile-bbb',
        'some-other-file',
        'systemd-private-xyz',
      ]);
      (puppeteer.launch as jest.Mock).mockResolvedValue({
        close: jest.fn(),
        process: jest.fn(),
      });

      await service.onModuleInit();

      const tmpDir = os.tmpdir();
      expect(mockRm).toHaveBeenCalledTimes(2);
      expect(mockRm).toHaveBeenCalledWith(path.join(tmpDir, 'puppeteer_dev_chrome_profile-aaa'), {
        recursive: true,
        force: true,
      });
      expect(mockRm).not.toHaveBeenCalledWith(
        path.join(tmpDir, 'some-other-file'),
        expect.anything(),
      );
    });

    it('does not throw if the temp dir cannot be read', async () => {
      mockReaddir.mockImplementation(() => {
        throw new Error('EACCES');
      });
      (puppeteer.launch as jest.Mock).mockResolvedValue({
        close: jest.fn(),
        process: jest.fn(),
      });

      await expect(service.onModuleInit()).resolves.not.toThrow();
    });

    it('records the newly-created profile dir as the live one', async () => {
      // cleanup readdir -> before-launch readdir -> after-launch readdir
      mockReaddir
        .mockReturnValueOnce([])
        .mockReturnValueOnce([])
        .mockReturnValueOnce(['puppeteer_dev_chrome_profile-new']);
      (puppeteer.launch as jest.Mock).mockResolvedValue({
        close: jest.fn(),
        process: jest.fn(),
      });

      await service.onModuleInit();

      expect((service as unknown as { currentProfile: string | null }).currentProfile).toBe(
        'puppeteer_dev_chrome_profile-new',
      );
    });
  });

  describe('periodic sweep', () => {
    it('removes orphaned profiles but keeps the live browser profile', () => {
      (service as unknown as { currentProfile: string | null }).currentProfile =
        'puppeteer_dev_chrome_profile-live';
      mockReaddir.mockReturnValue([
        'puppeteer_dev_chrome_profile-live',
        'puppeteer_dev_chrome_profile-orphan',
      ]);

      (service as unknown as { cleanupStaleProfiles(): void }).cleanupStaleProfiles();

      const tmpDir = os.tmpdir();
      expect(mockRm).toHaveBeenCalledTimes(1);
      expect(mockRm).toHaveBeenCalledWith(
        path.join(tmpDir, 'puppeteer_dev_chrome_profile-orphan'),
        {
          recursive: true,
          force: true,
        },
      );
      expect(mockRm).not.toHaveBeenCalledWith(
        path.join(tmpDir, 'puppeteer_dev_chrome_profile-live'),
        expect.anything(),
      );
    });
  });

  describe('closeBrowserSafely', () => {
    it('does not force-kill when close resolves cleanly', async () => {
      const kill = jest.fn();
      const browser = {
        close: jest.fn().mockResolvedValue(undefined),
        process: jest.fn(() => ({ kill })),
      } as unknown as puppeteer.Browser;

      await (
        service as unknown as { closeBrowserSafely(b: puppeteer.Browser): Promise<void> }
      ).closeBrowserSafely(browser);

      expect(browser.close).toHaveBeenCalled();
      expect(kill).not.toHaveBeenCalled();
    });

    it('force-kills the process when close hangs past the timeout', async () => {
      jest.useFakeTimers();
      const kill = jest.fn();
      const browser = {
        close: jest.fn(() => new Promise<void>(() => {})), // never resolves
        process: jest.fn(() => ({ kill })),
      } as unknown as puppeteer.Browser;

      const pending = (
        service as unknown as { closeBrowserSafely(b: puppeteer.Browser): Promise<void> }
      ).closeBrowserSafely(browser);

      await jest.advanceTimersByTimeAsync(6000);
      await pending;

      expect(kill).toHaveBeenCalledWith('SIGKILL');
    });
  });
});

describe('Semaphore', () => {
  describe('concurrent limit enforcement', () => {
    it('should limit concurrent acquisitions to specified capacity', async () => {
      const semaphore = new Semaphore(3);
      let concurrent = 0;
      let maxConcurrent = 0;

      const work = async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((resolve) => setTimeout(resolve, 10));
        concurrent--;
      };

      const promises = Array.from({ length: 10 }, () => semaphore.acquire(work));

      await Promise.all(promises);

      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });

    it('should serialize requests when at capacity', async () => {
      const semaphore = new Semaphore(1);
      const execution: number[] = [];

      const work = (id: number) => async () => {
        execution.push(id);
        await new Promise((resolve) => setTimeout(resolve, 5));
        execution.push(-id);
      };

      const promises = Array.from({ length: 5 }, (_, i) => semaphore.acquire(work(i)));

      await Promise.all(promises);

      // Should execute serially
      expect(execution).toEqual([0, -0, 1, -1, 2, -2, 3, -3, 4, -4]);
    });

    it('should allow concurrent execution within capacity', async () => {
      const semaphore = new Semaphore(3);
      const concurrent: number[] = [];

      const work = async () => {
        concurrent.push(1);
        await new Promise((resolve) => setTimeout(resolve, 20));
        concurrent.pop();
      };

      const promises = [work(), work(), work()].map((p) => semaphore.acquire(async () => p));

      await Promise.all(promises);

      // All should have run concurrently
      expect(concurrent.length).toBe(0);
    });
  });
});
