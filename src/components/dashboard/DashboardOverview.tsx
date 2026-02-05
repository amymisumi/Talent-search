import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserProfile } from '@/integrations/firebase/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  User, 
  Briefcase, 
  Search, 
  FileText, 
  Plus,
  Settings,
  Eye,
  MessageSquare
} from 'lucide-react';

interface DashboardOverviewProps {
  profileCompletion: number;
  profile: UserProfile | null;
  userRole?: 'youth' | 'recruiter';
  connectionsCount?: number;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ 
  profileCompletion, 
  profile,
  userRole = 'youth',
  connectionsCount = 0
}) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const isRecruiter = userRole === 'recruiter';
  
  // Debug logging
  console.log('[DashboardOverview] connectionsCount:', connectionsCount);
  console.log('[DashboardOverview] isRecruiter:', isRecruiter);
  console.log('[DashboardOverview] profile:', profile ? 'exists' : 'null');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{t('dashboard')}</h1>
        <Badge variant={profileCompletion >= 80 ? 'default' : 'secondary'}>
          {t('profile')} {profileCompletion}% {t('complete')}
        </Badge>
      </div>

      {/* Profile Summary */}
      {profile && (
        <Card className="p-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage 
                src={isRecruiter ? profile.companyLogoUrl : profile.profileImageUrl} 
                alt={isRecruiter ? profile.companyName || profile.fullName : profile.fullName} 
              />
              <AvatarFallback className="text-lg">
                {(isRecruiter ? profile.companyName : profile.fullName)?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">
                {isRecruiter ? profile.companyName || profile.fullName : profile.fullName || 'No name provided'}
              </h2>
              <p className="text-gray-600">
                {isRecruiter 
                  ? profile.companyDescription || profile.bio || 'No description available'
                  : profile.bio || 'No bio available'
                }
              </p>
              <div className="flex flex-wrap gap-4 mt-2">
                {profile.email && (
                  <div className="text-sm">
                    <span className="font-medium">{t('email')}:</span> {profile.email}
                  </div>
                )}
                {!isRecruiter && profile.age && (
                  <div className="text-sm">
                    <span className="font-medium">{t('age')}:</span> {profile.age}
                  </div>
                )}
                {profile.city && profile.country && (
                  <div className="text-sm">
                    <span className="font-medium">{t('location')}:</span> {profile.city}, {profile.country}
                  </div>
                )}
                {isRecruiter && profile.industryType && (
                  <div className="text-sm">
                    <span className="font-medium">{t('industry')}:</span> {profile.industryType}
                  </div>
                )}
                {!isRecruiter && profile.talentArea && (
                  <div className="text-sm">
                    <span className="font-medium">Talent Area:</span> {profile.talentArea}
                  </div>
                )}
                {!isRecruiter && profile.preferredCareerField && (
                  <div className="text-sm">
                    <span className="font-medium">Career Field:</span> {profile.preferredCareerField}
                  </div>
                )}
                {!isRecruiter && profile.yearsOfExperience && (
                  <div className="text-sm">
                    <span className="font-medium">{t('experience')}:</span> {profile.yearsOfExperience} {t('years')}
                  </div>
                )}
                {!isRecruiter && (
                  <div className="text-sm flex items-center gap-1">
                    <span className="font-medium">Connections:</span> 
                    <span className="font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">{connectionsCount ?? 0}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Profile Progress</h3>
          <Progress value={profileCompletion} className="mb-2" />
          <p className="text-sm text-gray-600">
            {profileCompletion}% of Your Profile Is Complete
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Recent Activity</h3>
          <p className="text-sm text-gray-600">No Recent Activity</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">
            Opportunities
          </h3>
          <p className="text-sm text-gray-600">
            {isRecruiter ? t('manageYourRecruiting') : 'No Opportunities Yet'}
          </p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          {isRecruiter ? (
            <>
              <Button variant="outline" onClick={() => navigate('/recruiter/settings')}>
                <User className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
              <Button variant="outline" onClick={() => navigate('/recruiter/jobs')}>
                <Plus className="h-4 w-4 mr-2" />
                Post Job
              </Button>
              <Button variant="outline" onClick={() => navigate('/recruiter/find-talent')}>
                <Search className="h-4 w-4 mr-2" />
                Find Talent
              </Button>
              <Button variant="outline" onClick={() => navigate('/recruiter/applications')}>
                <FileText className="h-4 w-4 mr-2" />
                Review Applications
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => navigate('/youth/profile/edit')}>
                <User className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
              <Button variant="outline" onClick={() => navigate('/youth/portfolio')}>
                <Eye className="h-4 w-4 mr-2" />
                View Portfolio
              </Button>
              <Button variant="outline" onClick={() => navigate('/youth/jobs')}>
                <Search className="h-4 w-4 mr-2" />
                Search Jobs
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};
