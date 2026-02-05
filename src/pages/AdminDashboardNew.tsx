import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from '../integrations/firebase/client';
import { signOut } from 'firebase/auth';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { AdminDashboardLayout } from '../components/admin/AdminDashboardLayout';
import { AdminOverviewDashboard } from '../components/admin/AdminOverviewDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
  Users,
  FileCheck,
  Star,
  Network,
  BarChart3,
  Flag,
  Bell,
  Settings,
  Shield,
  Activity,
  FileText,
  Download,
  Calendar,
  Search,
  Filter,
  Home
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import {
  isAdmin,
  getAllUsersForAdmin,
  getAllCertificatesForAdmin,
  getAllReviewsForAdmin,
  getAllConnectionsForAdmin,
  getAllReportsForAdmin,
  getAdminDashboardStats,
  AdminUserProfile
} from '../integrations/firebase/adminServices';
import { getCompleteAnalytics } from '../integrations/firebase/adminAnalytics';
import {
  generateUserListReport,
  generateReviewAnalyticsReport,
  generateVerificationLogsReport,
  generateConnectionActivityReport,
  generateReportsModerationLogsReport,
  downloadReport
} from '../utils/reportGenerator';
import { useLanguage } from '../contexts/LanguageContext';

// Import feature components (we'll create these)
import { UserManagementTab } from '../components/admin/tabs/UserManagementTab';
import { VerificationCenterTab } from '../components/admin/tabs/VerificationCenterTab';
import { ReviewsModerationTab } from '../components/admin/tabs/ReviewsModerationTab';
import { NetworkMonitoringTab } from '../components/admin/tabs/NetworkMonitoringTab';
import { AnalyticsTab } from '../components/admin/tabs/AnalyticsTab';
import { ReportsGeneratorTab } from '../components/admin/tabs/ReportsGeneratorTab';
import { AnnouncementsTab } from '../components/admin/tabs/AnnouncementsTab';
import { SystemSettingsTab } from '../components/admin/tabs/SystemSettingsTab';

const AdminDashboardNew: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { currentUser, userData } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  
  // Handle navigation clicks from sidebar
  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Admin navigation items
  const adminNavItems = [
    { label: 'Overview', path: '/admin-dashboard', icon: Home, onClick: () => handleNavClick('overview') },
    { label: 'Users', path: '/admin-dashboard', icon: Users, onClick: () => handleNavClick('users') },
    { label: 'Verification', path: '/admin-dashboard', icon: FileCheck, onClick: () => handleNavClick('verification') },
    { label: 'Reviews', path: '/admin-dashboard', icon: Star, onClick: () => handleNavClick('reviews') },
    { label: 'Network', path: '/admin-dashboard', icon: Network, onClick: () => handleNavClick('network') },
    { label: 'Analytics', path: '/admin-dashboard', icon: BarChart3, onClick: () => handleNavClick('analytics') },
    { label: 'Reports', path: '/admin-dashboard', icon: Flag, onClick: () => handleNavClick('reports') },
    { label: 'Announcements', path: '/admin-dashboard', icon: Bell, onClick: () => handleNavClick('announcements') },
    { label: 'Settings', path: '/admin-dashboard', icon: Settings, onClick: () => handleNavClick('settings') },
  ];

  useEffect(() => {
    checkAdminAccess();
  }, [currentUser]);

  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

  const checkAdminAccess = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    try {
      const adminStatus = await isAdmin(currentUser.uid);
      if (!adminStatus) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You do not have admin privileges."
        });
        navigate('/');
        return;
      }
      setIsAuthorized(true);
    } catch (error) {
      console.error("Error checking admin access:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to verify admin access."
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
      toast({
        title: "Logged out",
        description: "Successfully logged out from admin dashboard"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to logout"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  return (
    <AdminDashboardLayout activeTab={activeTab} onTabChange={handleTabChange}>
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-8">
          {/* Admin Welcome Card */}
          {currentUser && (
            <Card className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 border-0 shadow-2xl overflow-hidden">
              <CardContent className="p-8 text-white relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24 blur-3xl"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      <Avatar className="h-24 w-24 ring-4 ring-white/30 shadow-xl">
                        <AvatarImage src={userData?.photoURL} alt={currentUser.displayName || 'Admin'} />
                        <AvatarFallback className="text-2xl bg-white/20 text-white border-2 border-white/30">
                          <Shield className="h-12 w-12" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1.5 border-4 border-slate-800">
                        <div className="h-3 w-3 bg-green-400 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-4xl font-bold text-white">
                        Welcome back, {currentUser.displayName?.split(' ')[0] || 'Admin'}
                      </h2>
                      <p className="text-lg text-blue-100">{currentUser.email}</p>
                      <div className="flex items-center gap-3 mt-4">
                        <Badge className="bg-white/20 text-white border border-white/30 px-4 py-1.5">
                          <Shield className="h-4 w-4 mr-2" />
                          Super Administrator
                        </Badge>
                        <Badge className="bg-white/20 text-white border border-white/30 px-4 py-1.5">
                          Full Access
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
            <AdminOverviewDashboard />
          </div>
        )}

        {activeTab === 'users' && <UserManagementTab />}
        {activeTab === 'verification' && <VerificationCenterTab />}
        {activeTab === 'reviews' && <ReviewsModerationTab />}
        {activeTab === 'network' && <NetworkMonitoringTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'reports-generator' && <ReportsGeneratorTab />}
        {activeTab === 'announcements' && <AnnouncementsTab />}
        {activeTab === 'settings' && <SystemSettingsTab />}
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminDashboardNew;

