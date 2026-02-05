import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  getProfile, 
  calculateProfileCompletion,
  subscribeToJobs,
  subscribeToApplicationsByRecruiter,
  subscribeToConversations,
  getRecruiterAnalytics,
  getRecruiterNotifications,
  subscribeToRecruiterNotifications
} from '@/integrations/firebase/services';
import { UserProfile, Job, Application, Conversation, RecruiterNotification, RecruiterAnalytics } from '@/integrations/firebase/types';
import {
  Briefcase,
  FileText,
  Users,
  Bell,
  MessageSquare,
  TrendingUp,
  Plus,
  Search,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  MapPin,
  Building2,
  Edit,
  BarChart3,
  ArrowRight,
  Calendar,
  UserCheck,
  Mail,
  Phone,
  Globe,
  User,
  BriefcaseIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RecruiterDashboardOverviewProps {
  onNavigate?: (path: string) => void;
}

export const RecruiterDashboardOverview: React.FC<RecruiterDashboardOverviewProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<RecruiterNotification[]>([]);
  const [analytics, setAnalytics] = useState<RecruiterAnalytics | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const loadProfile = async () => {
      try {
        const userProfile = await getProfile(currentUser.uid);
        setProfile(userProfile);
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const loadAnalytics = async () => {
      try {
        const analyticsData = await getRecruiterAnalytics(currentUser.uid);
        setAnalytics(analyticsData);
      } catch (error) {
        console.error('Error loading analytics:', error);
      }
    };

    loadAnalytics();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribeJobs = subscribeToJobs(currentUser.uid, setJobs);
    const unsubscribeApplications = subscribeToApplicationsByRecruiter(currentUser.uid, setApplications);
    const unsubscribeConversations = subscribeToConversations(currentUser.uid, setConversations);
    
    const unsubscribeNotifications = subscribeToRecruiterNotifications(currentUser.uid, (notifs) => {
      setNotifications(notifs);
    });

    return () => {
      unsubscribeJobs();
      unsubscribeApplications();
      unsubscribeConversations();
      unsubscribeNotifications();
    };
  }, [currentUser]);

  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  const profileCompletion = profile ? calculateProfileCompletion(profile) : 0;
  const activeJobs = jobs.filter(job => job.status === 'open').length;
  const totalApplications = applications.length;
  const unreadMessages = conversations.reduce((sum, conv) => sum + (conv.unreadCount?.[currentUser?.uid || ''] || 0), 0);
  const unreadNotifications = notifications.filter(n => !n.isRead).length;
  const recentApplications = applications.slice(0, 5);
  const recentMessages = conversations.slice(0, 5);

  // Prepare chart data
  const applicationsChartData = analytics?.monthlyActivity.map(activity => ({
    month: activity.month,
    applications: activity.applicantsReceived,
    jobs: activity.jobsPosted
  })) || [];

  return (
    <div className="space-y-6">
      {/* Company Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.companyLogoUrl} alt={profile?.companyName || 'Company'} />
                <AvatarFallback>
                  <Building2 className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{profile?.companyName || 'Your Company'}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <MapPin className="h-4 w-4" />
                  {profile?.city && profile?.country ? `${profile.city}, ${profile.country}` : 'Location not set'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleNavigate('/recruiter/profile')}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Profile Completion</span>
              <span className="text-sm text-muted-foreground">{profileCompletion}%</span>
            </div>
            <Progress value={profileCompletion} className="h-2" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {/* Company Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </h3>
              <div className="space-y-3">
                {profile?.companyName && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Company Name</p>
                      <p className="text-sm text-muted-foreground">{profile.companyName}</p>
                    </div>
                  </div>
                )}
                {profile?.companyDescription && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Company Description</p>
                      <p className="text-sm text-muted-foreground">{profile.companyDescription}</p>
                    </div>
                  </div>
                )}
                {profile?.industryType && (
                  <div className="flex items-start gap-3">
                    <BriefcaseIcon className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Industry</p>
                      <p className="text-sm text-muted-foreground">{profile.industryType}</p>
                    </div>
                  </div>
                )}
                {(profile?.city || profile?.country) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">
                        {[profile.city, profile.country].filter(Boolean).join(', ') || 'Not specified'}
                      </p>
                    </div>
                  </div>
                )}
                {profile?.companyWebsite && (
                  <div className="flex items-start gap-3">
                    <Globe className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Website</p>
                      <a 
                        href={profile.companyWebsite} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {profile.companyWebsite}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </h3>
              <div className="space-y-3">
                {profile?.fullName && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Contact Name</p>
                      <p className="text-sm text-muted-foreground">{profile.fullName}</p>
                    </div>
                  </div>
                )}
                {profile?.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <a 
                        href={`mailto:${profile.email}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {profile.email}
                      </a>
                    </div>
                  </div>
                )}
                {profile?.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <a 
                        href={`tel:${profile.phone}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {profile.phone}
                      </a>
                    </div>
                  </div>
                )}
                {profile?.bio && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Bio</p>
                      <p className="text-sm text-muted-foreground">{profile.bio}</p>
                    </div>
                  </div>
                )}
                {profile?.preferredCareerField && (
                  <div className="flex items-start gap-3">
                    <Briefcase className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Preferred Career Field</p>
                      <p className="text-sm text-muted-foreground">{profile.preferredCareerField}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeJobs}</div>
            <p className="text-xs text-muted-foreground">
              {jobs.length} total jobs posted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications Received</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalApplications}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.newApplicantsThisWeek || 0} new this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadMessages}</div>
            <p className="text-xs text-muted-foreground">
              {conversations.length} total conversations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Candidates Hired</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.hiredCandidates || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.shortlistedCandidates || 0} shortlisted
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest applications, messages, and profile views</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {recentApplications.length === 0 && recentMessages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No recent activity</p>
                    <p className="text-sm mt-2">Start by posting a job or searching for talent!</p>
                  </div>
                ) : (
                  <>
                    {recentApplications.map((app) => (
                      <div key={app.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                        <div className="p-2 rounded-full bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">New Application</p>
                          <p className="text-sm text-muted-foreground">
                            {app.userName} applied for {app.jobTitle}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(app.appliedAt, 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                        <Badge variant={app.status === 'new' ? 'default' : 'secondary'} className="text-xs">
                          {app.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))}
                    {recentMessages.map((conv) => (
                      <div key={conv.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                        <div className="p-2 rounded-full bg-primary/10">
                          <MessageSquare className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">New Message</p>
                          <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(conv.lastMessageTime, 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                        {conv.unreadCount?.[currentUser?.uid || ''] > 0 && (
                          <Badge variant="default" className="text-xs">
                            {conv.unreadCount[currentUser.uid]}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Notifications Panel */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Notifications</CardTitle>
              {unreadNotifications > 0 && (
                <Badge variant="destructive">{unreadNotifications}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notifications</p>
                  </div>
                ) : (
                  notifications.slice(0, 10).map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 rounded-lg border ${!notif.isRead ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'}`}
                    >
                      <div className="flex items-start gap-2">
                        <Bell className={`h-4 w-4 mt-0.5 ${!notif.isRead ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${!notif.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notif.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{notif.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(notif.createdAt, 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <Separator className="my-4" />
            <Button variant="outline" className="w-full" onClick={() => handleNavigate('/recruiter/notifications')}>
              View All Notifications
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button className="h-auto flex-col gap-2 py-4" onClick={() => handleNavigate('/recruiter/jobs/new')}>
              <Plus className="h-5 w-5" />
              <span>Post New Job</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => handleNavigate('/recruiter/find-talent')}>
              <Search className="h-5 w-5" />
              <span>Search Talent</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => handleNavigate('/recruiter/messages')}>
              <MessageSquare className="h-5 w-5" />
              <span>View Messages</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => handleNavigate('/recruiter/applications')}>
              <FileText className="h-5 w-5" />
              <span>Review Applications</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Analytics Summary</CardTitle>
              <CardDescription>Applications and hiring trends</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleNavigate('/recruiter/analytics')}>
              View Full Analytics
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Applications Over Time */}
            <div>
              <h4 className="text-sm font-medium mb-4">Applications Over Time</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={applicationsChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="applications" stroke="#8884d8" name="Applications" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Hiring Funnel */}
            <div>
              <h4 className="text-sm font-medium mb-4">Hiring Funnel</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Applications</span>
                  <span className="font-semibold">{totalApplications}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Under Review</span>
                  <span className="font-semibold">
                    {applications.filter(a => a.status === 'under_review').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Shortlisted</span>
                  <span className="font-semibold">{analytics?.shortlistedCandidates || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Interviews Scheduled</span>
                  <span className="font-semibold">
                    {applications.filter(a => a.status === 'interview_scheduled').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Hired</span>
                  <span className="font-semibold text-green-600">{analytics?.hiredCandidates || 0}</span>
                </div>
                {totalApplications > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Conversion Rate</span>
                      <span className="font-semibold">
                        {((analytics?.hiredCandidates || 0) / totalApplications * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

