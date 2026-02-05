import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useAnalytics } from '@/hooks/useAnalytics';
import { trackEvent } from '@/services/analyticsService';
import {
  getProfile,
  getSkillsByProfile,
  getPortfoliosByProfile,
  getReviewsByProfile,
  getCertificatesByUser,
  addToShortlist,
  getShortlistByRecruiter,
  getConnectionsByUser
} from '@/integrations/firebase/services';
import { UserProfile, Skill, Portfolio, Review, Certificate, Connection } from '@/integrations/firebase/types';
import {
  User,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  Star,
  Mail,
  Phone,
  Globe,
  Download,
  Bookmark,
  MessageSquare,
  Calendar,
  Share2,
  Tag,
  FileText,
  ExternalLink,
  Github,
  Linkedin,
  Twitter,
  Eye,
  Video
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const CandidateProfileView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { track } = useAnalytics();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isShortlisted, setIsShortlisted] = useState(false);

  // Helper function to format camelCase to readable text
  const formatFieldName = (fieldName: string): string => {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // Check if recruiter is connected to a youth user
  const isConnectedToYouth = (youthUserId: string): boolean => {
    if (!currentUser?.uid || !youthUserId) return false;
    
    return connections.some(connection => 
      connection.status === 'accepted' &&
      (
        (connection.userId === currentUser.uid && connection.connectedUserId === youthUserId) ||
        (connection.connectedUserId === currentUser.uid && connection.userId === youthUserId)
      )
    );
  };

  useEffect(() => {
    const loadCandidateData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const [profileData, skillsData, portfoliosData, reviewsData, certificatesData] = await Promise.all([
          getProfile(id),
          getSkillsByProfile(id),
          getPortfoliosByProfile(id),
          getReviewsByProfile(id),
          getCertificatesByUser(id)
        ]);

        setProfile(profileData);
        setSkills(skillsData);
        setPortfolios(portfoliosData);
        setReviews(reviewsData);
        setCertificates(certificatesData);

        // Track profile view - only if viewing someone else's profile and user is a recruiter
        if (currentUser?.uid && id && id !== currentUser.uid && profileData) {
          // Check if current user is a recruiter
          const isRecruiter = userData?.role === 'recruiter';
          
          if (isRecruiter) {
            try {
              // Track general profile view
              await trackEvent(id, 'profile_viewed', {
                viewerId: currentUser.uid,
                viewerType: 'recruiter'
              });
              
              // Track recruiter-specific profile view
              await trackEvent(id, 'recruiter_viewed_profile', {
                recruiterId: currentUser.uid
              });
            } catch (error) {
              console.error('Error tracking profile view:', error);
              // Don't fail the page load if tracking fails
            }
          }
        }

        // Check if shortlisted
        if (currentUser?.uid) {
          const [shortlist, userConnections] = await Promise.all([
            getShortlistByRecruiter(currentUser.uid),
            getConnectionsByUser(currentUser.uid)
          ]);
          const shortlisted = shortlist.some(item => item.youthId === id);
          setIsShortlisted(shortlisted);
          setConnections(userConnections);
        }
      } catch (error) {
        console.error('Error loading candidate data:', error);
        toast({
          title: t('error'),
          description: t('failedToLoadProfile'),
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadCandidateData();
  }, [id, currentUser, t, toast]);

  const handleShortlist = async () => {
    if (!currentUser?.uid || !id) return;

    try {
      if (isShortlisted) {
        // Remove from shortlist - would need removeFromShortlist function
        toast({
          title: t('success') !== 'success' ? t('success') : 'Success',
          description: t('removedFromShortlist') !== 'removedFromShortlist' ? t('removedFromShortlist') : formatFieldName('removedFromShortlist')
        });
      } else {
        await addToShortlist({
          recruiterId: currentUser.uid,
          youthId: id
        });
        toast({
          title: t('success') !== 'success' ? t('success') : 'Success',
          description: t('addedToShortlist') !== 'addedToShortlist' ? t('addedToShortlist') : formatFieldName('addedToShortlist')
        });
      }
      setIsShortlisted(!isShortlisted);
    } catch (error) {
      console.error('Error updating shortlist:', error);
      toast({
        title: t('error'),
        description: t('failedToUpdateShortlist'),
        variant: 'destructive'
      });
    }
  };


  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">{t('profileNotFound')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          ← {t('back')}
        </Button>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              if (!id) return;
              if (!isConnectedToYouth(id)) {
                toast({
                  title: 'Connection Required',
                  description: `You must be connected to ${profile.fullName} before you can message them. Please connect with them first.`,
                  variant: 'destructive'
                });
                return;
              }
              navigate(`/recruiter/messages?userId=${id}`);
            }}
            disabled={!id || !isConnectedToYouth(id)}
            title={!id || !isConnectedToYouth(id) ? 'You must be connected to message this candidate' : 'Send message'}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            {t('message')}
          </Button>
          <Button variant="outline" onClick={() => navigate(`/recruiter/interviews/new?candidateId=${id}`)}>
            <Calendar className="h-4 w-4 mr-2" />
            {t('scheduleInterview') !== 'scheduleInterview' ? t('scheduleInterview') : formatFieldName('scheduleInterview')}
          </Button>
          <Button onClick={handleShortlist}>
            <Bookmark className={`h-4 w-4 mr-2 ${isShortlisted ? 'fill-current' : ''}`} />
            {isShortlisted 
              ? (t('removeFromShortlist') !== 'removeFromShortlist' ? t('removeFromShortlist') : formatFieldName('removeFromShortlist'))
              : (t('addToShortlist') !== 'addToShortlist' ? t('addToShortlist') : formatFieldName('addToShortlist'))
            }
          </Button>
        </div>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar className="h-32 w-32">
              <AvatarImage src={profile.profileImageUrl} />
              <AvatarFallback className="text-2xl">
                {profile.fullName?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold">{profile.fullName}</h1>
                  {profile.preferredCareerField && (
                    <p className="text-lg text-muted-foreground mt-1">{profile.preferredCareerField}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    {profile.city && profile.country && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {profile.city}, {profile.country}
                      </div>
                    )}
                    {profile.yearsOfExperience !== undefined && (
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {profile.yearsOfExperience} {t('yearsExperience')}
                      </div>
                    )}
                    {profile.educationLevel && (
                      <div className="flex items-center gap-1">
                        <GraduationCap className="h-4 w-4" />
                        {profile.educationLevel}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < Math.round(avgRating)
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {avgRating.toFixed(1)} ({reviews.length} {t('reviews')})
                  </p>
                </div>
              </div>
              {profile.bio && (
                <p className="mt-4 text-muted-foreground">{profile.bio}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Details */}
      <Card>
        <CardHeader>
          <CardTitle>{t('profileDetails') !== 'profileDetails' ? t('profileDetails') : formatFieldName('profileDetails')}</CardTitle>
        </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">{t('overview') !== 'overview' ? t('overview') : 'Overview'}</TabsTrigger>
                <TabsTrigger value="skills">{t('skills') !== 'skills' ? t('skills') : 'Skills'}</TabsTrigger>
                <TabsTrigger value="experience">{t('experience') !== 'experience' ? t('experience') : 'Experience'}</TabsTrigger>
                <TabsTrigger value="education">{t('education') !== 'education' ? t('education') : 'Education'}</TabsTrigger>
                <TabsTrigger value="portfolio">{t('portfolio') !== 'portfolio' ? t('portfolio') : 'Portfolio'}</TabsTrigger>
                <TabsTrigger value="reviews">{t('reviews') !== 'reviews' ? t('reviews') : 'Reviews'}</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <div>
                  <h3 className="font-semibold mb-2">{t('contactInformation') !== 'contactInformation' ? t('contactInformation') : formatFieldName('contactInformation')}</h3>
                  <div className="space-y-2 text-sm">
                    {profile.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {profile.email}
                      </div>
                    )}
                    {profile.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {profile.phone}
                      </div>
                    )}
                  </div>
                </div>
                {profile.cvUrl && (
                  <div>
                    <Button variant="outline" asChild>
                      <a href={profile.cvUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        {t('downloadCV') !== 'downloadCV' ? t('downloadCV') : formatFieldName('downloadCV')}
                      </a>
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="skills" className="mt-4">
                <div className="space-y-4">
                  {skills.length === 0 ? (
                    <p className="text-muted-foreground">{t('noSkills') !== 'noSkills' ? t('noSkills') : formatFieldName('noSkills')}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <Badge
                          key={skill.id}
                          variant={skill.verificationStatus === 'verified' ? 'default' : 'secondary'}
                          className="text-sm"
                        >
                          {skill.skillName}
                          {skill.proficiencyLevel && ` (${skill.proficiencyLevel})`}
                          {skill.verificationStatus === 'verified' && (
                            <Award className="h-3 w-3 ml-1" />
                          )}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="portfolio" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {portfolios.length === 0 ? (
                    <p className="text-muted-foreground col-span-full text-center py-8">{t('noPortfolio') !== 'noPortfolio' ? t('noPortfolio') : formatFieldName('noPortfolio')}</p>
                  ) : (
                    portfolios.map((portfolio) => {
                      const fileUrl = (portfolio as any).fileUrl || portfolio.imageUrl || portfolio.projectUrl;
                      const fileType = (portfolio as any).fileType || (portfolio.imageUrl ? 'image' : 'other');
                      
                      return (
                        <Card key={portfolio.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                          <div className="relative h-48 bg-gray-100">
                            {fileType === 'image' && fileUrl ? (
                              <img
                                src={fileUrl}
                                alt={portfolio.title}
                                className="w-full h-full object-cover"
                              />
                            ) : fileType === 'video' && fileUrl ? (
                              <div className="relative w-full h-full bg-gray-900 flex items-center justify-center overflow-hidden">
                                <video
                                  src={fileUrl}
                                  className="w-full h-full object-contain"
                                  controls
                                  preload="metadata"
                                  playsInline
                                />
                                <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                                  <Video className="w-3 h-3" />
                                  Video
                                </div>
                              </div>
                            ) : fileUrl ? (
                              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                                <FileText className="w-12 h-12 text-gray-400" />
                                <p className="mt-2 text-sm font-medium text-gray-700">
                                  {(portfolio as any).fileName || portfolio.title}
                                </p>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <FileText className="w-12 h-12 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <CardContent className="p-4">
                            <h4 className="font-semibold">{portfolio.title}</h4>
                            {portfolio.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {portfolio.description}
                              </p>
                            )}
                            {fileUrl && (
                              <div className="mt-3 flex gap-2">
                                <Button variant="outline" size="sm" asChild>
                                  <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    {t('viewProject') || 'View'}
                                  </a>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                  <a href={fileUrl} download>
                                    <Download className="h-3 w-3 mr-1" />
                                    Download
                                  </a>
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="mt-4">
                <div className="space-y-4">
                  {reviews.length === 0 ? (
                    <p className="text-muted-foreground">{t('noReviews')}</p>
                  ) : (
                    reviews.map((review) => (
                      <Card key={review.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{review.recruiterName}</p>
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-4 w-4 ${
                                        i < review.rating
                                          ? 'text-yellow-500 fill-yellow-500'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              {review.reviewText && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  {review.reviewText}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">
                                {formatDistanceToNow(review.createdAt, { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
    </div>
  );
};

