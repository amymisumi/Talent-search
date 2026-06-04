import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile, calculateProfileCompletion } from '@/integrations/firebase/services';
import { UserProfile } from '@/integrations/firebase/types';
import {
  Building2,
  MapPin,
  Users,
  TrendingUp,
  Upload,
  Edit,
  Bell,
  LogOut,
  Globe
} from 'lucide-react';
import { LanguageToggle } from '@/components/LanguageToggle';
import { signOut } from 'firebase/auth';
import { auth } from '@/integrations/firebase/client';
import { useNavigate } from 'react-router-dom';

interface RecruiterDashboardHeaderProps {
  onEditProfile?: () => void;
  onUploadLogo?: () => void;
}

export const RecruiterDashboardHeader: React.FC<RecruiterDashboardHeaderProps> = ({
  onEditProfile,
  onUploadLogo
}) => {
  const { t } = useLanguage();
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const loadProfile = async () => {
      if (currentUser?.uid) {
        try {
          const userProfile = await getProfile(currentUser.uid);
          setProfile(userProfile);
        } catch (error) {
          console.error('Error loading profile:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadProfile();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const profileCompletion = profile ? calculateProfileCompletion(profile) : 0;

  if (loading) {
    return (
      <Card className="mb-6 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <div className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="w-16 h-16 border-2 border-white/20">
                {profile?.companyLogoUrl ? (
                  <AvatarImage
                    src={profile.companyLogoUrl}
                    alt={profile.companyName || 'Company'}
                  />
                ) : (
                  <AvatarFallback className="bg-white/20 text-white">
                    <Building2 className="w-8 h-8" />
                  </AvatarFallback>
                )}
              </Avatar>

              <div>
                <h1 className="text-2xl font-bold">
                  {profile?.companyName || userData?.companyName || 'Welcome'}
                </h1>
                <p className="text-blue-100">
                  {profile?.contactName || currentUser?.displayName || 'Recruiter'}
                </p>
                {profile?.location && (
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm text-blue-100">{profile.location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Completion */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t('profileCompletion')}</span>
                <span className="text-sm">{profileCompletion}%</span>
              </div>
              <Progress value={profileCompletion} className="h-2" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 relative"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {unreadNotifications}
                  </Badge>
                )}
              </Button>

              {/* Language Toggle */}
              <LanguageToggle />

              {/* Logout */}
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>

            <Button
              onClick={onEditProfile}
              className="bg-white text-blue-600 hover:bg-gray-100"
              size="sm"
            >
              <Edit className="w-4 h-4 mr-2" />
              {t('editProfile')}
            </Button>

            {!profile?.companyLogoUrl && (
              <Button
                onClick={onUploadLogo}
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-blue-600"
                size="sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                {t('uploadLogo')}
              </Button>
            )}

            {/* Verification Badge */}
            {profile?.isVerified && (
              <Badge variant="secondary" className="bg-green-500 text-white w-fit">
                ✓ {t('verified')}
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/20">
          <div className="text-center">
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm text-blue-100">{t('activeJobs')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm text-blue-100">{t('totalApplications')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm text-blue-100">{t('shortlisted')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm text-blue-100">{t('hired')}</div>
          </div>
        </div>
      </div>
    </Card>
  );
};
