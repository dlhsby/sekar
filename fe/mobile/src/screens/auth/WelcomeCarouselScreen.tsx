/**
 * WelcomeCarouselScreen — Phase 4 M3a / ADR-042 / Hifi WL-2…WL-5
 *
 * 4-slide pre-login carousel shown to logged-out users after the Splash screen.
 * It opens on "Pantau real-time" (WL-2) — the WL-1 brand splash is no longer a
 * slide here; it lives in `SplashScreen` + the native boot splash, so showing it
 * again would duplicate it.
 *
 * Behavior:
 * - "Lanjut" advances; "Masuk" on the last slide finishes → Login.
 * - "Lewati" (Skip) on slides 2-4 jumps straight to Login.
 * - Swipe-back disabled — this is a linear intro, not exploration.
 */

import React, { useCallback, useRef, useState } from 'react';
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
    backgroundColor: nbColors.navy, // deep navy per hifi WL-5
    textColor: nbColors.white,
  },
];

type Props = NativeStackScreenProps<Record<string, undefined>, 'WelcomeCarousel'>;

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
          backgroundColor: SLIDES[index]?.backgroundColor ?? nbColors.bgCanvas,
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
