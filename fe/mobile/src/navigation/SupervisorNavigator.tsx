/**
 * Supervisor Navigator
 * Bottom tab navigation for supervisor role with stack navigation for reports
 * Uses Neo Brutalism design tokens for consistent styling
 */

import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { SupervisorTabParamList } from '../types/navigation.types';
import { nbColors, nbBorders, nbShadows, nbTypography } from '../constants/nbTokens';

// Import screens
import ReportsListScreen from '../screens/supervisor/ReportsListScreen';
import ReportDetailScreen from '../screens/supervisor/ReportDetailScreen';
import { MapDashboardScreen, AttendanceScreen, ProfileScreen } from '../screens/supervisor';
import { SettingsScreen } from '../screens/common/SettingsScreen';

const Tab = createBottomTabNavigator<SupervisorTabParamList>();
const Stack = createNativeStackNavigator();

/**
 * Reports Stack Navigator
 * Handles navigation between reports list and detail
 */
function ReportsStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: nbColors.white,
        },
        headerTitleStyle: {
          fontSize: nbTypography.fontSize.xl,
          fontWeight: nbTypography.fontWeight.bold,
          color: nbColors.black,
        },
        headerTintColor: nbColors.black,
      }}>
      <Stack.Screen
        name="ReportsListMain"
        component={ReportsListScreen}
        options={{ title: 'Laporan Kerja' }}
      />
      <Stack.Screen
        name="ReportDetail"
        component={ReportDetailScreen}
        options={{ title: 'Detail Laporan' }}
      />
    </Stack.Navigator>
  );
}

function SupervisorNavigator(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: nbColors.primary,
        tabBarInactiveTintColor: nbColors.gray[600],
        headerShown: true,
        headerStyle: {
          height: 76,
          backgroundColor: nbColors.white,
          borderBottomWidth: nbBorders.thick,
          borderBottomColor: nbColors.black,
          ...nbShadows.md,
          elevation: 0,
        },
        headerTitleStyle: {
          fontSize: nbTypography.fontSize['2xl'],
          fontWeight: nbTypography.fontWeight.bold,
          color: nbColors.black,
        },
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        tabBarIconStyle: styles.tabBarIcon,
      }}>
      <Tab.Screen
        name="MapDashboard"
        component={MapDashboardScreen}
        options={{
          title: 'Peta',
          headerShown: true,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="ReportsList"
        component={ReportsStackNavigator}
        options={{
          title: 'Laporan',
          headerShown: false, // Stack navigator has its own header
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="file-document-multiple"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{
          title: 'Kehadiran',
          headerShown: true,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="clipboard-check"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profil',
          headerShown: true,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Pengaturan',
          // Hidden from tab bar - accessed via Profile menu
          tabBarButton: () => null,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Neo Brutalism Tab Bar Styling
const styles = StyleSheet.create({
  tabBar: {
    height: 65,
    backgroundColor: nbColors.white,
    borderTopWidth: nbBorders.thick,
    borderTopColor: nbColors.black,
    ...nbShadows.md,
    paddingBottom: Platform.OS === 'ios' ? 4 : 4,
    paddingTop: 6,
  },
  tabBarLabel: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.semibold,
    marginTop: -2,
    marginBottom: 2,
  },
  tabBarItem: {
    paddingVertical: 2,
  },
  tabBarIcon: {
    marginTop: 4,
  },
});

export default SupervisorNavigator;

