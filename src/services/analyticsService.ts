import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  onSnapshot,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';

export type AnalyticsEventType =
  | 'profile_viewed'
  | 'portfolio_viewed'
  | 'job_match_found'
  | 'job_applied'
  | 'message_sent'
  | 'certificate_uploaded'
  | 'recruiter_viewed_profile'
  | 'recruiter_saved_profile'
  | 'skill_searched'
  | 'connection_request_sent'
  | 'connection_accepted';

export interface AnalyticsEvent {
  id?: string;
  userId: string;
  type: AnalyticsEventType;
  timestamp: Date | Timestamp;
  metadata?: {
    [key: string]: any;
    recruiterId?: string;
    jobId?: string;
    portfolioId?: string;
    certificateId?: string;
    skill?: string;
    connectionId?: string;
  };
}

export interface UserAnalytics {
  userId: string;
  profileViews: number;
  portfolioViews: number;
  jobMatches: number;
  applicationsSubmitted: number;
  messagesSent: number;
  certificatesUploaded: number;
  recruiterProfileViews: number;
  recruiterSaves: number;
  skillsSearched: string[];
  topPortfolioProject?: string;
  jobMatchRate: number;
  lastUpdated: Date | Timestamp;
}

/**
 * Track an analytics event
 */
export const trackEvent = async (
  userId: string,
  type: AnalyticsEventType,
  metadata?: AnalyticsEvent['metadata']
): Promise<string> => {
  try {
    const eventsRef = collection(db, 'user_analytics', userId, 'events');
    const eventData: Omit<AnalyticsEvent, 'id'> = {
      userId,
      type,
      timestamp: Timestamp.now(),
      metadata: metadata || {},
    };

    const docRef = await addDoc(eventsRef, eventData);

    // Update aggregated analytics
    await updateAggregatedAnalytics(userId, type, metadata);

    return docRef.id;
  } catch (error) {
    console.error('Error tracking event:', error);
    throw error;
  }
};

/**
 * Update aggregated analytics counters
 */
const updateAggregatedAnalytics = async (
  userId: string,
  type: AnalyticsEventType,
  metadata?: AnalyticsEvent['metadata']
): Promise<void> => {
  try {
    const analyticsRef = doc(db, 'user_analytics', userId);
    const analyticsDoc = await getDoc(analyticsRef);

    // Get current values or defaults
    const currentData = analyticsDoc.exists() ? analyticsDoc.data() : {
      profileViews: 0,
      portfolioViews: 0,
      jobMatches: 0,
      applicationsSubmitted: 0,
      messagesSent: 0,
      certificatesUploaded: 0,
      recruiterProfileViews: 0,
      recruiterSaves: 0,
    };

    const updates: any = {
      lastUpdated: Timestamp.now(),
    };

    // Increment counters based on event type
    switch (type) {
      case 'profile_viewed':
        updates.profileViews = (currentData.profileViews || 0) + 1;
        break;
      case 'portfolio_viewed':
        updates.portfolioViews = (currentData.portfolioViews || 0) + 1;
        if (metadata?.portfolioId) {
          // Track which portfolio project is most viewed
          const portfolioStatsRef = doc(db, 'user_analytics', userId, 'portfolio_stats', metadata.portfolioId);
          const portfolioStatsDoc = await getDoc(portfolioStatsRef);
          const currentViews = portfolioStatsDoc.exists() ? (portfolioStatsDoc.data().views || 0) : 0;
          await setDoc(portfolioStatsRef, {
            views: currentViews + 1,
            lastViewed: Timestamp.now(),
          }, { merge: true });
        }
        break;
      case 'job_match_found':
        updates.jobMatches = (currentData.jobMatches || 0) + 1;
        break;
      case 'job_applied':
        updates.applicationsSubmitted = (currentData.applicationsSubmitted || 0) + 1;
        break;
      case 'message_sent':
        updates.messagesSent = (currentData.messagesSent || 0) + 1;
        break;
      case 'certificate_uploaded':
        updates.certificatesUploaded = (currentData.certificatesUploaded || 0) + 1;
        break;
      case 'recruiter_viewed_profile':
        updates.recruiterProfileViews = (currentData.recruiterProfileViews || 0) + 1;
        if (metadata?.recruiterId) {
          // Track which recruiters viewed the profile
          const recruiterViewRef = doc(db, 'user_analytics', userId, 'recruiter_views', metadata.recruiterId);
          const recruiterViewDoc = await getDoc(recruiterViewRef);
          const currentViewCount = recruiterViewDoc.exists() ? (recruiterViewDoc.data().viewCount || 0) : 0;
          await setDoc(recruiterViewRef, {
            lastViewed: Timestamp.now(),
            viewCount: currentViewCount + 1,
          }, { merge: true });
        }
        break;
      case 'recruiter_saved_profile':
        updates.recruiterSaves = (currentData.recruiterSaves || 0) + 1;
        break;
      case 'skill_searched':
        if (metadata?.skill) {
          // Track searched skills
          const skillRef = doc(db, 'user_analytics', userId, 'searched_skills', metadata.skill);
          const skillDoc = await getDoc(skillRef);
          const currentSearchCount = skillDoc.exists() ? (skillDoc.data().searchCount || 0) : 0;
          await setDoc(skillRef, {
            skill: metadata.skill,
            searchCount: currentSearchCount + 1,
            lastSearched: Timestamp.now(),
          }, { merge: true });
        }
        break;
    }

    if (analyticsDoc.exists()) {
      await updateDoc(analyticsRef, updates);
    } else {
      // Initialize analytics document
      const initialData: UserAnalytics = {
        userId,
        profileViews: updates.profileViews || 0,
        portfolioViews: updates.portfolioViews || 0,
        jobMatches: updates.jobMatches || 0,
        applicationsSubmitted: updates.applicationsSubmitted || 0,
        messagesSent: updates.messagesSent || 0,
        certificatesUploaded: updates.certificatesUploaded || 0,
        recruiterProfileViews: updates.recruiterProfileViews || 0,
        recruiterSaves: updates.recruiterSaves || 0,
        skillsSearched: [],
        jobMatchRate: 0,
        lastUpdated: Timestamp.now(),
      };
      await setDoc(analyticsRef, initialData);
    }
  } catch (error) {
    console.error('Error updating aggregated analytics:', error);
  }
};

/**
 * Get user analytics from actual Firestore collections (real-time data)
 */
export const getUserAnalytics = async (userId: string): Promise<UserAnalytics | null> => {
  try {
    // Get real data from actual collections
    const [
      applicationsSnapshot,
      messagesSnapshot,
      sentConnectionsSnapshot,
      receivedConnectionsSnapshot,
      jobMatchesSnapshot,
      profileViewEventsSnapshot,
      portfolioViewEventsSnapshot,
      recruiterViewEventsSnapshot,
      recruiterSaveEventsSnapshot
    ] = await Promise.all([
      // Applications
      getDocs(query(collection(db, 'applications'), where('userId', '==', userId))),
      // Messages
      getDocs(query(collection(db, 'messages'), where('senderId', '==', userId))),
      // Sent connections
      getDocs(query(
        collection(db, 'connections'),
        where('userId', '==', userId),
        where('status', '==', 'accepted')
      )),
      // Received connections
      getDocs(query(
        collection(db, 'connections'),
        where('connectedUserId', '==', userId),
        where('status', '==', 'accepted')
      )),
      // Job matches
      (async () => {
        try {
          return await getDocs(query(collection(db, 'jobMatches'), where('userId', '==', userId)));
        } catch {
          return { docs: [] } as any;
        }
      })(),
      // Profile view events
      (async () => {
        try {
          return await getDocs(query(
            collection(db, 'user_analytics', userId, 'events'),
            where('type', '==', 'profile_viewed')
          ));
        } catch {
          return { docs: [] } as any;
        }
      })(),
      // Portfolio view events
      (async () => {
        try {
          return await getDocs(query(
            collection(db, 'user_analytics', userId, 'events'),
            where('type', '==', 'portfolio_viewed')
          ));
        } catch {
          return { docs: [] } as any;
        }
      })(),
      // Recruiter profile view events
      (async () => {
        try {
          return await getDocs(query(
            collection(db, 'user_analytics', userId, 'events'),
            where('type', '==', 'recruiter_viewed_profile')
          ));
        } catch {
          return { docs: [] } as any;
        }
      })(),
      // Recruiter save events
      (async () => {
        try {
          return await getDocs(query(
            collection(db, 'user_analytics', userId, 'events'),
            where('type', '==', 'recruiter_saved_profile')
          ));
        } catch {
          return { docs: [] } as any;
        }
      })()
    ]);

    const applicationsCount = applicationsSnapshot.docs.length;
    const messagesCount = messagesSnapshot.docs.length;
    const connectionsCount = sentConnectionsSnapshot.docs.length + receivedConnectionsSnapshot.docs.length;
    const jobMatchesCount = jobMatchesSnapshot.docs.length;
    const profileViewEvents = profileViewEventsSnapshot.docs.length;
    const portfolioViewEvents = portfolioViewEventsSnapshot.docs.length;
    const recruiterViewEvents = recruiterViewEventsSnapshot.docs.length;
    const recruiterSaveEvents = recruiterSaveEventsSnapshot.docs.length;

    // Get top portfolio project and searched skills
    let topPortfolioProject: string | undefined;
    const skillsSearched: string[] = [];
    
    try {
      const portfolioStatsRef = collection(db, 'user_analytics', userId, 'portfolio_stats');
      const portfolioStatsSnapshot = await getDocs(
        query(portfolioStatsRef, orderBy('views', 'desc'), limit(1))
      );
      topPortfolioProject = portfolioStatsSnapshot.docs[0]?.id;

      const skillsRef = collection(db, 'user_analytics', userId, 'searched_skills');
      const skillsSnapshot = await getDocs(query(skillsRef, orderBy('searchCount', 'desc'), limit(10)));
      skillsSearched.push(...skillsSnapshot.docs.map(doc => doc.data().skill).filter(Boolean));
    } catch (error) {
      console.warn('Error fetching portfolio stats or skills:', error);
    }

    // Calculate job match rate
    const jobMatchRate = applicationsCount > 0 && jobMatchesCount > 0
      ? Math.round((jobMatchesCount / applicationsCount) * 100)
      : 0;

    return {
      userId,
      profileViews: profileViewEvents,
      portfolioViews: portfolioViewEvents,
      jobMatches: jobMatchesCount,
      applicationsSubmitted: applicationsCount,
      messagesSent: messagesCount,
      certificatesUploaded: 0, // Would need to query certificates collection
      recruiterProfileViews: recruiterViewEvents,
      recruiterSaves: recruiterSaveEvents,
      skillsSearched,
      topPortfolioProject,
      jobMatchRate,
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error('Error getting user analytics:', error);
    return null;
  }
};

/**
 * Subscribe to real-time analytics updates using actual data from Firestore collections
 */
export const subscribeToUserAnalytics = (
  userId: string,
  callback: (analytics: UserAnalytics | null) => void
): (() => void) => {
  let applicationsCount = 0;
  let messagesCount = 0;
  let connectionsCount = 0;
  let jobMatchesCount = 0;
  let profileViewEvents = 0;
  let portfolioViewEvents = 0;
  let recruiterViewEvents = 0;
  let recruiterSaveEvents = 0;
  let topPortfolioProject: string | undefined;
  let skillsSearched: string[] = [];

  const calculateAndCallback = async () => {
    try {
      // Calculate job match rate
      const jobMatchRate = applicationsCount > 0 && jobMatchesCount > 0
        ? Math.round((jobMatchesCount / applicationsCount) * 100)
        : 0;

      // Get top portfolio project and searched skills from events (only once, not on every update)
      if (!topPortfolioProject) {
        try {
          const portfolioStatsRef = collection(db, 'user_analytics', userId, 'portfolio_stats');
          const portfolioStatsSnapshot = await getDocs(
            query(portfolioStatsRef, orderBy('views', 'desc'), limit(1))
          );
          topPortfolioProject = portfolioStatsSnapshot.docs[0]?.id;

          const skillsRef = collection(db, 'user_analytics', userId, 'searched_skills');
          const skillsSnapshot = await getDocs(query(skillsRef, orderBy('searchCount', 'desc'), limit(10)));
          skillsSearched = skillsSnapshot.docs.map(doc => doc.data().skill).filter(Boolean);
        } catch (error) {
          console.warn('Error fetching portfolio stats or skills:', error);
        }
      }

      const analytics: UserAnalytics = {
        userId,
        profileViews: profileViewEvents,
        portfolioViews: portfolioViewEvents,
        jobMatches: jobMatchesCount,
        applicationsSubmitted: applicationsCount,
        messagesSent: messagesCount,
        certificatesUploaded: 0, // Would need to query certificates collection
        recruiterProfileViews: recruiterViewEvents,
        recruiterSaves: recruiterSaveEvents,
        skillsSearched,
        topPortfolioProject,
        jobMatchRate,
        lastUpdated: new Date(),
      };

      callback(analytics);
    } catch (error) {
      console.error('Error calculating analytics:', error);
      callback(null);
    }
  };

  // Subscribe to applications
  const applicationsQ = query(
    collection(db, 'applications'),
    where('userId', '==', userId)
  );
  const unsubscribeApplications = onSnapshot(applicationsQ, (snapshot) => {
    applicationsCount = snapshot.docs.length;
    calculateAndCallback();
  });

  // Subscribe to messages
  const messagesQ = query(
    collection(db, 'messages'),
    where('senderId', '==', userId)
  );
  const unsubscribeMessages = onSnapshot(messagesQ, (snapshot) => {
    messagesCount = snapshot.docs.length;
    calculateAndCallback();
  });

  // Subscribe to connections (sent)
  let sentConnectionsCount = 0;
  const sentConnectionsQ = query(
    collection(db, 'connections'),
    where('userId', '==', userId),
    where('status', '==', 'accepted')
  );
  const unsubscribeSentConnections = onSnapshot(sentConnectionsQ, (snapshot) => {
    sentConnectionsCount = snapshot.docs.length;
    connectionsCount = sentConnectionsCount;
    calculateAndCallback();
  });

  // Subscribe to connections (received)
  let receivedConnectionsCount = 0;
  const receivedConnectionsQ = query(
    collection(db, 'connections'),
    where('connectedUserId', '==', userId),
    where('status', '==', 'accepted')
  );
  const unsubscribeReceivedConnections = onSnapshot(receivedConnectionsQ, (snapshot) => {
    receivedConnectionsCount = snapshot.docs.length;
    connectionsCount = sentConnectionsCount + receivedConnectionsCount;
    calculateAndCallback();
  });

  // Subscribe to job matches
  let unsubscribeJobMatches: (() => void) | null = null;
  try {
    const jobMatchesQ = query(
      collection(db, 'jobMatches'),
      where('userId', '==', userId)
    );
    unsubscribeJobMatches = onSnapshot(jobMatchesQ, (snapshot) => {
      jobMatchesCount = snapshot.docs.length;
      calculateAndCallback();
    });
  } catch (error) {
    console.warn('Error setting up job matches subscription:', error);
  }

  // Subscribe to analytics events for profile views
  let unsubscribeProfileViews: (() => void) | null = null;
  try {
    const profileViewsQ = query(
      collection(db, 'user_analytics', userId, 'events'),
      where('type', '==', 'profile_viewed')
    );
    unsubscribeProfileViews = onSnapshot(profileViewsQ, (snapshot) => {
      profileViewEvents = snapshot.docs.length;
      calculateAndCallback();
    });
  } catch (error) {
    console.warn('Error setting up profile views subscription:', error);
  }

  // Subscribe to analytics events for portfolio views
  let unsubscribePortfolioViews: (() => void) | null = null;
  try {
    const portfolioViewsQ = query(
      collection(db, 'user_analytics', userId, 'events'),
      where('type', '==', 'portfolio_viewed')
    );
    unsubscribePortfolioViews = onSnapshot(portfolioViewsQ, (snapshot) => {
      portfolioViewEvents = snapshot.docs.length;
      calculateAndCallback();
    });
  } catch (error) {
    console.warn('Error setting up portfolio views subscription:', error);
  }

  // Subscribe to analytics events for recruiter profile views
  let unsubscribeRecruiterViews: (() => void) | null = null;
  try {
    const recruiterViewsQ = query(
      collection(db, 'user_analytics', userId, 'events'),
      where('type', '==', 'recruiter_viewed_profile')
    );
    unsubscribeRecruiterViews = onSnapshot(recruiterViewsQ, (snapshot) => {
      recruiterViewEvents = snapshot.docs.length;
      calculateAndCallback();
    });
  } catch (error) {
    console.warn('Error setting up recruiter views subscription:', error);
  }

  // Subscribe to analytics events for recruiter saves
  let unsubscribeRecruiterSaves: (() => void) | null = null;
  try {
    const recruiterSavesQ = query(
      collection(db, 'user_analytics', userId, 'events'),
      where('type', '==', 'recruiter_saved_profile')
    );
    unsubscribeRecruiterSaves = onSnapshot(recruiterSavesQ, (snapshot) => {
      recruiterSaveEvents = snapshot.docs.length;
      calculateAndCallback();
    });
  } catch (error) {
    console.warn('Error setting up recruiter saves subscription:', error);
  }

  // Return unsubscribe function
  return () => {
    unsubscribeApplications();
    unsubscribeMessages();
    unsubscribeSentConnections();
    unsubscribeReceivedConnections();
    if (unsubscribeJobMatches) unsubscribeJobMatches();
    if (unsubscribeProfileViews) unsubscribeProfileViews();
    if (unsubscribePortfolioViews) unsubscribePortfolioViews();
    if (unsubscribeRecruiterViews) unsubscribeRecruiterViews();
    if (unsubscribeRecruiterSaves) unsubscribeRecruiterSaves();
  };
};

/**
 * Get events for a time period
 */
export const getEventsByTimeRange = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<AnalyticsEvent[]> => {
  try {
    const eventsRef = collection(db, 'user_analytics', userId, 'events');
    const q = query(
      eventsRef,
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      where('timestamp', '<=', Timestamp.fromDate(endDate)),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date(),
    } as AnalyticsEvent));
  } catch (error) {
    console.error('Error getting events by time range:', error);
    return [];
  }
};

/**
 * Get weekly/monthly trends
 */
export const getTrendData = async (
  userId: string,
  period: 'week' | 'month' = 'month'
): Promise<{ date: string; count: number }[]> => {
  try {
    const now = new Date();
    const startDate = new Date();
    
    if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate.setMonth(now.getMonth() - 1);
    }

    const events = await getEventsByTimeRange(userId, startDate, now);
    
    // Group by date
    const grouped: { [key: string]: number } = {};
    events.forEach(event => {
      const date = event.timestamp instanceof Date 
        ? event.timestamp.toISOString().split('T')[0]
        : new Date(event.timestamp as any).toISOString().split('T')[0];
      grouped[date] = (grouped[date] || 0) + 1;
    });

    // Convert to array and fill missing dates
    const result: { date: string; count: number }[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= now) {
      const dateStr = currentDate.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        count: grouped[dateStr] || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  } catch (error) {
    console.error('Error getting trend data:', error);
    return [];
  }
};

/**
 * Get recruiter engagement breakdown
 */
export const getRecruiterEngagement = async (
  userId: string
): Promise<Array<{ recruiterId: string; recruiterName: string; views: number; saved: boolean }>> => {
  try {
    const recruiterViewsRef = collection(db, 'user_analytics', userId, 'recruiter_views');
    const snapshot = await getDocs(recruiterViewsRef);

    const engagement = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        // Get recruiter name
        const recruiterDoc = await getDoc(doc(db, 'users', doc.id));
        const recruiterName = recruiterDoc.data()?.displayName || recruiterDoc.data()?.firstName || 'Unknown';

        return {
          recruiterId: doc.id,
          recruiterName,
          views: data.viewCount || 0,
          saved: false, // This would need to be tracked separately
        };
      })
    );

    return engagement.sort((a, b) => b.views - a.views);
  } catch (error) {
    console.error('Error getting recruiter engagement:', error);
    return [];
  }
};

