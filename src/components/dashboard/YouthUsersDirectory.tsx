import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAllProfiles,
  getSkillsByProfile,
  getPortfoliosByProfile,
  getReviewsByProfile,
  addToShortlist,
  getShortlistByRecruiter
} from '@/integrations/firebase/services';
import { UserProfile, Skill, Portfolio, Review, Shortlist } from '@/integrations/firebase/types';
import {
  Search,
  Star,
  MapPin,
  Award,
  Briefcase,
  GraduationCap,
  Users,
  Heart,
  Eye,
  MessageCircle,
  ExternalLink
} from 'lucide-react';

interface TalentProfile extends UserProfile {
  avgRating: number;
  reviewCount: number;
  skills: Skill[];
  portfolios: Portfolio[];
  isShortlisted: boolean;
}

interface YouthUsersDirectoryProps {
  onProfileView?: (profile: TalentProfile) => void;
  onMessage?: (profile: TalentProfile) => void;
}

export const YouthUsersDirectory: React.FC<YouthUsersDirectoryProps> = ({
  onProfileView,
  onMessage
}: YouthUsersDirectoryProps) => {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [profiles, setProfiles] = useState<TalentProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<TalentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<TalentProfile | null>(null);
  const [shortlist, setShortlist] = useState<Shortlist[]>([]);

  useEffect(() => {
    loadTalentData();
  }, [currentUser]);

  useEffect(() => {
    applySearch();
  }, [profiles, searchTerm]);

  const loadTalentData = async () => {
    if (!currentUser?.uid) return;

    try {
      setLoading(true);

      // Load profiles
      const profilesData = await getAllProfiles();
      if (!profilesData) return;

      // Load recruiter's shortlist
      const shortlistData = await getShortlistByRecruiter(currentUser.uid);
      setShortlist(shortlistData);

      // Get shortlisted user IDs
      const shortlistedUserIds = new Set(shortlistData.map(item => item.youthId));

      // Load detailed profile data
      const talentProfiles: TalentProfile[] = await Promise.all(
        profilesData.map(async (profile) => {
          const reviewsData = await getReviewsByProfile(profile.id);
          const skillsData = await getSkillsByProfile(profile.id);
          const portfoliosData = await getPortfoliosByProfile(profile.id);

          const avgRating = reviewsData && reviewsData.length > 0
            ? reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length
            : 0;

          return {
            ...profile,
            avgRating,
            reviewCount: reviewsData?.length || 0,
            skills: skillsData || [],
            portfolios: portfoliosData || [],
            isShortlisted: shortlistedUserIds.has(profile.userId)
          };
        })
      );

      setProfiles(talentProfiles);
      setFilteredProfiles(talentProfiles);
    } catch (error) {
      console.error('Error loading talent data:', error);
      toast({
        title: t('error'),
        description: t('failedToLoadTalentData'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const applySearch = () => {
    if (!searchTerm) {
      setFilteredProfiles(profiles);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = profiles.filter(profile =>
      profile.fullName.toLowerCase().includes(searchLower) ||
      profile.bio?.toLowerCase().includes(searchLower) ||
      profile.preferredCareerField?.toLowerCase().includes(searchLower) ||
      profile.city?.toLowerCase().includes(searchLower) ||
      profile.country?.toLowerCase().includes(searchLower) ||
      profile.skills.some(skill => skill.skillName.toLowerCase().includes(searchLower))
    );

    setFilteredProfiles(filtered);
  };

  const handleShortlist = async (profile: TalentProfile) => {
    if (!currentUser?.uid) return;

    try {
      if (profile.isShortlisted) {
        // Remove from shortlist - find the shortlist item
        const shortlistItem = shortlist.find(item => item.youthId === profile.userId);
        if (shortlistItem) {
          // Note: We would need to implement removeFromShortlist in services
          // For now, we'll just update the local state
          setShortlist(prev => prev.filter(item => item.id !== shortlistItem.id));
          setProfiles(prev => prev.map(p =>
            p.id === profile.id ? { ...p, isShortlisted: false } : p
          ));
          toast({
            title: t('success'),
            description: t('removedFromShortlist')
          });
        }
      } else {
        // Add to shortlist
        await addToShortlist({
          recruiterId: currentUser.uid,
          youthId: profile.userId,
          notes: ''
        });

        // Update local state
        setProfiles(prev => prev.map(p =>
          p.id === profile.id ? { ...p, isShortlisted: true } : p
        ));

        toast({
          title: t('success'),
          description: t('addedToShortlist')
        });
      }
    } catch (error) {
      console.error('Error updating shortlist:', error);
      toast({
        title: t('error'),
        description: t('failedToUpdateShortlist'),
        variant: 'destructive'
      });
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
        }`}
      />
    ));
  };

  const ProfileDetailModal = ({ profile }: { profile: TalentProfile }) => (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-2xl">{profile.fullName}</DialogTitle>
      </DialogHeader>

      <div className="space-y-6 mt-4">
        {/* Profile Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {profile.profileImageUrl && (
              <img
                src={profile.profileImageUrl}
                alt={profile.fullName}
                className="w-16 h-16 rounded-full object-cover"
              />
            )}
            <div>
              <h3 className="text-xl font-semibold">{profile.fullName}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {profile.city}, {profile.country}
                </div>
                <div className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4" />
                  {profile.yearsOfExperience} {t('years')}
                </div>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="flex items-center gap-1 mb-2">
              {renderStars(Math.round(profile.avgRating))}
              <span className="font-medium ml-1">
                {profile.avgRating > 0 ? profile.avgRating.toFixed(1) : t('new')}
              </span>
            </div>
            {profile.isVerified && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Award className="w-3 h-3 mr-1" />
                {t('verified')}
              </Badge>
            )}
          </div>
        </div>

        {/* Bio */}
        <div>
          <h4 className="font-semibold mb-2">{t('about')}</h4>
          <p className="text-muted-foreground">{profile.bio || t('noBioProvided')}</p>
        </div>

        {/* Key Information */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{profile.yearsOfExperience || 0}</div>
            <div className="text-sm text-muted-foreground">{t('yearsExperience')}</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{profile.skills.length}</div>
            <div className="text-sm text-muted-foreground">{t('skills')}</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{profile.portfolios.length}</div>
            <div className="text-sm text-muted-foreground">{t('portfolioItems')}</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{profile.reviewCount}</div>
            <div className="text-sm text-muted-foreground">{t('reviews')}</div>
          </div>
        </div>

        {/* Skills */}
        <div>
          <h4 className="font-semibold mb-3">{t('skills')}</h4>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <Badge
                key={skill.id}
                variant={skill.verificationStatus === 'verified' ? 'default' : 'secondary'}
                className="flex items-center gap-1"
              >
                {skill.skillName}
                {skill.verificationStatus === 'verified' && (
                  <Award className="w-3 h-3 ml-1" />
                )}
              </Badge>
            ))}
          </div>
        </div>

        {/* Portfolio */}
        {profile.portfolios.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">{t('portfolio')}</h4>
            <div className="grid gap-3">
              {profile.portfolios.map((item) => (
                <div key={item.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium">{item.title}</h5>
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      {item.technologies && item.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.technologies.map((tech, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {item.projectUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={item.projectUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-1" />
                          {t('view')}
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education & Experience */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {profile.educationLevel && (
            <div>
              <h4 className="font-semibold mb-2">{t('education')}</h4>
              <div className="flex items-center gap-2 text-muted-foreground">
                <GraduationCap className="w-4 h-4" />
                <span>{profile.educationLevel}</span>
              </div>
            </div>
          )}

          {profile.preferredCareerField && (
            <div>
              <h4 className="font-semibold mb-2">Career Field</h4>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="w-4 h-4" />
                <span>{profile.preferredCareerField}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={() => handleShortlist(profile)} variant={profile.isShortlisted ? "default" : "outline"}>
            <Heart className={`w-4 h-4 mr-2 ${profile.isShortlisted ? 'fill-current' : ''}`} />
            {profile.isShortlisted ? t('shortlisted') : t('shortlist')}
          </Button>
          <Button variant="outline" onClick={() => onMessage?.(profile)}>
            <MessageCircle className="w-4 h-4 mr-2" />
            {t('message')}
          </Button>
        </div>
      </div>
    </DialogContent>
  );

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
      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t('youthDirectory')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder={t('searchByNameSkillsLocation')}
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {filteredProfiles.length} {t('talentProfiles')}
          </h3>
        </div>

        {filteredProfiles.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">{t('noProfilesFound')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredProfiles.map((profile) => (
              <Card key={profile.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Profile Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {profile.profileImageUrl && (
                            <img
                              src={profile.profileImageUrl}
                              alt={profile.fullName}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          )}
                          <div>
                            <h4 className="text-lg font-semibold">{profile.fullName}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {profile.city}, {profile.country}
                              </div>
                              <div className="flex items-center gap-1">
                                <Briefcase className="w-4 h-4" />
                                {profile.yearsOfExperience} {t('years')}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center gap-1 mb-1">
                            {renderStars(Math.round(profile.avgRating))}
                            <span className="text-sm font-medium ml-1">
                              {profile.avgRating > 0 ? profile.avgRating.toFixed(1) : t('new')}
                            </span>
                          </div>
                          {profile.isVerified && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                              <Award className="w-3 h-3 mr-1" />
                              {t('verified')}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="text-muted-foreground mb-3 line-clamp-2">
                        {profile.bio || t('noBioProvided')}
                      </p>

                      {/* Skills Preview */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {profile.skills.slice(0, 4).map((skill) => (
                          <Badge
                            key={skill.id}
                            variant={skill.verificationStatus === 'verified' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {skill.skillName}
                            {skill.verificationStatus === 'verified' && <Award className="w-3 h-3 ml-1" />}
                          </Badge>
                        ))}
                        {profile.skills.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{profile.skills.length - 4} {t('more')}
                          </Badge>
                        )}
                      </div>

                      {/* Portfolio Count */}
                      {profile.portfolios.length > 0 && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          {profile.portfolios.length} {t('portfolioItems')}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" onClick={() => setSelectedProfile(profile)}>
                            <Eye className="w-4 h-4 mr-2" />
                            {t('viewProfile')}
                          </Button>
                        </DialogTrigger>
                        {selectedProfile && <ProfileDetailModal profile={selectedProfile} />}
                      </Dialog>

                      <Button
                        variant={profile.isShortlisted ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleShortlist(profile)}
                      >
                        <Heart className={`w-4 h-4 mr-2 ${profile.isShortlisted ? 'fill-current' : ''}`} />
                        {profile.isShortlisted ? t('shortlisted') : t('shortlist')}
                      </Button>

                      <Button variant="outline" size="sm" onClick={() => onMessage?.(profile)}>
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
