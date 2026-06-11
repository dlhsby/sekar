/**
 * usePruningDraftPersistence — Draft save/restore via AsyncStorage with TTL.
 * Manages auto-save interval, draft restoration, and cleanup.
 */

import { useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PickedWeek } from '../components/WeekPicker';

// ─── Constants ─────────────────────────────────────────────────────

const DRAFT_KEY = 'pruning_request_draft';
const DRAFT_TTL = 24 * 60 * 60 * 1000; // 24 hours
const AUTO_SAVE_INTERVAL = 30000; // 30 s

// ─── Types ────────────────────────────────────────────────────────

export interface DraftShape {
  rayonId: string;
  kecamatanName: string;
  address: string;
  treeCount: string;
  treeHeight: string;
  treeDiameter: string;
  requesterName: string;
  requesterPhone: string;
  rtLeaderName: string;
  rtLeaderPhone: string;
  notes: string;
  gpsLat: number | null;
  gpsLng: number | null;
  expectedWeek: PickedWeek | null;
  timestamp: number;
}

// ─── Hook ──────────────────────────────────────────────────────────

interface UsePruningDraftPersistenceOptions {
  formRef: React.MutableRefObject<DraftShape>;
  photosLength: number;
  onRestoreCallback?: (draft: DraftShape) => void;
}

export function usePruningDraftPersistence({
  formRef,
  photosLength,
  onRestoreCallback,
}: UsePruningDraftPersistenceOptions) {
  const saveDraftRef = useRef<() => Promise<void>>(async () => {});

  const saveDraft = useCallback(async () => {
    try {
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(formRef.current));
    } catch {
      /* silent — draft is best-effort */
    }
  }, [formRef]);

  saveDraftRef.current = saveDraft;

  const clearDraft = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(DRAFT_KEY);
    } catch {
      /* silent */
    }
  }, []);

  const hasContent = useCallback((): boolean => {
    const f = formRef.current;
    return !!(
      f.address.trim() ||
      f.treeCount.trim() ||
      f.treeHeight.trim() ||
      f.treeDiameter.trim() ||
      f.requesterName.trim() ||
      f.requesterPhone.trim() ||
      f.rtLeaderName.trim() ||
      f.rtLeaderPhone.trim() ||
      f.notes.trim() ||
      !!f.expectedWeek ||
      photosLength > 0
    );
  }, [photosLength, formRef]);

  const restoreDraft = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as DraftShape;
      if (!draft.timestamp || Date.now() - draft.timestamp >= DRAFT_TTL) {
        await AsyncStorage.removeItem(DRAFT_KEY);
        return;
      }
      if (onRestoreCallback) {
        onRestoreCallback(draft);
      }
    } catch {
      /* silent */
    }
  }, [onRestoreCallback]);

  // Auto-save draft every 30s while there's content.
  useEffect(() => {
    const interval = setInterval(() => {
      if (formRef.current.address.trim() || formRef.current.treeCount.trim()) {
        void saveDraftRef.current();
      }
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [formRef]);

  return {
    saveDraft,
    clearDraft,
    restoreDraft,
    hasContent,
    DRAFT_KEY,
    DRAFT_TTL,
  };
}
