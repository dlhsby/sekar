/**
 * Simple Semaphore for concurrency control
 *
 * Limits concurrent execution of async operations.
 * Used to cap puppeteer PDF generation at 3 concurrent instances.
 */
export class Semaphore {
  private available: number;
  private queue: (() => void)[] = [];

  constructor(capacity: number) {
    this.available = capacity;
  }

  async acquire<T>(fn: () => Promise<T>): Promise<T> {
    while (this.available === 0) {
      await new Promise<void>((resolve) => {
        this.queue.push(resolve);
      });
    }

    this.available--;

    try {
      return await fn();
    } finally {
      this.available++;
      const resolve = this.queue.shift();
      if (resolve) {
        resolve();
      }
    }
  }
}
