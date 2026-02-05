import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Save, Bell, Mail, Lock, Globe, User, Loader2 } from 'lucide-react';

type NotificationPreference = {
  email: boolean;
  push: boolean;
  sms: boolean;
  newsletter: boolean;
};

type PrivacySettings = {
  profileVisibility: 'public' | 'connections' | 'private';
  showEmail: boolean;
  showPhone: boolean;
  showLocation: boolean;
};

const SettingsSection = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notifications, setNotifications] = useState<NotificationPreference>({
    email: true,
    push: true,
    sms: false,
    newsletter: true,
  });
  
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    profileVisibility: 'public',
    showEmail: true,
    showPhone: false,
    showLocation: true,
  });

  useEffect(() => {
    // Simulate loading settings
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        // In a real app, you would fetch these from your API
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleNotificationChange = (key: keyof NotificationPreference) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handlePrivacyChange = (key: keyof PrivacySettings, value: any) => {
    setPrivacy(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Handle password change if needed
      if (newPassword && newPassword !== confirmPassword) {
        alert('New passwords do not match');
        return;
      }
      
      // In a real app, you would save the settings to your backend here
      console.log('Saving settings:', { notifications, privacy });
      
      // Show success message
      alert('Settings saved successfully!');
      
      // Reset password fields
      if (newPassword) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-600">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="mt-1 text-sm text-gray-600">
          Manage your account settings and preferences
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Account Settings */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <User className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium">Account Settings</h3>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value="user@example.com"
                  disabled
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="username"
                  value="johndoe"
                  disabled
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Change Password */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Lock className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium">Change Password</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Notification Preferences */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Bell className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium">Notification Preferences</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-gray-500">Receive email notifications</p>
              </div>
              <Switch
                id="email-notifications"
                checked={notifications.email}
                onCheckedChange={() => handleNotificationChange('email')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="push-notifications">Push Notifications</Label>
                <p className="text-sm text-gray-500">Receive push notifications on this device</p>
              </div>
              <Switch
                id="push-notifications"
                checked={notifications.push}
                onCheckedChange={() => handleNotificationChange('push')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sms-notifications">SMS Notifications</Label>
                <p className="text-sm text-gray-500">Receive text message notifications</p>
              </div>
              <Switch
                id="sms-notifications"
                checked={notifications.sms}
                onCheckedChange={() => handleNotificationChange('sms')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="newsletter">Newsletter</Label>
                <p className="text-sm text-gray-500">Subscribe to our newsletter</p>
              </div>
              <Switch
                id="newsletter"
                checked={notifications.newsletter}
                onCheckedChange={() => handleNotificationChange('newsletter')}
              />
            </div>
          </div>
        </Card>

        {/* Privacy Settings */}
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Globe className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium">Privacy Settings</h3>
          </div>
          
          <div className="space-y-6">
            <div>
              <Label>Profile Visibility</Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center">
                  <input
                    id="public"
                    name="profile-visibility"
                    type="radio"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    checked={privacy.profileVisibility === 'public'}
                    onChange={() => handlePrivacyChange('profileVisibility', 'public')}
                  />
                  <label htmlFor="public" className="ml-3 block text-sm font-medium text-gray-700">
                    Public - Anyone can see your profile
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="connections"
                    name="profile-visibility"
                    type="radio"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    checked={privacy.profileVisibility === 'connections'}
                    onChange={() => handlePrivacyChange('profileVisibility', 'connections')}
                  />
                  <label htmlFor="connections" className="ml-3 block text-sm font-medium text-gray-700">
                    Connections - Only your connections can see your profile
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="private"
                    name="profile-visibility"
                    type="radio"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    checked={privacy.profileVisibility === 'private'}
                    onChange={() => handlePrivacyChange('profileVisibility', 'private')}
                  />
                  <label htmlFor="private" className="ml-3 block text-sm font-medium text-gray-700">
                    Private - Only you can see your profile
                  </label>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Email Address</Label>
                  <p className="text-sm text-gray-500">Make your email visible on your profile</p>
                </div>
                <Switch
                  checked={privacy.showEmail}
                  onCheckedChange={(checked) => handlePrivacyChange('showEmail', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Phone Number</Label>
                  <p className="text-sm text-gray-500">Make your phone number visible to connections</p>
                </div>
                <Switch
                  checked={privacy.showPhone}
                  onCheckedChange={(checked) => handlePrivacyChange('showPhone', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Location</Label>
                  <p className="text-sm text-gray-500">Show your general location on your profile</p>
                </div>
                <Switch
                  checked={privacy.showLocation}
                  onCheckedChange={(checked) => handlePrivacyChange('showLocation', checked)}
                />
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SettingsSection;
