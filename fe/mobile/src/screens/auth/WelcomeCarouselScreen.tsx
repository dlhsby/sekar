/**
 * WelcomeCarouselScreen — Phase 4 M3a / ADR-042 / Hifi WL-2…WL-5
 *
 * 4-slide pre-login intro shown to logged-out users after the Splash screen.
 * Each slide's illustration + title + subtitle swipe together; only the dot
 * pagination and the CTAs are pinned in a fixed footer that reflects the
 * active slide.
 *
 * Behavior:
 * - "Lanjut" advances; the last slide promotes a single "Mulai (Masuk)" → Login.
 * - "Lewati" jumps to the last slide (it does NOT skip straight to Login).
 * - Login is pushed (not replaced) so it can navigate back here.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
import { NBButton, NBText } from '../../components/nb';
import { CarouselScenePanel } from '../../components/auth/CarouselScenePanel';
import { PaginationDots } from '../../components/auth/PaginationDots';
import { SceneLiveMap } from '../../components/auth/scenes/SceneLiveMap';
import { SceneChecklist } from '../../components/auth/scenes/SceneChecklist';
import { SceneRequests } from '../../components/auth/scenes/SceneRequests';
import { SceneOffline } from '../../components/auth/scenes/SceneOffline';
import { markCarouselSeen } from '../../services/storage/asyncStorageKeys';

const { width } = Dimensions.get('window');

interface Slide {
  id: string;
  title: string;
  highlight: string;
  body: string;
  illustrationBg?: string;
  scene: React.ReactNode;
}

const SLIDES: Slide[] = [
  {
    id: 'WL-2',
    title: 'Pantau tim secara real-time',
    highlight: 'real-time',
    body: 'Lihat posisi semua satgas di lapangan. Status hidup, langsung dari GPS.',
    scene: <SceneLiveMap />,
  },
  {
    id: 'WL-3',
    title: 'Tugas terstruktur tiap shift',
    highlight: 'terstruktur',
    body: 'Korlap kasih briefing & checklist. Selesai patroli, tinggal tap.',
    scene: <SceneChecklist />,
    illustrationBg: nbColors.bgAccentYellow,
  },
  {
    id: 'WL-4',
    title: 'Permohonan kecamatan, cepat',
    highlight: 'cepat',
    body: 'Ajukan perantingan langsung dari lapangan. Admin lihat, putuskan.',
    scene: <SceneRequests />,
    illustrationBg: nbColors.bgAccentPink,
  },
  {
    id: 'WL-5',
    title: 'Tetap jalan tanpa sinyal',
    highlight: 'jalan',
    body: 'Catatan tersimpan offline. Sinkron otomatis saat sinyal balik.',
    scene: <SceneOffline />,
    illustrationBg: nbColors.navy,
  },
];

const LAST = SLIDES.length - 1;

function SlideTitle({ title, highlight }: { title: string; highlight: string }): React.JSX.Element {
  if (!title.includes(highlight)) {
    return (
      <NBText variant="h1" style={styles.title}>
        {title}
      </NBText>
    );
  }
  const [before, after] = title.split(highlight);
  return (
    <NBText variant="h1" style={styles.title}>
      {before}
      <NBText variant="h1" color="primaryActive">
        {highlight}
      </NBText>
      {after}
    </NBText>
  );
}

type Props = NativeStackScreenProps<Record<string, undefined>, 'WelcomeCarousel'>;

export function WelcomeCarouselScreen({ navigation }: Props): React.JSX.Element {
  const [activeIndex, setActiveIndex] = useState(0);
  const [areaHeight, setAreaHeight] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const goToLogin = useCallback(async () => {
    await markCarouselSeen();
    // Push (not replace) so Login can navigate back to the carousel.
    navigation.navigate('Login');
  }, [navigation]);

  const scrollTo = useCallback((i: number) => {
    setActiveIndex(i);
    listRef.current?.scrollToIndex({ index: i, animated: true });
  }, []);

  const onMomentumScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  }, []);

  const onAreaLayout = useCallback((e: LayoutChangeEvent) => {
    setAreaHeight(e.nativeEvent.layout.height);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Slide }) => (
      <View style={[styles.slidePage, { width, height: areaHeight }]}>
        <CarouselScenePanel bg={item.illustrationBg} testID={`carousel-slide-${item.id}`}>
          {item.scene}
        </CarouselScenePanel>
        <SlideTitle title={item.title} highlight={item.highlight} />
        <NBText variant="body-sm" color="gray700" style={styles.body}>
          {item.body}
        </NBText>
      </View>
    ),
    [areaHeight],
  );

  const isLast = activeIndex >= LAST;

  return (
    <SafeAreaView style={styles.root} testID="welcome-carousel-screen">
      <View style={styles.swipeArea} onLayout={onAreaLayout}>
        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          bounces={false}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        />
      </View>

      <View style={styles.footer}>
        <PaginationDots variant="dots" total={SLIDES.length} index={activeIndex} style={styles.dots} />
        <NBButton
          title={isLast ? 'Mulai (Masuk)' : 'Lanjut'}
          variant="primary"
          fullWidth
          onPress={isLast ? goToLogin : () => scrollTo(activeIndex + 1)}
          testID="carousel-primary"
        />
        {!isLast ? (
          <NBButton
            title="Lewati"
            variant="ghost"
            fullWidth
            onPress={() => scrollTo(LAST)}
            testID="carousel-skip"
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: nbColors.bgCanvas },
  // No padding here: areaHeight (measured) must equal the FlatList viewport so
  // item height matches and the slide's description isn't clipped at the bottom.
  swipeArea: { flex: 1 },
  slidePage: {
    paddingHorizontal: nbSpacing.lg,
    paddingTop: nbSpacing.md,
    paddingBottom: nbSpacing.md,
  },
  title: { marginTop: nbSpacing.md, marginBottom: nbSpacing.sm },
  body: { marginBottom: nbSpacing.sm },
  footer: { paddingHorizontal: nbSpacing.lg, paddingBottom: nbSpacing.lg, paddingTop: nbSpacing.sm },
  dots: { marginBottom: nbSpacing.md },
});

export default WelcomeCarouselScreen;
