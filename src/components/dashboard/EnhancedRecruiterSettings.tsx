import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  updateProfile,
  updateEmail,
  updatePassword,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { doc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { toast } from 'sonner';
import {
  Settings,
  User,
  Mail,
  Lock,
  Globe,
  Moon,
  Sun,
  Bell,
  Eye,
  EyeOff,
  Trash2,
  Save,
  Loader2,
} from 'lucide-react';

export const EnhancedRecruiterSettings: React.FC = () => {
  const { currentUser, userData, updateUserProfile, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [notifications, setNotifications] = useState(true);
  const [profileVisible, setProfileVisible] = useState(true);
  const [autoAcceptConnections, setAutoAcceptConnections] = useState(false);

  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');

  // Use refs to track previous values and prevent unnecessary updates
  const prevUserDataRef = useRef<string>('');
  const prevCurrentUserRef = useRef<string>('');

  useEffect(() => {
    // Create stable keys to detect actual changes
    const userDataKey = userData 
      ? `${userData.notificationsEnabled}-${userData.profileVisible}-${userData.autoAcceptConnections}-${userData.displayName || ''}-${userData.companyName || ''}-${userData.firstName || ''}`
      : '';
    const currentUserKey = currentUser 
      ? `${currentUser.uid}-${currentUser.displayName || ''}-${currentUser.email || ''}`
      : '';
    
    // Only update when values actually change to prevent flickering
    const userDataChanged = prevUserDataRef.current !== userDataKey;
    const currentUserChanged = prevCurrentUserRef.current !== currentUserKey;
    
    if (currentUserChanged && currentUser) {
      const newDisplayName =
        currentUser.displayName ||
        userData?.displayName ||
        userData?.companyName ||
        userData?.firstName ||
        '';
      const newEmail = currentUser.email || '';
      
      // Only update if different to prevent unnecessary re-renders
      setDisplayName(prev => prev !== newDisplayName ? newDisplayName : prev);
      setEmail(prev => prev !== newEmail ? newEmail : prev);
      
      prevCurrentUserRef.current = currentUserKey;
    }
    
    if (userDataChanged && userData) {
      const newNotifications = userData.notificationsEnabled !== false;
      const newProfileVisible = userData.profileVisible !== false;
      const newAutoAcceptConnections = userData.autoAcceptConnections === true;
      
      // Only update if different to prevent unnecessary re-renders
      setNotifications(prev => prev !== newNotifications ? newNotifications : prev);
      setProfileVisible(prev => prev !== newProfileVisible ? newProfileVisible : prev);
      setAutoAcceptConnections(prev => prev !== newAutoAcceptConnections ? newAutoAcceptConnections : prev);
      
      prevUserDataRef.current = userDataKey;
    }
  }, [currentUser, userData]);

  const handleUpdateName = async () => {
    if (!currentUser || !displayName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      await updateProfile(currentUser, { displayName: displayName.trim() });
      await updateUserProfile({ displayName: displayName.trim(), firstName: displayName.trim() });
      toast.success('Name updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update name');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!currentUser || !email.trim()) {
      toast.error('Email cannot be empty');
      return;
    }

    if (email === currentUser.email) {
      toast.info('Email is already set to this value');
      return;
    }

    setLoading(true);
    try {
      await updateEmail(currentUser, email.trim());
      await updateUserProfile({ email: email.trim() });
      toast.success('Email updated successfully. Please check your new email for verification.');
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        toast.error('Please re-authenticate to change your email');
      } else {
        toast.error(error.message || 'Failed to update email');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentUser || !currentPassword || !newPassword) {
      toast.error('All password fields are required');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email!, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        toast.error('Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        toast.error('New password is too weak');
      } else {
        toast.error(error.message || 'Failed to update password');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreferences = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      await updateUserProfile({
        notificationsEnabled: notifications,
        profileVisible,
        autoAcceptConnections,
        preferredLanguage: language,
      });
      toast.success('Preferences updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;

    if (deleteConfirm !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    if (!deletePassword) {
      toast.error('Please enter your password');
      return;
    }

    setDeleteLoading(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email!, deletePassword);
      await reauthenticateWithCredential(currentUser, credential);

      const batch = writeBatch(db);

      const userRef = doc(db, 'users', currentUser.uid);
      batch.delete(userRef);

      const profileRef = doc(db, 'profiles', currentUser.uid);
      batch.delete(profileRef);

      const roleRef = doc(db, 'userRoles', currentUser.uid);
      batch.delete(roleRef);

      const analyticsRef = doc(db, 'user_analytics', currentUser.uid);
      batch.delete(analyticsRef);

      const connectionsRef = collection(db, 'connections', currentUser.uid, 'connections');
      const connectionsSnapshot = await getDocs(connectionsRef);
      connectionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

      const incomingRequestsRef = collection(db, 'connection_requests', currentUser.uid, 'incoming');
      const incomingSnapshot = await getDocs(incomingRequestsRef);
      incomingSnapshot.docs.forEach(doc => batch.delete(doc.ref));

      const outgoingRequestsRef = collection(db, 'connection_requests', currentUser.uid, 'outgoing');
      const outgoingSnapshot = await getDocs(outgoingRequestsRef);
      outgoingSnapshot.docs.forEach(doc => batch.delete(doc.ref));

      const allConnectionsRef = collection(db, 'connections');
      const allConnectionsSnapshot = await getDocs(allConnectionsRef);

      for (const userConnectionsDoc of allConnectionsSnapshot.docs) {
        const userConnectionsRef = collection(db, 'connections', userConnectionsDoc.id, 'connections');
        const userConnectionsSnapshot = await getDocs(
          query(userConnectionsRef, where('connectedUserId', '==', currentUser.uid))
        );
        userConnectionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      }

      await batch.commit();
      await deleteUser(currentUser);

      toast.success('Account deleted successfully');
      await signOut();
      window.location.href = '/';
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        toast.error('Password is incorrect');
      } else {
        toast.error(error.message || 'Failed to delete account');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Settings
            </CardTitle>
            <CardDescription>Update your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <div className="flex gap-2">
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name or company"
                />
                <Button onClick={handleUpdateName} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                />
                <Button onClick={handleUpdateEmail} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <Label>Change Password</Label>
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button onClick={handleUpdatePassword} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                  Update Password
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Preferences
            </CardTitle>
            <CardDescription>Customize your experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="language">Language</Label>
                <p className="text-sm text-muted-foreground">Choose your preferred language</p>
              </div>
              <Select value={language} onValueChange={(value: 'en' | 'sw') => setLanguage(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                  <SelectItem value="sw">🇰🇪 Kiswahili</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="theme">Theme</Label>
                <p className="text-sm text-muted-foreground">Choose light or dark mode</p>
              </div>
              <div className="flex items-center gap-2">
                {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications">Notifications</Label>
                <p className="text-sm text-muted-foreground">Enable or disable notifications</p>
              </div>
              <Switch id="notifications" checked={notifications} onCheckedChange={setNotifications} />
            </div>

            <Button onClick={handleUpdatePreferences} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Preferences
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Privacy Settings
            </CardTitle>
            <CardDescription>Control your profile visibility</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="profileVisible">Profile Visibility</Label>
                <p className="text-sm text-muted-foreground">Show or hide your profile</p>
              </div>
              <Switch id="profileVisible" checked={profileVisible} onCheckedChange={setProfileVisible} />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoAccept">Auto-Accept Connections</Label>
                <p className="text-sm text-muted-foreground">Automatically accept connection requests</p>
              </div>
              <Switch id="autoAccept" checked={autoAcceptConnections} onCheckedChange={setAutoAcceptConnections} />
            </div>

            <Button onClick={handleUpdatePreferences} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Privacy Settings
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Account
            </CardTitle>
            <CardDescription>Permanently delete your account and all associated data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deletePassword">Enter your password</Label>
              <Input
                id="deletePassword"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Your password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deleteConfirm">Type DELETE to confirm</Label>
              <Input
                id="deleteConfirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
              />
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleteLoading || !deletePassword || deleteConfirm !== 'DELETE'}>
                  {deleteLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account and remove all your data
                    from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, delete my account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

