import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import {
  getProfile,
  calculateProfileCompletion,
  subscribeToJobs,
  subscribeToApplicationsByRecruiter,
  subscribeToConversations,
  getRecruiterAnalytics,
  getRecruiterNotifications,
  subscribeToInterviews
} from '@/integrations/firebase/services';
import {
  UserProfile,
  Job,
  Application,
  Conversation,
  RecruiterNotification,
  Interview,
  ActivityFeedItem
} from '@/integrations/firebase/types';
import {
  Briefcase,
  FileText,
  Users,
  Bell,
  MessageSquare,
  TrendingUp,
  CheckCircle,
  Clock,
  MapPin,
  User,
  Settings,
  Search,
  BarChart3,
  Plus,
  Calendar,
  Eye,
  ArrowRight,
  Activity,
  Zap,
  Star,
  Mail,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export const DashboardOverviewEnhanced: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<RecruiterNotification[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser?.uid) return;

      try {
        setLoading(true);
        const userProfile = await getProfile(currentUser.uid);
        setProfile(userProfile);

        const analyticsData = await getRecruiterAnalytics(currentUser.uid);
        setAnalytics(analyticsData);

        const notificationsData = await getRecruiterNotifications(currentUser.uid);
        setNotifications(notificationsData.slice(0, 10));

        // Build activity feed
        const activities: ActivityFeedItem[] = [];
        
        // Add recent applications
        applications.slice(0, 5).forEach(app => {
          activities.push({
            id: `app-${app.id}`,
            recruiterId: currentUser.uid,
            type: 'application',
            title: 'New Application',
            description: `${app.userName} applied for ${app.jobTitle}`,
            relatedId: app.id,
            relatedType: 'application',
            createdAt: app.appliedAt,
            isRead: false
          });
        });

        // Add recent messages
        conversations.slice(0, 3).forEach(conv => {
          activities.push({
            id: `msg-${conv.id}`,
            recruiterId: currentUser.uid,
            type: 'message',
            title: 'New Message',
            description: conv.lastMessage,
            relatedId: conv.id,
            relatedType: 'conversation',
            createdAt: conv.lastMessageTime,
            isRead: false
          });
        });

        // Sort by date
        activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setActivityFeed(activities.slice(0, 10));
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast({
          title: t('error'),
          description: t('failedToLoadData'),
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser, t, toast]);

  // Set up real-time listeners
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribeJobs = subscribeToJobs(currentUser.uid, setJobs);
    const unsubscribeApplications = subscribeToApplicationsByRecruiter(currentUser.uid, setApplications);
    const unsubscribeConversations = subscribeToConversations(currentUser.uid, setConversations);
    const unsubscribeInterviews = subscribeToInterviews(currentUser.uid, setInterviews);

    return () => {
      unsubscribeJobs();
      unsubscribeApplications();
      unsubscribeConversations();
      unsubscribeInterviews();
    };
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
      </div>
    );
  }

  const profileCompletion = calculateProfileCompletion(profile);
  const activeJobs = jobs.filter(job => job.status === 'open').length;
  const totalApplications = applications.length;
  const unreadMessages = conversations.reduce(
    (sum, conv) => sum + (conv.unreadCount?.[currentUser?.uid || ''] || 0),
    0
  );
  const unreadNotifications = notifications.filter(n => !n.isRead).length;
  const upcomingInterviews = interviews.filter(
    i => i.status === 'scheduled' && new Date(i.scheduledAt) > new Date()
  ).slice(0, 5);
  const hiredCount = applications.filter(app => app.status === 'hired').length;

  return (
    <div className="space-y-6">
      {/* Company Profile Card */}
      {profile && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-4 ring-blue-100">
                  <AvatarImage src={profile.companyLogoUrl} alt={profile.companyName || profile.fullName} />
                  <AvatarFallback className="text-xl bg-blue-100 text-blue-600">
                    {profile.companyName?.charAt(0)?.toUpperCase() || profile.fullName?.charAt(0)?.toUpperCase() || 'R'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {profile.companyName || profile.fullName || t('welcome')}
                  </h2>
                  <p className="text-gray-600">{profile.email}</p>
                  {profile.city && profile.country && (
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      {profile.city}, {profile.country}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-500">{t('profileProgress')}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={profileCompletion} className="w-32 h-2" />
                    <span className="text-sm font-semibold">{profileCompletion}%</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/recruiter/profile')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {t('editProfile')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('activeJobs')}</CardTitle>
            <Briefcase className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {jobs.length} {t('totalJobs')}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('applicationsReceived')}</CardTitle>
            <FileText className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalApplications}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {applications.filter(app => app.status === 'new').length} {t('new')}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('unreadMessages')}</CardTitle>
            <MessageSquare className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{unreadMessages}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {conversations.length} {t('conversations')}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('candidatesHired')}</CardTitle>
            <CheckCircle className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{hiredCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics?.averageTimeToHire || 0} {t('avgDaysToHire')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Activity Feed & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activity Feed */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/recruiter/activity')}
                >
                  {t('viewAll')} <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {activityFeed.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No Recent Activity</p>
                    </div>
                  ) : (
                    activityFeed.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="mt-1">
                          {activity.type === 'application' && <FileText className="h-5 w-5 text-blue-600" />}
                          {activity.type === 'message' && <MessageSquare className="h-5 w-5 text-green-600" />}
                          {activity.type === 'interview' && <Calendar className="h-5 w-5 text-purple-600" />}
                          {activity.type === 'profile_view' && <Eye className="h-5 w-5 text-orange-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{activity.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {activity.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(activity.createdAt, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Quick Action Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  className="h-20 flex-col"
                  onClick={() => navigate('/recruiter/jobs/new')}
                >
                  <Plus className="h-5 w-5 mb-2" />
                  Post New Job
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col"
                  onClick={() => navigate('/recruiter/find-talent')}
                >
                  <Search className="h-5 w-5 mb-2" />
                  Search Talent
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col"
                  onClick={() => navigate('/recruiter/messages')}
                >
                  <MessageSquare className="h-5 w-5 mb-2" />
                  View Messages
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col"
                  onClick={() => navigate('/recruiter/analytics')}
                >
                  <BarChart3 className="h-5 w-5 mb-2" />
                  View Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Notifications & Upcoming Interviews */}
        <div className="space-y-6">
          {/* Notifications Panel */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  {t('notifications')}
                  {unreadNotifications > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {unreadNotifications}
                    </Badge>
                  )}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/recruiter/notifications')}
                >
                  {t('viewAll')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{t('noNotifications')}</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 rounded-lg border ${
                          !notification.isRead ? 'bg-blue-50 border-blue-200' : 'bg-background'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <AlertCircle className={`h-4 w-4 mt-0.5 ${
                            !notification.isRead ? 'text-blue-600' : 'text-muted-foreground'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{notification.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Upcoming Interviews */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {t('upcomingInterviews')}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/recruiter/interviews')}
                >
                  {t('viewAll')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[250px]">
                <div className="space-y-3">
                  {upcomingInterviews.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{t('noUpcomingInterviews')}</p>
                    </div>
                  ) : (
                    upcomingInterviews.map((interview) => (
                      <div
                        key={interview.id}
                        className="p-3 rounded-lg border hover:bg-accent transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {interview.youthId} {/* Would need to fetch candidate name */}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(interview.scheduledAt).toLocaleDateString()} at{' '}
                              {new Date(interview.scheduledAt).toLocaleTimeString()}
                            </p>
                            <Badge variant="outline" className="mt-2 text-xs">
                              {interview.meetingType === 'virtual' ? 'Video Call' : 'In-Person'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t('analyticsSummary')}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/recruiter/analytics')}
              >
                {t('viewFullReport')} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">{t('applicationsOverTime')}</p>
                <div className="h-32 bg-muted rounded flex items-center justify-center">
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">{t('chartPlaceholder')}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">{t('hiringFunnel')}</p>
                <div className="h-32 bg-muted rounded flex items-center justify-center">
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">{t('chartPlaceholder')}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">{t('conversionRates')}</p>
                <div className="h-32 bg-muted rounded flex items-center justify-center">
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">{t('chartPlaceholder')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

