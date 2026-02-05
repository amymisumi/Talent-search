import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Star,
  StarHalf,
  Building2,
  Calendar,
  FolderOpen,
  Loader2,
  TrendingUp,
  MessageSquare
} from 'lucide-react';
import {
  subscribeToYouthReviews,
  calculateAverageRating,
  getStarBreakdown,
  type YouthReview
} from '@/integrations/firebase/youthReviewsService';
import { format } from 'date-fns';

const ReviewsAndRatingsSection = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [reviews, setReviews] = useState<YouthReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Real-time subscription to reviews
  useEffect(() => {
    if (!currentUser) {
      setReviews([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    const unsubscribe = subscribeToYouthReviews(currentUser.uid, (updatedReviews) => {
      setReviews(updatedReviews);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Calculate statistics
  const averageRating = useMemo(() => {
    return calculateAverageRating(reviews);
  }, [reviews]);

  const starBreakdown = useMemo(() => {
    return getStarBreakdown(reviews);
  }, [reviews]);

  const totalReviews = reviews.length;

  // Render stars
  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClass = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5'
    }[size];

    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star key={`full-${i}`} className={`${sizeClass} fill-yellow-400 text-yellow-400`} />
        ))}
        {hasHalfStar && (
          <StarHalf className={`${sizeClass} fill-yellow-400 text-yellow-400`} />
        )}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star key={`empty-${i}`} className={`${sizeClass} fill-gray-200 text-gray-200`} />
        ))}
      </div>
    );
  };

  // Render star breakdown bar
  const renderStarBar = (starCount: number, count: number, total: number) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 min-w-[60px]">
          <span className="text-sm font-medium">{starCount}</span>
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        </div>
        <div className="flex-1">
          <Progress value={percentage} className="h-2" />
        </div>
        <span className="text-sm text-muted-foreground min-w-[40px] text-right">
          {count}
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Empty state
  if (totalReviews === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">{t('reviewsAndRatingsTitle')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('reviewsAndRatingsSubtitle')}
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 bg-blue-100 rounded-full mb-4">
              <Star className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{t('noReviewsYet')}</h3>
            <p className="text-center text-muted-foreground max-w-md mb-2">
              {t('noReviewsDescription')}
            </p>
            <p className="text-center text-sm text-muted-foreground max-w-md">
              {t('noReviewsMotivation')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">{t('reviewsAndRatingsTitle')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('reviewsAndRatingsSubtitle')}
        </p>
      </div>

      {/* Overall Performance Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('overallPerformanceSummary')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Average Rating */}
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">{t('averageRating')}</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold">{averageRating}</span>
                  <span className="text-xl text-muted-foreground">/ 5</span>
                </div>
                <div className="mt-2">
                  {renderStars(averageRating, 'lg')}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {t('basedOnReviews')} {totalReviews} {totalReviews === 1 ? t('verifiedRecruiterReview') : t('verifiedRecruiterReviews')}
              </div>
            </div>

            {/* Star Breakdown */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground mb-4">{t('ratingDistribution')}</p>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map(starCount => (
                  <div key={starCount}>
                    {renderStarBar(starCount, starBreakdown[starCount], totalReviews)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Reviews */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t('allReviews')}</h3>
          <Badge variant="secondary">{totalReviews} {totalReviews === 1 ? t('review') : t('reviews')}</Badge>
        </div>

        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  {/* Recruiter Avatar */}
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={review.recruiterProfileImage} alt={review.recruiterName} />
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {review.recruiterName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Review Content */}
                  <div className="flex-1 space-y-3">
                    {/* Recruiter Info */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-lg">{review.recruiterName}</h4>
                          {review.recruiterJobTitle && (
                            <Badge variant="outline" className="text-xs">
                              {review.recruiterJobTitle}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          {review.recruiterCompany && (
                            <>
                              <Building2 className="h-3 w-3" />
                              <span>{review.recruiterCompany}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating, 'md')}
                        <span className="text-sm font-medium">{review.rating} / 5</span>
                      </div>
                    </div>

                    {/* Written Feedback */}
                    {review.feedback && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start gap-2 mb-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <p className="text-sm font-medium text-muted-foreground">{t('feedback')}</p>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {review.feedback}
                        </p>
                      </div>
                    )}

                    {/* Related Project */}
                    {review.projectName && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FolderOpen className="h-4 w-4" />
                        <span>
                          <span className="font-medium">{t('projectReviewed')}:</span> {review.projectName}
                        </span>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {t('reviewedOn')} {format(new Date(review.timestamp), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReviewsAndRatingsSection;
