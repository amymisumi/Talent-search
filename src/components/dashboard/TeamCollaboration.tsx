import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getTeamMembers, addTeamMember, updateTeamMember, removeTeamMember, getTeamActivity } from '@/integrations/firebase/services';
import { TeamMember, TeamActivity } from '@/integrations/firebase/types';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Mail,
  Phone,
  Calendar,
  Activity,
  UserPlus,
  UserMinus,
  Settings,
  Shield,
  Crown
} from 'lucide-react';

interface TeamCollaborationProps {
  onClose?: () => void;
}

export const TeamCollaboration: React.FC<TeamCollaborationProps> = ({ onClose }) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamActivity, setTeamActivity] = useState<TeamActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    role: 'recruiter' as 'admin' | 'recruiter' | 'hiring_manager' | 'interviewer',
    permissions: [] as string[]
  });

  useEffect(() => {
    loadTeamData();
  }, [currentUser]);

  const loadTeamData = async () => {
    if (!currentUser?.uid) return;

    try {
      setLoading(true);
      const [membersData, activityData] = await Promise.all([
        getTeamMembers(currentUser.uid),
        getTeamActivity(currentUser.uid)
      ]);

      setTeamMembers(membersData);
      setTeamActivity(activityData);
    } catch (error) {
      console.error('Error loading team data:', error);
      toast({
        title: t('error'),
        description: t('failedToLoadTeamData'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      fullName: '',
      role: 'recruiter',
      permissions: []
    });
  };

  const handleAddMember = async () => {
    if (!currentUser?.uid) return;

    try {
      await addTeamMember(currentUser.uid, formData);
      toast({
        title: t('success'),
        description: t('teamMemberAddedSuccessfully')
      });
      setIsAddDialogOpen(false);
      resetForm();
      loadTeamData();
    } catch (error) {
      console.error('Error adding team member:', error);
      toast({
        title: t('error'),
        description: t('failedToAddTeamMember'),
        variant: 'destructive'
      });
    }
  };

  const handleUpdateMember = async () => {
    if (!selectedMember) return;

    try {
      await updateTeamMember(selectedMember.id, formData);
      toast({
        title: t('success'),
        description: t('teamMemberUpdatedSuccessfully')
      });
      setIsEditDialogOpen(false);
      setSelectedMember(null);
      resetForm();
      loadTeamData();
    } catch (error) {
      console.error('Error updating team member:', error);
      toast({
        title: t('error'),
        description: t('failedToUpdateTeamMember'),
        variant: 'destructive'
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeTeamMember(memberId);
      toast({
        title: t('success'),
        description: t('teamMemberRemovedSuccessfully')
      });
      loadTeamData();
    } catch (error) {
      console.error('Error removing team member:', error);
      toast({
        title: t('error'),
        description: t('failedToRemoveTeamMember'),
        variant: 'destructive'
      });
    }
  };

  const openEditDialog = (member: TeamMember) => {
    setSelectedMember(member);
    setFormData({
      email: member.email,
      fullName: member.fullName,
      role: member.role,
      permissions: member.permissions || []
    });
    setIsEditDialogOpen(true);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-4 h-4" />;
      case 'hiring_manager':
        return <Shield className="w-4 h-4" />;
      case 'interviewer':
        return <Users className="w-4 h-4" />;
      default:
        return <UserPlus className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'hiring_manager':
        return 'bg-blue-100 text-blue-800';
      case 'interviewer':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatActivityTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return t('justNow');
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('teamCollaboration')}</h2>
          <p className="text-muted-foreground">{t('manageYourTeam')}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {t('addTeamMember')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('addTeamMember')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="member-email">{t('email')} *</Label>
                <Input
                  id="member-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t('enterEmail')}
                />
              </div>

              <div>
                <Label htmlFor="member-name">{t('fullName')} *</Label>
                <Input
                  id="member-name"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder={t('enterFullName')}
                />
              </div>

              <div>
                <Label htmlFor="member-role">{t('role')}</Label>
                <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recruiter">{t('recruiter')}</SelectItem>
                    <SelectItem value="hiring_manager">{t('hiringManager')}</SelectItem>
                    <SelectItem value="interviewer">{t('interviewer')}</SelectItem>
                    <SelectItem value="admin">{t('admin')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button onClick={handleAddMember}>
                  {t('addMember')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t('teamMembers')} ({teamMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">{t('noTeamMembers')}</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('addFirstMember')}
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teamMembers.map((member) => (
                <Card key={member.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={member.photoURL} />
                          <AvatarFallback>
                            {member.fullName?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">{member.fullName}</h4>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <Badge className={getRoleColor(member.role)}>
                        {getRoleIcon(member.role)}
                        <span className="ml-1 capitalize">{t(member.role)}</span>
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Calendar className="w-4 h-4" />
                      <span>{t('joined')} {member.joinedAt?.toLocaleDateString()}</span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(member)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        {t('edit')}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('removeTeamMember')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('removeTeamMemberConfirm', { name: member.fullName })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemoveMember(member.id)}>
                              {t('remove')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            {t('recentActivity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamActivity.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">{t('noRecentActivity')}</p>
            ) : (
              teamActivity.slice(0, 10).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="p-2 rounded-full bg-primary/10">
                    {activity.type === 'member_added' && <UserPlus className="w-4 h-4 text-primary" />}
                    {activity.type === 'member_removed' && <UserMinus className="w-4 h-4 text-destructive" />}
                    {activity.type === 'role_changed' && <Settings className="w-4 h-4 text-primary" />}
                    {activity.type === 'application_reviewed' && <FileText className="w-4 h-4 text-primary" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatActivityTime(activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editTeamMember')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-member-email">{t('email')}</Label>
              <Input
                id="edit-member-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-member-name">{t('fullName')}</Label>
              <Input
                id="edit-member-name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-member-role">{t('role')}</Label>
              <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recruiter">{t('recruiter')}</SelectItem>
                  <SelectItem value="hiring_manager">{t('hiringManager')}</SelectItem>
                  <SelectItem value="interviewer">{t('interviewer')}</SelectItem>
                  <SelectItem value="admin">{t('admin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button onClick={handleUpdateMember}>
                {t('updateMember')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
