import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, updateNotificationSettings, getNotificationSettings } from '@/integrations/firebase/services';
import { RecruiterNotification, NotificationSettings } from '@/integrations/firebase/types';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Mail,
  MessageSquare,
  Calendar,
  Users,
  FileText,
  AlertTriangle,
  Settings,
  Trash2
} from 'lucide-react';

interface NotificationsCenterProps {
  onClose?: () => void;
}

export const NotificationsCenter: React.FC<NotificationsCenterProps> = ({ onClose }) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const [notifications, setNotifications] = useState<RecruiterNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    loadNotifications();
    loadSettings();
  }, [currentUser]);

  const loadNotifications = async () => {
    if (!currentUser?.uid) return;

    try {
      const notificationsData = await getNotifications(currentUser.uid);
      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({
        title: t('error'),
        description: t('failedToLoadNotifications'),
        variant: 'destructive'
      });
    }
  };

  const loadSettings = async () => {
    if (!currentUser?.uid) return;

    try {
      const settingsData = await getNotificationSettings(currentUser.uid);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: t('error'),
        description: t('failedToUpdateNotification'),
        variant: 'destructive'
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser?.uid) return;

    try {
      await markAllNotificationsAsRead(currentUser.uid);
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      toast({
        title: t('success'),
        description: t('allNotificationsMarkedAsRead')
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: t('error'),
        description: t('failedToUpdateNotifications'),
        variant: 'destructive'
      });
    }
  };

  const handleSettingsChange = async (key: keyof NotificationSettings, value: boolean) => {
    if (!settings || !currentUser?.uid) return;

    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);

    try {
      await updateNotificationSettings(currentUser.uid, updatedSettings);
      toast({
        title: t('success'),
        description: t('settingsUpdated')
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast({
        title: t('error'),
        description: t('failedToUpdateSettings'),
        variant: 'destructive'
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_application':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'interview_reminder':
        return <Calendar className="w-5 h-5 text-green-500" />;
      case 'job_expiring':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'candidate_response':
        return <MessageSquare className="w-5 h-5 text-purple-500" />;
      case 'team_message':
        return <Users className="w-5 h-5 text-indigo-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'new_application':
        return t('newApplication');
      case 'interview_reminder':
        return t('interviewReminder');
      case 'job_expiring':
        return t('jobExpiring');
      case 'candidate_response':
        return t('candidateResponse');
      case 'team_message':
        return t('teamMessage');
      case 'system_update':
        return t('systemUpdate');
      default:
        return type;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return t('justNow');
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread' && notification.isRead) return false;
    if (filter === 'read' && !notification.isRead) return false;
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{t('notifications')}</h2>
            <p className="text-muted-foreground">{t('stayUpdated')}</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllAsRead} variant="outline">
            <CheckCheck className="w-4 h-4 mr-2" />
            {t('markAllAsRead')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notifications List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('recentNotifications')}</CardTitle>
                <div className="flex gap-2">
                  <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('all')}</SelectItem>
                      <SelectItem value="unread">{t('unread')}</SelectItem>
                      <SelectItem value="read">{t('read')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allTypes')}</SelectItem>
                      <SelectItem value="new_application">{t('newApplication')}</SelectItem>
                      <SelectItem value="interview_reminder">{t('interviewReminder')}</SelectItem>
                      <SelectItem value="job_expiring">{t('jobExpiring')}</SelectItem>
                      <SelectItem value="candidate_response">{t('candidateResponse')}</SelectItem>
                      <SelectItem value="team_message">{t('teamMessage')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {filteredNotifications.length === 0 ? (
                  <div className="text-center py-8">
                    <BellOff className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">{t('noNotifications')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                          !notification.isRead
                            ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
                            : 'bg-muted/30'
                        }`}
                      >
                        <div className="flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">
                                {notification.title}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {getNotificationTypeLabel(notification.type)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatTimeAgo(notification.createdAt)}
                                </span>
                              </div>
                            </div>
                            {!notification.isRead && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="ml-2"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Settings Panel */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                {t('notificationSettings')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {settings && (
                <>
                  <div className="space-y-4">
                    <h4 className="font-medium">{t('emailNotifications')}</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="email-new-apps" className="text-sm">
                          {t('newApplications')}
                        </Label>
                        <Switch
                          id="email-new-apps"
                          checked={settings.emailNotifications}
                          onCheckedChange={(checked) => handleSettingsChange('emailNotifications', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="email-interviews" className="text-sm">
                          {t('interviewReminders')}
                        </Label>
                        <Switch
                          id="email-interviews"
                          checked={settings.interviewReminders}
                          onCheckedChange={(checked) => handleSettingsChange('interviewReminders', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="email-weekly" className="text-sm">
                          {t('weeklyReports')}
                        </Label>
                        <Switch
                          id="email-weekly"
                          checked={settings.weeklyReports}
                          onCheckedChange={(checked) => handleSettingsChange('weeklyReports', checked)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">{t('pushNotifications')}</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="push-new-apps" className="text-sm">
                          {t('newApplications')}
                        </Label>
                        <Switch
                          id="push-new-apps"
                          checked={settings.applicationAlerts}
                          onCheckedChange={(checked) => handleSettingsChange('applicationAlerts', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="push-messages" className="text-sm">
                          {t('messages')}
                        </Label>
                        <Switch
                          id="push-messages"
                          checked={settings.messageNotifications}
                          onCheckedChange={(checked) => handleSettingsChange('messageNotifications', checked)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">{t('smsAlerts')}</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="sms-urgent" className="text-sm">
                          {t('urgentNotifications')}
                        </Label>
                        <Switch
                          id="sms-urgent"
                          checked={settings.smsAlerts}
                          onCheckedChange={(checked) => handleSettingsChange('smsAlerts', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
