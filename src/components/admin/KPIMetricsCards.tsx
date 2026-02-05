import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Users,
  Building,
  FileCheck,
  Bell,
  TrendingUp,
  TrendingDown,
  Activity,
  UserPlus
} from 'lucide-react';

interface KPIMetricsCardsProps {
  stats: {
    newYouthThisWeek: string;
    totalYouth: any;
    totalUsers: number;
    totalRecruiters: number;
    verifiedCertificates: number;
    pendingCertificates: number;
    newUsersThisWeek: number;
    newRecruitersThisWeek: number;
  };
  dailyActivityData?: Array<{ date: string; activity: number }>;
}

export const KPIMetricsCards: React.FC<KPIMetricsCardsProps> = ({
  stats,
  dailyActivityData = []
}) => {
  const metrics = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: stats.newUsersThisWeek > 0 ? '+' + stats.newUsersThisWeek : '0',
      trendUp: stats.newUsersThisWeek > 0
    },
    {
      title: 'Total Recruiters',
      value: stats.totalRecruiters,
      icon: Building,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      trend: stats.newRecruitersThisWeek > 0 ? '+' + stats.newRecruitersThisWeek : '0',
      trendUp: stats.newRecruitersThisWeek > 0
    },
     {
      title: 'Total Youth',
      value: stats.totalYouth,
      icon: Building,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      trend: Number(stats.newYouthThisWeek) > 0 ? '+' + String(Number(stats.newYouthThisWeek)) : '0',
      trendUp: Number(stats.newYouthThisWeek) > 0
    },
    {
      title: 'Verified Certificates',
      value: stats.verifiedCertificates,
      icon: FileCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: '+12%',
      trendUp: true
    },
    {
      title: 'Pending Certificates',
      value: stats.pendingCertificates,
      icon: Bell,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      trend: '-5%',
      trendUp: false
    }
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card
              key={index}
              className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border-0 shadow-md bg-white"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {metric.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${metric.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`h-4 w-4 ${metric.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 mb-1">
                  {metric.value.toLocaleString()}
                </div>
                <div className="flex items-center space-x-1">
                  {metric.trendUp ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <Badge
                    variant="secondary"
                    className={`text-xs ${
                      metric.trendUp
                        ? 'text-green-700 bg-green-100'
                        : 'text-red-700 bg-red-100'
                    }`}
                  >
                    {metric.trend}
                  </Badge>
                  <span className="text-xs text-slate-500">vs last week</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Daily Activity Graph Card */}
      <Card className="border-0 shadow-md bg-white">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-slate-800">
            <Activity className="h-5 w-5 text-blue-600" />
            <span>Daily Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-end justify-between space-x-1">
            {dailyActivityData.length > 0 ? (
              dailyActivityData.map((day, index) => (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm transition-all duration-300 hover:from-blue-600 hover:to-blue-500"
                    style={{
                      height: `${Math.max((day.activity / 100) * 120, 8)}px`,
                      minHeight: '8px'
                    }}
                  />
                  <span className="text-xs text-slate-500 mt-2">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                </div>
              ))
            ) : (
              // Mock data for demonstration
              Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                  <div
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm transition-all duration-300 hover:from-blue-600 hover:to-blue-500"
                    style={{
                      height: `${Math.random() * 100 + 20}px`,
                      minHeight: '8px'
                    }}
                  />
                  <span className="text-xs text-slate-500 mt-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-slate-600">Activity Level</span>
            </div>
            <div className="text-sm text-slate-500">
              Last 7 days
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
