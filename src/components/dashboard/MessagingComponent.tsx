import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  sendMessage,
  getMessagesByConversation,
  getConversationsByUser,
  createConversation,
  markMessagesAsRead,
  subscribeToMessages,
  subscribeToConversations
} from '@/integrations/firebase/services';
import { Message, Conversation, UserProfile } from '@/integrations/firebase/types';
import {
  Send,
  Paperclip,
  Search,
  MessageSquare,
  User,
  Clock,
  Check,
  CheckCheck
} from 'lucide-react';

interface MessagingComponentProps {
  onSelectConversation?: (conversationId: string) => void;
}

export const MessagingComponent: React.FC<MessagingComponentProps> = ({ onSelectConversation }) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribeConversations = subscribeToConversations(currentUser.uid, setConversations);
    return () => unsubscribeConversations();
  }, [currentUser]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      markMessagesAsRead(selectedConversation.id, currentUser?.uid || '');
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async (conversationId: string) => {
    try {
      const messagesData = await getMessagesByConversation(conversationId);
      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: t('error'),
        description: t('failedToLoadMessages'),
        variant: 'destructive'
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !currentUser || sending) return;

    const messageToSend = newMessage.trim();
    setNewMessage(''); // Clear input immediately to prevent double send
    setSending(true);
    
    try {
      const messageData = {
        senderId: currentUser.uid,
        receiverId: selectedConversation.participants.find(p => p !== currentUser.uid) || '',
        message: messageToSend,
        messageType: 'text' as const,
        isRead: false,
        conversationId: selectedConversation.id
      };

      await sendMessage(messageData);
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message on error
      setNewMessage(messageToSend);
      toast({
        title: t('error'),
        description: t('failedToSendMessage'),
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const messageDate = new Date(date);

    if (messageDate.toDateString() === today.toDateString()) {
      return t('today');
    }

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (messageDate.toDateString() === yesterday.toDateString()) {
      return t('yesterday');
    }

    return messageDate.toLocaleDateString();
  };

  const filteredConversations = conversations.filter(conv => {
    const otherParticipant = conv.participants.find(p => p !== currentUser?.uid);
    return otherParticipant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getUnreadCount = (conversation: Conversation) => {
    return conversation.unreadCount?.[currentUser?.uid || ''] || 0;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">{t('loading')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      {/* Conversations List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            {t('conversations')}
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchConversations')}
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('noConversations')}</p>
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {filteredConversations.map((conversation) => {
                  const unreadCount = getUnreadCount(conversation);
                  const isSelected = selectedConversation?.id === conversation.id;

                  return (
                    <div
                      key={conversation.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        setSelectedConversation(conversation);
                        onSelectConversation?.(conversation.id);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback>
                            <User className="w-5 h-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">
                              {conversation.participants.find(p => p !== currentUser?.uid) || t('unknown')}
                            </p>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">
                                {formatTime(conversation.lastMessageTime)}
                              </span>
                              {unreadCount > 0 && (
                                <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                  {unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {conversation.lastMessage || t('noMessages')}
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
      <Card className="lg:col-span-2">
        {selectedConversation ? (
          <>
            <CardHeader className="border-b">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback>
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">
                    {selectedConversation.participants.find(p => p !== currentUser?.uid) || t('unknown')}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {t('lastSeen')} {formatTime(selectedConversation.lastMessageTime)}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex flex-col h-[500px]">
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
                  <Button variant="outline" size="sm">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Textarea
                    placeholder={t('typeMessage')}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1 min-h-[40px] max-h-[100px] resize-none"
                    rows={1}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    size="sm"
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
              <h3 className="text-lg font-semibold mb-2">{t('selectConversation')}</h3>
              <p>{t('chooseConversationToStart')}</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};
