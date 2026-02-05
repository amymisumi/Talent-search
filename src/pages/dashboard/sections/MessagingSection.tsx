import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/integrations/firebase/client';
import { getConnectionsByUser, getAllProfiles } from '@/integrations/firebase/services';
import { Connection, UserProfile } from '@/integrations/firebase/types';
import {
  MessageSquare,
  Send,
  Paperclip,
  Image,
  FileText,
  MoreVertical,
  Search,
  Users,
  Circle
} from 'lucide-react';

// Message types
type Message = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  isRead: boolean;
  createdAt: Date;
};

type ChatUser = {
  id: string;
  name: string;
  avatar?: string;
  role: 'youth' | 'recruiter';
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  isOnline: boolean;
};

const MessagingSection = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load connections and create chat users
  useEffect(() => {
    const loadChatUsers = async () => {
      if (!currentUser) return;

      try {
        const [connections, allProfiles] = await Promise.all([
          getConnectionsByUser(currentUser.uid),
          getAllProfiles()
        ]);

        const acceptedConnections = connections.filter(c => c.status === 'accepted');

        const chatUsersList: ChatUser[] = acceptedConnections.map(connection => {
          const connectedUser = allProfiles.find(p => p.userId === connection.connectedUserId);
          return {
            id: connection.connectedUserId,
            name: connectedUser?.fullName || connectedUser?.companyName || connection.connectedUserName,
            avatar: connectedUser?.profileImageUrl,
            role: connection.connectedUserRole,
            unreadCount: 0, // Will be calculated from messages
            isOnline: Math.random() > 0.5 // Mock online status
          };
        });

        setChatUsers(chatUsersList);
      } catch (error) {
        console.error('Error loading chat users:', error);
        toast({
          title: "Error",
          description: "Failed to load chat users",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadChatUsers();
  }, [currentUser, toast]);

  // Load messages for selected user
  useEffect(() => {
    if (!selectedUser || !currentUser) return;

    const messagesQuery = query(
      collection(db, 'messages'),
      where('senderId', 'in', [currentUser.uid, selectedUser.id]),
      where('receiverId', 'in', [currentUser.uid, selectedUser.id]),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList: Message[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Message[];

      setMessages(messagesList);

      // Mark messages as read
      messagesList
        .filter(msg => msg.receiverId === currentUser.uid && !msg.isRead)
        .forEach(msg => {
          updateDoc(doc(db, 'messages', msg.id), { isRead: true });
        });
    });

    return unsubscribe;
  }, [selectedUser, currentUser]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update unread counts
  useEffect(() => {
    if (!currentUser) return;

    const updateUnreadCounts = async () => {
      const updatedUsers = await Promise.all(
        chatUsers.map(async (user) => {
          const unreadQuery = query(
            collection(db, 'messages'),
            where('senderId', '==', user.id),
            where('receiverId', '==', currentUser.uid),
            where('isRead', '==', false)
          );
          const unreadSnapshot = await getDocs(unreadQuery);
          return {
            ...user,
            unreadCount: unreadSnapshot.size
          };
        })
      );
      setChatUsers(updatedUsers);
    };

    updateUnreadCounts();
  }, [messages, currentUser]);

  // Send message
  const handleSendMessage = async (content: string = newMessage, type: 'text' | 'image' | 'file' = 'text', fileUrl?: string, fileName?: string) => {
    if (!selectedUser || !currentUser || (!content.trim() && !fileUrl)) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        senderId: currentUser.uid,
        receiverId: selectedUser.id,
        content: content.trim(),
        type,
        fileUrl,
        fileName,
        isRead: false,
        createdAt: Timestamp.now()
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedUser) return;

    try {
      const fileRef = ref(storage, `messages/${currentUser?.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const fileUrl = await getDownloadURL(fileRef);

      const type = file.type.startsWith('image/') ? 'image' : 'file';
      await handleSendMessage('', type, fileUrl, file.name);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    }
  };

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Filter chat users
  const filteredUsers = chatUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
          <p className="mt-1 text-sm text-gray-600">
            Connect and chat with recruiters and other youth
          </p>
        </div>
        <Badge variant="secondary">
          {chatUsers.length} conversations
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Chat List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="mr-2 h-5 w-5" />
              Conversations
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[480px]">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No conversations yet</p>
                  <p className="text-sm">Connect with people to start chatting</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedUser?.id === user.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>
                              {user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {user.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">{user.name}</p>
                            {user.unreadCount > 0 && (
                              <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                                {user.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {user.lastMessage || `${user.role === 'recruiter' ? 'Recruiter' : 'Youth'}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-2">
          {selectedUser ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={selectedUser.avatar} />
                      <AvatarFallback>
                        {selectedUser.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {selectedUser.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{selectedUser.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedUser.isOnline ? 'Online' : 'Offline'} • {selectedUser.role === 'recruiter' ? 'Recruiter' : 'Youth'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex flex-col h-[480px]">
                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.senderId === currentUser?.uid
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {message.type === 'image' && message.fileUrl && (
                            <div className="mb-2">
                              <img
                                src={message.fileUrl}
                                alt="Shared image"
                                className="max-w-full h-auto rounded"
                              />
                            </div>
                          )}
                          {message.type === 'file' && message.fileUrl && (
                            <div className="mb-2 p-2 bg-background/50 rounded">
                              <a
                                href={message.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-primary hover:underline"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                {message.fileName}
                              </a>
                            </div>
                          )}
                          {message.content && (
                            <p className="text-sm">{message.content}</p>
                          )}
                          <p className="text-xs opacity-70 mt-1">
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex items-end space-x-2">
                    <div className="flex-1">
                      <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="min-h-[60px] resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept="image/*,.pdf,.doc,.docx"
                      />
                      <Button
                        onClick={() => handleSendMessage()}
                        disabled={sending || !newMessage.trim()}
                      >
                        {sending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                <p>Choose a person from the list to start chatting</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default MessagingSection;
