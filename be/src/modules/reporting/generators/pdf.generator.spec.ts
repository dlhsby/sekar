import { Semaphore } from './semaphore';

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
