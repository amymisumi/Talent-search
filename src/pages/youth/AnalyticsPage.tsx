import React, { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUserAnalytics,
  subscribeToUserAnalytics,
  getTrendData,
  getRecruiterEngagement,
  UserAnalytics,
} from '@/services/analyticsService';
import {
  BarChart3,
  Eye,
  Briefcase,
  Send,
  FileText,
  Award,
  TrendingUp,
  Users,
  Target,
  Calendar,
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AnalyticsPage = () => {
  const { currentUser } = useAuth();
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [trendData, setTrendData] = useState<Array<{ date: string; count: number }>>([]);
  const [recruiterEngagement, setRecruiterEngagement] = useState<Array<{ recruiterId: string; recruiterName: string; views: number; saved: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('month');

  useEffect(() => {
    if (!currentUser?.uid) return;

    // Subscribe to real-time analytics
    const unsubscribe = subscribeToUserAnalytics(currentUser.uid, (data) => {
      setAnalytics(data);
      setLoading(false);
    });

    // Load trend data
    loadTrendData();
    loadRecruiterEngagement();

    return () => unsubscribe();
  }, [currentUser, timeRange]);

  const loadTrendData = async () => {
    if (!currentUser?.uid) return;
    const data = await getTrendData(currentUser.uid, timeRange);
    setTrendData(data);
  };

  const loadRecruiterEngagement = async () => {
    if (!currentUser?.uid) return;
    const data = await getRecruiterEngagement(currentUser.uid);
    setRecruiterEngagement(data);
  };

  useEffect(() => {
    loadTrendData();
  }, [timeRange]);

  if (loading) {
    return (
      <DashboardShell heading="Analytics" subheading="Track your profile performance and insights">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-8 w-8 mb-2" />
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-6 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardShell>
    );
  }

  const stats = analytics || {
    userId: currentUser?.uid || '',
    profileViews: 0,
    portfolioViews: 0,
    jobMatches: 0,
    applicationsSubmitted: 0,
    messagesSent: 0,
    certificatesUploaded: 0,
    recruiterProfileViews: 0,
    recruiterSaves: 0,
    skillsSearched: [],
    jobMatchRate: 0,
    lastUpdated: new Date(),
  };

  const statCards = [
    {
      title: 'Profile Views',
      value: stats.recruiterProfileViews || stats.profileViews || 0,
      icon: Eye,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
      description: 'Views by recruiters',
    },
    {
      title: 'Job Matches',
      value: stats.jobMatches,
      icon: Briefcase,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900',
    },
    {
      title: 'Applications',
      value: stats.applicationsSubmitted,
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
    },
    {
      title: 'Messages Sent',
      value: stats.messagesSent,
      icon: Send,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900',
    },
  ];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return timeRange === 'week' 
      ? date.toLocaleDateString('en-US', { weekday: 'short' })
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <DashboardShell heading="Analytics" subheading="Track your profile performance and insights">
      <div className="space-y-6">
        {/* Time Range Selector */}
        <div className="flex justify-end">
          <Select value={timeRange} onValueChange={(value: 'week' | 'month') => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value.toLocaleString()}</p>
                    </div>
                    <div className={`${stat.bgColor} ${stat.color} p-3 rounded-full`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Job Match Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <span className="text-3xl font-bold">{stats.jobMatchRate}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.jobMatches} matches / {stats.applicationsSubmitted} applications
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Recruiter Engagement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span className="text-3xl font-bold">{stats.recruiterProfileViews || 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.recruiterSaves || 0} saved your profile
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Portfolio Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    <span className="text-3xl font-bold">{stats.portfolioViews}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.topPortfolioProject ? `Top: ${stats.topPortfolioProject}` : 'No views yet'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Activity Trends</CardTitle>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip 
                    labelFormatter={(label) => formatDate(label)}
                    formatter={(value: number) => [value, 'Events']}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="Daily Activity"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-300 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No activity data for this period</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skills Searched */}
        {stats.skillsSearched.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Searched Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stats.skillsSearched.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="text-sm">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recruiter Engagement Breakdown */}
        {recruiterEngagement.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recruiter Engagement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recruiterEngagement.slice(0, 5).map((recruiter) => (
                  <div key={recruiter.recruiterId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{recruiter.recruiterName}</p>
                      <p className="text-sm text-muted-foreground">
                        Viewed your profile {recruiter.views} time{recruiter.views !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {recruiter.saved && (
                      <Badge variant="default">Saved</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Certificates Uploaded */}
        <Card>
          <CardHeader>
            <CardTitle>Certificates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Award className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.certificatesUploaded}</p>
                <p className="text-sm text-muted-foreground">Certificates uploaded</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
};

export default AnalyticsPage;
