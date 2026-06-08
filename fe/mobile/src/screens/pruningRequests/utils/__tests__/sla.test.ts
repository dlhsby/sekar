/**
 * pruningSlaTag — derived SLA-urgency tag for the admin review queue.
 *
 * `now` is injected so every case is deterministic (no fake timers needed).
 */

import { pruningSlaTag } from '../sla';
import type { PruningRequestStatus } from '../../../../types/models.types';

const NOW = new Date('2026-06-08T12:00:00Z').getTime();
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

describe('pruningSlaTag', () => {
  describe('open statuses get a tag', () => {
    const open: PruningRequestStatus[] = ['submitted', 'under_review'];

    it.each(open)('returns a tag for %s', (status) => {
      expect(pruningSlaTag({ status, createdAt: hoursAgo(1) }, NOW)).not.toBeNull();
    });
  });

  describe('closed statuses get no tag', () => {
    const closed: PruningRequestStatus[] = [
      'approved',
      'rejected',
      'assigned',
      'in_progress',
      'done',
      'cancelled',
    ];

    it.each(closed)('returns null for %s', (status) => {
      expect(pruningSlaTag({ status, createdAt: hoursAgo(48) }, NOW)).toBeNull();
    });
  });

  describe('urgency buckets (longer wait → more urgent)', () => {
    it('is neutral when waiting < 6h', () => {
      expect(pruningSlaTag({ status: 'submitted', createdAt: hoursAgo(5) }, NOW)).toEqual({
        tone: 'neutral',
        label: 'SLA 5j',
      });
    });

    it('is neutral right up to the 6h boundary (5h59m floors to 5)', () => {
      const createdAt = new Date(NOW - (6 * 3_600_000 - 60_000)).toISOString();
      expect(pruningSlaTag({ status: 'submitted', createdAt }, NOW)?.tone).toBe('neutral');
    });

    it('warns from 6h up to 24h', () => {
      expect(pruningSlaTag({ status: 'submitted', createdAt: hoursAgo(6) }, NOW)).toEqual({
        tone: 'warn',
        label: 'SLA 6j',
      });
      expect(pruningSlaTag({ status: 'under_review', createdAt: hoursAgo(23) }, NOW)?.tone).toBe('warn');
    });

    it('goes bad at/after 24h', () => {
      expect(pruningSlaTag({ status: 'submitted', createdAt: hoursAgo(24) }, NOW)).toEqual({
        tone: 'bad',
        label: 'SLA 24j',
      });
      expect(pruningSlaTag({ status: 'submitted', createdAt: hoursAgo(72) }, NOW)?.tone).toBe('bad');
    });
  });

  describe('edge cases', () => {
    it('returns null for an unparseable createdAt', () => {
      expect(pruningSlaTag({ status: 'submitted', createdAt: 'not-a-date' }, NOW)).toBeNull();
    });

    it('clamps a future createdAt to 0 hours (neutral)', () => {
      expect(pruningSlaTag({ status: 'submitted', createdAt: hoursAgo(-5) }, NOW)).toEqual({
        tone: 'neutral',
        label: 'SLA 0j',
      });
    });

    it('defaults now to the current time when omitted', () => {
      // A just-created open request is fresh → neutral, regardless of wall clock.
      const tag = pruningSlaTag({ status: 'submitted', createdAt: new Date().toISOString() });
      expect(tag?.tone).toBe('neutral');
    });
  });
});
