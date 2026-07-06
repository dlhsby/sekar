/**
 * Generic draft persistence hook for AsyncStorage
 * Handles auto-save (with content check), restore (with TTL), clear
 * Parameterized over draft shape, storage key, TTL, auto-save interval
 */

import { useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UseDraftPersistenceOptions<TDraft> {
  /** Storage key for AsyncStorage */
  storageKey: string;
  /** TTL in ms; draft older than this is discarded. Default: 24h */
  ttlMs?: number;
  /** Auto-save interval in ms. Default: 30s */
  autoSaveIntervalMs?: number;
  /** Called to serialize draft before save (default: JSON.stringify) */
  serialize?: (draft: TDraft) => string;
  /** Called to deserialize draft after load (default: JSON.parse) */
  deserialize?: (raw: string) => TDraft;
  /** Predicate to decide if form has content worth auto-saving (default: always true) */
  hasContent?: (formRef: React.MutableRefObject<TDraft>) => boolean;
}

export interface UseDraftPersistenceReturn<TDraft> {
  /** Manually save the current draft (called on demand or by auto-save timer) */
  saveDraft: () => Promise<void>;
  /** Clear the stored draft */
  clearDraft: () => Promise<void>;
  /** Restore the draft from storage (if not expired) and invoke callback */
  restoreDraft: () => Promise<void>;
  /** Ref to the form/draft data (mutated by auto-save check) */
  formRef: React.MutableRefObject<TDraft>;
  /** Ref to the save function (used by auto-save interval) */
  saveDraftRef: React.MutableRefObject<() => Promise<void>>;
}

/**
 * Generic hook to manage draft persistence (save, restore, clear)
 * with auto-save interval and TTL expiry.
 *
 * @param form Current form/draft state
 * @param onRestoreDraft Callback when draft is restored from storage
 * @param options Configuration: storageKey, ttlMs, autoSaveIntervalMs, serialize/deserialize, hasContent
 * @returns Object with saveDraft, clearDraft, restoreDraft, formRef, saveDraftRef
 */
export function useDraftPersistence<TDraft>(
  form: TDraft,
  onRestoreDraft: (draft: TDraft) => void,
  options: UseDraftPersistenceOptions<TDraft>,
): UseDraftPersistenceReturn<TDraft> {
  const {
    storageKey,
    ttlMs = 24 * 60 * 60 * 1000, // 24 hours
    autoSaveIntervalMs = 30000, // 30 seconds
    serialize = (d) => JSON.stringify(d),
    deserialize = (raw) => JSON.parse(raw),
    hasContent = () => true,
  } = options;

  const formRef = useRef<TDraft>(form);
  const saveDraftRef = useRef<() => Promise<void>>(async () => {});

  // Keep formRef in sync with the passed form
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const saveDraft = useCallback(async () => {
    try {
      const serialized = serialize(form);
      await AsyncStorage.setItem(storageKey, serialized);
    } catch {
      // Silently fail — draft is best-effort
    }
  }, [form, serialize, storageKey]);

  // Keep saveDraftRef in sync
  useEffect(() => {
    saveDraftRef.current = saveDraft;
  }, [saveDraft]);

  const clearDraft = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(storageKey);
    } catch {
      // Silently fail
    }
  }, [storageKey]);

  const restoreDraft = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (!raw) return;
      const draft = deserialize(raw) as TDraft & { timestamp?: number };
      if (!draft.timestamp || Date.now() - draft.timestamp >= ttlMs) {
        await AsyncStorage.removeItem(storageKey);
        return;
      }
      // Call onRestoreDraft WITHOUT removing draft first — the callback is responsible
      // for deciding when to clear it (e.g., after user confirms an Alert dialog)
      onRestoreDraft(draft as TDraft);
    } catch {
      // Silently fail
    }
  }, [storageKey, deserialize, ttlMs, onRestoreDraft]);

  // Auto-save draft on interval while there's content
  useEffect(() => {
    const interval = setInterval(() => {
      if (hasContent(formRef)) {
        void saveDraftRef.current();
      }
    }, autoSaveIntervalMs);

    return () => clearInterval(interval);
  }, [hasContent, autoSaveIntervalMs]);

  return {
    saveDraft,
    clearDraft,
    restoreDraft,
    formRef,
    saveDraftRef,
  };
}
