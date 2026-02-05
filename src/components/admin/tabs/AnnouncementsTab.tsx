import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Bell, Send, Calendar } from 'lucide-react';
import { createAnnouncement, sendAnnouncement } from '../../../integrations/firebase/adminServices';
import { useToast } from '../../../hooks/use-toast';
import { useAuth } from '../../../contexts/AuthContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export const AnnouncementsTab: React.FC = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'youth' | 'recruiters' | 'selected'>('all');
  const [scheduledFor, setScheduledFor] = useState('');
  const [isDraft, setIsDraft] = useState(true);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const handleCreate = async () => {
    if (!currentUser || !title.trim() || !message.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in title and message"
      });
      return;
    }

    try {
      const announcementId = await createAnnouncement(currentUser.uid, {
        title,
        message,
        targetAudience,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
        isDraft,
        mediaUrl: undefined,
        targetUserIds: undefined
      });

      if (!isDraft) {
        await sendAnnouncement(currentUser.uid, announcementId);
        toast({
          title: "Success",
          description: "Announcement created and sent"
        });
      } else {
        toast({
          title: "Success",
          description: "Announcement saved as draft"
        });
      }

      // Reset form
      setTitle('');
      setMessage('');
      setScheduledFor('');
      setIsDraft(true);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create announcement"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-slate-700/50 backdrop-blur-xl shadow-xl border-slate-600/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-cyan-400" />
            Announcement & Notification Manager
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-slate-300">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter announcement title..."
              className="mt-2 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
            />
          </div>
          <div>
            <Label className="text-slate-300">Message</Label>
            <div className="mt-2 bg-slate-700 rounded-lg">
              <ReactQuill
                theme="snow"
                value={message}
                onChange={setMessage}
                className="bg-slate-700"
                modules={{
                  toolbar: [
                    [{ 'header': [1, 2, false] }],
                    ['bold', 'italic', 'underline'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link'],
                    ['clean']
                  ]
                }}
              />
            </div>
          </div>
          <div>
            <Label className="text-slate-300">Target Audience</Label>
            <Select value={targetAudience} onValueChange={(v: any) => setTargetAudience(v)}>
              <SelectTrigger className="mt-2 bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="youth">Youth Only</SelectItem>
                <SelectItem value="recruiters">Recruiters Only</SelectItem>
                <SelectItem value="selected">Selected Users</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-slate-300">Schedule For (Optional)</Label>
            <Input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="mt-2 bg-slate-700 border-slate-600 text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!isDraft}
              onChange={(e) => setIsDraft(!e.target.checked)}
              className="rounded"
            />
            <Label className="text-slate-300">Send immediately (uncheck to save as draft)</Label>
          </div>
          <Button
            onClick={handleCreate}
            disabled={sending || !title.trim() || !message.trim()}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white border-0 shadow-lg"
          >
            <Send className="h-4 w-4 mr-2" />
            {isDraft ? 'Save as Draft' : 'Send Announcement'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

