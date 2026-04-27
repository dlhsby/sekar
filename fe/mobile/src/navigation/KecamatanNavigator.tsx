/**
 * Kecamatan (Sub-District Staff) Navigator
 * Phase 3 sub-phase 3-10: Pruning request submission and management
 * Routes: Submit, MyRequests, RequestDetail, Profile
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SubmitScreen } from '../screens/pruningRequests/SubmitScreen';
import { MyRequestsScreen } from '../screens/pruningRequests/MyRequestsScreen';
import { RequestDetailScreen } from '../screens/pruningRequests/RequestDetailScreen';
import { SettingsScreen } from '../screens/common/SettingsScreen';
import { nbColors, nbTypography } from '../constants/nbTokens';

const Stack = createNativeStackNavigator();

/**
 * Kecamatan stack navigator for staff_kecamatan role users
 * Provides navigation between pruning request screens and settings
 */
export function KecamatanNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: nbColors.bgCanvas,
          borderBottomColor: nbColors.gray300,
          borderBottomWidth: 1,
        },
        headerTitleStyle: nbTypography.h3,
        headerTintColor: nbColors.black,
        headerShadowVisible: false,
        gestureEnabled: true,
      }}
    >
      {/* Main Tab: Submit Pruning Request */}
      <Stack.Screen
        name="PruningSubmit"
        component={SubmitScreen}
        options={{
          title: 'Buat Permohonan Pemangkasan',
          headerShown: true,
        }}
      />

      {/* Detail: My Requests List */}
      <Stack.Screen
        name="PruningMyRequests"
        component={MyRequestsScreen}
        options={{
          title: 'Permohonan Saya',
          headerBackTitle: 'Kembali',
        }}
      />

      {/* Detail: Request Details */}
      <Stack.Screen
        name="PruningDetail"
        component={RequestDetailScreen}
        options={{
          title: 'Detail Permohonan',
          headerBackTitle: 'Kembali',
        }}
      />

      {/* Profile/Settings */}
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Pengaturan',
          headerBackTitle: 'Kembali',
        }}
      />
    </Stack.Navigator>
  );
}

export default KecamatanNavigator;
