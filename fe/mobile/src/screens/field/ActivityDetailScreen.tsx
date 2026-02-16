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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getActivityById } from '../../services/api/activitiesApi';
import { NBCard, NBBackgroundPattern } from '../../components/nb';
import { nbColors, nbSpacing, nbTypography, nbBorders, nbBorderRadius } from '../../constants/nbTokens';
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

  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const response = await getActivityById(activityId);
        if (response.data) {
          setActivity(response.data);
        } else if (response.error) {
          Alert.alert('Error', response.error);
          navigation.goBack();
        }
      } catch {
        Alert.alert('Error', 'Gagal memuat detail aktivitas');
        navigation.goBack();
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [activityId, navigation]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <NBBackgroundPattern style={styles.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <Text style={styles.loadingText}>Memuat data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!activity) {
    return <SafeAreaView style={styles.container} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <NBBackgroundPattern style={styles.background} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Detail Aktivitas</Text>
        </View>

        {/* Activity Type */}
        {activity.activityType && (
          <NBCard style={styles.card}>
            <Text style={styles.sectionTitle}>Jenis Aktivitas</Text>
            <Text style={styles.sectionValue}>{activity.activityType.name}</Text>
          </NBCard>
        )}

        {/* Description */}
        <NBCard style={styles.card}>
          <Text style={styles.sectionTitle}>Deskripsi</Text>
          <Text style={styles.sectionValue}>{activity.description}</Text>
        </NBCard>

        {/* Area */}
        {activity.area?.name && (
          <NBCard style={styles.card}>
            <Text style={styles.sectionTitle}>Area</Text>
            <Text style={styles.sectionValue}>{activity.area.name}</Text>
          </NBCard>
        )}

        {/* Photos */}
        {activity.photo_urls.length > 0 && (
          <NBCard style={styles.card}>
            <Text style={styles.sectionTitle}>Foto ({activity.photo_urls.length})</Text>
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
          </NBCard>
        )}

        {/* GPS */}
        {activity.gps_lat != null && activity.gps_lng != null && (
          <NBCard style={styles.card}>
            <Text style={styles.sectionTitle}>Lokasi GPS</Text>
            <Text style={styles.sectionValue}>
              {activity.gps_lat.toFixed(6)}, {activity.gps_lng.toFixed(6)}
            </Text>
          </NBCard>
        )}

        {/* Timestamp */}
        <NBCard style={styles.card}>
          <Text style={styles.sectionTitle}>Dibuat Pada</Text>
          <Text style={styles.sectionValue}>{formatDateTime(activity.created_at)}</Text>
        </NBCard>

        {/* User */}
        {activity.user && (
          <NBCard style={styles.card}>
            <Text style={styles.sectionTitle}>Petugas</Text>
            <Text style={styles.sectionValue}>{activity.user.full_name}</Text>
          </NBCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: nbColors.background,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  scrollContent: {
    paddingBottom: nbSpacing['2xl'],
  },
  header: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
    backgroundColor: nbColors.white,
    borderBottomWidth: nbBorders.base,
    borderBottomColor: nbColors.black,
  },
  headerTitle: {
    fontSize: nbTypography.fontSize['2xl'],
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
  card: {
    margin: nbSpacing.md,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.gray[600],
    marginBottom: nbSpacing.xs,
  },
  sectionValue: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.black,
  },
  photosContainer: {
    gap: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
  },
  photo: {
    width: 150,
    height: 150,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
  },
});
