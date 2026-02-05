import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import {
  getAllProfiles,
  getAllYouthUsers,
  getActiveRecruiters,
  getConnectionsByUser,
  addConnection,
  updateConnection,
  subscribeToConnections
} from '@/integrations/firebase/services';
import { UserProfile, Connection } from '@/integrations/firebase/types';
import {
  Search,
  UserPlus,
  UserCheck,
  UserX,
  Users,
  User,
  MapPin,
  Briefcase,
  Star,
  MessageSquare,
  Tag,
  Filter,
  TrendingUp,
  Activity,
  CheckCircle,
  Clock,
  XCircle,
  Mail,
  Phone,
  Globe,
  Award,
  FileText,
  ExternalLink,
  Video as VideoIcon,
  Image as ImageIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getProfile, getPortfoliosByProfile } from '@/integrations/firebase/services';
import { Portfolio } from '@/integrations/firebase/types';

interface NetworkUser extends UserProfile {
  connectionStatus?: 'connected' | 'pending' | 'none';
  connectionId?: string;
  mutualConnections?: number;
}

export const NetworkingCenter: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [allUsers, setAllUsers] = useState<NetworkUser[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<NetworkUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userType, setUserType] = useState<'all' | 'youth' | 'recruiter'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'connected' | 'pending' | 'none'>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'browse' | 'connections' | 'requests' | 'analytics'>('browse');
  
  // Profile dialog state
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [selectedPortfolios, setSelectedPortfolios] = useState<Portfolio[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    loadNetworkData();
  }, [currentUser]);

  // Set up real-time listener for connections
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribe = subscribeToConnections(currentUser.uid, (updatedConnections) => {
      setConnections(updatedConnections);
      // Update connection statuses in allUsers
      setAllUsers(prevUsers => 
        prevUsers.map(user => {
          const connection = updatedConnections.find(
            c => (c.userId === currentUser.uid && c.connectedUserId === user.userId) ||
                 (c.connectedUserId === currentUser.uid && c.userId === user.userId)
          );
          return {
            ...user,
            connectionStatus: connection
              ? (connection.status === 'accepted' ? 'connected' : 'pending')
              : 'none',
            connectionId: connection?.id
          };
        })
      );
    });

    return unsubscribe;
  }, [currentUser]);

  useEffect(() => {
    applyFilters();
  }, [allUsers, searchTerm, userType, statusFilter, connections]);

  const loadNetworkData = async () => {
    if (!currentUser?.uid) return;

    try {
      setLoading(true);
      const [youthUsers, recruiters, connectionsData] = await Promise.all([
        getAllYouthUsers(),
        getActiveRecruiters(),
        getConnectionsByUser(currentUser.uid)
      ]);

      const allNetworkUsers: NetworkUser[] = [
        ...youthUsers.map(u => ({ ...u, userType: 'youth' as const })),
        ...recruiters.map(u => ({ ...u, userType: 'recruiter' as const }))
      ].filter(u => u.userId !== currentUser.uid);

      // Map connection statuses - check both directions
      const usersWithStatus = allNetworkUsers.map(user => {
        const connection = connectionsData.find(
          c => (c.userId === currentUser.uid && c.connectedUserId === user.userId) ||
               (c.connectedUserId === currentUser.uid && c.userId === user.userId)
        );
        return {
          ...user,
          connectionStatus: connection
            ? (connection.status === 'accepted' ? 'connected' : 'pending')
            : 'none',
          connectionId: connection?.id
        };
      });

      setAllUsers(usersWithStatus);
      setConnections(connectionsData);
      setFilteredUsers(usersWithStatus);
    } catch (error) {
      console.error('Error loading network data:', error);
      toast({
        title: t('error'),
        description: 'Failed to load network data. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = allUsers.filter(user => {
      // Text search
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          user.fullName.toLowerCase().includes(searchLower) ||
          user.bio?.toLowerCase().includes(searchLower) ||
          user.preferredCareerField?.toLowerCase().includes(searchLower) ||
          user.companyName?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // User type filter
      if (userType !== 'all') {
        const isYouth = !user.companyName;
        if (userType === 'youth' && !isYouth) return false;
        if (userType === 'recruiter' && isYouth) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (user.connectionStatus !== statusFilter) return false;
      }

      return true;
    });

    setFilteredUsers(filtered);
  };

  const handleSendConnectionRequest = async (userId: string) => {
    if (!currentUser?.uid) return;

    const targetUser = allUsers.find(u => u.userId === userId);
    if (!targetUser) return;

    try {
      await addConnection({
        userId: currentUser.uid,
        connectedUserId: userId,
        connectedUserName: targetUser.fullName || targetUser.companyName || 'User',
        connectedUserRole: targetUser.companyName ? 'recruiter' : 'youth',
        status: 'pending',
        initiatedBy: currentUser.uid
      });

      toast({
        title: 'Success',
        description: `Connection request sent to ${targetUser.fullName || targetUser.companyName || 'user'}`
      });

      // Real-time subscription will update the UI automatically
    } catch (error) {
      console.error('Error sending connection request:', error);
      toast({
        title: 'Error',
        description: 'Failed to send request. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleAcceptConnection = async (connectionId: string) => {
    try {
      await updateConnection(connectionId, {
        status: 'accepted',
        acceptedAt: new Date()
      });

      toast({
        title: 'Success',
        description: 'Connection accepted successfully'
      });

      // Real-time subscription will update the UI automatically
    } catch (error) {
      console.error('Error accepting connection:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept connection. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleRejectConnection = async (connectionId: string) => {
    try {
      await updateConnection(connectionId, {
        status: 'declined'
      });

      toast({
        title: 'Success',
        description: 'Connection rejected'
      });

      // Real-time subscription will update the UI automatically
    } catch (error) {
      console.error('Error rejecting connection:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject connection. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Handle viewing profile
  const handleViewProfile = async (userId: string) => {
    console.log('=== handleViewProfile CALLED ===');
    console.log('userId parameter:', userId);
    console.log('currentUser?.uid:', currentUser?.uid);
    console.log('Are they equal?', userId === currentUser?.uid);
    
    if (!userId) {
      console.error('userId is missing!');
      toast({
        title: "Error",
        description: "User ID is missing",
        variant: "destructive",
      });
      return;
    }
    
    if (userId === currentUser?.uid) {
      console.error('❌ ERROR: Attempted to view own profile!');
      toast({
        title: "Error",
        description: "Cannot view your own profile here",
        variant: "destructive",
      });
      return;
    }

    setSelectedProfile(null);
    setSelectedPortfolios([]);
    setLoadingProfile(true);
    setShowProfileDialog(true);

    try {
      console.log('Fetching profile for userId:', userId);
      const profile = await getProfile(userId);
      console.log('Profile fetched:', profile);
      console.log('Profile userId:', profile?.userId || profile?.id);
      console.log('Profile fullName:', profile?.fullName || profile?.companyName);
      
      if (!profile) {
        console.error('Profile not found for userId:', userId);
        toast({
          title: "Error",
          description: "Profile not found",
          variant: "destructive",
        });
        setShowProfileDialog(false);
        return;
      }
      
      // Double-check we're not setting our own profile
      if (profile.userId === currentUser?.uid || profile.id === currentUser?.uid) {
        console.error('❌ ERROR: Profile returned is for current user!');
        console.error('Profile userId:', profile.userId, 'Profile id:', profile.id);
        toast({
          title: "Error",
          description: "Cannot view your own profile",
          variant: "destructive",
        });
        setShowProfileDialog(false);
        return;
      }

      console.log('Setting profile:', profile.fullName || profile.companyName);
      setSelectedProfile(profile);

      // If it's a youth user, also load their portfolios
      if (!profile.companyName && (profile.role === 'youth' || !profile.role)) {
        try {
          console.log('Loading portfolios for userId:', userId);
          const portfolios = await getPortfoliosByProfile(userId);
          console.log('Portfolios loaded:', portfolios.length);
          setSelectedPortfolios(portfolios);
        } catch (portfolioError) {
          console.error('Error loading portfolios:', portfolioError);
          setSelectedPortfolios([]);
        }
      } else {
        setSelectedPortfolios([]);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  const getFileType = (url: string): 'image' | 'video' | 'document' => {
    if (!url) return 'document';
    const extension = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) return 'image';
    if (['mp4', 'webm', 'mov', 'avi'].includes(extension || '')) return 'video';
    return 'document';
  };

  const validConnections = connections.filter(c => c.userId !== c.connectedUserId); // Filter out self-connections
  const connectedUsers = allUsers.filter(u => u.connectionStatus === 'connected');
  const pendingRequests = validConnections.filter(c => 
    c.status === 'pending' && 
    c.initiatedBy !== currentUser?.uid &&
    (c.userId === currentUser?.uid || c.connectedUserId === currentUser?.uid)
  );
  const sentRequests = validConnections.filter(c => 
    c.status === 'pending' && 
    c.initiatedBy === currentUser?.uid &&
    (c.userId === currentUser?.uid || c.connectedUserId === currentUser?.uid)
  );

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Networking</h2>
          <p className="text-muted-foreground">Connect with talent and recruiters</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {connectedUsers.length} {connectedUsers.length === 1 ? 'Connection' : 'Connections'}
          </Badge>
          {pendingRequests.length > 0 && (
            <Badge variant="destructive">
              {pendingRequests.length} {pendingRequests.length === 1 ? 'Pending Request' : 'Pending Requests'}
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <TabsList>
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="connections">
            Connections ({connectedUsers.length})
          </TabsTrigger>
          <TabsTrigger value="requests">
            Requests
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Browse Tab */}
        <TabsContent value="browse" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, skills, or company..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={userType} onValueChange={(value: any) => setUserType(value)}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="youth">Youth</SelectItem>
                    <SelectItem value="recruiter">Recruiters</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="connected">Connected</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="none">Not Connected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Users Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={user.profileImageUrl || user.companyLogoUrl} />
                      <AvatarFallback>
                        {user.fullName?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{user.fullName}</h4>
                          {user.companyName && (
                            <p className="text-sm text-muted-foreground truncate">{user.companyName}</p>
                          )}
                          {user.preferredCareerField && (
                            <p className="text-sm text-muted-foreground">{user.preferredCareerField}</p>
                          )}
                        </div>
                        {user.connectionStatus === 'connected' && (
                          <Badge variant="default" className="ml-2">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        )}
                        {user.connectionStatus === 'pending' && (
                          <Badge variant="secondary" className="ml-2">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {user.city && user.country && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {user.city}, {user.country}
                          </div>
                        )}
                        {user.yearsOfExperience !== undefined && (
                          <div className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {user.yearsOfExperience} {user.yearsOfExperience === 1 ? 'Year' : 'Years'}
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex gap-2">
                        {user.connectionStatus === 'none' && (
                          <Button
                            size="sm"
                            onClick={() => handleSendConnectionRequest(user.userId)}
                            className="flex-1"
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Connect
                          </Button>
                        )}
                        {user.connectionStatus === 'connected' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/youth/messages?userId=${user.userId}`)}
                              className="flex-1"
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Message
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('=== PROFILE BUTTON CLICKED (Browse Tab) ===');
                                console.log('user.userId:', user.userId);
                                console.log('user.id:', user.id);
                                console.log('user.fullName:', user.fullName);
                                console.log('currentUser?.uid:', currentUser?.uid);
                                console.log('Are they equal?', user.userId === currentUser?.uid);
                                
                                if (!user.userId || user.userId === currentUser?.uid) {
                                  console.error('❌ Invalid userId for profile view!');
                                  toast({
                                    title: "Error",
                                    description: "Cannot view this profile",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                
                                handleViewProfile(user.userId);
                              }}
                              title="View Profile"
                            >
                              <User className="h-4 w-4 mr-1" />
                              Profile
                            </Button>
                          </>
                        )}
                        {user.connectionStatus === 'pending' && (
                          <Button variant="outline" size="sm" disabled className="flex-1">
                            <Clock className="h-4 w-4 mr-2" />
                            Pending
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Connections Tab */}
        <TabsContent value="connections" className="space-y-4">
          {connectedUsers.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No connections yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connectedUsers.map((user) => (
                <Card key={user.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.profileImageUrl || user.companyLogoUrl} />
                        <AvatarFallback>
                          {user.fullName?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{user.fullName}</h4>
                        {user.companyName && (
                          <p className="text-sm text-muted-foreground truncate">{user.companyName}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/youth/messages?userId=${user.userId}`)}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('=== PROFILE BUTTON CLICKED (Connections Tab) ===');
                            console.log('user.userId:', user.userId);
                            console.log('user.id:', user.id);
                            console.log('user.fullName:', user.fullName);
                            console.log('currentUser?.uid:', currentUser?.uid);
                            console.log('Are they equal?', user.userId === currentUser?.uid);
                            
                            if (!user.userId || user.userId === currentUser?.uid) {
                              console.error('❌ Invalid userId for profile view!');
                              toast({
                                title: "Error",
                                description: "Cannot view this profile",
                                variant: "destructive",
                              });
                              return;
                            }
                            
                            handleViewProfile(user.userId);
                          }}
                          title="View Profile"
                        >
                          <User className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          {/* Pending Requests (Received) */}
          {pendingRequests.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Received Requests</h3>
              <div className="space-y-3">
                {pendingRequests.map((request) => {
                  const user = allUsers.find(u => u.userId === request.userId || u.userId === request.connectedUserId);
                  if (!user) return null;
                  return (
                    <Card key={request.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={user.profileImageUrl || user.companyLogoUrl} />
                              <AvatarFallback>
                                {user.fullName?.[0]?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-semibold">{user.fullName}</h4>
                              {user.companyName && (
                                <p className="text-sm text-muted-foreground">{user.companyName}</p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(request.createdAt, { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAcceptConnection(request.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Accept
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRejectConnection(request.id)}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sent Requests */}
          {sentRequests.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Sent Requests</h3>
              <div className="space-y-3">
                {sentRequests.map((request) => {
                  const user = allUsers.find(u => u.userId === request.connectedUserId);
                  if (!user) return null;
                  return (
                    <Card key={request.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={user.profileImageUrl || user.companyLogoUrl} />
                              <AvatarFallback>
                                {user.fullName?.[0]?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-semibold">{user.fullName}</h4>
                              {user.companyName && (
                                <p className="text-sm text-muted-foreground">{user.companyName}</p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(request.createdAt, { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {pendingRequests.length === 0 && sentRequests.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <UserPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No pending requests</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Connections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{connectedUsers.length}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {userType === 'all' ? 'All Users' : userType === 'youth' ? 'Youth' : 'Recruiters'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{pendingRequests.length}</div>
                <p className="text-sm text-muted-foreground mt-1">Awaiting Response</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Sent Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{sentRequests.length}</div>
                <p className="text-sm text-muted-foreground mt-1">Awaiting Approval</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Profile View Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedProfile?.fullName || selectedProfile?.companyName || 'Loading Profile...'}
            </DialogTitle>
          </DialogHeader>
          
          {loadingProfile && !selectedProfile ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              <p className="ml-4">Loading profile...</p>
            </div>
          ) : selectedProfile ? (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={selectedProfile.profileImageUrl} />
                  <AvatarFallback className="text-2xl">
                    {(selectedProfile.fullName || selectedProfile.companyName || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">
                    {selectedProfile.fullName || selectedProfile.companyName}
                  </h2>
                  {selectedProfile.companyName && (
                    <p className="text-muted-foreground">Recruiter</p>
                  )}
                  {selectedProfile.talentArea && (
                    <p className="text-muted-foreground">{selectedProfile.talentArea}</p>
                  )}
                  {(selectedProfile.city || selectedProfile.country) && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <MapPin className="h-4 w-4" />
                      {[selectedProfile.city, selectedProfile.country].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {selectedProfile.companyName ? (
                // Recruiter Profile - Simple view
                <div className="space-y-4">
                  {selectedProfile.bio && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">About</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{selectedProfile.bio}</p>
                      </CardContent>
                    </Card>
                  )}
                  
                  {selectedProfile.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedProfile.email}</span>
                    </div>
                  )}
                  
                  {selectedProfile.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedProfile.phone}</span>
                    </div>
                  )}
                  
                  {selectedProfile.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a href={selectedProfile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {selectedProfile.website}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                // Youth Profile - With Portfolio
                <Tabs defaultValue="profile" className="w-full">
                  <TabsList>
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="portfolio">
                      Portfolio {selectedPortfolios.length > 0 && `(${selectedPortfolios.length})`}
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="profile" className="space-y-4">
                    {selectedProfile.bio && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">About</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm whitespace-pre-wrap">{selectedProfile.bio}</p>
                        </CardContent>
                      </Card>
                    )}
                    
                    {selectedProfile.skills && selectedProfile.skills.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Skills</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {selectedProfile.skills.map((skill, index) => (
                              <Badge key={index} variant="secondary">
                                {typeof skill === 'string' ? skill : skill.skillName}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    
                    {selectedProfile.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedProfile.email}</span>
                      </div>
                    )}
                    
                    {selectedProfile.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedProfile.phone}</span>
                      </div>
                    )}
                    
                    {selectedProfile.website && (
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <a href={selectedProfile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {selectedProfile.website}
                        </a>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="portfolio" className="space-y-4">
                    {selectedPortfolios.length === 0 ? (
                      <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                          <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No portfolio items yet</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedPortfolios.map((portfolio) => (
                          <Card key={portfolio.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                              <CardTitle className="text-lg">{portfolio.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {portfolio.description && (
                                <p className="text-sm text-muted-foreground line-clamp-3">
                                  {portfolio.description}
                                </p>
                              )}
                              
                              {portfolio.fileUrl && (
                                <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                                  {getFileType(portfolio.fileUrl) === 'image' ? (
                                    <img
                                      src={portfolio.fileUrl}
                                      alt={portfolio.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : getFileType(portfolio.fileUrl) === 'video' ? (
                                    <video
                                      src={portfolio.fileUrl}
                                      controls
                                      preload="metadata"
                                      playsInline
                                      className="w-full h-full object-contain"
                                    >
                                      Your browser does not support the video tag.
                                    </video>
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <FileText className="h-12 w-12 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="absolute top-2 right-2">
                                    {getFileType(portfolio.fileUrl) === 'image' && (
                                      <Badge variant="secondary">
                                        <ImageIcon className="h-3 w-3 mr-1" />
                                        Image
                                      </Badge>
                                    )}
                                    {getFileType(portfolio.fileUrl) === 'video' && (
                                      <Badge variant="secondary">
                                        <VideoIcon className="h-3 w-3 mr-1" />
                                        Video
                                      </Badge>
                                    )}
                                    {getFileType(portfolio.fileUrl) === 'document' && (
                                      <Badge variant="secondary">
                                        <FileText className="h-3 w-3 mr-1" />
                                        Document
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {portfolio.projectUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => window.open(portfolio.projectUrl, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Visit Project
                                </Button>
                              )}
                              {portfolio.fileUrl && getFileType(portfolio.fileUrl) === 'document' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => window.open(portfolio.fileUrl, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  View Full
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-muted-foreground">No profile data available</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

