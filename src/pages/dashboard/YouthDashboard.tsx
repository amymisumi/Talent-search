import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getProfile, calculateProfileCompletion, subscribeToJobs, subscribeToApplicationsByUser, subscribeToMessages, subscribeToConversations, getApplicationsByUser, getConnectionsByUser, subscribeToConnections } from '@/integrations/firebase/services';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Briefcase,
  FileText,
  Users,
  Bell,
  MapPin,
  User,
  Plus
} from 'lucide-react';

// Components
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { NetworkingCenter } from '@/components/dashboard/NetworkingCenter';

// Types
import { UserProfile, Job, Application, Message, Conversation } from '@/integrations/firebase/types';

export function YouthDashboard() {
  const { currentUser, userData, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Redirect recruiters to their dashboard
  // Only redirect if we're certain the role is 'recruiter' and auth is not loading
  useEffect(() => {
    // Wait for auth to finish loading and userData to be available before checking role
    // Only redirect if auth is done loading, userData exists, and role is definitively 'recruiter'
    if (!authLoading && userData && userData.role === 'recruiter') {
      navigate('/recruiter-dashboard', { replace: true });
    }
  }, [userData, authLoading, navigate]);
  
  // Get active tab from URL params, default to 'overview'
  const activeTab = searchParams.get('tab') || 'overview';

  // Dynamic data states
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [connections, setConnections] = useState<any[]>([]);

  // Analytics data
  const [analytics, setAnalytics] = useState<any>(null);

  // Load user profile (non-blocking — show dashboard shell immediately)
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const fallbackProfile: UserProfile = {
      id: currentUser.uid,
      userId: currentUser.uid,
      fullName: currentUser.displayName || userData?.displayName || 'Youth User',
      email: currentUser.email || userData?.email || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setProfile(fallbackProfile);
    setLoading(false);

    let cancelled = false;
    getProfile(currentUser.uid)
      .then((userProfile) => {
        if (!cancelled && userProfile) {
          setProfile(userProfile);
        }
      })
      .catch((error) => {
        console.error('Error loading profile:', error);
      });

    return () => { cancelled = true; };
  }, [currentUser, userData?.displayName, userData?.email]);

  // Load analytics data from Firebase
  useEffect(() => {
    const loadAnalytics = async () => {
      if (currentUser?.uid) {
        try {
          // Import analytics service
          const { getUserAnalytics } = await import('@/services/analyticsService');
          const analyticsData = await getUserAnalytics(currentUser.uid);
          
          if (analyticsData) {
            setAnalytics({
              connections: 0, // Can be calculated from connections if needed
              profileViews: analyticsData.profileViews || 0,
              recruiterProfileViews: analyticsData.recruiterProfileViews || 0,
              applicationsSent: applications.length,
              jobMatches: analyticsData.jobMatches || 0,
              messagesSent: analyticsData.messagesSent || 0,
              portfolioViews: analyticsData.portfolioViews || 0,
            });
          } else {
            // No analytics data yet, use defaults
            setAnalytics({
              connections: 0,
              profileViews: 0,
              recruiterProfileViews: 0,
              applicationsSent: applications.length,
              jobMatches: 0,
              messagesSent: 0,
              portfolioViews: 0,
            });
          }
        } catch (error) {
          console.error('Error loading analytics:', error);
          // Fallback to defaults on error
          setAnalytics({
            connections: 0,
            profileViews: 0,
            recruiterProfileViews: 0,
            applicationsSent: applications.length,
            jobMatches: 0,
            messagesSent: 0,
            portfolioViews: 0,
          });
        }
      }
    };

    loadAnalytics();
  }, [currentUser, applications]);

  // Load and subscribe to connections in real-time
  useEffect(() => {
    if (!currentUser?.uid) return;

    console.log('[YouthDashboard] Setting up connections subscription for user:', currentUser.uid);
    
    const unsubscribe = subscribeToConnections(currentUser.uid, (userConnections) => {
      console.log('[YouthDashboard] Connections updated:', userConnections.length);
      console.log('[YouthDashboard] All connections:', userConnections.map(c => ({
        id: c.id,
        status: c.status,
        userId: c.userId,
        connectedUserId: c.connectedUserId,
        statusType: typeof c.status,
        statusValue: c.status
      })));
      
      const acceptedCount = userConnections.filter(c => {
        const status = c.status?.toLowerCase?.() || c.status || '';
        return status === 'accepted';
      }).length;
      
      console.log('[YouthDashboard] Accepted connections count:', acceptedCount);
      console.log('[YouthDashboard] Connection statuses:', userConnections.map(c => c.status));
      setConnections(userConnections);
    });

    return () => {
      console.log('[YouthDashboard] Unsubscribing from connections');
      unsubscribe();
    };
  }, [currentUser]);

  // Set up real-time listeners
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribeJobs = subscribeToJobs(currentUser.uid, setJobs);
    const unsubscribeApplications = subscribeToApplicationsByUser(currentUser.uid, setApplications);
    const unsubscribeMessages = subscribeToMessages(currentUser.uid, setMessages);
    const unsubscribeConversations = subscribeToConversations(currentUser.uid, setConversations);

    return () => {
      unsubscribeJobs();
      unsubscribeApplications();
      unsubscribeMessages();
      unsubscribeConversations();
    };
  }, [currentUser]);

  const handleProfileUpdate = async (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    return true;
  };

  const profileCompletion = calculateProfileCompletion(profile);

  // Calculate metrics
  const activeJobs = jobs.filter(job => job.status === 'open').length;
  const totalApplications = applications.length;
  const pendingApplications = applications.filter(app => app.status === 'pending').length;
  const unreadMessages = conversations.reduce((sum, conv) => sum + (conv.unreadCount?.[currentUser?.uid || ''] || 0), 0);

  if (loading) {
    return (
      <DashboardShell heading={t('settingUpDashboard')} subheading={t('dashboardLoadingSubtitle')}>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
        </div>
      </DashboardShell>
    );
  }

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <DashboardShell heading={t('youthDashboard')} subheading={t('monitorOpportunities')}>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        {activeTab === 'network' ? (
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="network">Network</TabsTrigger>
          </TabsList>
        ) : (
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="overview" className="space-y-8">
          {/* Contextual Action Bar */}
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-3">
            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => navigate('/youth/profile/edit')}>
              <User className="h-4 w-4 mr-2" />
              {t('updateProfile')}
            </Button>
            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => navigate('/youth/cv-builder')}>
              <FileText className="h-4 w-4 mr-2" />
              {t('createCV')}
            </Button>
            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => navigate('/youth/portfolio')}>
              <Plus className="h-4 w-4 mr-2" />
              {t('uploadPortfolio')}
            </Button>
          </div>

          {/* User Info Card */}
          {profile && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
              <CardContent className="p-4 sm:p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20 ring-4 ring-blue-100 flex-shrink-0">
                      <AvatarImage src={profile.profileImageUrl} alt={profile.fullName} />
                      <AvatarFallback className="text-xl bg-blue-100 text-blue-600">
                        {profile.fullName?.charAt(0)?.toUpperCase() || 'Y'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2 min-w-0">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">{profile.fullName || t('welcome')}</h2>
                      <p className="text-base sm:text-lg text-gray-600 truncate">{profile.email}</p>
                      {profile.city && profile.country && (
                        <div className="flex items-center text-base text-gray-500">
                          <MapPin className="h-5 w-5 mr-2" />
                          {profile.city}, {profile.country}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-start md:items-end space-y-4 w-full md:w-auto">
                    <div className="space-y-2 w-full md:w-auto">
                      <div className="text-sm font-medium text-gray-500">{t('profileProgress')}</div>
                      <div className="flex items-center space-x-3">
                        <Progress value={profileCompletion} className="w-full sm:w-32 h-3" />
                        <span className="text-lg font-semibold">{profileCompletion}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">{t('jobMatches')}</CardTitle>
                <Briefcase className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{activeJobs}</div>
                <p className="text-sm text-gray-500 mt-1">
                  {jobs.length > 0 ? `${jobs.length} ${t('totalMatches')}` : t('noJobMatchesYet')}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">{t('Applications')}</CardTitle>
                <FileText className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{totalApplications}</div>
                <p className="text-sm text-gray-500 mt-1">
                  {pendingApplications > 0 ? `${pendingApplications} ${t('pending')}` : t('noApplicationsYet')}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">{t('Connections')}</CardTitle>
                <Users className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {(() => {
                    const acceptedCount = connections.filter(c => {
                      const status = (c.status || '').toString().toLowerCase().trim();
                      return status === 'accepted';
                    }).length;
                    console.log('[YouthDashboard] Connections card - Total:', connections.length, 'Accepted:', acceptedCount);
                    return acceptedCount;
                  })()}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {(() => {
                    const acceptedCount = connections.filter(c => {
                      const status = (c.status || '').toString().toLowerCase().trim();
                      return status === 'accepted';
                    }).length;
                    return acceptedCount === 1 ? 'Network connection' : t('networkConnections');
                  })()}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">{t('Messages')}</CardTitle>
                <Bell className="h-5 w-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{unreadMessages}</div>
                <p className="text-sm text-gray-500 mt-1">
                  {conversations.length > 0 ? `${conversations.length} ${t('conversations')}` : t('noMessagesYet')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Dashboard Overview Content */}
          <DashboardOverview 
            profileCompletion={profileCompletion} 
            profile={profile} 
            connectionsCount={(() => {
              // Count all accepted connections (both sent and received)
              const acceptedConnections = connections.filter(c => {
                const status = (c.status || '').toString().toLowerCase().trim();
                const isAccepted = status === 'accepted';
                if (connections.length > 0) {
                  console.log('[YouthDashboard] Checking connection:', {
                    id: c.id,
                    status: c.status,
                    statusLower: status,
                    userId: c.userId,
                    connectedUserId: c.connectedUserId,
                    isAccepted,
                    currentUserId: currentUser?.uid
                  });
                }
                return isAccepted;
              });
              
              const count = acceptedConnections.length;
              console.log('[YouthDashboard] Rendering DashboardOverview');
              console.log('[YouthDashboard] Total connections:', connections.length);
              console.log('[YouthDashboard] Accepted connections count:', count);
              console.log('[YouthDashboard] All connection statuses:', connections.map(c => c.status));
              
              return count;
            })()}
            userRole="youth"
          />
        </TabsContent>

        <TabsContent value="network">
          <NetworkingCenter />
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}

export default YouthDashboard;
