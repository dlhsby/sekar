'use client';

import { useUser } from '@/lib/auth/hooks';
import { NBCard, NBCardHeader, NBCardContent } from '@/components/nb/NBCard';
import { NBBadge } from '@/components/nb/NBBadge';
import {
  UsersIcon,
  MapPinIcon,
  MapIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

/**
 * Dashboard Home Page
 *
 * Role-based dashboard content:
 * - Admin: City-wide statistics and all resources
 * - TopManagement: All rayons overview and analytics
 * - KepalaRayon: Rayon-specific statistics
 * - KoordinatorLapangan: Area-specific statistics
 */
export default function DashboardPage() {
  const user = useUser();

  // Role-based stats configuration
  const getStatsForRole = (role: string) => {
    switch (role) {
      case 'admin':
        return [
          { label: 'Total Users', value: '156', icon: UsersIcon, color: 'primary' as const },
          { label: 'Active Areas', value: '42', icon: MapPinIcon, color: 'success' as const },
          { label: 'Total Rayons', value: '8', icon: BuildingOfficeIcon, color: 'warning' as const },
          { label: 'Reports Today', value: '23', icon: DocumentTextIcon, color: 'neutral' as const },
        ];
      case 'top_management':
        return [
          { label: 'All Rayons', value: '8', icon: BuildingOfficeIcon, color: 'primary' as const },
          { label: 'Active Workers', value: '124', icon: UsersIcon, color: 'success' as const },
          { label: 'Areas Covered', value: '42', icon: MapPinIcon, color: 'warning' as const },
          { label: 'Reports Today', value: '23', icon: DocumentTextIcon, color: 'neutral' as const },
        ];
      case 'kepala_rayon':
        return [
          { label: 'My Rayon Areas', value: '12', icon: MapPinIcon, color: 'primary' as const },
          { label: 'Active Workers', value: '28', icon: UsersIcon, color: 'success' as const },
          { label: 'Tasks Pending', value: '5', icon: ClockIcon, color: 'warning' as const },
          { label: 'Reports Today', value: '8', icon: DocumentTextIcon, color: 'neutral' as const },
        ];
      case 'koordinator_lapangan':
        return [
          { label: 'My Areas', value: '5', icon: MapPinIcon, color: 'primary' as const },
          { label: 'Team Workers', value: '12', icon: UsersIcon, color: 'success' as const },
          { label: 'Tasks Today', value: '7', icon: CheckCircleIcon, color: 'warning' as const },
          { label: 'Reports Today', value: '4', icon: DocumentTextIcon, color: 'neutral' as const },
        ];
      default:
        return [];
    }
  };

  // Recent activity mock data (role-based)
  const getRecentActivity = (role: string) => {
    const activities = {
      admin: [
        { text: 'New user "Budi Santoso" created', time: '5 minutes ago', type: 'success' as const },
        { text: 'Rayon "Surabaya Timur" configuration updated', time: '15 minutes ago', type: 'neutral' as const },
        { text: 'System backup completed successfully', time: '1 hour ago', type: 'success' as const },
        { text: '23 new reports submitted today', time: '2 hours ago', type: 'neutral' as const },
      ],
      top_management: [
        { text: 'Rayon "Surabaya Pusat" achieved 95% completion', time: '30 minutes ago', type: 'success' as const },
        { text: 'Weekly performance report generated', time: '1 hour ago', type: 'neutral' as const },
        { text: 'New area "Taman Bungkul" added', time: '2 hours ago', type: 'neutral' as const },
        { text: '124 workers active across all rayons', time: '3 hours ago', type: 'success' as const },
      ],
      kepala_rayon: [
        { text: 'Worker "Ahmad" completed area cleaning', time: '10 minutes ago', type: 'success' as const },
        { text: 'New task assigned to team', time: '25 minutes ago', type: 'neutral' as const },
        { text: 'Area inspection report submitted', time: '1 hour ago', type: 'neutral' as const },
        { text: '5 pending tasks require review', time: '2 hours ago', type: 'warning' as const },
      ],
      koordinator_lapangan: [
        { text: 'Worker "Siti" clocked in at Area Kenjeran', time: '5 minutes ago', type: 'success' as const },
        { text: 'Daily schedule created for team', time: '30 minutes ago', type: 'neutral' as const },
        { text: 'Area maintenance completed', time: '1 hour ago', type: 'success' as const },
        { text: '7 tasks scheduled for today', time: '2 hours ago', type: 'neutral' as const },
      ],
    };

    return activities[role as keyof typeof activities] || activities.admin;
  };

  const stats = user ? getStatsForRole(user.role) : [];
  const recentActivity = user ? getRecentActivity(user.role) : [];

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-nb-black mb-2">
          Welcome back, {user?.full_name || 'User'}!
        </h1>
        <p className="text-nb-gray-600 text-lg">
          {user?.role === 'admin' && 'Manage the entire SEKAR system from here.'}
          {user?.role === 'top_management' && 'Overview of all rayon operations and analytics.'}
          {user?.role === 'kepala_rayon' && 'Monitor and manage your rayon performance.'}
          {user?.role === 'koordinator_lapangan' && 'Coordinate your team and area activities.'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <NBCard key={stat.label} variant="elevated">
              <NBCardContent className="space-y-3">
                <div className="flex items-start justify-between">
                  <NBBadge variant={stat.color} size="sm">
                    {stat.label}
                  </NBBadge>
                  <Icon className="h-6 w-6 text-nb-gray-400" />
                </div>
                <p className="text-4xl font-extrabold text-nb-black">{stat.value}</p>
              </NBCardContent>
            </NBCard>
          );
        })}
      </div>

      {/* Recent Activity */}
      <NBCard variant="elevated" className="mb-8">
        <NBCardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-nb-black">Recent Activity</h2>
            <NBBadge variant="neutral" size="sm">
              Live
            </NBBadge>
          </div>
        </NBCardHeader>
        <NBCardContent>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-4 pb-4 border-b-2 border-nb-gray-100 last:border-b-0 last:pb-0"
              >
                <div className="flex-shrink-0 mt-1">
                  {activity.type === 'success' && (
                    <CheckCircleIcon className="h-5 w-5 text-nb-success" />
                  )}
                  {activity.type === 'warning' && (
                    <ClockIcon className="h-5 w-5 text-nb-warning" />
                  )}
                  {activity.type === 'neutral' && (
                    <DocumentTextIcon className="h-5 w-5 text-nb-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-nb-black font-medium">{activity.text}</p>
                  <p className="text-nb-gray-500 text-sm mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </NBCardContent>
      </NBCard>

      {/* Quick Actions (role-based) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {user?.role === 'admin' && (
          <>
            <NBCard variant="outlined" interactive className="hover:border-nb-primary">
              <NBCardContent className="text-center py-8">
                <UsersIcon className="h-12 w-12 mx-auto mb-3 text-nb-primary" />
                <h3 className="font-bold text-lg text-nb-black">Manage Users</h3>
                <p className="text-nb-gray-600 text-sm mt-1">
                  Create, edit, and manage user accounts
                </p>
              </NBCardContent>
            </NBCard>
            <NBCard variant="outlined" interactive className="hover:border-nb-success">
              <NBCardContent className="text-center py-8">
                <BuildingOfficeIcon className="h-12 w-12 mx-auto mb-3 text-nb-success" />
                <h3 className="font-bold text-lg text-nb-black">Manage Rayons</h3>
                <p className="text-nb-gray-600 text-sm mt-1">
                  Configure rayons and hierarchies
                </p>
              </NBCardContent>
            </NBCard>
            <NBCard variant="outlined" interactive className="hover:border-nb-warning">
              <NBCardContent className="text-center py-8">
                <MapPinIcon className="h-12 w-12 mx-auto mb-3 text-nb-warning" />
                <h3 className="font-bold text-lg text-nb-black">Manage Areas</h3>
                <p className="text-nb-gray-600 text-sm mt-1">
                  Create and configure service areas
                </p>
              </NBCardContent>
            </NBCard>
          </>
        )}

        {user?.role !== 'admin' && (
          <>
            <NBCard variant="outlined" interactive className="hover:border-nb-primary">
              <NBCardContent className="text-center py-8">
                <MapIcon className="h-12 w-12 mx-auto mb-3 text-nb-primary" />
                <h3 className="font-bold text-lg text-nb-black">View Monitoring</h3>
                <p className="text-nb-gray-600 text-sm mt-1">
                  Track worker locations in real-time
                </p>
              </NBCardContent>
            </NBCard>
            <NBCard variant="outlined" interactive className="hover:border-nb-success">
              <NBCardContent className="text-center py-8">
                <DocumentTextIcon className="h-12 w-12 mx-auto mb-3 text-nb-success" />
                <h3 className="font-bold text-lg text-nb-black">View Reports</h3>
                <p className="text-nb-gray-600 text-sm mt-1">
                  Review submitted work reports
                </p>
              </NBCardContent>
            </NBCard>
            <NBCard variant="outlined" interactive className="hover:border-nb-warning">
              <NBCardContent className="text-center py-8">
                <ClockIcon className="h-12 w-12 mx-auto mb-3 text-nb-warning" />
                <h3 className="font-bold text-lg text-nb-black">View Schedules</h3>
                <p className="text-nb-gray-600 text-sm mt-1">
                  Check team schedules and shifts
                </p>
              </NBCardContent>
            </NBCard>
          </>
        )}
      </div>
    </div>
  );
}
