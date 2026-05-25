/**
 * WelcomeCarouselScreen — Phase 4 M3a / ADR-042 / Hifi WL-1…WL-5
 *
 * 5-slide pre-login carousel shown on first launch. After dismissal
 * (`carousel_seen=true`), RootNavigator skips this gate and lands users on
 * Login directly.
 *
 * Behavior decisions (resolved inline, ui-ux.md ambiguity table):
 * - Auto-advance: 2.5s on WL-1 only. Slides 2-5 wait for user input.
 * - "Lewati" (Skip) on slides 1-4 jumps to Login + sets the flag.
 * - "Lanjut" advances; "Masuk" on WL-5 finishes + navigates to Login.
 * - Swipe-back disabled — this is a linear onboarding, not exploration.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { nbColors } from '../../constants/nbTokens';
import { OnboardingSlide } from '../../components/auth/OnboardingSlide';
import { markCarouselSeen } from '../../services/storage/asyncStorageKeys';

const { width } = Dimensions.get('window');
const AUTO_ADVANCE_MS = 2500;

interface Slide {
  id: string;
  title: string;
  body: string;
  emoji: string; // placeholder for the real SVG illustration shipped by design
  backgroundColor?: string;
  textColor?: string;
}

const SLIDES: Slide[] = [
  {
    id: 'WL-1',
    title: 'SEKAR',
    body: 'Pantau dan kelola ruang hijau Surabaya.',
    emoji: '🌳',
  },
  {
    id: 'WL-2',
    title: 'Pantau Real-time',
    body: 'Lihat status tim dan kondisi taman secara langsung di peta.',
    emoji: '🗺️',
  },
  {
    id: 'WL-3',
    title: 'Tugas Terstruktur',
    body: 'Susun perantingan, perawatan, dan penanaman dalam satu alur kerja.',
    emoji: '📋',
  },
  {
    id: 'WL-4',
    title: 'Permohonan Publik',
    body: 'Terima dan tangani permohonan kecamatan dengan cepat.',
    emoji: '📨',
  },
  {
    id: 'WL-5',
    title: 'Bekerja Offline',
    body: 'Tetap produktif di lapangan walau sinyal tidak stabil.',
    emoji: '📡',
    backgroundColor: '#1A4D2E', // navy per hifi WL-5
    textColor: '#FFFFFF',
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = NativeStackScreenProps<any, 'WelcomeCarousel'>;

export function WelcomeCarouselScreen({ navigation }: Props): React.JSX.Element {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const finish = useCallback(async () => {
    await markCarouselSeen();
    // Replace so the carousel doesn't sit on the stack.
    navigation.replace('Login');
  }, [navigation]);

  const advance = useCallback(() => {
    setIndex((i) => {
      const next = Math.min(i + 1, SLIDES.length - 1);
      listRef.current?.scrollToIndex({ index: next, animated: true });
      return next;
    });
  }, []);

  // Auto-advance only fires on WL-1; users drive the rest manually so reading
  // pace isn't dictated by a timer.
  useEffect(() => {
    if (index !== 0) return;
    const t = setTimeout(advance, AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
  }, [index, advance]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(newIndex);
  }, []);

  const renderItem = useCallback(
    ({ item, index: i }: { item: Slide; index: number }) => {
      const isLast = i === SLIDES.length - 1;
      return (
        <View style={{ width }}>
          <OnboardingSlide
            title={item.title}
            body={item.body}
            illustration={
              <View
                style={[
                  styles.illoPlaceholder,
                  item.backgroundColor ? { backgroundColor: 'rgba(255,255,255,0.08)' } : null,
                ]}
                accessibilityLabel={item.title}
              >
                {/* Final hifi assets ship as SVG; emoji is the placeholder until
                    `design/project/illustrations.html` exports are vendored. */}
                <Text style={styles.illoEmoji}>{item.emoji}</Text>
              </View>
            }
            primaryLabel={isLast ? 'Masuk' : 'Lanjut'}
            onPrimaryPress={isLast ? finish : advance}
            secondaryLabel={isLast ? undefined : 'Lewati'}
            onSecondaryPress={isLast ? undefined : finish}
            index={i}
            total={SLIDES.length}
            backgroundColor={item.backgroundColor}
            textColor={item.textColor}
            testID={`carousel-slide-${item.id}`}
          />
        </View>
      );
    },
    [advance, finish],
  );

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor:
            SLIDES[index]?.backgroundColor ??
            ((nbColors as Record<string, string>).paper ?? '#F5F0EB'),
        },
      ]}
      testID="welcome-carousel-screen"
    >
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        bounces={false}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  illoPlaceholder: {
    width: 220,
    height: 220,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  illoEmoji: { fontSize: 96 },
});

export default WelcomeCarouselScreen;
