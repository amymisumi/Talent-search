import { db } from './client';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { getProfile } from './services';

// Enhanced Review interface for youth reviews
export interface YouthReview {
  id: string;
  youthId: string;
  recruiterId: string;
  recruiterName: string;
  recruiterJobTitle?: string;
  recruiterCompany?: string;
  recruiterProfileImage?: string;
  rating: number; // 1-5
  feedback: string; // Written feedback
  projectId?: string;
  projectName?: string;
  timestamp: Timestamp | Date;
  createdAt: Timestamp | Date;
}

// Recruiter details interface
interface RecruiterDetails {
  fullName: string;
  companyName?: string;
  profileImageUrl?: string;
  jobTitle?: string;
}

// Project details interface
interface ProjectDetails {
  title: string;
  description?: string;
}

// Get all reviews for a youth user
export const getYouthReviews = async (youthId: string): Promise<YouthReview[]> => {
  try {
    // Query top-level reviews collection where youthId or profileId matches
    const reviewsRef = collection(db, 'reviews');
    
    // Try multiple query strategies
    let querySnapshot;
    
    // Strategy 1: Query by youthId with ordering
    try {
      const q = query(
        reviewsRef,
        where('youthId', '==', youthId),
        orderBy('timestamp', 'desc')
      );
      querySnapshot = await getDocs(q);
    } catch (error) {
      // Strategy 2: Query by youthId with createdAt ordering
      try {
        const q = query(
          reviewsRef,
          where('youthId', '==', youthId),
          orderBy('createdAt', 'desc')
        );
        querySnapshot = await getDocs(q);
      } catch {
        // Strategy 3: Query by profileId (fallback for existing structure)
        try {
          const q = query(
            reviewsRef,
            where('profileId', '==', youthId),
            orderBy('createdAt', 'desc')
          );
          querySnapshot = await getDocs(q);
        } catch {
          // Strategy 4: Just query without ordering
          const q = query(reviewsRef, where('youthId', '==', youthId));
          querySnapshot = await getDocs(q);
        }
      }
    }
    if (!querySnapshot) {
      return [];
    }

    const reviews: YouthReview[] = [];

    // Fetch recruiter and project details for each review
    for (const docSnapshot of querySnapshot.docs) {
      const reviewData = docSnapshot.data();
      const review: YouthReview = {
        id: docSnapshot.id,
        youthId: reviewData.youthId || reviewData.profileId || youthId,
        recruiterId: reviewData.recruiterId,
        recruiterName: reviewData.recruiterName || 'Unknown Recruiter',
        rating: reviewData.rating || 0,
        feedback: reviewData.feedback || reviewData.reviewText || reviewData.comment || '',
        projectId: reviewData.projectId,
        timestamp: reviewData.timestamp?.toDate() || reviewData.createdAt?.toDate() || new Date(),
        createdAt: reviewData.createdAt?.toDate() || reviewData.timestamp?.toDate() || new Date(),
      };

      // Fetch recruiter details
      if (reviewData.recruiterId) {
        try {
          const recruiterProfile = await getProfile(reviewData.recruiterId);
          if (recruiterProfile) {
            review.recruiterName = recruiterProfile.fullName || review.recruiterName;
            review.recruiterCompany = recruiterProfile.companyName;
            review.recruiterProfileImage = recruiterProfile.profileImageUrl;
            review.recruiterJobTitle = recruiterProfile.preferredCareerField; // Using this field as job title if available
          }
        } catch (error) {
          console.warn(`Error fetching recruiter ${reviewData.recruiterId}:`, error);
        }
      }

      // Fetch project details if projectId exists
      if (reviewData.projectId) {
        try {
          // Try to get from portfolios collection
          const portfoliosRef = collection(db, 'portfolios');
          const portfolioQuery = query(
            portfoliosRef,
            where('profileId', '==', youthId)
          );
          const portfolioSnapshot = await getDocs(portfolioQuery);
          
          const portfolio = portfolioSnapshot.docs.find(
            doc => doc.id === reviewData.projectId
          );
          
          if (portfolio) {
            review.projectName = portfolio.data().title;
          }
        } catch (error) {
          console.warn(`Error fetching project ${reviewData.projectId}:`, error);
        }
      }

      // Only include submitted or edited reviews (not drafts)
      const reviewStatus = reviewData.status;
      if (!reviewStatus || reviewStatus === 'submitted' || reviewStatus === 'edited') {
        reviews.push(review);
      }
    }

    // Sort by timestamp manually (in case ordering didn't work)
    reviews.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA; // Descending order
    });

    return reviews;
  } catch (error) {
    console.error('Error getting youth reviews:', error);
    throw error;
  }
};

// Real-time listener for reviews
export const subscribeToYouthReviews = (
  youthId: string,
  callback: (reviews: YouthReview[]) => void
): (() => void) => {
  try {
    console.log('[YouthReviews] Subscribing to reviews for youthId:', youthId);
    const reviewsRef = collection(db, 'reviews');
    
    // Build query with multiple fallback strategies
    // Only show submitted reviews (not drafts)
    let q;
    
    try {
      // Try to query with 'in' operator for both 'submitted' and 'edited' statuses
      q = query(
        reviewsRef, 
        where('youthId', '==', youthId),
        where('status', 'in', ['submitted', 'edited']),
        orderBy('timestamp', 'desc')
      );
    } catch {
      try {
        q = query(
          reviewsRef, 
          where('youthId', '==', youthId),
          where('status', 'in', ['submitted', 'edited']),
          orderBy('createdAt', 'desc')
        );
      } catch {
        try {
          // Fallback: query by submitted status only
          q = query(
            reviewsRef, 
            where('youthId', '==', youthId),
            where('status', '==', 'submitted'),
            orderBy('timestamp', 'desc')
          );
        } catch {
          try {
            q = query(
              reviewsRef, 
              where('youthId', '==', youthId),
              where('status', '==', 'submitted'),
              orderBy('createdAt', 'desc')
            );
          } catch {
            try {
              q = query(
                reviewsRef, 
                where('profileId', '==', youthId),
                where('status', '==', 'submitted'),
                orderBy('createdAt', 'desc')
              );
            } catch {
              // If composite index doesn't exist, query without status filter and filter in memory
              try {
                q = query(reviewsRef, where('youthId', '==', youthId), orderBy('createdAt', 'desc'));
              } catch {
                q = query(reviewsRef, where('youthId', '==', youthId));
              }
            }
          }
        }
      }
    }

    return onSnapshot(
      q,
      async (querySnapshot) => {
        console.log('[YouthReviews] Received', querySnapshot.docs.length, 'reviews for youthId:', youthId);
        const reviews: YouthReview[] = [];

        // Process reviews in parallel for better performance
        const reviewPromises = querySnapshot.docs.map(async (docSnapshot) => {
          const reviewData = docSnapshot.data();
          console.log('[YouthReviews] Processing review:', docSnapshot.id, 'youthId:', reviewData.youthId, 'status:', reviewData.status);
          const review: YouthReview = {
            id: docSnapshot.id,
            youthId: reviewData.youthId || reviewData.profileId || youthId,
            recruiterId: reviewData.recruiterId,
            recruiterName: reviewData.recruiterName || 'Unknown Recruiter',
            rating: reviewData.rating || 0,
            feedback: reviewData.feedback || reviewData.reviewText || reviewData.comment || '',
            projectId: reviewData.projectId,
            timestamp: reviewData.timestamp?.toDate() || reviewData.createdAt?.toDate() || new Date(),
            createdAt: reviewData.createdAt?.toDate() || reviewData.timestamp?.toDate() || new Date(),
          };

          // Fetch recruiter details
          if (reviewData.recruiterId) {
            try {
              const recruiterProfile = await getProfile(reviewData.recruiterId);
              if (recruiterProfile) {
                review.recruiterName = recruiterProfile.fullName || review.recruiterName;
                review.recruiterCompany = recruiterProfile.companyName;
                review.recruiterProfileImage = recruiterProfile.profileImageUrl;
                review.recruiterJobTitle = recruiterProfile.preferredCareerField;
              }
            } catch (error) {
              console.warn(`Error fetching recruiter ${reviewData.recruiterId}:`, error);
            }
          }

          // Fetch project details if projectId exists
          if (reviewData.projectId) {
            try {
              const portfoliosRef = collection(db, 'portfolios');
              const portfolioQuery = query(
                portfoliosRef,
                where('profileId', '==', youthId)
              );
              const portfolioSnapshot = await getDocs(portfolioQuery);
              
              const portfolio = portfolioSnapshot.docs.find(
                doc => doc.id === reviewData.projectId
              );
              
              if (portfolio) {
                review.projectName = portfolio.data().title;
              }
            } catch (error) {
              console.warn(`Error fetching project ${reviewData.projectId}:`, error);
            }
          }

          return review;
        });

        const processedReviews = await Promise.all(reviewPromises);
        
        // Filter to only show submitted or edited reviews (in case query didn't filter by status)
        const submittedReviews = processedReviews.filter(review => {
          // Check if review has status field, if not assume it's submitted (for backward compatibility)
          const reviewData = querySnapshot.docs.find(doc => doc.id === review.id)?.data();
          const status = reviewData?.status;
          // Show reviews that are submitted or edited (not drafts)
          return !status || status === 'submitted' || status === 'edited';
        });
        
        reviews.push(...submittedReviews);

        // Sort by timestamp manually (in case ordering didn't work)
        reviews.sort((a, b) => {
          const dateA = new Date(a.timestamp).getTime();
          const dateB = new Date(b.timestamp).getTime();
          return dateB - dateA; // Descending order
        });

        callback(reviews);
      },
      (error) => {
        console.error('Error in reviews subscription:', error);
        callback([]);
      }
    );
  } catch (error) {
    console.error('Error setting up reviews subscription:', error);
    return () => {};
  }
};

// Calculate average rating
export const calculateAverageRating = (reviews: YouthReview[]): number => {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10; // Round to 1 decimal place
};

// Get star breakdown
export const getStarBreakdown = (reviews: YouthReview[]): Record<number, number> => {
  const breakdown: Record<number, number> = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  reviews.forEach(review => {
    const rating = Math.round(review.rating);
    if (rating >= 1 && rating <= 5) {
      breakdown[rating]++;
    }
  });

  return breakdown;
};

