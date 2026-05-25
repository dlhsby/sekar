import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ASYNC_STORAGE_KEYS,
  clearEntryFlowFlags,
  hasCompletedOnboarding,
  hasSeenCarousel,
  markCarouselSeen,
  markOnboardingCompleted,
} from '../asyncStorageKeys';

describe('asyncStorageKeys helpers', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('carousel flag', () => {
    it('hasSeenCarousel returns false when unset', async () => {
      expect(await hasSeenCarousel()).toBe(false);
    });

    it('hasSeenCarousel returns true after markCarouselSeen', async () => {
      await markCarouselSeen();
      expect(await hasSeenCarousel()).toBe(true);
      expect(await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.CAROUSEL_SEEN)).toBe('true');
    });
  });

  describe('onboarding flag (user-scoped)', () => {
    it('hasCompletedOnboarding returns false when unset', async () => {
      expect(await hasCompletedOnboarding('user-1')).toBe(false);
    });

    it('hasCompletedOnboarding returns true only for the matching user', async () => {
      await markOnboardingCompleted('user-1');
      expect(await hasCompletedOnboarding('user-1')).toBe(true);
      expect(await hasCompletedOnboarding('user-2')).toBe(false);
    });

    it('writes the user-scoped key', async () => {
      await markOnboardingCompleted('user-1');
      const raw = await AsyncStorage.getItem(
        `${ASYNC_STORAGE_KEYS.ONBOARDING_COMPLETED_PREFIX}user-1`,
      );
      expect(raw).toBe('true');
    });
  });

  describe('clearEntryFlowFlags', () => {
    it('removes carousel + onboarding flags but leaves other keys alone', async () => {
      await markCarouselSeen();
      await markOnboardingCompleted('user-1');
      await AsyncStorage.setItem('unrelated:key', 'keep-me');

      await clearEntryFlowFlags();

      expect(await hasSeenCarousel()).toBe(false);
      expect(await hasCompletedOnboarding('user-1')).toBe(false);
      expect(await AsyncStorage.getItem('unrelated:key')).toBe('keep-me');
    });
  });
});
