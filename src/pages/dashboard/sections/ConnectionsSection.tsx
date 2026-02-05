import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import {
  getConnectionsByUser,
  updateConnection,
  addConnection,
  getAllProfiles,
  subscribeToConnections,
  getProfile,
  getPortfoliosByProfile
} from '@/integrations/firebase/services';
import { Connection, UserProfile, Portfolio } from '@/integrations/firebase/types';
import {
  Users,
  UserPlus,
  Check,
  X,
  Search,
  MessageSquare,
  Briefcase,
  Eye,
  User,
  MapPin,
  Mail,
  Phone,
  Globe,
  Award,
  FileText,
  Video,
  Image as ImageIcon,
  ExternalLink
} from 'lucide-react';

const ConnectionsSection = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [selectedPortfolios, setSelectedPortfolios] = useState<Portfolio[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  // Debug: Log when dialog state changes
  useEffect(() => {
    console.log('showProfileDialog state changed to:', showProfileDialog);
  }, [showProfileDialog]);

  // Load all users (only once, not connections - real-time subscription handles that)
  useEffect(() => {
    const loadUsers = async () => {
      if (!currentUser) return;

      try {
        const profiles = await getAllProfiles();
        // Filter out current user and get only recruiters and youth
        const filteredProfiles = profiles.filter(profile =>
          profile.userId !== currentUser.uid &&
          (profile.companyName || profile.role === 'youth')
        );
        setAllUsers(filteredProfiles);
        console.log('Loaded users for connections:', filteredProfiles.length);
      } catch (error) {
        console.error('Error loading users:', error);
        toast({
          title: "Error",
          description: "Failed to load users",
          variant: "destructive",
        });
      }
    };

    loadUsers();
  }, [currentUser, toast]);
  
  // Also load users from connections to ensure we have sender info for incoming requests
  useEffect(() => {
    const loadConnectionUsers = async () => {
      if (!currentUser || connections.length === 0) return;
      
      try {
        const profiles = await getAllProfiles();
        const connectionUserIds = new Set<string>();
        
        // Collect all user IDs from connections (both senders and receivers)
        connections.forEach(conn => {
          if (conn.userId && conn.userId !== currentUser.uid) {
            connectionUserIds.add(conn.userId);
          }
          if (conn.connectedUserId && conn.connectedUserId !== currentUser.uid) {
            connectionUserIds.add(conn.connectedUserId);
          }
        });
        
        console.log('Connection user IDs to load:', Array.from(connectionUserIds));
        
        // Add users from connections that might not be in allUsers
        const missingUsers = profiles.filter(profile => 
          profile.userId &&
          connectionUserIds.has(profile.userId) &&
          !allUsers.find(u => u.userId === profile.userId)
        );
        
        if (missingUsers.length > 0) {
          console.log('Adding missing users from connections:', missingUsers.map(u => ({ id: u.userId, name: u.fullName || u.companyName })));
          setAllUsers(prev => {
            const existingIds = new Set(prev.map(u => u.userId));
            const newUsers = missingUsers.filter(u => !existingIds.has(u.userId));
            return [...prev, ...newUsers];
          });
        }
      } catch (error) {
        console.error('Error loading connection users:', error);
      }
    };
    
    loadConnectionUsers();
  }, [connections, currentUser]);

  // Set up real-time listener for connections (this handles both initial load and updates)
  useEffect(() => {
    if (!currentUser) return;

    console.log('Setting up real-time connection subscription for:', currentUser.uid);
    const unsubscribe = subscribeToConnections(currentUser.uid, (updatedConnections) => {
      console.log('Connections updated via subscription:', {
        count: updatedConnections.length,
        currentUserId: currentUser.uid,
        connections: updatedConnections.map(c => {
          const isReceiver = c.connectedUserId === currentUser.uid;
          const isSender = c.userId === currentUser.uid;
          const didNotInitiate = c.initiatedBy !== currentUser.uid;
          return {
            id: c.id,
            userId: c.userId,
            connectedUserId: c.connectedUserId,
            initiatedBy: c.initiatedBy,
            status: c.status,
            isReceiver,
            isSender,
            didNotInitiate,
            shouldBeIncoming: isReceiver && didNotInitiate && !isSender,
            connectedUserName: c.connectedUserName
          };
        })
      });
      setConnections(updatedConnections);
      setLoading(false); // Set loading to false once we get the first update
    });
    
    return () => {
      console.log('Cleaning up connection subscription');
      unsubscribe();
    };
  }, [currentUser]);

  // Filter users for connection requests
  const filteredUsers = allUsers.filter(user =>
    user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.talentArea?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separate connections by status - check both directions and filter out self-connections
  const validConnections = connections.filter(c => 
    c.userId !== c.connectedUserId && // Filter out self-connections
    (c.userId === currentUser?.uid || c.connectedUserId === currentUser?.uid)
  );
  
  const acceptedConnections = validConnections.filter(c => c.status === 'accepted');
  
  // Incoming requests: where current user is the receiver (connectedUserId) and didn't initiate
  // STRICT CHECK: Must be receiver AND not sender AND not initiator
  const pendingRequests = validConnections.filter(c => {
    // FIRST CHECK: Must be pending
    if (c.status !== 'pending') {
      return false;
    }
    
    // SECOND CHECK: If current user is the sender (userId), REJECT IMMEDIATELY
    if (c.userId === currentUser?.uid) {
      console.log('❌ REJECTED: Current user is the sender (userId matches):', {
        id: c.id,
        userId: c.userId,
        connectedUserId: c.connectedUserId,
        initiatedBy: c.initiatedBy || 'undefined',
        currentUser: currentUser?.uid
      });
      return false;
    }
    
    // THIRD CHECK: If current user initiated it, REJECT IMMEDIATELY
    if (c.initiatedBy === currentUser?.uid) {
      console.log('❌ REJECTED: Current user initiated this connection:', {
        id: c.id,
        userId: c.userId,
        connectedUserId: c.connectedUserId,
        initiatedBy: c.initiatedBy,
        currentUser: currentUser?.uid
      });
      return false;
    }
    
    // FOURTH CHECK: Current user must be the receiver
    const isReceiver = c.connectedUserId === currentUser?.uid;
    if (!isReceiver) {
      console.log('❌ REJECTED: Current user is not the receiver:', {
        id: c.id,
        userId: c.userId,
        connectedUserId: c.connectedUserId,
        currentUser: currentUser?.uid
      });
      return false;
    }
    
    // If we get here, all checks passed - it's a valid incoming request
    console.log('✅ ACCEPTED: Valid incoming request:', {
      id: c.id,
      userId: c.userId,
      connectedUserId: c.connectedUserId,
      initiatedBy: c.initiatedBy || 'undefined',
      currentUser: currentUser?.uid
    });
    
    return true;
  });
  
  // Outgoing requests: where current user is the sender (userId) or initiated
  // This means: userId === currentUser.uid OR initiatedBy === currentUser.uid
  const sentRequests = validConnections.filter(c => {
    if (c.status !== 'pending') return false;
    const isSender = c.userId === currentUser?.uid;
    const didInitiate = c.initiatedBy === currentUser?.uid;
    return isSender || didInitiate;
  });
  
  const allPending = validConnections.filter(c => c.status === 'pending');
  console.log('=== CONNECTION FILTERING SUMMARY ===');
  console.log('Connection filtering:', {
    totalConnections: connections.length,
    validConnections: validConnections.length,
    accepted: acceptedConnections.length,
    pendingIncoming: pendingRequests.length,
    pendingOutgoing: sentRequests.length,
    currentUser: currentUser?.uid,
    allPendingCount: allPending.length,
    allPending: allPending.map(c => {
      const isReceiver = c.connectedUserId === currentUser?.uid;
      const didNotInitiate = c.initiatedBy ? c.initiatedBy !== currentUser?.uid : c.userId !== currentUser?.uid;
      const isNotSender = c.userId !== currentUser?.uid;
      const shouldBeIncoming = isReceiver && didNotInitiate && isNotSender;
      
      return {
        id: c.id,
        userId: c.userId,
        connectedUserId: c.connectedUserId,
        initiatedBy: c.initiatedBy || 'undefined',
        status: c.status,
        isReceiver,
        isSender: !isNotSender,
        didNotInitiate,
        isNotSender,
        shouldBeIncoming,
        connectedUserName: c.connectedUserName
      };
    }),
    pendingRequestsDetails: pendingRequests.map(c => ({
      id: c.id,
      userId: c.userId,
      connectedUserId: c.connectedUserId,
      initiatedBy: c.initiatedBy || 'undefined',
      connectedUserName: c.connectedUserName,
      connectedUserRole: c.connectedUserRole
    })),
    // Show why each pending connection is or isn't in pendingRequests
    pendingAnalysis: allPending.map(c => {
      const isReceiver = c.connectedUserId === currentUser?.uid;
      const isSender = c.userId === currentUser?.uid;
      const didInitiate = c.initiatedBy === currentUser?.uid;
      const inPendingRequests = pendingRequests.some(pr => pr.id === c.id);
      
      return {
        id: c.id,
        userId: c.userId,
        connectedUserId: c.connectedUserId,
        isReceiver,
        isSender,
        didInitiate,
        inPendingRequests,
        reason: isSender ? 'REJECTED: User is sender' : 
                didInitiate ? 'REJECTED: User initiated' :
                !isReceiver ? 'REJECTED: User is not receiver' :
                'SHOULD BE IN pendingRequests'
      };
    })
  });
  console.log('=== END CONNECTION FILTERING SUMMARY ===');

  // Check if user is already connected or has pending request
  const getConnectionStatus = (userId: string) => {
    // Don't allow connecting to self
    if (userId === currentUser?.uid) return null;
    
    const connection = connections.find(c =>
      c.userId !== c.connectedUserId && // Ensure it's not a self-connection
      ((c.userId === currentUser?.uid && c.connectedUserId === userId) ||
       (c.connectedUserId === currentUser?.uid && c.userId === userId))
    );
    return connection?.status || null;
  };

  // Handle sending connection request
  const handleSendRequest = async (targetUser: UserProfile) => {
    if (!currentUser) return;

    // Check if already connected or pending
    const existingStatus = getConnectionStatus(targetUser.userId);
    if (existingStatus === 'accepted') {
      toast({
        title: "Already Connected",
        description: `You are already connected to ${targetUser.fullName || targetUser.companyName}`,
      });
      return;
    }
    if (existingStatus === 'pending') {
      toast({
        title: "Request Already Sent",
        description: `A connection request is already pending with ${targetUser.fullName || targetUser.companyName}`,
      });
      return;
    }

    setSendingRequest(targetUser.userId);
    try {
      console.log('Sending connection request:', {
        from: currentUser.uid,
        to: targetUser.userId,
        name: targetUser.fullName || targetUser.companyName
      });
      
      const connectionId = await addConnection({
        userId: currentUser.uid,
        connectedUserId: targetUser.userId,
        connectedUserName: targetUser.fullName || targetUser.companyName || 'User',
        connectedUserRole: targetUser.companyName ? 'recruiter' : 'youth',
        status: 'pending',
        initiatedBy: currentUser.uid,
      });

      console.log('Connection request created with ID:', connectionId);

      toast({
        title: "Request Sent",
        description: `Connection request sent to ${targetUser.fullName || targetUser.companyName}`,
      });
    } catch (error: any) {
      console.error('Error sending connection request:', error);
      const errorMessage = error?.message || "Failed to send connection request";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSendingRequest(null);
    }
  };

  // Handle accepting/declining connection requests
  const handleConnectionResponse = async (connectionId: string, status: 'accepted' | 'declined') => {
    try {
      await updateConnection(connectionId, { status });

      toast({
        title: status === 'accepted' ? "Connection Accepted" : "Request Declined",
        description: status === 'accepted'
          ? "You are now connected!"
          : "Connection request declined",
      });
    } catch (error) {
      console.error('Error updating connection:', error);
      toast({
        title: "Error",
        description: "Failed to update connection",
        variant: "destructive",
      });
    }
  };

  // Handle viewing profile
  const handleViewProfile = async (userId: string) => {
    console.log('=== handleViewProfile CALLED ===');
    console.log('userId:', userId);
    console.log('currentUser?.uid:', currentUser?.uid);
    
    if (!userId) {
      console.error('handleViewProfile: userId is missing');
      toast({
        title: "Error",
        description: "User ID is missing",
        variant: "destructive",
      });
      return;
    }
    
    // Make sure we're not viewing our own profile
    if (userId === currentUser?.uid) {
      console.error('handleViewProfile: Attempted to view own profile');
      toast({
        title: "Error",
        description: "This is your own profile",
        variant: "destructive",
      });
      return;
    }
    
    // Note: Dialog should already be open from button click
    console.log('=== handleViewProfile: Starting profile load ===');
    
    // Ensure dialog is open (in case it wasn't set in button click)
    setShowProfileDialog(true);
    setLoadingProfile(true);
    
    try {
      console.log('Fetching profile for userId:', userId);
      const profile = await getProfile(userId);
      console.log('Profile fetched:', profile);
      
      if (!profile) {
        console.error('Profile not found for userId:', userId);
        toast({
          title: "Error",
          description: "Profile not found",
          variant: "destructive",
        });
        setShowProfileDialog(false);
        setLoadingProfile(false);
        return;
      }
      
      console.log('Setting profile:', profile);
      console.log('Profile userId:', profile.userId || profile.id);
      console.log('Expected userId:', userId);
      console.log('Current user:', currentUser?.uid);
      
      // Double-check we're setting the correct profile
      if (profile.userId === currentUser?.uid || profile.id === currentUser?.uid) {
        console.error('ERROR: Attempted to set own profile!');
        toast({
          title: "Error",
          description: "Cannot view your own profile here",
          variant: "destructive",
        });
        setShowProfileDialog(false);
        setLoadingProfile(false);
        return;
      }
      
      setSelectedProfile(profile);
      
      // If it's a youth user, also load their portfolios
      if (!profile.companyName && (profile.role === 'youth' || !profile.role)) {
        console.log('Loading portfolios for youth user...');
        try {
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
      
      // Ensure dialog stays open after profile loads
      setShowProfileDialog(true);
      console.log('Profile loaded, ensuring dialog is open');
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: `Failed to load profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
      // Keep dialog open but show error state
      setShowProfileDialog(true);
    } finally {
      setLoadingProfile(false);
      console.log('=== handleViewProfile COMPLETE ===');
      console.log('Final dialog state - showProfileDialog:', showProfileDialog);
    }
  };

  // Handle messaging
  const handleMessage = (userId: string) => {
    navigate(`/youth/messages?userId=${userId}`);
  };

  // Get file type from URL
  const getFileType = (url: string): 'image' | 'video' | 'document' | 'unknown' => {
    if (!url) return 'unknown';
    const extension = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) return 'image';
    if (['mp4', 'webm', 'mov', 'avi'].includes(extension || '')) return 'video';
    if (['pdf', 'doc', 'docx', 'txt'].includes(extension || '')) return 'document';
    return 'unknown';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Network</h2>
          <p className="mt-1 text-sm text-gray-600">
            Connect with other youth and recruiters in your field
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {acceptedConnections.length} connections
        </Badge>
      </div>

      {/* Debug: Show all pending connections */}
      {process.env.NODE_ENV === 'development' && allPending.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-sm text-yellow-800">DEBUG: All Pending Connections ({allPending.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              {allPending.map(c => {
                const isReceiver = c.connectedUserId === currentUser?.uid;
                const didNotInitiate = c.initiatedBy ? c.initiatedBy !== currentUser?.uid : c.userId !== currentUser?.uid;
                const isNotSender = c.userId !== currentUser?.uid;
                const shouldBeIncoming = isReceiver && didNotInitiate && isNotSender;
                const isInPendingRequests = pendingRequests.some(pr => pr.id === c.id);
                
                return (
                  <div key={c.id} className="p-2 border rounded bg-white">
                    <div>ID: {c.id}</div>
                    <div>From: {c.userId} (sender: {c.userId === currentUser?.uid ? 'YES' : 'NO'})</div>
                    <div>To: {c.connectedUserId} (receiver: {isReceiver ? 'YES' : 'NO'})</div>
                    <div>Initiated By: {c.initiatedBy || 'undefined'}</div>
                    <div>Status: {c.status}</div>
                    <div className="mt-1">
                      <span className={shouldBeIncoming ? 'text-green-600 font-bold' : 'text-red-600'}>
                        Should be incoming: {shouldBeIncoming ? 'YES' : 'NO'}
                      </span>
                      {' | '}
                      <span className={isInPendingRequests ? 'text-green-600 font-bold' : 'text-red-600'}>
                        In pendingRequests: {isInPendingRequests ? 'YES' : 'NO'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug: Show all pending connections */}
      {process.env.NODE_ENV === 'development' && allPending.length > 0 && (
        <Card className="border-blue-300 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-sm text-blue-800">DEBUG: All Pending Connections ({allPending.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              {allPending.map(c => {
                const isReceiver = c.connectedUserId === currentUser?.uid;
                const isSender = c.userId === currentUser?.uid;
                const didInitiate = c.initiatedBy === currentUser?.uid;
                const inPendingRequests = pendingRequests.some(pr => pr.id === c.id);
                
                return (
                  <div key={c.id} className="p-2 border rounded bg-white">
                    <div><strong>ID:</strong> {c.id}</div>
                    <div><strong>From:</strong> {c.userId} {isSender && '(YOU ARE SENDER)'}</div>
                    <div><strong>To:</strong> {c.connectedUserId} {isReceiver && '(YOU ARE RECEIVER)'}</div>
                    <div><strong>Initiated By:</strong> {c.initiatedBy || 'undefined'} {didInitiate && '(YOU)'}</div>
                    <div><strong>Status:</strong> {c.status}</div>
                    <div className="mt-1">
                      <span className={inPendingRequests ? 'text-green-600 font-bold' : 'text-red-600'}>
                        In pendingRequests: {inPendingRequests ? 'YES ✅' : 'NO ❌'}
                      </span>
                      {!inPendingRequests && (
                        <div className="text-red-600 mt-1">
                          Reason: {isSender ? 'You are the sender' : didInitiate ? 'You initiated' : !isReceiver ? 'You are not receiver' : 'Unknown'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserPlus className="mr-2 h-5 w-5" />
              Connection Requests ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingRequests
                .filter(request => {
                  // SAFETY CHECK: Don't show if current user is the sender
                  if (request.userId === currentUser?.uid) {
                    console.error('ERROR: Filtering out own sent request from display:', {
                      requestId: request.id,
                      userId: request.userId,
                      connectedUserId: request.connectedUserId,
                      currentUser: currentUser?.uid
                    });
                    return false;
                  }
                  return true;
                })
                .map((request) => {
                // For incoming requests, current user is the receiver, so sender is userId
                const senderUserId = request.userId;
                
                // Double-check: if sender is current user, skip
                if (senderUserId === currentUser?.uid) {
                  console.error('ERROR: Attempting to display own sent request as incoming!', {
                    requestId: request.id,
                    senderId: senderUserId,
                    currentUser: currentUser?.uid
                  });
                  return null;
                }
                
                const senderUser = allUsers.find(u => u.userId === senderUserId);
                const senderUserName = senderUser?.fullName || senderUser?.companyName || request.connectedUserName || 'Unknown User';
                const senderUserRole = senderUser?.companyName ? 'recruiter' : (senderUser?.role || request.connectedUserRole || 'youth');
                
                console.log('Displaying incoming request:', {
                  requestId: request.id,
                  senderId: senderUserId,
                  senderName: senderUserName,
                  currentUser: currentUser?.uid,
                  connection: {
                    userId: request.userId,
                    connectedUserId: request.connectedUserId,
                    initiatedBy: request.initiatedBy
                  }
                });
                
                return (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={senderUser?.profileImageUrl} />
                      <AvatarFallback>
                        {senderUserName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{senderUserName}</p>
                      <p className="text-sm text-muted-foreground">
                        {senderUserRole === 'recruiter' ? 'Recruiter' : 'Youth'}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => handleConnectionResponse(request.id, 'accepted')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleConnectionResponse(request.id, 'declined')}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Connections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            My Connections ({acceptedConnections.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {acceptedConnections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No connections yet</p>
              <p className="text-sm">Start networking to build your professional network!</p>
            </div>
          ) : (
            <ScrollArea className="h-80">
              <div className="space-y-4">
                {acceptedConnections.map((connection) => {
                  // Determine the other user's info based on connection direction
                  // Connection structure:
                  // - userId: one user in the connection
                  // - connectedUserId: the other user in the connection
                  // - initiatedBy: who started the connection
                  
                  // Calculate otherUserId - should be the opposite of currentUser
                  let otherUserId: string | undefined;
                  
                  if (connection.userId === currentUser?.uid) {
                    // Current user is userId, so other user is connectedUserId
                    otherUserId = connection.connectedUserId;
                  } else if (connection.connectedUserId === currentUser?.uid) {
                    // Current user is connectedUserId, so other user is userId
                    otherUserId = connection.userId;
                  } else {
                    // Neither matches - this shouldn't happen, but use fallback
                    console.error('⚠️ Current user does not match either connection user!', {
                      currentUser: currentUser?.uid,
                      connectionUserId: connection.userId,
                      connectedUserId: connection.connectedUserId
                    });
                    // Try to use the one that's not null
                    otherUserId = connection.userId || connection.connectedUserId;
                  }
                  
                  // Debug logging
                  console.log('=== CONNECTION RENDER ===');
                  console.log('Connection:', connection);
                  console.log('Current user:', currentUser?.uid);
                  console.log('Connection userId:', connection.userId);
                  console.log('Connection connectedUserId:', connection.connectedUserId);
                  console.log('isReceiver:', isReceiver);
                  console.log('otherUserId:', otherUserId);
                  console.log('Should be different:', otherUserId !== currentUser?.uid);
                  
                  // Safety check: make sure we have a valid otherUserId
                  if (!otherUserId || otherUserId === currentUser?.uid) {
                    console.warn('Invalid connection - otherUserId matches current user or is missing:', {
                      connectionId: connection.id,
                      otherUserId,
                      currentUserId: currentUser?.uid
                    });
                    return null;
                  }
                  
                  const otherUser = allUsers.find(u => u.userId === otherUserId);
                  const otherUserName = otherUser?.fullName || otherUser?.companyName || connection.connectedUserName;
                  const otherUserRole = otherUser?.companyName ? 'recruiter' : (otherUser?.role || connection.connectedUserRole);
                  
                  return (
                  <div key={connection.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar 
                        className="cursor-pointer hover:ring-2 ring-primary transition-all"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('=== AVATAR CLICKED ===');
                          console.log('otherUserId:', otherUserId, 'currentUser:', currentUser?.uid);
                          
                          if (!otherUserId || otherUserId === currentUser?.uid) {
                            console.error('Invalid userId for profile view:', otherUserId);
                            return;
                          }
                          
                          // Open dialog FIRST
                          console.log('=== AVATAR: Opening dialog ===');
                          setSelectedProfile(null);
                          setSelectedPortfolios([]);
                          setLoadingProfile(true);
                          setShowProfileDialog(true);
                          console.log('=== AVATAR: Dialog state set to true ===');
                          
                          // Then load profile
                          handleViewProfile(otherUserId).catch(err => {
                            console.error('Error loading profile:', err);
                          });
                        }}
                        title="Click to view profile"
                      >
                        <AvatarImage src={otherUser?.profileImageUrl} />
                        <AvatarFallback>
                          {otherUserName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{otherUserName}</p>
                        <p className="text-sm text-muted-foreground">
                          {otherUserRole === 'recruiter' ? 'Recruiter' : 'Youth'}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleMessage(otherUserId)}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Message
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          
                          // Validate otherUserId
                          if (!otherUserId || otherUserId === currentUser?.uid) {
                            toast({
                              title: "Error",
                              description: "Cannot view this profile",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          // Open dialog and load profile
                          setSelectedProfile(null);
                          setSelectedPortfolios([]);
                          setLoadingProfile(true);
                          setShowProfileDialog(true);
                          
                          // Load the profile
                          handleViewProfile(otherUserId).catch(err => {
                            console.error('Error loading profile:', err);
                            toast({
                              title: "Error",
                              description: "Failed to load profile",
                              variant: "destructive",
                            });
                            setLoadingProfile(false);
                          });
                        }}
                        title="View Profile"
                      >
                        <User className="h-4 w-4 mr-1" />
                        View Profile
                      </Button>
                    </div>
                  </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Find People to Connect */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="mr-2 h-5 w-5" />
            Find People to Connect
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search by name, company, or talent area..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          <ScrollArea className="h-96">
            <div className="space-y-4">
              {filteredUsers.map((user) => {
                const connectionStatus = getConnectionStatus(user.userId);
                const isSending = sendingRequest === user.userId;

                return (
                  <div key={user.userId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={user.profileImageUrl} />
                        <AvatarFallback>
                          {user.fullName?.charAt(0)?.toUpperCase() || user.companyName?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {user.fullName || user.companyName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {user.companyName ? `Recruiter at ${user.companyName}` : `Youth - ${user.talentArea || 'No talent area specified'}`}
                        </p>
                        {(user.city || user.country) && (
                          <p className="text-xs text-muted-foreground">
                            {[user.city, user.country].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      {connectionStatus === 'accepted' ? (
                        <Badge variant="secondary">Connected</Badge>
                      ) : connectionStatus === 'pending' ? (
                        <Badge variant="outline">Pending</Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleSendRequest(user)}
                          disabled={isSending}
                        >
                          {isSending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-1" />
                              Connect
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Profile View Dialog */}
      <Dialog 
        open={showProfileDialog} 
        onOpenChange={(open) => {
          console.log('Dialog onOpenChange called with:', open);
          console.log('Current showProfileDialog state:', showProfileDialog);
          setShowProfileDialog(open);
          if (!open) {
            setSelectedProfile(null);
            setSelectedPortfolios([]);
            setLoadingProfile(false);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" style={{ zIndex: 9999 }}>
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
              {/* Debug info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-muted-foreground p-2 bg-gray-100 rounded">
                  <p>Profile ID: {selectedProfile.id}</p>
                  <p>Profile userId: {selectedProfile.userId}</p>
                  <p>Current user: {currentUser?.uid}</p>
                  <p>Match: {selectedProfile.userId === currentUser?.uid ? '❌ SAME USER' : '✅ DIFFERENT USER'}</p>
                </div>
              )}
              
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

              {/* Tabs for Profile and Portfolio */}
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
                              <Badge key={index} variant="secondary">{skill}</Badge>
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
                                      className="w-full h-full object-cover"
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
                                        <Video className="h-3 w-3 mr-1" />
                                        Video
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {portfolio.fileUrl && (
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
                              
                              {portfolio.link && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => window.open(portfolio.link, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Visit Project
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
                <p className="text-sm text-muted-foreground mt-2">Please try again</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConnectionsSection;
