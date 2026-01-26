# Phase 4 - Mobile Implementation Guide
# Asset Management & QR Code Integration

**Duration:** 7 days
**Prerequisites:** Phase 3 mobile deployed, backend Phase 4 complete
**Target:** React Native 0.76.x, iOS/Android

---

## Overview

Implement asset management features allowing workers to scan QR codes, view asset details, report maintenance needs, and track asset history. Supervisors can view asset status, assign maintenance tasks, and monitor asset health across all areas.

---

## Timeline

| Day | Focus | Deliverables |
|-----|-------|--------------|
| Day 1 | QR Scanner Setup | Camera permissions, scanner component |
| Day 2-3 | Worker Asset Features | Asset detail, maintenance report |
| Day 4-5 | Supervisor Asset Features | Asset dashboard, bulk management |
| Day 6 | Asset History | Timeline, notifications |
| Day 7 | Testing & Polish | QR scanning, offline support |

---

## Technical Architecture

### QR Code Format

```
sekar://asset/{asset_id}
Example: sekar://asset/550e8400-e29b-41d4-a716-446655440000
```

**QR Code Generation (Backend):**
- Generated server-side with asset UUID
- Printable A4 format with asset name/location
- Includes backup numeric code for manual entry

### Dependencies

```json
{
  "react-native-vision-camera": "^4.0.0",
  "vision-camera-code-scanner": "^1.0.0",
  "react-native-permissions": "^4.1.0"
}
```

**Installation:**
```bash
cd fe/mobile
npm install react-native-vision-camera vision-camera-code-scanner
npx pod-install ios
```

---

## 1. QR Scanner Component

### Camera Permissions Setup

**Android (android/app/src/main/AndroidManifest.xml):**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
```

**iOS (ios/SekarApp/Info.plist):**
```xml
<key>NSCameraUsageDescription</key>
<string>SEKAR memerlukan akses kamera untuk scan QR code aset</string>
```

### QRCodeScanner Component

**Path:** `src/components/assets/QRCodeScanner.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Linking, Alert, Platform } from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface QRCodeScannerProps {
  onScan: (assetId: string) => void;
  onClose: () => void;
}

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScan, onClose }) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const device = useCameraDevice('back');

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const permission = Platform.OS === 'ios'
      ? PERMISSIONS.IOS.CAMERA
      : PERMISSIONS.ANDROID.CAMERA;

    const result = await check(permission);

    if (result === RESULTS.GRANTED) {
      setHasPermission(true);
      return;
    }

    if (result === RESULTS.DENIED) {
      const requestResult = await request(permission);
      setHasPermission(requestResult === RESULTS.GRANTED);
    } else if (result === RESULTS.BLOCKED) {
      Alert.alert(
        'Izin Kamera Diblokir',
        'Buka Pengaturan untuk mengaktifkan akses kamera.',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Buka Pengaturan', onPress: () => Linking.openSettings() },
        ]
      );
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (!isActive || codes.length === 0) return;

      const code = codes[0];
      const value = code.value;

      // Validate SEKAR QR format: sekar://asset/{uuid}
      const match = value?.match(/^sekar:\/\/asset\/([a-f0-9-]{36})$/i);

      if (match) {
        setIsActive(false); // Prevent multiple scans
        onScan(match[1]);
      } else {
        Alert.alert(
          'QR Code Tidak Valid',
          'QR code ini bukan kode aset SEKAR yang valid.',
          [{ text: 'OK', onPress: () => setIsActive(true) }]
        );
      }
    },
  });

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Icon name="camera-off" size={64} color="#ccc" />
        <Text style={styles.permissionText}>
          Izin kamera diperlukan untuk scan QR code
        </Text>
        <TouchableOpacity onPress={requestCameraPermission} style={styles.button}>
          <Text style={styles.buttonText}>Izinkan Akses Kamera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text>Kamera tidak tersedia</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        codeScanner={codeScanner}
      />

      {/* Overlay with scanning frame */}
      <View style={styles.overlay}>
        <View style={styles.topOverlay} />
        <View style={styles.middleRow}>
          <View style={styles.sideOverlay} />
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <View style={styles.sideOverlay} />
        </View>
        <View style={styles.bottomOverlay}>
          <Text style={styles.instruction}>
            Arahkan kamera ke QR code aset
          </Text>
        </View>
      </View>

      {/* Close button */}
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Icon name="close" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  middleRow: {
    flexDirection: 'row',
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#4CAF50',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  instruction: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### Manual Asset ID Entry

**Component:** `src/components/assets/ManualAssetInput.tsx`

```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Button } from '@/components/common/Button';

interface ManualAssetInputProps {
  onSubmit: (assetId: string) => void;
  onCancel: () => void;
}

export const ManualAssetInput: React.FC<ManualAssetInputProps> = ({
  onSubmit,
  onCancel,
}) => {
  const [assetCode, setAssetCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    // Validate UUID format or numeric code format
    const uuidRegex = /^[a-f0-9-]{36}$/i;
    const numericRegex = /^[0-9]{8}$/;

    if (!assetCode.trim()) {
      setError('Masukkan kode aset');
      return;
    }

    if (!uuidRegex.test(assetCode) && !numericRegex.test(assetCode)) {
      setError('Format kode tidak valid. Gunakan UUID atau 8 digit angka.');
      return;
    }

    setError('');
    onSubmit(assetCode);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Masukkan Kode Aset</Text>
      <Text style={styles.subtitle}>
        Masukkan UUID atau kode 8 digit yang tertera di bawah QR code
      </Text>

      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        value={assetCode}
        onChangeText={(text) => {
          setAssetCode(text);
          setError('');
        }}
        placeholder="Contoh: 12345678 atau UUID"
        placeholderTextColor="#999"
        autoCapitalize="none"
        autoCorrect={false}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.buttonRow}>
        <Button
          title="Batal"
          onPress={onCancel}
          variant="outline"
          style={styles.buttonHalf}
        />
        <Button
          title="Submit"
          onPress={handleSubmit}
          style={styles.buttonHalf}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  inputError: {
    borderColor: '#f44336',
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  buttonHalf: {
    flex: 1,
  },
});
```

---

## 2. Worker Asset Screens

### 2.1 Asset Scanner Screen

**Path:** `src/screens/worker/AssetScannerScreen.tsx`

```typescript
import React, { useState } from 'react';
import { View, StyleSheet, Modal, Alert } from 'react-native';
import { QRCodeScanner } from '@/components/assets/QRCodeScanner';
import { ManualAssetInput } from '@/components/assets/ManualAssetInput';
import { Button } from '@/components/common/Button';
import { assetsApi } from '@/services/api/assetsApi';
import { useNavigation } from '@react-navigation/native';
import type { WorkerNavigationProp } from '@/types/navigation.types';

export const AssetScannerScreen: React.FC = () => {
  const navigation = useNavigation<WorkerNavigationProp>();
  const [showManualInput, setShowManualInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAssetScanned = async (assetId: string) => {
    setIsLoading(true);
    try {
      // Fetch asset details from API
      const asset = await assetsApi.getAssetById(assetId);

      // Navigate to asset detail
      navigation.navigate('AssetDetail', { assetId: asset.id });
    } catch (error: any) {
      Alert.alert(
        'Aset Tidak Ditemukan',
        error.response?.data?.message || 'Aset dengan kode ini tidak terdaftar.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <QRCodeScanner
        onScan={handleAssetScanned}
        onClose={() => navigation.goBack()}
      />

      <View style={styles.manualInputButton}>
        <Button
          title="Masukkan Kode Manual"
          onPress={() => setShowManualInput(true)}
          variant="outline"
          icon="keyboard"
        />
      </View>

      <Modal
        visible={showManualInput}
        animationType="slide"
        transparent
        onRequestClose={() => setShowManualInput(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ManualAssetInput
              onSubmit={(assetId) => {
                setShowManualInput(false);
                handleAssetScanned(assetId);
              }}
              onCancel={() => setShowManualInput(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  manualInputButton: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
});
```

### 2.2 Asset Detail Screen

**Path:** `src/screens/worker/AssetDetailScreen.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { assetsApi } from '@/services/api/assetsApi';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { Asset, MaintenanceHistory } from '@/types/assets.types';
import type { WorkerNavigationProp, WorkerRouteProp } from '@/types/navigation.types';

export const AssetDetailScreen: React.FC = () => {
  const navigation = useNavigation<WorkerNavigationProp>();
  const route = useRoute<WorkerRouteProp<'AssetDetail'>>();
  const { assetId } = route.params;

  const [asset, setAsset] = useState<Asset | null>(null);
  const [history, setHistory] = useState<MaintenanceHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAssetDetails();
  }, [assetId]);

  const fetchAssetDetails = async () => {
    setIsLoading(true);
    try {
      const [assetData, historyData] = await Promise.all([
        assetsApi.getAssetById(assetId),
        assetsApi.getMaintenanceHistory(assetId),
      ]);
      setAsset(assetData);
      setHistory(historyData);
    } catch (error) {
      Alert.alert('Error', 'Gagal memuat detail aset');
    } finally {
      setIsLoading(false);
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Baik':
        return '#4CAF50';
      case 'Cukup':
        return '#FF9800';
      case 'Buruk':
        return '#f44336';
      default:
        return '#999';
    }
  };

  const getConditionIcon = (condition: string) => {
    switch (condition) {
      case 'Baik':
        return 'check-circle';
      case 'Cukup':
        return 'alert-circle';
      case 'Buruk':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!asset) {
    return (
      <View style={styles.errorContainer}>
        <Text>Aset tidak ditemukan</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Asset Photo */}
      {asset.photo_url && (
        <Image source={{ uri: asset.photo_url }} style={styles.photo} />
      )}

      {/* Basic Info */}
      <Card style={styles.card}>
        <Text style={styles.assetName}>{asset.name}</Text>
        <Text style={styles.assetType}>{asset.asset_type}</Text>

        <View style={styles.infoRow}>
          <Icon name="map-marker" size={20} color="#666" />
          <Text style={styles.infoText}>
            {asset.area.name} ({asset.area.area_type})
          </Text>
        </View>

        {asset.location_details && (
          <View style={styles.infoRow}>
            <Icon name="information" size={20} color="#666" />
            <Text style={styles.infoText}>{asset.location_details}</Text>
          </View>
        )}

        <View style={styles.conditionRow}>
          <Text style={styles.conditionLabel}>Kondisi:</Text>
          <View
            style={[
              styles.conditionBadge,
              { backgroundColor: getConditionColor(asset.condition) },
            ]}
          >
            <Icon
              name={getConditionIcon(asset.condition)}
              size={16}
              color="#fff"
            />
            <Text style={styles.conditionText}>{asset.condition}</Text>
          </View>
        </View>
      </Card>

      {/* Description */}
      {asset.description && (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Deskripsi</Text>
          <Text style={styles.description}>{asset.description}</Text>
        </Card>
      )}

      {/* Maintenance History */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>
          Riwayat Pemeliharaan ({history.length})
        </Text>
        {history.length === 0 ? (
          <Text style={styles.emptyText}>Belum ada riwayat pemeliharaan</Text>
        ) : (
          history.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <Icon
                name="wrench"
                size={20}
                color="#4CAF50"
                style={styles.historyIcon}
              />
              <View style={styles.historyContent}>
                <Text style={styles.historyType}>{item.maintenance_type}</Text>
                <Text style={styles.historyDate}>
                  {new Date(item.performed_at).toLocaleDateString('id-ID')}
                </Text>
                {item.notes && (
                  <Text style={styles.historyNotes}>{item.notes}</Text>
                )}
              </View>
            </View>
          ))
        )}
        {history.length > 3 && (
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() =>
              navigation.navigate('AssetHistory', { assetId: asset.id })
            }
          >
            <Text style={styles.viewAllText}>
              Lihat Semua ({history.length})
            </Text>
          </TouchableOpacity>
        )}
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          title="Laporkan Kerusakan"
          onPress={() =>
            navigation.navigate('AssetMaintenanceReport', { assetId: asset.id })
          }
          icon="alert-circle"
          style={styles.button}
        />
        <Button
          title="Pemeliharaan Rutin"
          onPress={() =>
            navigation.navigate('AssetMaintenanceReport', {
              assetId: asset.id,
              type: 'routine',
            })
          }
          variant="outline"
          icon="calendar-check"
          style={styles.button}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  photo: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  card: {
    margin: 16,
  },
  assetName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  assetType: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  conditionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12,
  },
  conditionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  conditionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  historyItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyIcon: {
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyType: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  historyNotes: {
    fontSize: 12,
    color: '#999',
  },
  viewAllButton: {
    marginTop: 8,
    alignItems: 'center',
  },
  viewAllText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  actionButtons: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  button: {
    width: '100%',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

### 2.3 Asset Maintenance Report Screen

**Path:** `src/screens/worker/AssetMaintenanceReportScreen.tsx`

```typescript
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { photoService } from '@/services/media/photoService';
import { assetsApi } from '@/services/api/assetsApi';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { WorkerNavigationProp, WorkerRouteProp } from '@/types/navigation.types';

const MAINTENANCE_TYPES = [
  { value: 'routine', label: 'Pemeliharaan Rutin', icon: 'calendar-check' },
  { value: 'repair', label: 'Perbaikan', icon: 'wrench' },
  { value: 'replacement', label: 'Penggantian', icon: 'swap-horizontal' },
  { value: 'inspection', label: 'Inspeksi', icon: 'magnify' },
];

const URGENCY_LEVELS = [
  { value: 'low', label: 'Rendah', color: '#4CAF50' },
  { value: 'medium', label: 'Sedang', color: '#FF9800' },
  { value: 'high', label: 'Tinggi', color: '#f44336' },
];

export const AssetMaintenanceReportScreen: React.FC = () => {
  const navigation = useNavigation<WorkerNavigationProp>();
  const route = useRoute<WorkerRouteProp<'AssetMaintenanceReport'>>();
  const { assetId, type } = route.params;

  const [maintenanceType, setMaintenanceType] = useState(type || 'routine');
  const [urgency, setUrgency] = useState('medium');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTakePhoto = async () => {
    try {
      const photoUri = await photoService.capturePhoto();
      if (photoUri) {
        setPhotos([...photos, photoUri]);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal mengambil foto');
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Deskripsi wajib diisi');
      return;
    }

    if (maintenanceType === 'repair' && photos.length === 0) {
      Alert.alert('Error', 'Foto wajib dilampirkan untuk laporan perbaikan');
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload photos first
      const photoUrls = await Promise.all(
        photos.map((uri) => photoService.uploadPhoto(uri))
      );

      // Submit maintenance report
      await assetsApi.submitMaintenanceReport({
        asset_id: assetId,
        maintenance_type: maintenanceType,
        urgency,
        description,
        photo_urls: photoUrls,
      });

      Alert.alert('Berhasil', 'Laporan pemeliharaan berhasil dikirim', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Gagal mengirim laporan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Jenis Pemeliharaan</Text>
        <View style={styles.typeGrid}>
          {MAINTENANCE_TYPES.map((mType) => (
            <TouchableOpacity
              key={mType.value}
              style={[
                styles.typeButton,
                maintenanceType === mType.value && styles.typeButtonActive,
              ]}
              onPress={() => setMaintenanceType(mType.value)}
            >
              <Icon
                name={mType.icon}
                size={24}
                color={maintenanceType === mType.value ? '#fff' : '#666'}
              />
              <Text
                style={[
                  styles.typeLabel,
                  maintenanceType === mType.value && styles.typeLabelActive,
                ]}
              >
                {mType.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Tingkat Urgensi</Text>
        <View style={styles.urgencyRow}>
          {URGENCY_LEVELS.map((level) => (
            <TouchableOpacity
              key={level.value}
              style={[
                styles.urgencyButton,
                { borderColor: level.color },
                urgency === level.value && { backgroundColor: level.color },
              ]}
              onPress={() => setUrgency(level.value)}
            >
              <Text
                style={[
                  styles.urgencyLabel,
                  { color: urgency === level.value ? '#fff' : level.color },
                ]}
              >
                {level.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Deskripsi *</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="Jelaskan kondisi atau pekerjaan yang dilakukan..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{description.length} / 500</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>
          Foto {maintenanceType === 'repair' ? '*' : '(Opsional)'}
        </Text>
        <View style={styles.photoGrid}>
          {photos.map((uri, index) => (
            <View key={index} style={styles.photoItem}>
              <Image source={{ uri }} style={styles.photo} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemovePhoto(index)}
              >
                <Icon name="close-circle" size={24} color="#f44336" />
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < 5 && (
            <TouchableOpacity style={styles.addPhotoButton} onPress={handleTakePhoto}>
              <Icon name="camera-plus" size={32} color="#666" />
              <Text style={styles.addPhotoText}>Tambah Foto</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.hint}>Maksimal 5 foto</Text>
      </Card>

      <View style={styles.actionButtons}>
        <Button
          title="Kirim Laporan"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  typeButtonActive: {
    borderColor: '#2196F3',
    backgroundColor: '#2196F3',
  },
  typeLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  typeLabelActive: {
    color: '#fff',
    fontWeight: '600',
  },
  urgencyRow: {
    flexDirection: 'row',
    gap: 12,
  },
  urgencyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  urgencyLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoItem: {
    width: 100,
    height: 100,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  actionButtons: {
    padding: 16,
    paddingBottom: 32,
  },
});
```

---

## 3. Navigation Updates

### Worker Navigator

**Update:** `src/navigation/WorkerNavigator.tsx`

```typescript
// Add to stack navigator
<Stack.Screen
  name="AssetScanner"
  component={AssetScannerScreen}
  options={{ title: 'Scan QR Aset' }}
/>
<Stack.Screen
  name="AssetDetail"
  component={AssetDetailScreen}
  options={{ title: 'Detail Aset' }}
/>
<Stack.Screen
  name="AssetMaintenanceReport"
  component={AssetMaintenanceReportScreen}
  options={{ title: 'Laporan Pemeliharaan' }}
/>
<Stack.Screen
  name="AssetHistory"
  component={AssetHistoryScreen}
  options={{ title: 'Riwayat Pemeliharaan' }}
/>

// Add FAB button to WorkerHomeScreen
<FloatingActionButton
  icon="qrcode-scan"
  onPress={() => navigation.navigate('AssetScanner')}
  label="Scan Aset"
/>
```

---

## 4. Offline Support

### Asset Data Caching

**Path:** `src/services/storage/assetCache.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Asset } from '@/types/assets.types';

const CACHE_KEY = '@sekar/asset_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const assetCache = {
  async saveAsset(asset: Asset): Promise<void> {
    const cache = await this.getCache();
    cache[asset.id] = {
      data: asset,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  },

  async getAsset(assetId: string): Promise<Asset | null> {
    const cache = await this.getCache();
    const cached = cache[assetId];

    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      delete cache[assetId];
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      return null;
    }

    return cached.data;
  },

  async getCache(): Promise<Record<string, { data: Asset; timestamp: number }>> {
    const data = await AsyncStorage.getItem(CACHE_KEY);
    return data ? JSON.parse(data) : {};
  },

  async clearExpired(): Promise<void> {
    const cache = await this.getCache();
    const now = Date.now();
    const filtered = Object.entries(cache).reduce(
      (acc, [id, value]) => {
        if (now - value.timestamp <= CACHE_DURATION) {
          acc[id] = value;
        }
        return acc;
      },
      {} as Record<string, { data: Asset; timestamp: number }>
    );
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(filtered));
  },
};
```

### Offline Maintenance Reports

**Path:** `src/services/sync/assetSyncQueue.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { assetsApi } from '@/services/api/assetsApi';
import { photoService } from '@/services/media/photoService';
import uuid from 'react-native-uuid';

const QUEUE_KEY = '@sekar/pending_maintenance_reports';

interface PendingMaintenanceReport {
  local_id: string;
  asset_id: string;
  maintenance_type: string;
  urgency: string;
  description: string;
  photo_paths: string[];
  created_at: number;
  sync_status: 'pending' | 'syncing' | 'synced' | 'failed';
  error_message?: string;
}

export const assetSyncQueue = {
  async addPendingReport(report: Omit<PendingMaintenanceReport, 'local_id' | 'created_at' | 'sync_status'>): Promise<void> {
    const queue = await this.getQueue();
    queue.push({
      ...report,
      local_id: uuid.v4() as string,
      created_at: Date.now(),
      sync_status: 'pending',
    });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  async getQueue(): Promise<PendingMaintenanceReport[]> {
    const data = await AsyncStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  },

  async syncAll(): Promise<void> {
    const queue = await this.getQueue();
    const pending = queue.filter((r) => r.sync_status === 'pending');

    for (const report of pending) {
      try {
        // Mark as syncing
        await this.updateStatus(report.local_id, 'syncing');

        // Upload photos
        const photoUrls = await Promise.all(
          report.photo_paths.map((path) => photoService.uploadPhoto(path))
        );

        // Submit report
        await assetsApi.submitMaintenanceReport({
          asset_id: report.asset_id,
          maintenance_type: report.maintenance_type,
          urgency: report.urgency,
          description: report.description,
          photo_urls: photoUrls,
        });

        // Mark as synced
        await this.updateStatus(report.local_id, 'synced');
      } catch (error: any) {
        await this.updateStatus(report.local_id, 'failed', error.message);
      }
    }

    // Cleanup synced reports older than 7 days
    await this.cleanup();
  },

  async updateStatus(
    localId: string,
    status: PendingMaintenanceReport['sync_status'],
    errorMessage?: string
  ): Promise<void> {
    const queue = await this.getQueue();
    const index = queue.findIndex((r) => r.local_id === localId);
    if (index !== -1) {
      queue[index].sync_status = status;
      if (errorMessage) {
        queue[index].error_message = errorMessage;
      }
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }
  },

  async cleanup(): Promise<void> {
    const queue = await this.getQueue();
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const filtered = queue.filter(
      (r) => r.sync_status !== 'synced' || r.created_at > cutoff
    );
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  },
};
```

---

## 5. Testing Requirements

### Unit Tests

```typescript
// __tests__/components/QRCodeScanner.test.tsx
describe('QRCodeScanner', () => {
  it('should request camera permission on mount', async () => {
    // Test implementation
  });

  it('should parse valid SEKAR QR code format', () => {
    const validCode = 'sekar://asset/550e8400-e29b-41d4-a716-446655440000';
    const match = validCode.match(/^sekar:\/\/asset\/([a-f0-9-]{36})$/i);
    expect(match).not.toBeNull();
    expect(match![1]).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('should reject invalid QR code format', () => {
    const invalidCode = 'https://example.com/asset/123';
    const match = invalidCode.match(/^sekar:\/\/asset\/([a-f0-9-]{36})$/i);
    expect(match).toBeNull();
  });
});

// __tests__/services/assetCache.test.tsx
describe('assetCache', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('should cache asset data', async () => {
    const asset = { id: '123', name: 'Test Asset' };
    await assetCache.saveAsset(asset);
    const cached = await assetCache.getAsset('123');
    expect(cached).toEqual(asset);
  });

  it('should return null for expired cache', async () => {
    // Test implementation
  });
});
```

### Integration Tests

```typescript
// __tests__/screens/AssetDetailScreen.test.tsx
describe('AssetDetailScreen', () => {
  it('should fetch and display asset details', async () => {
    // Mock API
    // Render screen
    // Verify display
  });

  it('should navigate to maintenance report screen', async () => {
    // Test implementation
  });
});
```

---

## 6. Success Criteria

- [ ] QR scanner works on both iOS and Android
- [ ] Camera permissions handled properly
- [ ] Valid SEKAR QR codes parsed correctly
- [ ] Invalid QR codes rejected with clear message
- [ ] Manual asset ID entry works as fallback
- [ ] Asset details display correctly
- [ ] Maintenance report submission works
- [ ] Photos uploaded and compressed
- [ ] Offline reports queued and synced
- [ ] Asset data cached for offline access
- [ ] Navigation flows work correctly
- [ ] All screens responsive on different devices
- [ ] Loading and error states handled
- [ ] 100% test coverage for critical paths

---

## 7. Performance Optimizations

### Image Optimization

- Compress photos to 500KB before upload
- Use thumbnail for list views
- Lazy load images with placeholder

### QR Scanning Performance

- Debounce scan events (500ms)
- Stop camera when modal/screen inactive
- Release camera resources on unmount

### Caching Strategy

- Cache asset details for 24 hours
- Clear expired cache on app launch
- Limit cache size to 100 assets

---

**Last Updated:** 2026-01-21
**Status:** Ready for Implementation
**Dependencies:** react-native-vision-camera ^4.0.0, vision-camera-code-scanner ^1.0.0
