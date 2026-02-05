import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, MessageSquare, Building, MapPin, Send } from 'lucide-react';
import { getActiveRecruiters, sendMessageToRecruiter } from '@/integrations/firebase/services';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserProfile } from '@/integrations/firebase/types';

const RecruitersSection: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [recruiters, setRecruiters] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecruiter, setSelectedRecruiter] = useState<UserProfile | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const loadRecruiters = async () => {
      try {
        const data = await getActiveRecruiters();
        setRecruiters(data);
      } catch (error) {
        console.error('Error loading recruiters:', error);
        toast.error('Failed to load recruiters');
      } finally {
        setLoading(false);
      }
    };

    loadRecruiters();
  }, []);

  const handleSendMessage = async () => {
    if (!selectedRecruiter || !currentUser || !message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSending(true);
    try {
      await sendMessageToRecruiter(currentUser.uid, selectedRecruiter.id, message);
      toast.success(t('messageSent'));
      setMessage('');
      setSelectedRecruiter(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(t('messageError'));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('availableRecruiters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            {t('availableRecruiters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recruiters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('noRecruiters')}</p>
            </div>
          ) : (
            <ScrollArea className="h-80">
              <div className="space-y-4">
                {recruiters.map((recruiter) => (
                  <div key={recruiter.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={recruiter.profileImageUrl} alt={recruiter.fullName} />
                        <AvatarFallback>
                          {recruiter.fullName?.charAt(0)?.toUpperCase() || 'R'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">{recruiter.fullName}</h4>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Building className="h-3 w-3 mr-1" />
                          {recruiter.companyName || t('companyName')}
                        </div>
                        {recruiter.city && recruiter.country && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3 mr-1" />
                            {recruiter.city}, {recruiter.country}
                          </div>
                        )}
                        {recruiter.specialization && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            {recruiter.specialization}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRecruiter(recruiter)}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          {t('connect')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            {t('connect')} {recruiter.fullName}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarImage src={recruiter.profileImageUrl} alt={recruiter.fullName} />
                              <AvatarFallback>
                                {recruiter.fullName?.charAt(0)?.toUpperCase() || 'R'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{recruiter.fullName}</p>
                              <p className="text-sm text-muted-foreground">
                                {recruiter.companyName || t('companyName')}
                              </p>
                            </div>
                          </div>
                          <Textarea
                            placeholder={t('typeMessage')}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={4}
                          />
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setSelectedRecruiter(null)}>
                              Cancel
                            </Button>
                            <Button onClick={handleSendMessage} disabled={sending || !message.trim()}>
                              <Send className="h-4 w-4 mr-1" />
                              {sending ? 'Sending...' : t('send')}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default RecruitersSection;
