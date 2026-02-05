import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Users,
  Building,
  FileCheck,
  Star,
  Flag,
  TrendingUp,
  AlertTriangle,
  Activity,
  Clock,
  BarChart3
} from 'lucide-react';
import {
  getAdminDashboardStats,
  subscribeToAdminDashboardStats,
  AdminDashboardStats,
  SystemAlert
} from '../../integrations/firebase/adminServices';
import { useToast } from '../../hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export const AdminOverviewDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  useEffect(() => {
    const unsubscribe = subscribeToAdminDashboardStats((updatedStats) => {
      setStats(updatedStats);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={isDark ? "text-lg text-white" : "text-lg text-gray-900"}>Loading dashboard...</div>
      </div>
    );
  }

  const handleMetricClick = (metric: string) => {
    // Navigate to detailed view based on metric
    switch (metric) {
      case 'youth':
        navigate('/admin-dashboard?tab=users&filter=youth');
        break;
      case 'recruiters':
        navigate('/admin-dashboard?tab=users&filter=recruiters');
        break;
      case 'certificates':
        navigate('/admin-dashboard?tab=certificates');
        break;
      case 'reviews':
        navigate('/admin-dashboard?tab=reviews');
        break;
      case 'reports':
        navigate('/admin-dashboard?tab=reports');
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-8">
      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card 
          className="cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 border-0 bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25"
          onClick={() => handleMetricClick('youth')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-blue-100">Total Youth</CardTitle>
            <div className="p-2 bg-white/20 rounded-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-white mb-2">{stats.totalYouth}</div>
            <div className="flex items-center gap-2 text-blue-100 text-sm">
              <TrendingUp className="h-4 w-4" />
              <span>+{stats.dailyGrowth.youth} today</span>
            </div>
            <p className="text-xs text-blue-200 mt-2">{stats.verifiedYouth} verified</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 border-0 bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/25"
          onClick={() => handleMetricClick('recruiters')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-purple-100">Total Recruiters</CardTitle>
            <div className="p-2 bg-white/20 rounded-lg">
              <Building className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-white mb-2">{stats.totalRecruiters}</div>
            <div className="flex items-center gap-2 text-purple-100 text-sm">
              <TrendingUp className="h-4 w-4" />
              <span>+{stats.dailyGrowth.recruiters} today</span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 border-0 bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25"
          onClick={() => handleMetricClick('certificates')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-amber-100">Pending Certificates</CardTitle>
            <div className="p-2 bg-white/20 rounded-lg">
              <FileCheck className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-white mb-2">{stats.pendingCertificates}</div>
            <p className="text-xs text-amber-100 mt-1">
              {stats.totalCertificates ? `of ${stats.totalCertificates} total` : 'Awaiting review'}
            </p>
          </CardContent>
        </Card>


        <Card 
          className="cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 border-0 bg-gradient-to-br from-yellow-500 to-amber-500 shadow-lg shadow-yellow-500/25"
          onClick={() => handleMetricClick('reviews')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-yellow-100">Total Reviews</CardTitle>
            <div className="p-2 bg-white/20 rounded-lg">
              <Star className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-white mb-2">{stats.totalReviews}</div>
            <div className="flex items-center gap-2 text-yellow-100 text-sm">
              <TrendingUp className="h-4 w-4" />
              <span>+{stats.dailyGrowth.reviews} today</span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 border-0 bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/25"
          onClick={() => handleMetricClick('reports')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-red-100">Pending Reports</CardTitle>
            <div className="p-2 bg-white/20 rounded-lg">
              <Flag className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-white mb-2">{stats.pendingReports || 0}</div>
            <p className="text-xs text-red-100 mt-1">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Growth Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 bg-slate-700/50 backdrop-blur-xl shadow-xl border-slate-600/50">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              Daily Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg dark:bg-slate-600/30 bg-gray-100">
                <span className="text-sm font-medium dark:text-slate-200 text-gray-700">Youth</span>
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                  +{stats.dailyGrowth.youth}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg dark:bg-slate-600/30 bg-gray-100">
                <span className="text-sm font-medium dark:text-slate-200 text-gray-700">Recruiters</span>
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                  +{stats.dailyGrowth.recruiters}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg dark:bg-slate-600/30 bg-gray-100">
                <span className="text-sm font-medium dark:text-slate-200 text-gray-700">Reviews</span>
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                  +{stats.dailyGrowth.reviews}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 dark:bg-slate-700/50 bg-white/80 backdrop-blur-xl shadow-xl dark:border-slate-600/50 border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-bold dark:text-white text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              Weekly Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg dark:bg-slate-600/30 bg-gray-100">
                <span className="text-sm font-medium dark:text-slate-200 text-gray-700">Youth</span>
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                  +{stats.weeklyGrowth.youth}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg dark:bg-slate-600/30 bg-gray-100">
                <span className="text-sm font-medium dark:text-slate-200 text-gray-700">Recruiters</span>
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                  +{stats.weeklyGrowth.recruiters}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg dark:bg-slate-600/30 bg-gray-100">
                <span className="text-sm font-medium dark:text-slate-200 text-gray-700">Reviews</span>
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                  +{stats.weeklyGrowth.reviews}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Alerts */}
      {stats.systemAlerts.length > 0 && (
        <Card className="border-0 bg-slate-700/50 backdrop-blur-xl shadow-xl border-slate-600/50">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              System Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.systemAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border backdrop-blur-sm ${
                    alert.severity === 'critical'
                      ? 'bg-red-500/20 border-red-500/30'
                      : alert.severity === 'high'
                      ? 'bg-orange-500/20 border-orange-500/30'
                      : alert.severity === 'medium'
                      ? 'bg-yellow-500/20 border-yellow-500/30'
                      : 'bg-blue-500/20 border-blue-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          className={
                            alert.severity === 'critical'
                              ? 'bg-red-500/30 text-red-200 border-red-500/50'
                              : alert.severity === 'high'
                              ? 'bg-orange-500/30 text-orange-200 border-orange-500/50'
                              : alert.severity === 'medium'
                              ? 'bg-yellow-500/30 text-yellow-200 border-yellow-500/50'
                              : 'bg-blue-500/30 text-blue-200 border-blue-500/50'
                          }
                        >
                          {alert.severity}
                        </Badge>
                        <span className="text-sm font-semibold text-white">{alert.title}</span>
                      </div>
                      <p className="text-sm text-slate-300">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(alert.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                      onClick={() => {
                        // Handle alert action
                        toast({
                          title: "Alert Action",
                          description: `Handling alert: ${alert.title}`
                        });
                      }}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
};

