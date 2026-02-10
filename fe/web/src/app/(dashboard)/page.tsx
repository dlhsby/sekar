'use client';

import { Users, MapPin, Map, Building2, CheckCircle, Clock, FileText } from 'lucide-react';
import { useUser } from '@/lib/auth/hooks';
import { Card, CardHeader, CardContent, Badge } from '@/components/ui';

/**
 * Dashboard Home Page
 *
 * Role-based dashboard content
 */
export default function DashboardPage() {
  const user = useUser();

  // Role-based stats configuration
  const getStatsForRole = (role: string) => {
    switch (role) {
      case 'admin':
        return [
          { label: 'Total Users', value: '156', Icon: Users, color: 'default' as const },
          { label: 'Active Areas', value: '42', Icon: MapPin, color: 'success' as const },
          { label: 'Total Rayons', value: '8', Icon: Building2, color: 'warning' as const },
          { label: 'Reports Today', value: '23', Icon: FileText, color: 'secondary' as const },
        ];
      case 'top_management':
        return [
          { label: 'All Rayons', value: '8', Icon: Building2, color: 'default' as const },
          { label: 'Active Workers', value: '124', Icon: Users, color: 'success' as const },
          { label: 'Areas Covered', value: '42', Icon: MapPin, color: 'warning' as const },
          { label: 'Reports Today', value: '23', Icon: FileText, color: 'secondary' as const },
        ];
      case 'kepala_rayon':
        return [
          { label: 'My Rayon Areas', value: '12', Icon: MapPin, color: 'default' as const },
          { label: 'Active Workers', value: '28', Icon: Users, color: 'success' as const },
          { label: 'Tasks Pending', value: '5', Icon: Clock, color: 'warning' as const },
          { label: 'Reports Today', value: '8', Icon: FileText, color: 'secondary' as const },
        ];
      case 'koordinator_lapangan':
        return [
          { label: 'My Areas', value: '5', Icon: MapPin, color: 'default' as const },
          { label: 'Team Workers', value: '12', Icon: Users, color: 'success' as const },
          { label: 'Tasks Today', value: '7', Icon: CheckCircle, color: 'warning' as const },
          { label: 'Reports Today', value: '4', Icon: FileText, color: 'secondary' as const },
        ];
      default:
        return [];
    }
  };

  // Recent activity mock data (role-based)
  const getRecentActivity = (role: string) => {
    const activities = {
      admin: [
        {
          text: 'New user "Budi Santoso" created',
          time: '5 minutes ago',
          type: 'success' as const,
        },
        {
          text: 'Rayon "Surabaya Timur" configuration updated',
          time: '15 minutes ago',
          type: 'neutral' as const,
        },
        {
          text: 'System backup completed successfully',
          time: '1 hour ago',
          type: 'success' as const,
        },
        { text: '23 new reports submitted today', time: '2 hours ago', type: 'neutral' as const },
      ],
      top_management: [
        {
          text: 'Rayon "Surabaya Pusat" achieved 95% completion',
          time: '30 minutes ago',
          type: 'success' as const,
        },
        {
          text: 'Weekly performance report generated',
          time: '1 hour ago',
          type: 'neutral' as const,
        },
        { text: 'New area "Taman Bungkul" added', time: '2 hours ago', type: 'neutral' as const },
        {
          text: '124 workers active across all rayons',
          time: '3 hours ago',
          type: 'success' as const,
        },
      ],
      kepala_rayon: [
        {
          text: 'Worker "Ahmad" completed area cleaning',
          time: '10 minutes ago',
          type: 'success' as const,
        },
        { text: 'New task assigned to team', time: '25 minutes ago', type: 'neutral' as const },
        { text: 'Area inspection report submitted', time: '1 hour ago', type: 'neutral' as const },
        { text: '5 pending tasks require review', time: '2 hours ago', type: 'warning' as const },
      ],
      koordinator_lapangan: [
        {
          text: 'Worker "Siti" clocked in at Area Kenjeran',
          time: '5 minutes ago',
          type: 'success' as const,
        },
        {
          text: 'Daily schedule created for team',
          time: '30 minutes ago',
          type: 'neutral' as const,
        },
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
          const { Icon } = stat;
          return (
            <Card key={stat.label} variant="elevated">
              <CardContent className="space-y-3 p-6">
                <div className="flex items-start justify-between">
                  <Badge variant={stat.color} size="sm">
                    {stat.label}
                  </Badge>
                  <div aria-label={`${stat.label} icon`}>
                    <Icon className="h-6 w-6 text-nb-gray-400" />
                  </div>
                </div>
                <p className="text-4xl font-extrabold text-nb-black">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <Card variant="elevated" className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-nb-black">Recent Activity</h2>
            <Badge variant="secondary" size="sm">
              Live
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-4 pb-4 border-b-2 border-nb-gray-100 last:border-b-0 last:pb-0"
              >
                <div className="flex-shrink-0 mt-1">
                  {activity.type === 'success' && (
                    <CheckCircle className="h-5 w-5 text-nb-success" />
                  )}
                  {activity.type === 'warning' && <Clock className="h-5 w-5 text-nb-warning" />}
                  {activity.type === 'neutral' && <FileText className="h-5 w-5 text-nb-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-nb-black font-medium">{activity.text}</p>
                  <p className="text-nb-gray-500 text-sm mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions (role-based) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {user?.role === 'admin' && (
          <>
            <Card variant="outlined" interactive className="hover:border-nb-primary">
              <CardContent className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-3 text-nb-primary" />
                <h3 className="font-bold text-lg text-nb-black">Manage Users</h3>
                <p className="text-nb-gray-600 text-sm mt-1">
                  Create, edit, and manage user accounts
                </p>
              </CardContent>
            </Card>
            <Card variant="outlined" interactive className="hover:border-nb-success">
              <CardContent className="text-center py-8">
                <Building2 className="h-12 w-12 mx-auto mb-3 text-nb-success" />
                <h3 className="font-bold text-lg text-nb-black">Manage Rayons</h3>
                <p className="text-nb-gray-600 text-sm mt-1">Configure rayons and hierarchies</p>
              </CardContent>
            </Card>
            <Card variant="outlined" interactive className="hover:border-nb-warning">
              <CardContent className="text-center py-8">
                <MapPin className="h-12 w-12 mx-auto mb-3 text-nb-warning" />
                <h3 className="font-bold text-lg text-nb-black">Manage Areas</h3>
                <p className="text-nb-gray-600 text-sm mt-1">Create and configure service areas</p>
              </CardContent>
            </Card>
          </>
        )}

        {user?.role !== 'admin' && (
          <>
            <Card variant="outlined" interactive className="hover:border-nb-primary">
              <CardContent className="text-center py-8">
                <Map className="h-12 w-12 mx-auto mb-3 text-nb-primary" />
                <h3 className="font-bold text-lg text-nb-black">View Monitoring</h3>
                <p className="text-nb-gray-600 text-sm mt-1">Track worker locations in real-time</p>
              </CardContent>
            </Card>
            <Card variant="outlined" interactive className="hover:border-nb-success">
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-3 text-nb-success" />
                <h3 className="font-bold text-lg text-nb-black">View Reports</h3>
                <p className="text-nb-gray-600 text-sm mt-1">Review submitted work reports</p>
              </CardContent>
            </Card>
            <Card variant="outlined" interactive className="hover:border-nb-warning">
              <CardContent className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto mb-3 text-nb-warning" />
                <h3 className="font-bold text-lg text-nb-black">View Schedules</h3>
                <p className="text-nb-gray-600 text-sm mt-1">Check team schedules and shifts</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
