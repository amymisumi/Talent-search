import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Search,
  Filter,
  MapPin,
  Briefcase,
  Star,
  Users,
  UserPlus,
  Check,
  Clock,
  MessageSquare,
  Eye,
  Loader2,
  Building2,
  Sparkles,
  Shield,
  X,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getDiscoverableYouths,
  getDiscoverableRecruiters,
  getConnectionStatus,
  getSmartMatches,
  blockUser,
  reportUser,
  type DiscoverableUser,
  type ConnectionStatus,
  type NetworkFilters,
} from '@/integrations/firebase/youthNetworkService';
import {
  addConnection,
  getConnectionsByUser,
  updateConnection,
  subscribeToConnections,
  getProfile,
} from '@/integrations/firebase/services';
import { Connection, UserProfile } from '@/integrations/firebase/types';

const NetworkDiscoverySection = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'youths' | 'recruiters' | 'suggestions' | 'connections' | 'requests'>('youths');
  
  // Data states
  const [youths, setYouths] = useState<DiscoverableUser[]>([]);
  const [recruiters, setRecruiters] = useState<DiscoverableUser[]>([]);
  const [smartMatches, setSmartMatches] = useState<Array<DiscoverableUser & { matchReason: string; matchScore: number }>>([]);
  const [connections, setConnections] = useState<Map<string, ConnectionStatus>>(new Map());
  const [connectionsVersion, setConnectionsVersion] = useState(0); // Force re-render when connections change
  const [userConnections, setUserConnections] = useState<Connection[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Connection[]>([]);
  const [acceptedConnections, setAcceptedConnections] = useState<Connection[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState<NetworkFilters>({
    searchTerm: '',
  });
  
  // Available filter options (can be enhanced with API calls)
  const fields = ['Tech', 'Film', 'Music', 'Design', 'Fashion', 'Photography', 'Writing', 'Business'];
  const availabilityOptions = ['freelance', 'part-time', 'full-time'];
  const experienceLevels = ['entry', 'mid', 'senior', 'expert'];
  const industries = ['Technology', 'Entertainment', 'Creative', 'Business', 'Education'];

  // Load connections in real-time
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToConnections(currentUser.uid, (conns) => {
      setUserConnections(conns);
      
      // Separate connections by status
      const accepted = conns.filter(c => c.status === 'accepted');
      const pending = conns.filter(c => 
        c.status === 'pending' && c.initiatedBy !== currentUser.uid
      );
      
      setAcceptedConnections(accepted);
      setPendingRequests(pending);
      
      // Update connection status map - include both directions
      const statusMap = new Map<string, ConnectionStatus>();
      conns.forEach(conn => {
        // If current user is the sender, map the recipient's ID
        if (conn.userId === currentUser.uid) {
          statusMap.set(conn.connectedUserId, conn.status as ConnectionStatus);
          console.log('📤 Mapping connection (sender):', {
            recipientId: conn.connectedUserId,
            status: conn.status,
            connectionId: conn.id
          });
        }
        // If current user is the recipient, map the sender's ID
        if (conn.connectedUserId === currentUser.uid) {
          statusMap.set(conn.userId, conn.status as ConnectionStatus);
          console.log('📥 Mapping connection (receiver):', {
            senderId: conn.userId,
            status: conn.status,
            connectionId: conn.id
          });
        }
      });
      console.log('✅ Updated connection status map:', {
        currentUser: currentUser.uid,
        totalConnections: conns.length,
        mapSize: statusMap.size,
        mapEntries: Array.from(statusMap.entries()).map(([id, status]) => ({ userId: id, status }))
      });
      // Force React to detect the change by creating a completely new Map
      setConnections(new Map(statusMap));
      setConnectionsVersion(prev => prev + 1); // Force re-render
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Load discoverable users
  useEffect(() => {
    if (!currentUser) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        const [youthsData, recruitersData, matchesData, conns] = await Promise.all([
          getDiscoverableYouths(currentUser.uid, filters),
          getDiscoverableRecruiters(currentUser.uid, filters),
          getSmartMatches(currentUser.uid, 10),
          getConnectionsByUser(currentUser.uid),
        ]);
        
        setYouths(youthsData);
        setRecruiters(recruitersData);
        setSmartMatches(matchesData);
        setUserConnections(conns);
        
        // Set connection statuses - include both directions
        const statusMap = new Map<string, ConnectionStatus>();
        conns.forEach(conn => {
          // If current user is the sender, map the recipient's ID
          if (conn.userId === currentUser.uid) {
            statusMap.set(conn.connectedUserId, conn.status as ConnectionStatus);
            console.log('📤 Initial mapping (sender):', {
              recipientId: conn.connectedUserId,
              status: conn.status
            });
          }
          // If current user is the recipient, map the sender's ID
          if (conn.connectedUserId === currentUser.uid) {
            statusMap.set(conn.userId, conn.status as ConnectionStatus);
            console.log('📥 Initial mapping (receiver):', {
              senderId: conn.userId,
              status: conn.status
            });
          }
        });
        console.log('✅ Initial connection status map:', {
          currentUser: currentUser.uid,
          totalConnections: conns.length,
          mapSize: statusMap.size,
          mapEntries: Array.from(statusMap.entries()).map(([id, status]) => ({ userId: id, status }))
        });
        // Force React to detect the change by creating a completely new Map
        setConnections(new Map(statusMap));
        setConnectionsVersion(prev => prev + 1); // Force re-render
      } catch (error) {
        console.error('Error loading network data:', error);
        toast.error('Failed to load network data');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentUser, filters]);

  // Filtered data
  const filteredYouths = useMemo(() => {
    let filtered = youths;
    
    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(youth =>
        youth.fullName.toLowerCase().includes(search) ||
        youth.field?.toLowerCase().includes(search) ||
        youth.location?.city?.toLowerCase().includes(search)
      );
    }
    
    return filtered;
  }, [youths, filters]);

  const filteredRecruiters = useMemo(() => {
    let filtered = recruiters;
    
    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(recruiter =>
        recruiter.fullName.toLowerCase().includes(search) ||
        recruiter.companyName?.toLowerCase().includes(search) ||
        recruiter.industry?.toLowerCase().includes(search)
      );
    }
    
    return filtered;
  }, [recruiters, filters]);

  // Connection handlers
  const handleConnect = async (userId: string) => {
    if (!currentUser) return;
    
    setActionLoading(userId);
    try {
      // Get target user profile to get their name and role
      const targetProfile = await getProfile(userId);
      
      await addConnection({
        userId: currentUser.uid,
        connectedUserId: userId,
        connectedUserName: targetProfile?.fullName || targetProfile?.companyName || 'User',
        connectedUserRole: targetProfile?.companyName ? 'recruiter' : 'youth',
        status: 'pending',
        initiatedBy: currentUser.uid,
      });
      
      // Update the map immediately (real-time subscription will also update it)
      setConnections(prev => {
        const newMap = new Map(prev);
        newMap.set(userId, 'pending');
        console.log('🔄 Updated map after sending request:', {
          userId,
          status: 'pending',
          mapSize: newMap.size,
          mapHasKey: newMap.has(userId)
        });
        return newMap;
      });
      toast.success('Connection request sent!');
    } catch (error: any) {
      console.error('❌ Error sending connection request:', error);
      // Even if there's an error, check if connection already exists and update map
      if (error.message?.includes('already exists')) {
        console.log('⚠️ Connection already exists, updating map to show pending status');
        setConnections(prev => {
          const newMap = new Map(prev);
          newMap.set(userId, 'pending');
        console.log('✅ Map updated for existing connection:', {
          userId,
          mapSize: newMap.size,
          mapHasKey: newMap.has(userId)
        });
        setConnectionsVersion(prev => prev + 1); // Force re-render
        return newMap;
      });
      }
      toast.error(error.message || 'Failed to send connection request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptRequest = async (connectionId: string, connectedUserId: string) => {
    if (!currentUser) return;
    
    setActionLoading(connectionId);
    try {
      await updateConnection(connectionId, {
        status: 'accepted',
        acceptedAt: new Date(),
      });
      
      // Also create reverse connection
      const targetProfile = await getProfile(connectedUserId);
      await addConnection({
        userId: connectedUserId,
        connectedUserId: currentUser.uid,
        connectedUserName: currentUser.displayName || 'User',
        connectedUserRole: 'youth',
        status: 'accepted',
        initiatedBy: currentUser.uid,
        acceptedAt: new Date(),
      });
      
      toast.success('Connection accepted!');
    } catch (error: any) {
      console.error('Error accepting connection:', error);
      toast.error(error.message || 'Failed to accept connection request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineRequest = async (connectionId: string) => {
    if (!currentUser) return;
    
    setActionLoading(connectionId);
    try {
      await updateConnection(connectionId, {
        status: 'declined',
      });
      
      toast.success('Connection request declined');
    } catch (error: any) {
      console.error('Error declining connection:', error);
      toast.error(error.message || 'Failed to decline connection request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlock = async (userId: string) => {
    if (!currentUser) return;
    
    try {
      await blockUser(currentUser.uid, userId);
      setConnections(prev => new Map(prev).set(userId, 'blocked'));
      toast.success('User blocked');
    } catch (error) {
      toast.error('Failed to block user');
    }
  };

  const handleReport = async (reason: string, details?: string) => {
    if (!currentUser || !selectedUserId) return;
    
    try {
      await reportUser(currentUser.uid, selectedUserId, reason, details);
      toast.success('User reported. Thank you for keeping the community safe.');
      setShowReportDialog(false);
      setSelectedUserId(null);
    } catch (error) {
      toast.error('Failed to report user');
    }
  };

  // Render Youth Card
  const renderYouthCard = (youth: DiscoverableUser) => {
    // Force re-evaluation by checking the map again (with version dependency)
    const actualStatus = connections.get(youth.userId);
    const finalStatus = actualStatus || 'connect';
    const isLoading = actionLoading === youth.userId;
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('Youth card connection status:', {
        userId: youth.userId,
        connectionStatus: finalStatus,
        statusFromMap: actualStatus,
        statusType: typeof finalStatus,
        isPending: finalStatus === 'pending',
        isConnected: finalStatus === 'connected',
        mapHasKey: connections.has(youth.userId),
        mapSize: connections.size,
        connectionsVersion,
        mapEntries: Array.from(connections.entries())
      });
    }

    return (
      <Card key={youth.userId} className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={youth.profileImageUrl} />
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {youth.fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{youth.fullName}</h3>
                  {youth.field && (
                    <Badge variant="outline" className="mt-1">
                      {youth.field}
                    </Badge>
                  )}
                </div>
                {youth.averageRating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{youth.averageRating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              
              {/* Location */}
              {youth.location && (youth.location.city || youth.location.country) && (
                <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>
                    {[youth.location.city, youth.location.country].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              
              {/* Skills */}
              {youth.skills && youth.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {youth.skills.slice(0, 3).map((skill, idx) => {
                    const skillName = typeof skill === 'string' ? skill : skill.skillName;
                    return (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {skillName}
                      </Badge>
                    );
                  })}
                  {youth.skills.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{youth.skills.length - 3}
                    </Badge>
                  )}
                </div>
              )}
              
              {/* Badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                {youth.hasPortfolio && (
                  <Badge variant="outline" className="text-xs">
                    <Briefcase className="h-3 w-3 mr-1" />
                    Portfolio
                  </Badge>
                )}
                {youth.lookingForJobs && (
                  <Badge variant="outline" className="text-xs bg-green-50">
                    Looking for jobs
                  </Badge>
                )}
                {youth.availability && (
                  <Badge variant="outline" className="text-xs">
                    {youth.availability}
                  </Badge>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex gap-2 mt-4" key={`actions-${youth.userId}-${connectionsVersion}`}>
                {finalStatus === 'connected' ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/youth/profile?userId=${youth.userId}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/youth/messages?userId=${youth.userId}`)}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Message
                    </Button>
                  </>
                ) : (finalStatus === 'pending' || finalStatus === 'Pending') ? (
                  <>
                    <Badge variant="secondary" className="mr-2">Pending</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/youth/profile/view/${youth.userId}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleConnect(youth.userId)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-1" />
                          Connect
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/youth/profile/view/${youth.userId}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render Recruiter Card
  const renderRecruiterCard = (recruiter: DiscoverableUser) => {
    // Force re-evaluation by checking the map again (with version dependency)
    const actualStatus = connections.get(recruiter.userId);
    const finalStatus = actualStatus || 'connect';
    const isLoading = actionLoading === recruiter.userId;
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('Recruiter card connection status:', {
        userId: recruiter.userId,
        connectionStatus: finalStatus,
        statusFromMap: actualStatus,
        statusType: typeof finalStatus,
        isPending: finalStatus === 'pending',
        isConnected: finalStatus === 'connected',
        mapHasKey: connections.has(recruiter.userId),
        mapSize: connections.size,
        connectionsVersion,
        mapEntries: Array.from(connections.entries())
      });
    }

    return (
      <Card key={recruiter.userId} className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={recruiter.companyLogo || recruiter.profileImageUrl} />
              <AvatarFallback className="bg-purple-100 text-purple-600">
                {recruiter.companyName?.charAt(0).toUpperCase() || recruiter.fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{recruiter.companyName || recruiter.fullName}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{recruiter.fullName}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {recruiter.isVerified && (
                    <Badge variant="default" className="bg-blue-500">
                      <Shield className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  {recruiter.activelyHiring && (
                    <Badge variant="default" className="bg-green-500">
                      Actively Hiring
                    </Badge>
                  )}
                </div>
              </div>
              
              {recruiter.industry && (
                <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  <span>{recruiter.industry}</span>
                </div>
              )}
              
              {recruiter.rolesHiringFor && recruiter.rolesHiringFor.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {recruiter.rolesHiringFor.slice(0, 3).map((role, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {role}
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* Actions */}
              <div className="flex gap-2 mt-4" key={`actions-${recruiter.userId}-${connectionsVersion}`}>
                {finalStatus === 'connected' ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/recruiter/profile?userId=${recruiter.userId}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/youth/messages?userId=${recruiter.userId}`)}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Message
                    </Button>
                  </>
                ) : (finalStatus === 'pending' || finalStatus === 'Pending') ? (
                  <>
                    <Badge variant="secondary" className="mr-2">Pending</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/recruiter/profile?userId=${recruiter.userId}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleConnect(recruiter.userId)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-1" />
                          Connect
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/recruiter/profile/view/${recruiter.userId}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, skills, location, company..."
                value={filters.searchTerm || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
          
          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
              {activeTab === 'youths' && (
                <>
                  <Select
                    value={filters.field || ''}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, field: value || undefined }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Field/Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Fields</SelectItem>
                      {fields.map(field => (
                        <SelectItem key={field} value={field}>{field}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select
                    value={filters.availability || ''}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, availability: value as any || undefined }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Availability" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any</SelectItem>
                      {availabilityOptions.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="lookingForJobs"
                      checked={filters.lookingForJobs || false}
                      onCheckedChange={(checked) => setFilters(prev => ({ ...prev, lookingForJobs: checked ? true : undefined }))}
                    />
                    <label htmlFor="lookingForJobs" className="text-sm">Looking for jobs</label>
                  </div>
                </>
              )}
              
              {activeTab === 'recruiters' && (
                <>
                  <Select
                    value={filters.industry || ''}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, industry: value || undefined }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Industries</SelectItem>
                      {industries.map(industry => (
                        <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="verifiedOnly"
                      checked={filters.verifiedOnly || false}
                      onCheckedChange={(checked) => setFilters(prev => ({ ...prev, verifiedOnly: checked ? true : undefined }))}
                    />
                    <label htmlFor="verifiedOnly" className="text-sm">Verified only</label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="activelyHiring"
                      checked={filters.activelyHiring || false}
                      onCheckedChange={(checked) => setFilters(prev => ({ ...prev, activelyHiring: checked ? true : undefined }))}
                    />
                    <label htmlFor="activelyHiring" className="text-sm">Actively hiring</label>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto">
          <TabsTrigger value="youths" className="text-xs sm:text-sm py-2">
            <Users className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">Youths ({filteredYouths.length})</span>
          </TabsTrigger>
          <TabsTrigger value="recruiters" className="text-xs sm:text-sm py-2">
            <Building2 className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">Recruiters ({filteredRecruiters.length})</span>
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="text-xs sm:text-sm py-2">
            <Sparkles className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">Matches ({smartMatches.length})</span>
          </TabsTrigger>
          <TabsTrigger value="requests" className="text-xs sm:text-sm py-2">
            <Clock className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}</span>
          </TabsTrigger>
          <TabsTrigger value="connections" className="text-xs sm:text-sm py-2 col-span-2 sm:col-span-1">
            <Check className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">Connections ({acceptedConnections.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Youths Tab */}
        <TabsContent value="youths" className="space-y-4">
          {filteredYouths.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No youths found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredYouths.map(youth => renderYouthCard(youth))}
            </div>
          )}
        </TabsContent>

        {/* Recruiters Tab */}
        <TabsContent value="recruiters" className="space-y-4">
          {filteredRecruiters.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No recruiters found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecruiters.map(recruiter => renderRecruiterCard(recruiter))}
            </div>
          )}
        </TabsContent>

        {/* Smart Matches Tab */}
        <TabsContent value="suggestions" className="space-y-4">
          {smartMatches.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No smart matches available</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {smartMatches.map((match) => (
                <Card key={match.userId} className="hover:shadow-md transition-shadow border-primary/20">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={match.profileImageUrl} />
                        <AvatarFallback>
                          {match.fullName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{match.fullName}</h3>
                            {match.role === 'recruiter' && match.companyName && (
                              <p className="text-sm text-muted-foreground">{match.companyName}</p>
                            )}
                          </div>
                          <Badge variant="default" className="bg-purple-500">
                            {match.matchScore}% match
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mt-2">
                          {match.matchReason}
                        </p>
                        
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            onClick={() => handleConnect(match.userId)}
                            disabled={actionLoading === match.userId}
                          >
                            {actionLoading === match.userId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <UserPlus className="h-4 w-4 mr-1" />
                                Connect
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (match.role === 'recruiter') {
                                navigate(`/recruiter/profile?userId=${match.userId}`);
                              } else {
                                navigate(`/youth/profile?userId=${match.userId}`);
                              }
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Connection Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No pending connection requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>
                            {request.connectedUserName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-lg">{request.connectedUserName}</h3>
                          <Badge variant="secondary" className="mt-1">
                            {request.connectedUserRole}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            Wants to connect with you
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAcceptRequest(request.id, request.connectedUserId)}
                          disabled={actionLoading === request.id}
                        >
                          {actionLoading === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Accept
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeclineRequest(request.id)}
                          disabled={actionLoading === request.id}
                        >
                          {actionLoading === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <X className="h-4 w-4 mr-1" />
                              Decline
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Connections Tab */}
        <TabsContent value="connections" className="space-y-4">
          {acceptedConnections.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No connections yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Start connecting with people in the Youths or Recruiters tabs
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {acceptedConnections.map((connection) => (
                <Card key={connection.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>
                          {connection.connectedUserName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{connection.connectedUserName}</h3>
                        <Badge variant="secondary" className="mt-1">
                          {connection.connectedUserRole}
                        </Badge>
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (connection.connectedUserRole === 'recruiter') {
                                navigate(`/recruiter/profile?userId=${connection.connectedUserId}`);
                              } else {
                                navigate(`/youth/profile?userId=${connection.connectedUserId}`);
                              }
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/youth/messages?userId=${connection.connectedUserId}`)}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Message
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report User</DialogTitle>
            <DialogDescription>
              Help us keep the community safe by reporting inappropriate behavior.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select onValueChange={(value) => handleReport(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="harassment">Harassment</SelectItem>
                <SelectItem value="fake_profile">Fake Profile</SelectItem>
                <SelectItem value="inappropriate_content">Inappropriate Content</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NetworkDiscoverySection;

