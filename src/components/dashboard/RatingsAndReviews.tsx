import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  getAllYouthUsers,
  getProfile,
  getPortfoliosByProfile,
  createReview,
  updateReview,
  getReviewsByRecruiter,
  getReviewDrafts,
  subscribeToReviewsByRecruiter,
  getConnectionsByUser
} from '@/integrations/firebase/services';
import { UserProfile, Review, Portfolio, Connection } from '@/integrations/firebase/types';
import {
  Star,
  User,
  Briefcase,
  Calendar,
  TrendingUp,
  Award,
  Search,
  Plus,
  CheckCircle,
  Save,
  Edit,
  FileText,
  Link as LinkIcon,
  X,
  BarChart3,
  MessageSquare
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface RatingFormData {
  professionalism: number;
  communication: number;
  skillsCompetency: number;
  projectQuality: number;
  overallRating: number;
  feedback: string;
  projectId?: string;
}

export const RatingsAndReviews: React.FC = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [youthUsers, setYouthUsers] = useState<UserProfile[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [drafts, setDrafts] = useState<Review[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYouth, setSelectedYouth] = useState<UserProfile | null>(null);
  const [selectedProject, setSelectedProject] = useState<Portfolio | null>(null);
  const [youthProjects, setYouthProjects] = useState<Portfolio[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('submit');

  const [ratingForm, setRatingForm] = useState<RatingFormData>({
    professionalism: 5,
    communication: 5,
    skillsCompetency: 5,
    projectQuality: 5,
    overallRating: 5,
    feedback: '',
    projectId: undefined
  });

  useEffect(() => {
    if (!currentUser?.uid) return;

    loadYouthUsers();
    loadReviews();
    loadConnections();
    
    // Set up real-time listener for reviews
    const unsubscribe = subscribeToReviewsByRecruiter(currentUser.uid, (updatedReviews) => {
      setReviews(updatedReviews.filter(r => r.status !== 'draft'));
      setDrafts(updatedReviews.filter(r => r.status === 'draft'));
    });

    return () => unsubscribe();
  }, [currentUser]);

  const loadYouthUsers = async () => {
    try {
      const users = await getAllYouthUsers();
      setYouthUsers(users);
    } catch (error) {
      console.error('Error loading youth users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load youth users. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const loadConnections = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const userConnections = await getConnectionsByUser(currentUser.uid);
      setConnections(userConnections);
    } catch (error) {
      console.error('Error loading connections:', error);
    }
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

  const loadReviews = async () => {
    if (!currentUser?.uid) return;

    try {
      setLoading(true);
      const [allReviews, reviewDrafts] = await Promise.all([
        getReviewsByRecruiter(currentUser.uid),
        getReviewDrafts(currentUser.uid)
      ]);
      setReviews(allReviews.filter(r => r.status !== 'draft'));
      setDrafts(reviewDrafts);
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reviews. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadYouthProjects = async (youthId: string) => {
    try {
      const projects = await getPortfoliosByProfile(youthId);
      setYouthProjects(projects);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleSelectYouth = async (youthId: string) => {
    const youth = youthUsers.find(u => u.id === youthId || u.userId === youthId);
    if (youth) {
      const youthUserId = youth.userId || youth.id;
      
      // Check if connected before allowing selection
      if (!isConnectedToYouth(youthUserId)) {
        toast({
          title: 'Connection Required',
          description: `You must be connected to ${youth.fullName} before you can submit a review. Please connect with them first.`,
          variant: 'destructive'
        });
        return;
      }
      
      setSelectedYouth(youth);
      await loadYouthProjects(youth.id || youth.userId);
      setShowReviewForm(true);
    }
  };

  const calculateOverallRating = (): number => {
    const { professionalism, communication, skillsCompetency, projectQuality } = ratingForm;
    const avg = (professionalism + communication + skillsCompetency + projectQuality) / 4;
    return Math.round(avg * 10) / 10; // Round to 1 decimal place
  };

  useEffect(() => {
    const overall = calculateOverallRating();
    setRatingForm(prev => ({ ...prev, overallRating: overall }));
  }, [ratingForm.professionalism, ratingForm.communication, ratingForm.skillsCompetency, ratingForm.projectQuality]);

  const validateForm = (): boolean => {
    if (!selectedYouth) {
      toast({
        title: 'Error',
        description: 'Please select a youth to review.',
        variant: 'destructive'
      });
      return false;
    }

    if (ratingForm.feedback.length > 2000) {
      toast({
        title: 'Error',
        description: 'Feedback must be 2000 characters or less.',
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  const handleSaveDraft = async () => {
    if (!validateForm() || !currentUser?.uid || !selectedYouth) return;

    try {
      // Ensure we use the user's UID, not profile ID
      const youthUserId = selectedYouth.userId || selectedYouth.id;
      
      if (!youthUserId) {
        toast({
          title: 'Error',
          description: 'Unable to identify youth user. Please try again.',
          variant: 'destructive'
        });
        return;
      }

      const reviewData: Omit<Review, 'id' | 'createdAt' | 'updatedAt'> = {
        youthId: youthUserId, // Use userId (Firebase Auth UID) to match youth dashboard queries
        recruiterId: currentUser.uid,
        recruiterName: currentUser.displayName || 'Recruiter',
        rating: ratingForm.overallRating,
        professionalism: ratingForm.professionalism,
        communication: ratingForm.communication,
        skillsCompetency: ratingForm.skillsCompetency,
        projectQuality: ratingForm.projectQuality,
        reviewText: ratingForm.feedback,
        projectId: ratingForm.projectId,
        status: 'draft'
      };

      if (editingReview) {
        await updateReview(editingReview.id, reviewData);
        toast({
          title: 'Success',
          description: 'Draft saved successfully'
        });
      } else {
        await createReview(reviewData);
        toast({
          title: 'Success',
          description: 'Draft saved successfully'
        });
      }

      resetForm();
      setShowReviewForm(false);
      loadReviews();
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: 'Error',
        description: 'Failed to save draft. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleSubmitReview = async () => {
    if (!validateForm() || !currentUser?.uid || !selectedYouth) return;

    try {
      // Ensure we use the user's UID, not profile ID
      // userId is the Firebase Auth UID, which is what the youth dashboard queries by
      // The profile document ID might be the same as userId, but we should prioritize userId field
      let youthUserId = selectedYouth.userId;
      
      // If userId is not set, try to get it from the profile
      // The profile document ID in 'profiles' collection should match the Firebase Auth UID
      if (!youthUserId) {
        youthUserId = selectedYouth.id; // Fallback to profile document ID (should be the same as userId)
      }
      
      if (!youthUserId) {
        toast({
          title: 'Error',
          description: 'Unable to identify youth user. Please try again.',
          variant: 'destructive'
        });
        return;
      }

      // Check if recruiter is connected to this youth user
      if (!isConnectedToYouth(youthUserId)) {
        toast({
          title: 'Connection Required',
          description: `You must be connected to ${selectedYouth.fullName} before you can submit a review. Please connect with them first.`,
          variant: 'destructive'
        });
        return;
      }

      console.log('[Review] Creating review with youthId:', youthUserId, 'for youth:', selectedYouth.fullName);
      console.log('[Review] Selected youth object:', { id: selectedYouth.id, userId: selectedYouth.userId });

      const reviewData: Omit<Review, 'id' | 'createdAt' | 'updatedAt'> = {
        youthId: youthUserId, // Use userId (Firebase Auth UID) to match youth dashboard queries
        recruiterId: currentUser.uid,
        recruiterName: currentUser.displayName || 'Recruiter',
        rating: ratingForm.overallRating,
        professionalism: ratingForm.professionalism,
        communication: ratingForm.communication,
        skillsCompetency: ratingForm.skillsCompetency,
        projectQuality: ratingForm.projectQuality,
        reviewText: ratingForm.feedback,
        // Also set feedback field for youth dashboard compatibility
        feedback: ratingForm.feedback,
        projectId: ratingForm.projectId,
        status: 'submitted'
      };

      if (editingReview) {
        await updateReview(editingReview.id, { ...reviewData, status: 'edited' });
        toast({
          title: 'Success',
          description: `Your review has been successfully submitted for ${selectedYouth.fullName}.`
        });
      } else {
        await createReview(reviewData);
        toast({
          title: 'Success',
          description: `Your review has been successfully submitted for ${selectedYouth.fullName}.`
        });
      }

      resetForm();
      setShowReviewForm(false);
      loadReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Error',
        description: 'Unable to submit review right now. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleEditDraft = async (draft: Review) => {
    setEditingReview(draft);
    const youth = youthUsers.find(u => u.id === draft.youthId || u.userId === draft.youthId);
    if (youth) {
      setSelectedYouth(youth);
      await loadYouthProjects(youth.id || youth.userId);
      
      // Set project after projects are loaded
      if (draft.projectId) {
        const projects = await getPortfoliosByProfile(youth.id || youth.userId);
        const project = projects.find(p => p.id === draft.projectId);
        if (project) setSelectedProject(project);
      }
    }
    
    setRatingForm({
      professionalism: draft.professionalism || 5,
      communication: draft.communication || 5,
      skillsCompetency: draft.skillsCompetency || 5,
      projectQuality: draft.projectQuality || 5,
      overallRating: draft.rating,
      feedback: draft.reviewText || '',
      projectId: draft.projectId
    });
    
    setShowReviewForm(true);
  };

  const resetForm = () => {
    setRatingForm({
      professionalism: 5,
      communication: 5,
      skillsCompetency: 5,
      projectQuality: 5,
      overallRating: 5,
      feedback: '',
      projectId: undefined
    });
    setSelectedYouth(null);
    setSelectedProject(null);
    setYouthProjects([]);
    setEditingReview(null);
  };

  const renderStarRating = (
    rating: number,
    onChange: (rating: number) => void,
    allowDecimals: boolean = false
  ) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => {
          let starClass = 'text-gray-300';
          if (i < fullStars) {
            starClass = 'text-yellow-500 fill-yellow-500';
          } else if (i === fullStars && hasHalfStar) {
            starClass = 'text-yellow-500 fill-yellow-500 opacity-50';
          }

          return (
            <Star
              key={i}
              className={`h-6 w-6 cursor-pointer transition-colors ${starClass}`}
              onClick={() => onChange(i + 1)}
              onDoubleClick={() => allowDecimals && onChange(i + 0.5)}
            />
          );
        })}
        <span className="ml-2 text-sm text-muted-foreground">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const filteredYouthUsers = youthUsers.filter(user => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      user.fullName.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.preferredCareerField?.toLowerCase().includes(searchLower)
    );
  });

  const filteredReviews = reviews.filter(review => {
    if (filterStatus === 'all') return true;
    return review.status === filterStatus;
  });

  const calculateAnalytics = () => {
    const submittedReviews = reviews.filter(r => r.status === 'submitted' || r.status === 'edited');
    const avgRating = submittedReviews.length > 0
      ? submittedReviews.reduce((sum, r) => sum + r.rating, 0) / submittedReviews.length
      : 0;
    
    const skillCounts: Record<string, number> = {};
    submittedReviews.forEach(review => {
      if (review.skillsCompetency) {
        // Extract skills from feedback or use default
        const skills = review.reviewText?.toLowerCase().match(/\b(react|javascript|python|java|node|typescript|vue|angular)\b/g) || [];
        skills.forEach(skill => {
          skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        });
      }
    });

    return {
      averageRating: avgRating,
      totalReviews: submittedReviews.length,
      totalDrafts: drafts.length,
      topSkills: Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([skill]) => skill)
    };
  };

  const analytics = calculateAnalytics();

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Ratings and Reviews</h2>
          <p className="text-muted-foreground">
            Provide feedback on youth profiles after interviews, completed projects, or other professional interactions
          </p>
        </div>
        <Button onClick={() => {
          resetForm();
          setShowReviewForm(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Submit New Review
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="submit">Submit Review</TabsTrigger>
          <TabsTrigger value="past">Past Reviews ({reviews.length})</TabsTrigger>
          <TabsTrigger value="drafts">Drafts ({drafts.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Submit Review Tab */}
        <TabsContent value="submit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Youth to Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or career field..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredYouthUsers.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No youth found</p>
                    ) : (
                      filteredYouthUsers.map((youth) => {
                        const youthUserId = youth.userId || youth.id;
                        const isConnected = isConnectedToYouth(youthUserId);
                        
                        return (
                        <Card
                          key={youth.id || youth.userId}
                          className={`cursor-pointer hover:shadow-md transition-shadow ${!isConnected ? 'opacity-60' : ''}`}
                          onClick={() => handleSelectYouth(youth.id || youth.userId)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-4 flex-1">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={youth.profileImageUrl} />
                                  <AvatarFallback>
                                    {youth.fullName?.[0]?.toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <h4 className="font-semibold">{youth.fullName}</h4>
                                  <p className="text-sm text-muted-foreground">{youth.email}</p>
                                  {youth.preferredCareerField && (
                                    <p className="text-sm text-muted-foreground">
                                      {youth.preferredCareerField}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {isConnected ? (
                                  <Badge variant="default">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Connected
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">
                                    Not Connected
                                  </Badge>
                                )}
                                <Button variant="outline" size="sm" disabled={!isConnected}>
                                  Review
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Past Reviews Tab */}
        <TabsContent value="past" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reviews</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="edited">Edited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {filteredReviews.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No reviews submitted yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((review) => {
                const youth = youthUsers.find(u => u.id === review.youthId || u.userId === review.youthId);
                const project = review.projectId ? youthProjects.find(p => p.id === review.projectId) : null;
                
                return (
                  <Card key={review.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={youth?.profileImageUrl} />
                            <AvatarFallback>
                              {youth?.fullName?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{youth?.fullName || 'Unknown'}</h4>
                              <Badge variant={review.status === 'edited' ? 'secondary' : 'default'}>
                                {review.status === 'edited' ? 'Edited' : 'Submitted'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 mb-2">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < Math.floor(review.rating)
                                      ? 'text-yellow-500 fill-yellow-500'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                              <span className="ml-2 text-sm text-muted-foreground">
                                {review.rating.toFixed(1)}
                              </span>
                            </div>
                            {review.reviewText && (
                              <p className="text-sm text-muted-foreground mb-2">{review.reviewText}</p>
                            )}
                            {project && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <LinkIcon className="h-4 w-4" />
                                <span>Project: {project.title}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {review.submittedAt
                                  ? format(review.submittedAt, 'PPP')
                                  : format(review.createdAt, 'PPP')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Drafts Tab */}
        <TabsContent value="drafts" className="space-y-4">
          {drafts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No draft reviews</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {drafts.map((draft) => {
                const youth = youthUsers.find(u => u.id === draft.youthId || u.userId === draft.youthId);
                
                return (
                  <Card key={draft.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={youth?.profileImageUrl} />
                            <AvatarFallback>
                              {youth?.fullName?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{youth?.fullName || 'Unknown'}</h4>
                              <Badge variant="outline">Draft</Badge>
                            </div>
                            <div className="flex items-center gap-1 mb-2">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < Math.floor(draft.rating)
                                      ? 'text-yellow-500 fill-yellow-500'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                              <span className="ml-2 text-sm text-muted-foreground">
                                {draft.rating.toFixed(1)}
                              </span>
                            </div>
                            {draft.reviewText && (
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                {draft.reviewText}
                              </p>
                            )}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>Last updated {formatDistanceToNow(draft.updatedAt || draft.createdAt, { addSuffix: true })}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditDraft(draft)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Continue
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Average Rating Given</CardTitle>
                <BarChart3 className="h-5 w-5 text-blue-600 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.averageRating.toFixed(1)}</div>
                <div className="flex items-center gap-1 mt-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(analytics.averageRating)
                          ? 'text-yellow-500 fill-yellow-500'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Reviews Submitted</CardTitle>
                <Award className="h-5 w-5 text-green-600 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.totalReviews}</div>
                <p className="text-sm text-muted-foreground mt-1">Reviews submitted</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Draft Reviews</CardTitle>
                <FileText className="h-5 w-5 text-orange-600 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.totalDrafts}</div>
                <p className="text-sm text-muted-foreground mt-1">In progress</p>
              </CardContent>
            </Card>
          </div>

          {analytics.topSkills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Skills Evaluated</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analytics.topSkills.map((skill, idx) => (
                    <Badge key={idx} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Form Dialog */}
      <Dialog open={showReviewForm} onOpenChange={(open) => {
        setShowReviewForm(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingReview ? 'Edit Review' : 'Submit Review'}
              {selectedYouth && ` - ${selectedYouth.fullName}`}
            </DialogTitle>
            <DialogDescription>
              {editingReview 
                ? 'Update your review for this youth. Your changes will be saved immediately.'
                : 'Provide feedback and ratings for this youth. You can save as draft or submit immediately.'}
            </DialogDescription>
          </DialogHeader>

          {selectedYouth && (
            <div className="space-y-6">
              {/* Youth Profile Summary */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedYouth.profileImageUrl} />
                      <AvatarFallback>
                        {selectedYouth.fullName?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-semibold">{selectedYouth.fullName}</h4>
                      <p className="text-sm text-muted-foreground">{selectedYouth.email}</p>
                      {selectedYouth.preferredCareerField && (
                        <p className="text-sm text-muted-foreground">
                          {selectedYouth.preferredCareerField}
                        </p>
                      )}
                      {selectedYouth.yearsOfExperience !== undefined && (
                        <p className="text-sm text-muted-foreground">
                          {selectedYouth.yearsOfExperience} years of experience
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/recruiter/candidates/${selectedYouth.id || selectedYouth.userId}`)}
                    >
                      View Full Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Project Selection (Optional) */}
              {youthProjects.length > 0 && (
                <div>
                  <Label>Link to Project (Optional)</Label>
                  <Select
                    value={selectedProject?.id || 'none'}
                    onValueChange={(projectId) => {
                      if (projectId === 'none') {
                        setSelectedProject(null);
                        setRatingForm(prev => ({ ...prev, projectId: undefined }));
                      } else {
                        const project = youthProjects.find(p => p.id === projectId);
                        setSelectedProject(project || null);
                        setRatingForm(prev => ({ ...prev, projectId: projectId || undefined }));
                      }
                    }}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select a project (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {youthProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedProject && (
                    <div className="mt-2 p-3 bg-muted rounded-lg">
                      <p className="font-medium text-sm">{selectedProject.title}</p>
                      {selectedProject.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedProject.description}
                        </p>
                      )}
                      {selectedProject.projectUrl && (
                        <a
                          href={selectedProject.projectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1"
                        >
                          <LinkIcon className="h-3 w-3" />
                          View Project
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Rating Criteria */}
              <div className="space-y-4">
                <div>
                  <Label className="flex items-center justify-between mb-2">
                    <span>Professionalism</span>
                    <span className="text-sm text-muted-foreground">{ratingForm.professionalism}/5</span>
                  </Label>
                  {renderStarRating(
                    ratingForm.professionalism,
                    (rating) => setRatingForm(prev => ({ ...prev, professionalism: rating }))
                  )}
                </div>

                <div>
                  <Label className="flex items-center justify-between mb-2">
                    <span>Communication</span>
                    <span className="text-sm text-muted-foreground">{ratingForm.communication}/5</span>
                  </Label>
                  {renderStarRating(
                    ratingForm.communication,
                    (rating) => setRatingForm(prev => ({ ...prev, communication: rating }))
                  )}
                </div>

                <div>
                  <Label className="flex items-center justify-between mb-2">
                    <span>Skills Competency</span>
                    <span className="text-sm text-muted-foreground">{ratingForm.skillsCompetency}/5</span>
                  </Label>
                  {renderStarRating(
                    ratingForm.skillsCompetency,
                    (rating) => setRatingForm(prev => ({ ...prev, skillsCompetency: rating }))
                  )}
                </div>

                <div>
                  <Label className="flex items-center justify-between mb-2">
                    <span>Project Quality</span>
                    <span className="text-sm text-muted-foreground">{ratingForm.projectQuality}/5</span>
                  </Label>
                  {renderStarRating(
                    ratingForm.projectQuality,
                    (rating) => setRatingForm(prev => ({ ...prev, projectQuality: rating }))
                  )}
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Label className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Overall Rating (Auto-calculated)</span>
                    <span className="text-sm font-bold text-blue-600">{ratingForm.overallRating.toFixed(1)}/5</span>
                  </Label>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-6 w-6 ${
                          i < Math.floor(ratingForm.overallRating)
                            ? 'text-yellow-500 fill-yellow-500'
                            : i === Math.floor(ratingForm.overallRating) && ratingForm.overallRating % 1 >= 0.5
                            ? 'text-yellow-500 fill-yellow-500 opacity-50'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Textual Feedback */}
              <div>
                <Label htmlFor="feedback">
                  Written Feedback (Optional)
                  <span className="text-sm text-muted-foreground ml-2">
                    {ratingForm.feedback.length}/2000 characters
                  </span>
                </Label>
                <Textarea
                  id="feedback"
                  value={ratingForm.feedback}
                  onChange={(e) => {
                    if (e.target.value.length <= 2000) {
                      setRatingForm(prev => ({ ...prev, feedback: e.target.value }));
                    }
                  }}
                  placeholder="Share your experience... Highlight strengths, suggest improvements, and provide constructive feedback."
                  rows={6}
                  className="mt-2"
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tips: Highlight strengths, suggest improvements, encourage positive engagement
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save as Draft
                </Button>
                <Button
                  onClick={handleSubmitReview}
                  className="flex-1"
                  disabled={!selectedYouth || !isConnectedToYouth(selectedYouth.userId || selectedYouth.id)}
                  title={!selectedYouth || !isConnectedToYouth(selectedYouth.userId || selectedYouth.id) 
                    ? 'You must be connected to this youth to submit a review' 
                    : 'Submit review'}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit Review
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReviewForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};


