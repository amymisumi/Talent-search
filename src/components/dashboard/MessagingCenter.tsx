import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  getConnectionsByUser,
  getAllProfiles,
  getOrCreateConversation,
  subscribeToMessagesByConversation,
  sendMessage,
  markMessagesAsRead,
  getMessagesByConversation,
  getConversationsByUser,
  subscribeToConversations,
} from '@/integrations/firebase/services';
import {
  subscribeToMultipleUsersPresence,
  setUserOnline,
  setUserOffline,
} from '@/integrations/firebase/presenceService';
import { Connection, UserProfile, Message, Conversation } from '@/integrations/firebase/types';
import {
  Send,
  Search,
  MessageSquare,
  Check,
  CheckCheck,
} from 'lucide-react';

interface ConnectionWithProfile extends Connection {
  profile?: UserProfile;
  isOnline?: boolean;
  lastSeen?: number | null;
  conversationId?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
}

export const MessagingCenter: React.FC = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [connections, setConnections] = useState<ConnectionWithProfile[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<ConnectionWithProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [presenceMap, setPresenceMap] = useState<Record<string, { status: 'online' | 'offline'; lastSeen: number | null }>>({});

  // Set user online when component mounts
  useEffect(() => {
    if (currentUser?.uid) {
      setUserOnline(currentUser.uid);
      
      // Set offline when component unmounts or user logs out
      return () => {
        setUserOffline(currentUser.uid);
      };
    }
  }, [currentUser]);

  // Load connections and profiles
  useEffect(() => {
    const loadConnections = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        const [userConnections, allProfiles] = await Promise.all([
          getConnectionsByUser(currentUser.uid),
          getAllProfiles(),
        ]);

        // Filter only accepted connections
        const acceptedConnections = userConnections.filter(c => c.status === 'accepted');

        // Enrich connections with profile data
        const enrichedConnections: ConnectionWithProfile[] = acceptedConnections.map(connection => {
          const otherUserId = connection.userId === currentUser.uid 
            ? connection.connectedUserId 
            : connection.userId;
          
          const profile = allProfiles.find(p => p.userId === otherUserId);
          
          return {
            ...connection,
            profile,
            isOnline: false,
            lastSeen: null,
            unreadCount: 0,
          };
        });

        setConnections(enrichedConnections);

        // Subscribe to presence for all connected users
        const userIds = enrichedConnections.map(c => {
          return c.userId === currentUser.uid ? c.connectedUserId : c.userId;
        });

        if (userIds.length > 0) {
          const unsubscribePresence = subscribeToMultipleUsersPresence(userIds, (presence) => {
            setPresenceMap(presence);
            
            // Update connections with presence data
            setConnections(prev => prev.map(conn => {
              const otherUserId = conn.userId === currentUser.uid 
                ? conn.connectedUserId 
                : conn.userId;
              const presenceData = presence[otherUserId];
              
              return {
                ...conn,
                isOnline: presenceData?.status === 'online',
                lastSeen: presenceData?.lastSeen || null,
              };
            }));
          });

          return () => unsubscribePresence();
        }
      } catch (error) {
        console.error('Error loading connections:', error);
        toast({
          title: "Error",
          description: "Failed to load connections",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadConnections();
  }, [currentUser, toast]);

  // Subscribe to conversations in real-time and update connections
  useEffect(() => {
    if (!currentUser || connections.length === 0) return;

    // Set up real-time conversation subscription
    const unsubscribe = subscribeToConversations(currentUser.uid, (conversations) => {
      // Update connections with conversation data in real-time
      setConnections(prev => prev.map(conn => {
        const otherUserId = conn.userId === currentUser.uid 
          ? conn.connectedUserId 
          : conn.userId;
        
        const conversation = conversations.find(conv => 
          conv.participants.includes(otherUserId) && conv.participants.includes(currentUser.uid)
        );

        if (conversation) {
          return {
            ...conn,
            conversationId: conversation.id,
            lastMessage: conversation.lastMessage,
            lastMessageTime: conversation.lastMessageTime,
            unreadCount: conversation.unreadCount?.[currentUser.uid] || 0,
          };
        }
        
        return conn;
      }));
    });

    return () => unsubscribe();
  }, [currentUser, connections.length]);

  // Load messages when a connection is selected
  useEffect(() => {
    if (!selectedConnection || !currentUser) return;

    let unsubscribe: (() => void) | undefined;

    const loadMessages = async () => {
      try {
        // Get or create conversation
        const otherUserId = selectedConnection.userId === currentUser.uid 
          ? selectedConnection.connectedUserId 
          : selectedConnection.userId;
        
        let conversationId = selectedConnection.conversationId;
        
        if (!conversationId) {
          conversationId = await getOrCreateConversation([currentUser.uid, otherUserId]);
          // Update connection with conversation ID
          setConnections(prev => prev.map(conn => 
            conn.id === selectedConnection.id 
              ? { ...conn, conversationId }
              : conn
          ));
          setSelectedConnection(prev => prev ? { ...prev, conversationId } : null);
        }

        // Mark messages as read
        await markMessagesAsRead(conversationId, currentUser.uid);

        // Subscribe to real-time messages
        unsubscribe = subscribeToMessagesByConversation(conversationId, (updatedMessages) => {
          setMessages(updatedMessages);
        });
      } catch (error) {
        console.error('Error loading messages:', error);
        toast({
          title: "Error",
          description: "Failed to load messages",
          variant: "destructive",
        });
      }
    };

    loadMessages();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [selectedConnection, currentUser, toast]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConnection || !currentUser || sending) return;

    const messageToSend = newMessage.trim();
    setNewMessage(''); // Clear input immediately to prevent double send
    setSending(true);
    
    try {
      const otherUserId = selectedConnection.userId === currentUser.uid 
        ? selectedConnection.connectedUserId 
        : selectedConnection.userId;
      
      const conversationId = selectedConnection.conversationId || 
        await getOrCreateConversation([currentUser.uid, otherUserId]);

      await sendMessage({
        senderId: currentUser.uid,
        receiverId: otherUserId,
        message: messageToSend,
        messageType: 'text',
        isRead: false,
        conversationId,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message on error
      setNewMessage(messageToSend);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date
  const formatDate = (date: Date) => {
    const today = new Date();
    const messageDate = new Date(date);

    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    }

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return messageDate.toLocaleDateString();
  };

  // Get connection description
  const getConnectionDescription = (connection: ConnectionWithProfile): string => {
    if (connection.profile?.companyName) {
      return `Recruiter - ${connection.profile.companyName}`;
    }
    if (connection.profile?.preferredCareerField) {
      return connection.profile.preferredCareerField;
    }
    if (connection.profile?.talentArea) {
      return connection.profile.talentArea;
    }
    return connection.connectedUserRole === 'recruiter' ? 'Recruiter' : 'Youth';
  };

  // Filter connections
  const filteredConnections = connections.filter(conn => {
    const name = conn.profile?.fullName || conn.profile?.companyName || conn.connectedUserName || '';
    const description = getConnectionDescription(conn);
    return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           description.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Sort connections by last message time
  const sortedConnections = [...filteredConnections].sort((a, b) => {
    const timeA = a.lastMessageTime?.getTime() || 0;
    const timeB = b.lastMessageTime?.getTime() || 0;
    return timeB - timeA;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 min-h-[calc(100vh-180px)] h-[calc(100vh-180px)]">
      {/* Connections List */}
      <Card className="lg:col-span-1 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Messages
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            {sortedConnections.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No conversations yet</p>
                <p className="text-sm">Connect with people to start chatting</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {sortedConnections.map((connection) => {
                  const isSelected = selectedConnection?.id === connection.id;
                  const otherUserId = connection.userId === currentUser?.uid 
                    ? connection.connectedUserId 
                    : connection.userId;
                  const presence = presenceMap[otherUserId];
                  // Only show online if presence explicitly says online (not just connection.isOnline)
                  const isOnline = presence?.status === 'online';

                  return (
                    <div
                      key={connection.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-primary/10 border border-primary/20' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedConnection(connection)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage 
                              src={connection.profile?.profileImageUrl} 
                              alt={connection.profile?.fullName || connection.profile?.companyName}
                            />
                            <AvatarFallback>
                              {(connection.profile?.fullName || connection.profile?.companyName || 'U')
                                .charAt(0)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">
                              {connection.profile?.fullName || 
                               connection.profile?.companyName || 
                               connection.connectedUserName}
                            </p>
                            <div className="flex items-center gap-1">
                              {connection.lastMessageTime && (
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(connection.lastMessageTime)}
                                </span>
                              )}
                              {connection.unreadCount && connection.unreadCount > 0 && (
                                <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                  {connection.unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {connection.lastMessage || getConnectionDescription(connection)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="lg:col-span-2 flex flex-col">
        {selectedConnection ? (
          <>
            <CardHeader className="border-b">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar>
                    <AvatarImage 
                      src={selectedConnection.profile?.profileImageUrl}
                      alt={selectedConnection.profile?.fullName || selectedConnection.profile?.companyName}
                    />
                    <AvatarFallback>
                      {(selectedConnection.profile?.fullName || 
                        selectedConnection.profile?.companyName || 
                        'U')
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {(presenceMap[selectedConnection.userId === currentUser.uid 
                    ? selectedConnection.connectedUserId 
                    : selectedConnection.userId]?.status === 'online' || selectedConnection.isOnline) && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {selectedConnection.profile?.fullName || 
                     selectedConnection.profile?.companyName || 
                     selectedConnection.connectedUserName}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      const otherUserId = selectedConnection.userId === currentUser.uid 
                        ? selectedConnection.connectedUserId 
                        : selectedConnection.userId;
                      const presence = presenceMap[otherUserId];
                      const isOnline = presence?.status === 'online';
                      return isOnline ? 'Online' : 'Offline';
                    })()}
                    {' • '}
                    {getConnectionDescription(selectedConnection)}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message, index) => {
                    const isOwnMessage = message.senderId === currentUser?.uid;
                    const showDate = index === 0 ||
                      formatDate(messages[index - 1].createdAt) !== formatDate(message.createdAt);

                    return (
                      <div key={message.id}>
                        {showDate && (
                          <div className="text-center my-4">
                            <Badge variant="outline" className="text-xs">
                              {formatDate(message.createdAt)}
                            </Badge>
                          </div>
                        )}
                        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                            <div className={`p-3 rounded-lg ${
                              isOwnMessage
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}>
                              <p className="text-sm">{message.message}</p>
                              <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                                isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}>
                                <span>{formatTime(message.createdAt)}</span>
                                {isOwnMessage && (
                                  message.isRead ? (
                                    <CheckCheck className="w-3 h-3" />
                                  ) : (
                                    <Check className="w-3 h-3" />
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1 min-h-[60px] resize-none"
                    rows={1}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    size="icon"
                  >
                    {sending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
              <p>Choose a person from the list to start chatting</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};
