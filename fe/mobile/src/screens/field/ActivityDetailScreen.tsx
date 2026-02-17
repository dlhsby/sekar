/**
 * Activity Detail Screen
 * Phase 2C: Read-only view of a submitted activity
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getActivityById } from '../../services/api/activitiesApi';
import { NBCard, NBCardHeader, NBCardContent, NBBackgroundPattern } from '../../components/nb';
import { nbColors, nbSpacing, nbTypography, nbBorders, nbBorderRadius, nbShadows } from '../../constants/nbTokens';
import type { Activity } from '../../types/models.types';

type RouteParams = {
  activityId: string;
};

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ActivityDetailScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const route = useRoute();
  const { activityId } = route.params as RouteParams;

  const [activity, setActivity] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Set up header with back button
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: 'Detail Aktivitas',
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('TasksActivities' as never)}
          style={styles.backButton}
          accessibilityLabel="Kembali"
          accessibilityRole="button"
        >
          <Icon name="arrow-left" size={24} color={nbColors.black} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const response = await getActivityById(activityId);
        if (response.data) {
          setActivity(response.data);
        } else if (response.error) {
          Alert.alert('Error', response.error);
          navigation.navigate('TasksActivities' as never);
        }
      } catch {
        Alert.alert('Error', 'Gagal memuat detail aktivitas');
        navigation.navigate('TasksActivities' as never);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [activityId, navigation]);

  if (isLoading) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.background}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <Text style={styles.loadingText}>Memuat data...</Text>
        </View>
      </NBBackgroundPattern>
    );
  }

  if (!activity) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.background}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.container} />
      </NBBackgroundPattern>
    );
  }

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.background}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {/* General Information Card - Merged Time & Worker */}
        <NBCard style={styles.card}>
          <NBCardHeader>
            <Text style={styles.sectionTitle}>📋 INFORMASI UMUM</Text>
          </NBCardHeader>
          <NBCardContent>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Tanggal & Waktu</Text>
              <Text style={styles.value}>{formatDateTime(activity.created_at)}</Text>
            </View>
            {activity.user && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Nama Petugas</Text>
                <Text style={styles.value}>{activity.user.full_name}</Text>
              </View>
            )}
            {activity.area?.name && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Area</Text>
                <Text style={styles.value}>{activity.area.name}</Text>
              </View>
            )}
          </NBCardContent>
        </NBCard>

        {/* Photos Card - Matching creation form order */}
        {activity.photo_urls.length > 0 && (
          <NBCard style={styles.card}>
            <NBCardHeader>
              <Text style={styles.sectionTitle}>📸 FOTO AKTIVITAS</Text>
              <Text style={styles.sectionSubtitle}>{activity.photo_urls.length} foto dilampirkan</Text>
            </NBCardHeader>
            <NBCardContent>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photosContainer}
              >
                {activity.photo_urls.map((url, index) => (
                  <Image
                    key={index}
                    source={{ uri: url }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            </NBCardContent>
          </NBCard>
        )}

        {/* Activity Type Card */}
        {activity.activityType && (
          <NBCard style={styles.card}>
            <NBCardHeader>
              <Text style={styles.sectionTitle}>🏷️ JENIS AKTIVITAS</Text>
            </NBCardHeader>
            <NBCardContent>
              <Text style={styles.value}>{activity.activityType.name}</Text>
              {activity.activityType.description && (
                <Text style={styles.description}>{activity.activityType.description}</Text>
              )}
            </NBCardContent>
          </NBCard>
        )}

        {/* Description Card */}
        <NBCard style={styles.card}>
          <NBCardHeader>
            <Text style={styles.sectionTitle}>📝 DESKRIPSI PEKERJAAN</Text>
          </NBCardHeader>
          <NBCardContent>
            <Text style={styles.descriptionText}>{activity.description}</Text>
          </NBCardContent>
        </NBCard>

        {/* GPS Location Card */}
        {activity.gps_lat != null && activity.gps_lng != null ? (
          <NBCard style={styles.card}>
            <NBCardHeader>
              <Text style={styles.sectionTitle}>📍 LOKASI GPS</Text>
            </NBCardHeader>
            <NBCardContent>
              <View style={styles.locationContainer}>
                <Text style={styles.locationText}>
                  {activity.gps_lat != null && activity.gps_lng != null
                    ? `${Number(activity.gps_lat).toFixed(6)}, ${Number(activity.gps_lng).toFixed(6)}`
                    : 'Koordinat tidak tersedia'}
                </Text>
              </View>
            </NBCardContent>
          </NBCard>
        ) : null}
      </ScrollView>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: nbSpacing.md,
  },
  loadingText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray[600],
  },
  contentContainer: {
    paddingVertical: nbSpacing.md,
    paddingBottom: nbSpacing['2xl'],
  },
  backButton: {
    marginLeft: nbSpacing.md,
    padding: nbSpacing.xs,
  },
  card: {
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
    ...nbShadows.sm,
  },
  sectionTitle: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray[600],
    marginTop: nbSpacing.xs,
  },
  infoRow: {
    marginBottom: nbSpacing.md,
  },
  label: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.gray[700],
    marginBottom: nbSpacing.xs,
  },
  value: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.black,
  },
  description: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.gray[600],
    marginTop: nbSpacing.xs,
  },
  descriptionText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.black,
    lineHeight: nbTypography.fontSize.base * 1.5,
  },
  photosContainer: {
    gap: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
  },
  photo: {
    width: 160,
    height: 160,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  locationContainer: {
    padding: nbSpacing.md,
    backgroundColor: nbColors.gray[50],
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
  },
  locationText: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },
});
