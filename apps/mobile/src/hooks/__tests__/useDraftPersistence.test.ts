/**
 * Tests for generic useDraftPersistence hook
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDraftPersistence } from '../useDraftPersistence';

jest.useFakeTimers();

describe('useDraftPersistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  interface TestDraft {
    title: string;
    description: string;
    timestamp: number;
  }

  const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<
    typeof AsyncStorage.getItem
  >;
  const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<
    typeof AsyncStorage.setItem
  >;
  const mockRemoveItem = AsyncStorage.removeItem as jest.MockedFunction<
    typeof AsyncStorage.removeItem
  >;

  describe('basic operations', () => {
    it('should save draft to storage', async () => {
      const form: TestDraft = { title: 'Test', description: 'Desc', timestamp: 0 };
      const onRestore = jest.fn();

      const { result } = renderHook(() =>
        useDraftPersistence(form, onRestore, {
          storageKey: 'test_draft',
        })
      );

      await result.current.saveDraft();

      expect(mockSetItem).toHaveBeenCalledWith(
        'test_draft',
        JSON.stringify(form)
      );
    });

    it('should clear draft from storage', async () => {
      const form: TestDraft = { title: '', description: '', timestamp: 0 };
      const onRestore = jest.fn();

      const { result } = renderHook(() =>
        useDraftPersistence(form, onRestore, {
          storageKey: 'test_draft',
        })
      );

      await result.current.clearDraft();

      expect(mockRemoveItem).toHaveBeenCalledWith('test_draft');
    });

    it('should restore valid draft from storage', async () => {
      const onRestore = jest.fn();
      const now = Date.now();
      const savedDraft: TestDraft = {
        title: 'Saved Title',
        description: 'Saved Desc',
        timestamp: now,
      };

      mockGetItem.mockResolvedValueOnce(JSON.stringify(savedDraft));

      const form: TestDraft = { title: '', description: '', timestamp: 0 };
      const { result } = renderHook(() =>
        useDraftPersistence(form, onRestore, {
          storageKey: 'test_draft',
          ttlMs: 24 * 60 * 60 * 1000, // 24 hours
        })
      );

      await result.current.restoreDraft();

      expect(onRestore).toHaveBeenCalledWith(savedDraft);
      // Note: removeItem is NOT called by restoreDraft — the callback is responsible
      // for deciding when/if to clear the draft (e.g., after user confirms an Alert)
    });

    it('should discard expired draft', async () => {
      const onRestore = jest.fn();
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
      const expiredDraft: TestDraft = {
        title: 'Old Title',
        description: 'Old Desc',
        timestamp: twoMinutesAgo,
      };

      mockGetItem.mockResolvedValueOnce(JSON.stringify(expiredDraft));

      const form: TestDraft = { title: '', description: '', timestamp: 0 };
      const { result } = renderHook(() =>
        useDraftPersistence(form, onRestore, {
          storageKey: 'test_draft',
          ttlMs: 60 * 1000, // 1 minute TTL
        })
      );

      await result.current.restoreDraft();

      expect(onRestore).not.toHaveBeenCalled();
      expect(mockRemoveItem).toHaveBeenCalledWith('test_draft');
    });

    it('should handle restore when no draft exists', async () => {
      const onRestore = jest.fn();
      mockGetItem.mockResolvedValueOnce(null);

      const form: TestDraft = { title: '', description: '', timestamp: 0 };
      const { result } = renderHook(() =>
        useDraftPersistence(form, onRestore, {
          storageKey: 'test_draft',
        })
      );

      await result.current.restoreDraft();

      expect(onRestore).not.toHaveBeenCalled();
      expect(mockRemoveItem).not.toHaveBeenCalled();
    });
  });

  describe('auto-save with hasContent predicate', () => {
    it('should auto-save when content exists', async () => {
      const form: TestDraft = { title: 'Content', description: '', timestamp: 0 };
      const onRestore = jest.fn();

      const { rerender } = renderHook(
        (f) =>
          useDraftPersistence(f, onRestore, {
            storageKey: 'test_draft',
            autoSaveIntervalMs: 1000,
            hasContent: (fRef) => (fRef.current as TestDraft).title.length > 0,
          }),
        {
          initialProps: form,
        }
      );

      // Advance timers to trigger auto-save
      jest.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(mockSetItem).toHaveBeenCalled();
      });

      mockSetItem.mockClear();

      // Update form to have no content
      rerender({ title: '', description: '', timestamp: 0 });

      jest.advanceTimersByTime(1000);

      // Auto-save should not fire because hasContent returns false
      expect(mockSetItem).not.toHaveBeenCalled();
    });

    it('should not auto-save when hasContent returns false', async () => {
      const form: TestDraft = { title: '', description: '', timestamp: 0 };
      const onRestore = jest.fn();

      renderHook(() =>
        useDraftPersistence(form, onRestore, {
          storageKey: 'test_draft',
          autoSaveIntervalMs: 1000,
          hasContent: (() => false) as (fRef: React.MutableRefObject<unknown>) => boolean,
        })
      );

      jest.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(mockSetItem).not.toHaveBeenCalled();
      });
    });

    it('should respect custom autoSaveIntervalMs', async () => {
      const form: TestDraft = { title: 'Content', description: '', timestamp: 0 };
      const onRestore = jest.fn();

      renderHook(() =>
        useDraftPersistence(form, onRestore, {
          storageKey: 'test_draft',
          autoSaveIntervalMs: 5000, // 5 seconds
          hasContent: () => true,
        })
      );

      // Before 5 seconds, no save
      jest.advanceTimersByTime(3000);
      expect(mockSetItem).not.toHaveBeenCalled();

      // At 5 seconds, save fires
      jest.advanceTimersByTime(2000);
      await waitFor(() => {
        expect(mockSetItem).toHaveBeenCalled();
      });
    });
  });

  describe('custom serialize/deserialize', () => {
    it('should use custom serialize function', async () => {
      const form: TestDraft = { title: 'Test', description: 'Desc', timestamp: 0 };
      const onRestore = jest.fn();
      const customSerialize = jest.fn((d) => `custom:${JSON.stringify(d)}`);

      const { result } = renderHook(() =>
        useDraftPersistence(form, onRestore, {
          storageKey: 'test_draft',
          serialize: customSerialize,
        })
      );

      await result.current.saveDraft();

      expect(customSerialize).toHaveBeenCalledWith(form);
      expect(mockSetItem).toHaveBeenCalledWith(
        'test_draft',
        `custom:${JSON.stringify(form)}`
      );
    });

    it('should use custom deserialize function', async () => {
      const onRestore = jest.fn();
      const savedJson = JSON.stringify({ title: 'Saved', description: 'Desc', timestamp: Date.now() });
      mockGetItem.mockResolvedValueOnce(`custom:${savedJson}`);

      const customDeserialize = jest.fn((raw) => {
        const json = raw.replace(/^custom:/, '');
        return JSON.parse(json);
      });

      const form: TestDraft = { title: '', description: '', timestamp: 0 };
      const { result } = renderHook(() =>
        useDraftPersistence(form, onRestore, {
          storageKey: 'test_draft',
          deserialize: customDeserialize,
        })
      );

      await result.current.restoreDraft();

      expect(customDeserialize).toHaveBeenCalled();
      expect(onRestore).toHaveBeenCalled();
    });
  });

  describe('formRef and saveDraftRef tracking', () => {
    it('should keep formRef in sync with form prop', async () => {
      const form1: TestDraft = { title: 'Form1', description: 'Desc1', timestamp: 0 };
      const form2: TestDraft = { title: 'Form2', description: 'Desc2', timestamp: 0 };
      const onRestore = jest.fn();

      const { result, rerender } = renderHook(
        (f) =>
          useDraftPersistence(f, onRestore, {
            storageKey: 'test_draft',
          }),
        {
          initialProps: form1,
        }
      );

      expect(result.current.formRef.current).toEqual(form1);

      rerender(form2);

      expect(result.current.formRef.current).toEqual(form2);
    });

    it('should keep saveDraftRef callable with current form', async () => {
      const form: TestDraft = { title: 'Initial', description: '', timestamp: 0 };
      const onRestore = jest.fn();

      const { result } = renderHook(() =>
        useDraftPersistence(form, onRestore, {
          storageKey: 'test_draft',
        })
      );

      // Call saveDraftRef directly
      await result.current.saveDraftRef.current();

      expect(mockSetItem).toHaveBeenCalledWith(
        'test_draft',
        JSON.stringify(form)
      );
    });
  });

  describe('error handling', () => {
    it('should silently fail on save error', async () => {
      const form: TestDraft = { title: 'Test', description: '', timestamp: 0 };
      const onRestore = jest.fn();
      mockSetItem.mockRejectedValueOnce(new Error('Storage error'));

      const { result } = renderHook(() =>
        useDraftPersistence(form, onRestore, {
          storageKey: 'test_draft',
        })
      );

      // Should not throw
      await expect(result.current.saveDraft()).resolves.toBeUndefined();
    });

    it('should silently fail on clear error', async () => {
      const form: TestDraft = { title: '', description: '', timestamp: 0 };
      const onRestore = jest.fn();
      mockRemoveItem.mockRejectedValueOnce(new Error('Storage error'));

      const { result } = renderHook(() =>
        useDraftPersistence(form, onRestore, {
          storageKey: 'test_draft',
        })
      );

      // Should not throw
      await expect(result.current.clearDraft()).resolves.toBeUndefined();
    });

    it('should silently fail on restore error', async () => {
      const onRestore = jest.fn();
      mockGetItem.mockRejectedValueOnce(new Error('Storage error'));

      const form: TestDraft = { title: '', description: '', timestamp: 0 };
      const { result } = renderHook(() =>
        useDraftPersistence(form, onRestore, {
          storageKey: 'test_draft',
        })
      );

      // Should not throw
      await expect(result.current.restoreDraft()).resolves.toBeUndefined();
      expect(onRestore).not.toHaveBeenCalled();
    });

    it('should silently fail on JSON parse error during restore', async () => {
      const onRestore = jest.fn();
      mockGetItem.mockResolvedValueOnce('not valid json');

      const form: TestDraft = { title: '', description: '', timestamp: 0 };
      const { result } = renderHook(() =>
        useDraftPersistence(form, onRestore, {
          storageKey: 'test_draft',
        })
      );

      // Should not throw
      await expect(result.current.restoreDraft()).resolves.toBeUndefined();
      expect(onRestore).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should clear auto-save interval on unmount', () => {
      const form: TestDraft = { title: 'Content', description: '', timestamp: 0 };
      const onRestore = jest.fn();
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const { unmount } = renderHook(() =>
        useDraftPersistence(form, onRestore, {
          storageKey: 'test_draft',
          autoSaveIntervalMs: 1000,
          hasContent: () => true,
        })
      );

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });
});
