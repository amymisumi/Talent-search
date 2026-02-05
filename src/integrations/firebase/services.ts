import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  onSnapshot,
  addDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "./client";
import { UserProfile, Skill, Portfolio, Review, UserRole, UserData, Connection, JobMatch, Application, Notification, Certificate, SupportReport, ActivityLog, LandingPageContent, SystemSettings, AdminUser, Job, Message, Conversation, Interview, Shortlist, RecruiterAnalytics, RecruiterSettings, RecruiterNotification, SavedSearch, CandidateRating, JobTemplate } from "./types";
import { sendSupportEmail } from "../../utils/emailService";

// User Data
export const getUserData = async (userId: string): Promise<Partial<UserData>> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      return userDoc.data() as Partial<UserData>;
    }
    return {};
  } catch (error) {
    console.error("Error getting user data:", error);
    return {};
  }
};

// User Roles
export const getUserRole = async (userId: string): Promise<UserRole | null> => {
  try {
    const roleDoc = await getDoc(doc(db, "userRoles", userId));
    if (roleDoc.exists()) {
      return roleDoc.data().role as UserRole;
    }
    return null;
  } catch (error) {
    console.error("Error getting user role:", error);
    return null;
  }
};

export const setUserRole = async (userId: string, role: UserRole): Promise<void> => {
  try {
    console.log("Setting user role for userId:", userId, "role:", role);
    await setDoc(doc(db, "userRoles", userId), {
      role,
      createdAt: Timestamp.now()
    });
    console.log("User role set successfully");
  } catch (error) {
    console.error("Error setting user role:", error);
    throw error;
  }
};

// Profiles
export const createProfile = async (profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    console.log("Creating profile with data:", profile);
    const docRef = doc(db, "profiles", profile.userId);
    const profileData = {
      ...profile,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    console.log("Profile data to save:", profileData);
    await setDoc(docRef, profileData);
    console.log("Profile created successfully with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error creating profile:", error);
    throw error;
  }
};

export const getProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    console.log('[DEBUG] getProfile - Fetching profile for userId:', userId);

    // First try to get the profile document directly by ID
    const profileDoc = await getDoc(doc(db, "profiles", userId));

    if (profileDoc.exists()) {
      console.log('[DEBUG] Found profile by ID:', profileDoc.id);
      const data = profileDoc.data();
      console.log('[DEBUG] Profile data from Firebase:', data);
      const profile = {
        id: profileDoc.id,
        ...data,
        // Handle both timestamp and Date objects
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
      } as UserProfile;
      console.log('[DEBUG] Processed profile:', profile);
      return profile;
    }

    // If not found by ID, try querying by userId field
    console.log('[DEBUG] Profile not found by ID, trying query by userId field');
    const q = query(collection(db, "profiles"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      console.log('[DEBUG] Found profile by userId field:', doc.id);
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Handle both timestamp and Date objects
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
      } as UserProfile;
    }

    console.log('[DEBUG] No profile found for userId:', userId);
    return null;
  } catch (error) {
    console.error("Error getting profile:", error);
    return null;
  }
};

export const updateProfile = async (profileId: string, updates: Partial<UserProfile>): Promise<void> => {
  try {
    await updateDoc(doc(db, "profiles", profileId), {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
};

export const getAllProfiles = async (): Promise<UserProfile[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "profiles"));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as UserProfile[];
  } catch (error) {
    console.error("Error getting all profiles:", error);
    return [];
  }
};

// Skills
export const addSkill = async (skill: Omit<Skill, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const docRef = doc(collection(db, "skills"));
    const skillData = {
      ...skill,
      createdAt: Timestamp.now()
    };
    await setDoc(docRef, skillData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding skill:", error);
    throw error;
  }
};

export const getSkillsByProfile = async (profileId: string): Promise<Skill[]> => {
  try {
    const q = query(collection(db, "skills"), where("profileId", "==", profileId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      verifiedAt: doc.data().verifiedAt?.toDate()
    })) as Skill[];
  } catch (error) {
    console.error("Error getting skills:", error);
    return [];
  }
};

export const updateSkill = async (skillId: string, updates: Partial<Skill>): Promise<void> => {
  try {
    await updateDoc(doc(db, "skills", skillId), updates);
  } catch (error) {
    console.error("Error updating skill:", error);
    throw error;
  }
};

export const deleteSkill = async (skillId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "skills", skillId));
  } catch (error) {
    console.error("Error deleting skill:", error);
    throw error;
  }
};

// Portfolios
export const addPortfolio = async (portfolio: Omit<Portfolio, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const docRef = doc(collection(db, "portfolios"));
    // Remove undefined values as Firebase doesn't allow them
    const portfolioData = Object.fromEntries(
      Object.entries({
        ...portfolio,
        createdAt: Timestamp.now()
      }).filter(([_, value]) => value !== undefined)
    );
    await setDoc(docRef, portfolioData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding portfolio:", error);
    throw error;
  }
};

export const getPortfoliosByProfile = async (profileId: string): Promise<Portfolio[]> => {
  try {
    const q = query(collection(db, "portfolios"), where("profileId", "==", profileId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    })) as Portfolio[];
  } catch (error) {
    console.error("Error getting portfolios:", error);
    return [];
  }
};

export const updatePortfolio = async (portfolioId: string, updates: Partial<Portfolio>): Promise<void> => {
  try {
    await updateDoc(doc(db, "portfolios", portfolioId), updates);
  } catch (error) {
    console.error("Error updating portfolio:", error);
    throw error;
  }
};

export const deletePortfolio = async (portfolioId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "portfolios", portfolioId));
  } catch (error) {
    console.error("Error deleting portfolio:", error);
    throw error;
  }
};

// Delete portfolio document and its storage object (if storagePath provided)
export const deletePortfolioWithStorage = async (portfolioId: string, storagePath?: string): Promise<void> => {
  try {
    if (storagePath) {
      try {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
      } catch (err) {
        console.warn('Failed to delete storage object for portfolio:', storagePath, err);
        // continue to delete the document even if storage deletion fails
      }
    }

    await deleteDoc(doc(db, "portfolios", portfolioId));
  } catch (error) {
    console.error("Error deleting portfolio with storage:", error);
    throw error;
  }
};

// Real-time listener for portfolios for a given profileId. Returns unsubscribe function.
export const onPortfoliosByProfile = (profileId: string, callback: (portfolios: Portfolio[]) => void) => {
  try {
    const q = query(collection(db, "portfolios"), where("profileId", "==", profileId), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : d.data().createdAt
      })) as Portfolio[];
      callback(items);
    });
    return unsub;
  } catch (error) {
    console.error('Error creating realtime listener for portfolios:', error);
    // return a noop unsubscribe
    return () => {};
  }
};

// Reviews
export const createReview = async (review: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = doc(collection(db, "reviews"));
    const now = Timestamp.now();
    
    // Build review data and filter out undefined values (Firestore doesn't allow undefined)
    const reviewData: any = {
      createdAt: now,
      updatedAt: now,
      timestamp: now, // Add timestamp field for youth dashboard compatibility
    };
    
    // Only include fields that are not undefined
    Object.keys(review).forEach(key => {
      const value = (review as any)[key];
      if (value !== undefined) {
        reviewData[key] = value;
      }
    });
    
    // Ensure feedback field is set (map reviewText to feedback for youth dashboard)
    if (reviewData.reviewText && !reviewData.feedback) {
      reviewData.feedback = reviewData.reviewText;
    }
    
    // Add submittedAt only if status is submitted
    if (review.status === 'submitted') {
      reviewData.submittedAt = now;
    }
    
    console.log('[createReview] Creating review with data:', {
      youthId: reviewData.youthId,
      recruiterId: reviewData.recruiterId,
      status: reviewData.status,
      rating: reviewData.rating,
      hasFeedback: !!reviewData.feedback,
      hasReviewText: !!reviewData.reviewText
    });
    
    await setDoc(docRef, reviewData);
    
    // If submitted (not draft), update youth's average rating
    if (review.status === 'submitted') {
      await updateYouthRating(review.youthId);
    }
    
    return docRef.id;
  } catch (error) {
    console.error("Error creating review:", error);
    throw error;
  }
};

export const updateReview = async (reviewId: string, updates: Partial<Review>): Promise<void> => {
  try {
    // Build update data and filter out undefined values (Firestore doesn't allow undefined)
    const updateData: any = {
      updatedAt: Timestamp.now()
    };
    
    // Only include fields that are not undefined
    Object.keys(updates).forEach(key => {
      const value = (updates as any)[key];
      if (value !== undefined) {
        updateData[key] = value;
      }
    });
    
    // Ensure feedback field is set (map reviewText to feedback for youth dashboard)
    if (updateData.reviewText && !updateData.feedback) {
      updateData.feedback = updateData.reviewText;
    }
    
    // If status is changing to submitted, set submittedAt and timestamp
    if (updates.status === 'submitted' || updates.status === 'edited') {
      const now = Timestamp.now();
      updateData.submittedAt = now;
      // Ensure timestamp is set for youth dashboard
      if (!updateData.timestamp) {
        updateData.timestamp = now;
      }
      // Update youth's average rating
      const reviewDoc = await getDoc(doc(db, "reviews", reviewId));
      if (reviewDoc.exists()) {
        const existingReview = reviewDoc.data() as Review;
        await updateYouthRating(existingReview.youthId);
      }
    }
    
    await updateDoc(doc(db, "reviews", reviewId), updateData);
  } catch (error) {
    console.error("Error updating review:", error);
    throw error;
  }
};

// Helper function to update youth's average rating
const updateYouthRating = async (youthId: string): Promise<void> => {
  try {
    const reviewsQuery = query(
      collection(db, "reviews"),
      where("youthId", "==", youthId),
      where("status", "==", "submitted")
    );
    const reviewsSnapshot = await getDocs(reviewsQuery);
    
    if (reviewsSnapshot.empty) return;
    
    const reviews = reviewsSnapshot.docs.map(doc => doc.data() as Review);
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / reviews.length;
    
    // Update youth profile - try both "profiles" and "users" collections
    try {
      const profileRef = doc(db, "profiles", youthId);
      await updateDoc(profileRef, {
        averageRating,
        reviewCount: reviews.length,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      // Fallback to users collection if profiles doesn't exist
      try {
        const userRef = doc(db, "users", youthId);
        await updateDoc(userRef, {
          averageRating,
          reviewCount: reviews.length,
          updatedAt: Timestamp.now()
        });
      } catch (userError) {
        console.error("Error updating youth rating in both collections:", userError);
      }
    }
  } catch (error) {
    console.error("Error updating youth rating:", error);
  }
};

export const getReviewsByProfile = async (profileId: string): Promise<Review[]> => {
  try {
    // Support both profileId and youthId for backward compatibility
    const q = query(
      collection(db, "reviews"),
      where("youthId", "==", profileId),
      where("status", "==", "submitted")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
        submittedAt: data.submittedAt?.toDate()
      } as Review;
    });
  } catch (error) {
    console.error("Error getting reviews:", error);
    return [];
  }
};

export const getReviewsByRecruiter = async (recruiterId: string): Promise<Review[]> => {
  try {
    const q = query(collection(db, "reviews"), where("recruiterId", "==", recruiterId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
        submittedAt: data.submittedAt?.toDate()
      } as Review;
    });
  } catch (error) {
    console.error("Error getting reviews by recruiter:", error);
    return [];
  }
};

export const getReviewDrafts = async (recruiterId: string): Promise<Review[]> => {
  try {
    const q = query(
      collection(db, "reviews"),
      where("recruiterId", "==", recruiterId),
      where("status", "==", "draft")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate()
      } as Review;
    });
  } catch (error) {
    console.error("Error getting review drafts:", error);
    return [];
  }
};

export const subscribeToReviewsByRecruiter = (
  recruiterId: string,
  callback: (reviews: Review[]) => void
): (() => void) => {
  const q = query(collection(db, "reviews"), where("recruiterId", "==", recruiterId));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const reviews = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
        submittedAt: data.submittedAt?.toDate()
      } as Review;
    });
    callback(reviews);
  }, (error) => {
    console.error("Error in reviews subscription:", error);
  });
  
  return unsubscribe;
};

export const deleteReview = async (reviewId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "reviews", reviewId));
  } catch (error) {
    console.error("Error deleting review:", error);
    throw error;
  }
};

// Legacy function for backward compatibility
export const addReview = async (review: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  return createReview(review);
};

// Connections
export const addConnection = async (connection: Omit<Connection, 'id' | 'createdAt'>): Promise<string> => {
  try {
    // Prevent self-connections
    if (connection.userId === connection.connectedUserId) {
      throw new Error("Cannot send connection request to yourself");
    }
    
    // Check if connection already exists (in either direction)
    const existingQuery1 = query(
      collection(db, "connections"),
      where("userId", "==", connection.userId),
      where("connectedUserId", "==", connection.connectedUserId)
    );
    const existingQuery2 = query(
      collection(db, "connections"),
      where("userId", "==", connection.connectedUserId),
      where("connectedUserId", "==", connection.userId)
    );
    
    const [existing1, existing2] = await Promise.all([
      getDocs(existingQuery1),
      getDocs(existingQuery2)
    ]);
    
    if (!existing1.empty || !existing2.empty) {
      const existingDoc = existing1.empty ? existing2.docs[0] : existing1.docs[0];
      const existingData = existingDoc.data();
      // If it's declined, allow creating a new request
      if (existingData.status === 'declined') {
        // Delete the declined connection and allow new request
        await deleteDoc(existingDoc.ref);
      } else {
        throw new Error("Connection request already exists");
      }
    }
    
    const docRef = doc(collection(db, "connections"));
    // Ensure initiatedBy is always set (default to userId if not provided)
    const connectionData = {
      ...connection,
      initiatedBy: connection.initiatedBy || connection.userId,
      createdAt: Timestamp.now()
    };
    
    console.log('🔵 Creating connection:', {
      id: docRef.id,
      userId: connection.userId,
      connectedUserId: connection.connectedUserId,
      initiatedBy: connectionData.initiatedBy,
      status: connection.status,
      connectedUserName: connection.connectedUserName,
      connectedUserRole: connection.connectedUserRole,
      note: `User ${connection.userId} is sending to ${connection.connectedUserId}`,
      fullData: connectionData
    });
    
    await setDoc(docRef, connectionData);
    
    console.log('✅ Connection created successfully:', {
      id: docRef.id,
      sender: connection.userId,
      recipient: connection.connectedUserId,
      initiatedBy: connectionData.initiatedBy,
      status: connection.status,
      note: `User ${connection.connectedUserId} should see this as incoming request. User ${connection.userId} should NOT see this as incoming.`
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding connection:", error);
    throw error;
  }
};

export const getConnectionsByUser = async (userId: string): Promise<Connection[]> => {
  try {
    // Get connections where user is the sender (userId)
    const sentQuery = query(collection(db, "connections"), where("userId", "==", userId));
    // Get connections where user is the receiver (connectedUserId)
    const receivedQuery = query(collection(db, "connections"), where("connectedUserId", "==", userId));
    
    const [sentSnapshot, receivedSnapshot] = await Promise.all([
      getDocs(sentQuery),
      getDocs(receivedQuery)
    ]);
    
    // Combine both results and filter out self-connections
    const sentConnections = (sentSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        acceptedAt: doc.data().acceptedAt?.toDate()
      })) as Connection[])
      .filter(conn => conn.userId !== conn.connectedUserId); // Filter self-connections
    
    const receivedConnections = (receivedSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        acceptedAt: doc.data().acceptedAt?.toDate()
      })) as Connection[])
      .filter(conn => conn.userId !== conn.connectedUserId); // Filter self-connections
    
    // Combine and deduplicate by id
    const allConnections = [...sentConnections, ...receivedConnections];
    const uniqueConnections = Array.from(
      new Map(allConnections.map(conn => [conn.id, conn])).values()
    );
    
    return uniqueConnections;
  } catch (error) {
    console.error("Error getting connections:", error);
    return [];
  }
};

export const updateConnection = async (connectionId: string, updates: Partial<Connection>): Promise<void> => {
  try {
    // If connection is being accepted, auto-create a conversation
    if (updates.status === 'accepted') {
      const connectionDoc = await getDoc(doc(db, "connections", connectionId));
      if (connectionDoc.exists()) {
        const connectionData = connectionDoc.data() as Connection;
        const participants = [connectionData.userId, connectionData.connectedUserId].sort();
        
        // Check if conversation already exists
        const existingConversation = await getOrCreateConversation(participants);
        
        // Store conversation ID in connection document for easy lookup
        await updateDoc(doc(db, "connections", connectionId), {
          ...updates,
          conversationId: existingConversation,
          acceptedAt: updates.acceptedAt || Timestamp.now()
        });
        return;
      }
    }
    
    await updateDoc(doc(db, "connections", connectionId), updates);
  } catch (error) {
    console.error("Error updating connection:", error);
    throw error;
  }
};

// Job Matches
export const addJobMatch = async (jobMatch: Omit<JobMatch, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const docRef = doc(collection(db, "jobMatches"));
    const jobMatchData = {
      ...jobMatch,
      createdAt: Timestamp.now()
    };
    await setDoc(docRef, jobMatchData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding job match:", error);
    throw error;
  }
};

export const getJobMatchesByUser = async (userId: string): Promise<JobMatch[]> => {
  try {
    const q = query(collection(db, "jobMatches"), where("userId", "==", userId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      viewedAt: doc.data().viewedAt?.toDate(),
      appliedAt: doc.data().appliedAt?.toDate()
    })) as JobMatch[];
  } catch (error) {
    console.error("Error getting job matches:", error);
    return [];
  }
};

export const updateJobMatch = async (jobMatchId: string, updates: Partial<JobMatch>): Promise<void> => {
  try {
    await updateDoc(doc(db, "jobMatches", jobMatchId), updates);
  } catch (error) {
    console.error("Error updating job match:", error);
    throw error;
  }
};

// Applications
export const addApplication = async (application: Omit<Application, 'id' | 'appliedAt' | 'updatedAt'>): Promise<string> => {
  try {
    console.log('[addApplication] Creating application for jobId:', application.jobId);
    
    // Get job to find recruiter ID
    const job = await getJob(application.jobId);
    if (!job) {
      console.error('[addApplication] Job not found:', application.jobId);
      throw new Error('Job not found');
    }
    
    console.log('[addApplication] Job found:', job.id, 'recruiterId:', job.recruiterId);
    
    const recruiterId = job.recruiterId;
    if (!recruiterId) {
      console.error('[addApplication] Job does not have a recruiter ID:', job);
      throw new Error('Job does not have a recruiter ID');
    }
    
    const docRef = doc(collection(db, "applications"));
    const applicationData = {
      ...application,
      recruiterId: recruiterId, // Ensure recruiterId is set
      appliedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    console.log('[addApplication] Application data to save:', {
      userId: applicationData.userId,
      recruiterId: applicationData.recruiterId,
      jobId: applicationData.jobId,
      jobTitle: applicationData.jobTitle
    });
    
    await setDoc(docRef, applicationData);
    console.log('[addApplication] Application created successfully with ID:', docRef.id);
    
    // Verify the application was saved correctly
    const savedApp = await getDoc(docRef);
    if (savedApp.exists()) {
      const savedData = savedApp.data();
      console.log('[addApplication] Verification - Saved application data:', {
        id: savedApp.id,
        recruiterId: savedData.recruiterId,
        userId: savedData.userId,
        jobId: savedData.jobId,
        hasRecruiterId: !!savedData.recruiterId
      });
      
      if (!savedData.recruiterId) {
        console.error('[addApplication] ERROR: Application was saved without recruiterId!');
        // Try to update it
        await updateDoc(docRef, { recruiterId: recruiterId });
        console.log('[addApplication] Fixed: Updated application with recruiterId');
      }
    } else {
      console.error('[addApplication] ERROR: Application document does not exist after creation!');
    }
        
        // Create recruiter notification for new application
    try {
        await createRecruiterNotification({
          recruiterId,
          type: 'new_application',
          title: 'New Application Received',
          message: `${application.userName} applied for ${application.jobTitle}`,
          relatedId: docRef.id,
          isRead: false
        });
    } catch (notifError) {
      console.error("Error creating recruiter notification:", notifError);
      // Don't throw - application was created successfully
    }
    
    return docRef.id;
  } catch (error) {
    console.error("Error adding application:", error);
    throw error;
  }
};

export const getApplicationsByUser = async (userId: string): Promise<Application[]> => {
  try {
    let q;
    try {
      // Try query with orderBy first
      q = query(collection(db, "applications"), where("userId", "==", userId), orderBy("appliedAt", "desc"));
    const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
      id: doc.id,
          ...data,
          appliedAt: data.appliedAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      }) as Application[];
    } catch (orderByError: any) {
      // If orderBy fails (missing index), try without orderBy
      if (orderByError?.code === 'failed-precondition') {
        console.warn('Missing Firestore index for applications query. Using fallback query without orderBy.');
        q = query(collection(db, "applications"), where("userId", "==", userId));
        const querySnapshot = await getDocs(q);
        const applications = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            appliedAt: data.appliedAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          };
        }) as Application[];
        // Sort manually by appliedAt
        applications.sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime());
        return applications;
      }
      throw orderByError;
    }
  } catch (error) {
    console.error("Error getting applications:", error);
    return [];
  }
};

export const updateApplication = async (applicationId: string, updates: Partial<Application>): Promise<void> => {
  try {
    await updateDoc(doc(db, "applications", applicationId), {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Error updating application:", error);
    throw error;
  }
};

export const deleteApplication = async (applicationId: string, userId: string): Promise<void> => {
  try {
    console.log('[deleteApplication] Deleting application:', applicationId, 'for user:', userId);
    
    // Get the application first to get the jobId
    const applicationDoc = await getDoc(doc(db, "applications", applicationId));
    if (!applicationDoc.exists()) {
      throw new Error('Application not found');
    }
    
    const applicationData = applicationDoc.data() as Application;
    
    // Verify that the user owns this application
    if (applicationData.userId !== userId) {
      throw new Error('You can only delete your own applications');
    }
    
    // Delete the application document
    await deleteDoc(doc(db, "applications", applicationId));
    console.log('[deleteApplication] Application deleted successfully');
    
    // Remove the jobId from user's appliedJobs array
    try {
      const profileRef = doc(db, "profiles", userId);
      const profileDoc = await getDoc(profileRef);
      
      if (profileDoc.exists()) {
        const profileData = profileDoc.data();
        const appliedJobs = profileData.appliedJobs || [];
        const updatedAppliedJobs = appliedJobs.filter((jobId: string) => jobId !== applicationData.jobId);
        
        await updateDoc(profileRef, {
          appliedJobs: updatedAppliedJobs
        });
        console.log('[deleteApplication] Removed jobId from user profile');
      }
    } catch (profileError) {
      console.error('[deleteApplication] Error updating user profile:', profileError);
      // Don't throw - application was deleted successfully
    }
  } catch (error) {
    console.error("[deleteApplication] Error deleting application:", error);
    throw error;
  }
};

// Notifications
export const addNotification = async (notification: Omit<Notification, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const docRef = doc(collection(db, "notifications"));
    const notificationData = {
      ...notification,
      createdAt: Timestamp.now()
    };
    await setDoc(docRef, notificationData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding notification:", error);
    throw error;
  }
};

export const getNotificationsByUser = async (userId: string): Promise<Notification[]> => {
  try {
    const q = query(collection(db, "notifications"), where("userId", "==", userId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    })) as Notification[];
  } catch (error) {
    console.error("Error getting notifications:", error);
    return [];
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, "notifications", notificationId), { isRead: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "notifications", notificationId));
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
};

// Real-time listeners
export const subscribeToConnections = (userId: string, callback: (connections: Connection[]) => void) => {
  console.log('Setting up connection subscription for user:', userId);
  
  // Subscribe to connections where user is the sender
  const sentQuery = query(collection(db, "connections"), where("userId", "==", userId));
  // Subscribe to connections where user is the receiver
  const receivedQuery = query(collection(db, "connections"), where("connectedUserId", "==", userId));
  
  let sentConnections: Connection[] = [];
  let receivedConnections: Connection[] = [];
  
  const updateCallback = () => {
    // Combine, filter out self-connections, and deduplicate
    const allConnections = [...sentConnections, ...receivedConnections]
      .filter(conn => conn.userId !== conn.connectedUserId); // Filter self-connections
    const uniqueConnections = Array.from(
      new Map(allConnections.map(conn => [conn.id, conn])).values()
    );
    console.log('Connection subscription update:', {
      sent: sentConnections.length,
      received: receivedConnections.length,
      total: uniqueConnections.length
    });
    callback(uniqueConnections);
  };
  
  // Subscribe to sent connections
  const unsubscribeSent = onSnapshot(
    sentQuery, 
    (querySnapshot) => {
      console.log('Sent connections snapshot:', querySnapshot.docs.length);
      sentConnections = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        acceptedAt: doc.data().acceptedAt?.toDate()
      })) as Connection[];
      updateCallback();
    },
    (error) => {
      console.error('Error in sent connections subscription:', error);
    }
  );
  
  // Subscribe to received connections
  const unsubscribeReceived = onSnapshot(
    receivedQuery, 
    (querySnapshot) => {
      console.log('Received connections snapshot:', querySnapshot.docs.length);
      const received = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          acceptedAt: data.acceptedAt?.toDate()
        };
      }) as Connection[];
      
      console.log('Received connections details:', received.map(c => {
        const isReceiver = c.connectedUserId === userId;
        const didNotInitiate = c.initiatedBy ? c.initiatedBy !== userId : c.userId !== userId;
        const isNotSender = c.userId !== userId;
        const shouldBeIncoming = isReceiver && didNotInitiate && isNotSender;
        
        return {
          id: c.id,
          userId: c.userId,
          connectedUserId: c.connectedUserId,
          initiatedBy: c.initiatedBy || 'undefined',
          status: c.status,
          connectedUserName: c.connectedUserName,
          connectedUserRole: c.connectedUserRole,
          subscriptionUserId: userId,
          isReceiver,
          didNotInitiate,
          isNotSender,
          shouldBeIncoming,
          fullConnection: c
        };
      }));
      
      receivedConnections = received;
      updateCallback();
    },
    (error) => {
      console.error('Error in received connections subscription:', error);
    }
  );
  
  // Return a function that unsubscribes from both
  return () => {
    console.log('Unsubscribing from connections');
    unsubscribeSent();
    unsubscribeReceived();
  };
};

export const subscribeToJobMatches = (userId: string, callback: (jobMatches: JobMatch[]) => void) => {
  const q = query(collection(db, "jobMatches"), where("userId", "==", userId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (querySnapshot) => {
    const jobMatches = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      viewedAt: doc.data().viewedAt?.toDate(),
      appliedAt: doc.data().appliedAt?.toDate()
    })) as JobMatch[];
    callback(jobMatches);
  });
};

export const subscribeToApplications = (userId: string, callback: (applications: Application[]) => void) => {
  // This is an alias for subscribeToApplicationsByUser for backward compatibility
  return subscribeToApplicationsByUser(userId, callback);
};

export const subscribeToApplicationsByUser = (userId: string, callback: (applications: Application[]) => void) => {
  let unsubscribeFn: (() => void) | null = null;
  
  try {
  const q = query(
    collection(db, "applications"),
    where("userId", "==", userId),
    orderBy("appliedAt", "desc")
  );
  
    unsubscribeFn = onSnapshot(
      q,
      (querySnapshot) => {
        const applications = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
      id: doc.id,
            ...data,
            appliedAt: data.appliedAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          };
        }) as Application[];
    callback(applications);
      },
      (error) => {
        console.error('Error in subscribeToApplicationsByUser:', error);
        // If it's a missing index error, try fallback query
        if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
          console.warn('Missing Firestore index. Trying query without orderBy...');
          if (unsubscribeFn) {
            unsubscribeFn(); // Unsubscribe from the first query
          }
          
          const fallbackQuery = query(
            collection(db, "applications"),
            where("userId", "==", userId)
          );
          
          unsubscribeFn = onSnapshot(
            fallbackQuery,
            (querySnapshot) => {
              const applications = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                  id: doc.id,
                  ...data,
                  appliedAt: data.appliedAt?.toDate() || new Date(),
                  updatedAt: data.updatedAt?.toDate() || new Date()
                };
              }) as Application[];
              // Sort manually by appliedAt
              applications.sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime());
              callback(applications);
            },
            (fallbackError) => {
              console.error('Error in fallback query:', fallbackError);
              callback([]); // Return empty array on error
            }
          );
        } else {
          callback([]); // Return empty array on other errors
        }
      }
    );
    
    return () => {
      if (unsubscribeFn) {
        unsubscribeFn();
      }
    };
  } catch (error) {
    console.error('Error setting up subscribeToApplicationsByUser:', error);
    // Return a no-op unsubscribe function
    return () => {};
  }
};

export const subscribeToNotifications = (userId: string, callback: (notifications: Notification[]) => void) => {
  const q = query(collection(db, "notifications"), where("userId", "==", userId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (querySnapshot) => {
    const notifications = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    })) as Notification[];
    callback(notifications);
  });
};

// Profile completion calculation
export const calculateProfileCompletion = (profile: UserProfile | null): number => {
  if (!profile) return 0;

  const fields = [
    profile.fullName,
    profile.email,
    profile.country,
    profile.city,
    profile.bio,
    profile.phone,
    profile.yearsOfExperience,
    profile.educationLevel,
    profile.preferredCareerField,
    profile.talentArea,
    profile.profileImageUrl,
    profile.cvUrl
  ];

  const completedFields = fields.filter(field => field && typeof field === 'string' && field.trim() !== '').length;
  return Math.round((completedFields / fields.length) * 100);
};

// Storage
export const uploadFile = async (file: File, path: string): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

export const deleteFile = async (path: string): Promise<void> => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
};

// Additional functions for recruiters and messaging
export const getActiveRecruiters = async (): Promise<UserProfile[]> => {
  try {
    const q = query(collection(db, "profiles"), where("companyName", "!=", null));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as UserProfile[];
  } catch (error) {
    console.error("Error getting active recruiters:", error);
    return [];
  }
};

export const sendMessageToRecruiter = async (senderId: string, receiverId: string, message: string): Promise<string> => {
  try {
    const messageData = {
      senderId,
      receiverId,
      message,
      isRead: false,
      createdAt: Timestamp.now()
    };
    const docRef = await addDoc(collection(db, "messages"), messageData);
    return docRef.id;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

// Admin-specific functions
export const getAllRecruiters = async (): Promise<UserProfile[]> => {
  try {
    const q = query(collection(db, "profiles"), where("companyName", "!=", null));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as UserProfile[];
  } catch (error) {
    console.error("Error getting all recruiters:", error);
    return [];
  }
};

export const updateRecruiterVerification = async (recruiterId: string, isVerified: boolean): Promise<void> => {
  try {
    await updateDoc(doc(db, "profiles", recruiterId), {
      isVerified,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Error updating recruiter verification:", error);
    throw error;
  }
};

export const getAllYouthUsers = async (): Promise<UserProfile[]> => {
  try {
    const q = query(collection(db, "userRoles"), where("role", "==", "youth"));
    const roleSnapshot = await getDocs(q);

    const youthProfiles: UserProfile[] = [];
    for (const roleDoc of roleSnapshot.docs) {
      const userId = roleDoc.id; // This is the Firebase Auth UID
      const profile = await getProfile(userId);
      if (profile) {
        // Ensure userId is set correctly (should match the Firebase Auth UID)
        const profileWithUserId = {
          ...profile,
          userId: userId, // Ensure userId is set to the Firebase Auth UID
          id: profile.id || userId // id should be the profile document ID
        };
        youthProfiles.push(profileWithUserId);
      }
    }

    return youthProfiles;
  } catch (error) {
    console.error("Error getting all youth users:", error);
    return [];
  }
};

export const getPendingCertificates = async (): Promise<any[]> => {
  try {
    const q = query(collection(db, "certificates"), where("status", "==", "pending"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      submittedAt: doc.data().submittedAt?.toDate()
    }));
  } catch (error) {
    console.error("Error getting pending certificates:", error);
    return [];
  }
};

export const updateCertificateStatus = async (certificateId: string, status: 'verified' | 'rejected', adminNotes?: string): Promise<void> => {
  try {
    await updateDoc(doc(db, "certificates", certificateId), {
      status,
      adminNotes,
      reviewedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Error updating certificate status:", error);
    throw error;
  }
};

export const getAdminStats = async (): Promise<{
  totalUsers: number;
  totalRecruiters: number;
  totalYouth: number;
  verifiedCertificates: number;
  pendingCertificates: number;
  newUsersThisWeek: number;
  newRecruitersThisWeek: number;
  newYouthThisWeek: number;
}> => {
  try {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [users, recruiters, youth, certificates, profiles] = await Promise.all([
      getDocs(collection(db, "userRoles")),
      getDocs(query(collection(db, "userRoles"), where("role", "==", "recruiter"))),
      getDocs(query(collection(db, "userRoles"), where("role", "==", "youth"))),
      getDocs(collection(db, "certificates")),
      getDocs(collection(db, "profiles"))
    ]);

    const verifiedCertificates = certificates.docs.filter(doc => doc.data().status === 'verified').length;
    const pendingCertificates = certificates.docs.filter(doc => doc.data().status === 'pending').length;

    // Calculate new users this week
    const newUsersThisWeek = profiles.docs.filter(doc => {
      const createdAt = doc.data().createdAt?.toDate();
      return createdAt && createdAt >= oneWeekAgo;
    }).length;

    // Calculate new recruiters this week
    const newRecruitersThisWeek = profiles.docs.filter(doc => {
      const createdAt = doc.data().createdAt?.toDate();
      const companyName = doc.data().companyName;
      return createdAt && createdAt >= oneWeekAgo && companyName;
    }).length;

    // Calculate new youth this week
    const newYouthThisWeek = profiles.docs.filter(doc => {
      const createdAt = doc.data().createdAt?.toDate();
      const companyName = doc.data().companyName;
      return createdAt && createdAt >= oneWeekAgo && !companyName;
    }).length;

    return {
      totalUsers: users.size,
      totalRecruiters: recruiters.size,
      totalYouth: youth.size,
      verifiedCertificates,
      pendingCertificates,
      newUsersThisWeek,
      newRecruitersThisWeek,
      newYouthThisWeek
    };
  } catch (error) {
    console.error("Error getting admin stats:", error);
    return {
      totalUsers: 0,
      totalRecruiters: 0,
      totalYouth: 0,
      verifiedCertificates: 0,
      pendingCertificates: 0,
      newUsersThisWeek: 0,
      newRecruitersThisWeek: 0,
      newYouthThisWeek: 0
    };
  }
};

export const sendNotificationToUsers = async (
  userIds: string[],
  title: string,
  message: string,
  type: 'email' | 'in_app' | 'both' = 'in_app'
): Promise<void> => {
  try {
    const notificationPromises = userIds.map(userId =>
      addDoc(collection(db, "notifications"), {
        userId,
        type: type === 'email' ? 'message' : 'admin_notification',
        title,
        message,
        isRead: false,
        createdAt: Timestamp.now()
      })
    );

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error("Error sending notifications:", error);
    throw error;
  }
};

// Additional admin functions
export const getAllCertificates = async (status?: 'pending' | 'verified' | 'rejected'): Promise<Certificate[]> => {
  try {
    let q = collection(db, "certificates");
    if (status) {
      q = query(q, where("status", "==", status));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      submittedAt: doc.data().submittedAt?.toDate(),
      reviewedAt: doc.data().reviewedAt?.toDate()
    })) as Certificate[];
  } catch (error) {
    console.error("Error getting certificates:", error);
    return [];
  }
};

export const getAllPortfolios = async (): Promise<Portfolio[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "portfolios"));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    })) as Portfolio[];
  } catch (error) {
    console.error("Error getting portfolios:", error);
    return [];
  }
};

export const flagPortfolio = async (portfolioId: string, isFlagged: boolean): Promise<void> => {
  try {
    await updateDoc(doc(db, "portfolios", portfolioId), {
      isFlagged,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Error flagging portfolio:", error);
    throw error;
  }
};

export const suspendUser = async (userId: string, isSuspended: boolean): Promise<void> => {
  try {
    await updateDoc(doc(db, "profiles", userId), {
      isSuspended,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Error suspending user:", error);
    throw error;
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  try {
    // Delete profile
    await deleteDoc(doc(db, "profiles", userId));
    // Delete user role
    await deleteDoc(doc(db, "userRoles", userId));
    // Note: Auth user deletion would need to be handled separately
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

export const getSupportReports = async (): Promise<SupportReport[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "supportReports"));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      resolvedAt: doc.data().resolvedAt?.toDate()
    })) as SupportReport[];
  } catch (error) {
    console.error("Error getting support reports:", error);
    return [];
  }
};

export const updateSupportReport = async (reportId: string, updates: Partial<SupportReport>): Promise<void> => {
  try {
    await updateDoc(doc(db, "supportReports", reportId), {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Error updating support report:", error);
    throw error;
  }
};

export const getActivityLogs = async (limitCount: number = 100): Promise<ActivityLog[]> => {
  try {
    const q = query(collection(db, "activityLogs"), orderBy("timestamp", "desc"), limit(limitCount));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate()
    })) as ActivityLog[];
  } catch (error) {
    console.error("Error getting activity logs:", error);
    return [];
  }
};

export const addActivityLog = async (log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<string> => {
  try {
    const docRef = doc(collection(db, "activityLogs"));
    const logData = {
      ...log,
      timestamp: Timestamp.now()
    };
    await setDoc(docRef, logData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding activity log:", error);
    throw error;
  }
};

export const getLandingPageContent = async (): Promise<LandingPageContent[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "landingPageContent"));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as LandingPageContent[];
  } catch (error) {
    console.error("Error getting landing page content:", error);
    return [];
  }
};

export const updateLandingPageContent = async (contentId: string, updates: Partial<LandingPageContent>): Promise<void> => {
  try {
    await updateDoc(doc(db, "landingPageContent", contentId), {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Error updating landing page content:", error);
    throw error;
  }
};

export const getSystemSettings = async (): Promise<SystemSettings | null> => {
  try {
    const querySnapshot = await getDocs(collection(db, "systemSettings"));
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        updatedAt: doc.data().updatedAt.toDate()
      } as SystemSettings;
    }
    return null;
  } catch (error) {
    console.error("Error getting system settings:", error);
    return null;
  }
};

export const updateSystemSettings = async (settingsId: string, updates: Partial<SystemSettings>): Promise<void> => {
  try {
    await updateDoc(doc(db, "systemSettings", settingsId), {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Error updating system settings:", error);
    throw error;
  }
};

// Real-time listeners for admin
export const subscribeToRecruiters = (callback: (recruiters: UserProfile[]) => void) => {
  const q = query(collection(db, "profiles"), where("companyName", "!=", null));
  return onSnapshot(q, (querySnapshot) => {
    const recruiters = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    })) as UserProfile[];
    callback(recruiters);
  });
};

export const subscribeToPendingCertificates = (callback: (certificates: any[]) => void) => {
  const q = query(collection(db, "certificates"), where("status", "==", "pending"));
  return onSnapshot(q, (querySnapshot) => {
    const certificates = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      submittedAt: doc.data().submittedAt?.toDate()
    }));
    callback(certificates);
  });
};

// Additional admin functions for moderation, logs, landing page, settings
export const subscribeToAllPortfolios = (callback: (portfolios: Portfolio[]) => void) => {
  const q = query(collection(db, "portfolios"));
  return onSnapshot(q, (querySnapshot) => {
    const portfolios = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    })) as Portfolio[];
    callback(portfolios);
  });
};

export const subscribeToSupportReports = (callback: (reports: SupportReport[]) => void) => {
  const q = query(collection(db, "supportReports"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (querySnapshot) => {
    const reports = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      resolvedAt: doc.data().resolvedAt?.toDate()
    })) as SupportReport[];
    callback(reports);
  });
};

export const subscribeToActivityLogs = (callback: (logs: ActivityLog[]) => void, limitCount: number = 100) => {
  const q = query(collection(db, "activityLogs"), orderBy("timestamp", "desc"), limit(limitCount));
  return onSnapshot(q, (querySnapshot) => {
    const logs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate()
    })) as ActivityLog[];
    callback(logs);
  });
};

export const subscribeToLandingPageContent = (callback: (content: LandingPageContent[]) => void) => {
  const q = query(collection(db, "landingPageContent"));
  return onSnapshot(q, (querySnapshot) => {
    const content = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as LandingPageContent[];
    callback(content);
  });
};

export const subscribeToSystemSettings = (callback: (settings: SystemSettings | null) => void) => {
  const q = collection(db, "systemSettings");
  return onSnapshot(q, (querySnapshot) => {
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const settings = {
        id: doc.id,
        ...doc.data(),
        updatedAt: doc.data().updatedAt.toDate()
      } as SystemSettings;
      callback(settings);
    } else {
      callback(null);
    }
  });
};

// Enhanced notification functions
export const sendNotificationToYouthOnly = async (
  title: string,
  message: string,
  type: 'email' | 'in_app' | 'both' = 'in_app'
): Promise<void> => {
  try {
    const youthUsers = await getAllYouthUsers();
    const userIds = youthUsers.map(user => user.userId);
    await sendNotificationToUsers(userIds, title, message, type);
  } catch (error) {
    console.error("Error sending notifications to youth:", error);
    throw error;
  }
};

export const sendNotificationToRecruitersOnly = async (
  title: string,
  message: string,
  type: 'email' | 'in_app' | 'both' = 'in_app'
): Promise<void> => {
  try {
    const recruiters = await getAllRecruiters();
    const userIds = recruiters.map(recruiter => recruiter.userId);
    await sendNotificationToUsers(userIds, title, message, type);
  } catch (error) {
    console.error("Error sending notifications to recruiters:", error);
    throw error;
  }
};

// Enhanced user management
export const verifyYouthUser = async (userId: string, isVerified: boolean): Promise<void> => {
  try {
    await updateDoc(doc(db, "profiles", userId), {
      isVerified,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Error updating youth verification:", error);
    throw error;
  }
};

export const suspendYouthUser = async (userId: string, isSuspended: boolean): Promise<void> => {
  try {
    await updateDoc(doc(db, "profiles", userId), {
      isSuspended,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Error suspending youth user:", error);
    throw error;
  }
};

export const suspendRecruiter = async (recruiterId: string, isSuspended: boolean): Promise<void> => {
  try {
    await updateDoc(doc(db, "profiles", recruiterId), {
      isSuspended,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Error suspending recruiter:", error);
    throw error;
  }
};

// Recruiter Dashboard Services

// Job Management
export const createJob = async (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt' | 'applicantsCount'>): Promise<string> => {
  try {
    const docRef = doc(collection(db, "jobs"));
    
    // Remove undefined values from job object (Firestore doesn't allow undefined)
    const cleanedJob: any = {};
    Object.keys(job).forEach(key => {
      const value = (job as any)[key];
      if (value !== undefined && value !== null) {
        // Handle Date objects - convert to Timestamp
        if (value instanceof Date) {
          cleanedJob[key] = Timestamp.fromDate(value);
        } else if (Array.isArray(value)) {
          // Only include non-empty arrays
          if (value.length > 0) {
            cleanedJob[key] = value;
          }
        } else {
          cleanedJob[key] = value;
        }
      }
    });
    
    const jobData = {
      ...cleanedJob,
      applicantsCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    await setDoc(docRef, jobData);
    return docRef.id;
  } catch (error) {
    console.error("Error creating job:", error);
    throw error;
  }
};

export const getJob = async (jobId: string): Promise<Job | null> => {
  try {
    const jobDoc = await getDoc(doc(db, "jobs", jobId));
    if (jobDoc.exists()) {
      const data = jobDoc.data();
      console.log('[getJob] Job data from Firestore:', {
        id: jobDoc.id,
        recruiterId: data.recruiterId,
        title: data.title,
        allFields: Object.keys(data)
      });
      return {
        id: jobDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        deadline: data.deadline?.toDate() || new Date(),
        applicationDeadline: data.applicationDeadline?.toDate() || data.applicationDeadline
      } as Job;
    }
    console.log('[getJob] Job not found:', jobId);
    return null;
  } catch (error) {
    console.error("[getJob] Error getting job:", error);
    return null;
  }
};

export const getJobsByRecruiter = async (recruiterId: string): Promise<Job[]> => {
  try {
    const q = query(collection(db, "jobs"), where("recruiterId", "==", recruiterId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate(),
      deadline: doc.data().deadline.toDate()
    })) as Job[];
  } catch (error) {
    console.error("Error getting jobs:", error);
    return [];
  }
};

// Get all open jobs posted by recruiters (for youth job matches)
export const getAllOpenJobs = async (): Promise<Job[]> => {
  try {
    const q = query(
      collection(db, "jobs"),
      where("status", "==", "open"),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate(),
      deadline: doc.data().deadline?.toDate ? doc.data().deadline.toDate() : doc.data().deadline,
      applicationDeadline: doc.data().applicationDeadline?.toDate ? doc.data().applicationDeadline.toDate() : doc.data().applicationDeadline
    })) as Job[];
  } catch (error) {
    console.error("Error getting all open jobs:", error);
    return [];
  }
};

// Subscribe to all open jobs (real-time)
export const subscribeToAllOpenJobs = (
  callback: (jobs: Job[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  let unsubscribeFn: (() => void) | null = null;
  
  try {
    const q = query(
      collection(db, "jobs"),
      where("status", "==", "open"),
      orderBy("createdAt", "desc")
    );
    
    unsubscribeFn = onSnapshot(
      q,
      (querySnapshot) => {
        const jobs = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
            deadline: data.deadline?.toDate ? data.deadline.toDate() : data.deadline,
            applicationDeadline: data.applicationDeadline?.toDate ? data.applicationDeadline.toDate() : data.applicationDeadline
          };
        }) as Job[];
        callback(jobs);
      },
      (error: any) => {
        console.error('Error in subscribeToAllOpenJobs:', error);
        // If it's a missing index error, try without orderBy
        if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
          console.warn('Missing Firestore index. Trying query without orderBy...');
          if (unsubscribeFn) {
            unsubscribeFn(); // Unsubscribe from the first query
          }
          
          const fallbackQuery = query(
            collection(db, "jobs"),
            where("status", "==", "open")
          );
          
          unsubscribeFn = onSnapshot(
            fallbackQuery,
            (querySnapshot) => {
              const jobs = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                  id: doc.id,
                  ...data,
                  createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
                  updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
                  deadline: data.deadline?.toDate ? data.deadline.toDate() : data.deadline,
                  applicationDeadline: data.applicationDeadline?.toDate ? data.applicationDeadline.toDate() : data.applicationDeadline
                };
              }) as Job[];
              // Sort manually
              jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
              callback(jobs);
            },
            (fallbackError) => {
              console.error('Error in fallback query:', fallbackError);
              if (onError) {
                onError(fallbackError as Error);
              }
            }
          );
        } else {
          if (onError) {
            onError(error as Error);
          }
        }
      }
    );
    
    return () => {
      if (unsubscribeFn) {
        unsubscribeFn();
      }
    };
  } catch (error) {
    console.error('Error setting up subscription:', error);
    if (onError) {
      onError(error as Error);
    }
    // Return a no-op unsubscribe function
    return () => {};
  }
};

export const updateJob = async (jobId: string, updates: Partial<Job>): Promise<void> => {
  try {
    // Remove undefined values from updates (Firestore doesn't allow undefined)
    const cleanedUpdates: any = {
      updatedAt: Timestamp.now()
    };
    
    Object.keys(updates).forEach(key => {
      const value = (updates as any)[key];
      if (value !== undefined && value !== null) {
        // Handle Date objects - convert to Timestamp
        if (value instanceof Date) {
          cleanedUpdates[key] = Timestamp.fromDate(value);
        } else if (Array.isArray(value)) {
          // Only include non-empty arrays
          if (value.length > 0) {
            cleanedUpdates[key] = value;
          }
        } else {
          cleanedUpdates[key] = value;
        }
      }
    });
    
    await updateDoc(doc(db, "jobs", jobId), cleanedUpdates);
  } catch (error) {
    console.error("Error updating job:", error);
    throw error;
  }
};

export const deleteJob = async (jobId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "jobs", jobId));
  } catch (error) {
    console.error("Error deleting job:", error);
    throw error;
  }
};

export const duplicateJob = async (jobId: string): Promise<string> => {
  try {
    const jobDoc = await getDoc(doc(db, "jobs", jobId));
    if (!jobDoc.exists()) {
      throw new Error("Job not found");
    }

    const jobData = jobDoc.data();
    const newJob = {
      ...jobData,
      title: `${jobData.title} (Copy)`,
      status: 'open' as const,
      applicantsCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    delete newJob.id;

    const docRef = doc(collection(db, "jobs"));
    await setDoc(docRef, newJob);
    return docRef.id;
  } catch (error) {
    console.error("Error duplicating job:", error);
    throw error;
  }
};

// Application Management
export const getApplicationsByJob = async (jobId: string): Promise<Application[]> => {
  try {
    const q = query(collection(db, "applications"), where("jobId", "==", jobId), orderBy("appliedAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      appliedAt: doc.data().appliedAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as Application[];
  } catch (error) {
    console.error("Error getting applications:", error);
    return [];
  }
};

export const getApplicationsByRecruiter = async (recruiterId: string): Promise<Application[]> => {
  try {
    console.log('[getApplicationsByRecruiter] Fetching applications for recruiterId:', recruiterId);
    let q;
    try {
      // Try query with orderBy first
      q = query(collection(db, "applications"), where("recruiterId", "==", recruiterId), orderBy("appliedAt", "desc"));
    const querySnapshot = await getDocs(q);
      const applications = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
      id: doc.id,
          ...data,
          appliedAt: data.appliedAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      }) as Application[];
      console.log('[getApplicationsByRecruiter] Found', applications.length, 'applications');
      return applications;
    } catch (orderByError: any) {
      // If orderBy fails (missing index), try without orderBy
      if (orderByError?.code === 'failed-precondition') {
        console.warn('[getApplicationsByRecruiter] Missing Firestore index. Using fallback query without orderBy.');
        q = query(collection(db, "applications"), where("recruiterId", "==", recruiterId));
        const querySnapshot = await getDocs(q);
        console.log('[getApplicationsByRecruiter] Fallback query found', querySnapshot.docs.length, 'applications');
        const applications = querySnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('[getApplicationsByRecruiter] Application doc:', doc.id, 'recruiterId:', data.recruiterId, 'userId:', data.userId);
          return {
            id: doc.id,
            ...data,
            appliedAt: data.appliedAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          };
        }) as Application[];
        // Sort manually by appliedAt
        applications.sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime());
        return applications;
      }
      // If query fails completely, try fetching all and filtering in memory
      console.warn('[getApplicationsByRecruiter] Query failed, trying to fetch all applications and filter in memory');
      const allApplicationsSnapshot = await getDocs(collection(db, "applications"));
      const allApplications = allApplicationsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          appliedAt: data.appliedAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      }) as Application[];
      console.log('[getApplicationsByRecruiter] Total applications in database:', allApplications.length);
      const filtered = allApplications.filter(app => app.recruiterId === recruiterId);
      console.log('[getApplicationsByRecruiter] Filtered applications for recruiterId', recruiterId, ':', filtered.length);
      console.log('[getApplicationsByRecruiter] Sample applications:', filtered.slice(0, 3).map(app => ({
        id: app.id,
        recruiterId: app.recruiterId,
        userId: app.userId,
        jobId: app.jobId
      })));
      filtered.sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime());
      return filtered;
    }
  } catch (error) {
    console.error("[getApplicationsByRecruiter] Error getting applications:", error);
    // Last resort: try to fetch all and filter
    try {
      console.log('[getApplicationsByRecruiter] Last resort: fetching all applications');
      const allApplicationsSnapshot = await getDocs(collection(db, "applications"));
      const allApplications = allApplicationsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          appliedAt: data.appliedAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      }) as Application[];
      const filtered = allApplications.filter(app => app.recruiterId === recruiterId);
      console.log('[getApplicationsByRecruiter] Last resort found', filtered.length, 'applications');
      filtered.sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime());
      return filtered;
    } catch (fallbackError) {
      console.error("[getApplicationsByRecruiter] Fallback also failed:", fallbackError);
    return [];
    }
  }
};

export const updateApplicationStatus = async (applicationId: string, status: Application['status'], notes?: string): Promise<void> => {
  try {
    // Filter out undefined values (Firestore doesn't allow undefined)
    const updates: any = {
      status,
      updatedAt: Timestamp.now()
    };
    
    // Only include notes if it's provided and not undefined
    if (notes !== undefined && notes !== null) {
      updates.notes = notes;
    }
    
    await updateDoc(doc(db, "applications", applicationId), updates);
  } catch (error) {
    console.error("Error updating application status:", error);
    throw error;
  }
};

// Messaging System
export const sendMessage = async (message: Omit<Message, 'id' | 'createdAt'>): Promise<string> => {
  try {
    // Ensure conversation exists
    let conversationId = message.conversationId;
    if (!conversationId) {
      // Auto-create conversation if not provided
      conversationId = await getOrCreateConversation([message.senderId, message.receiverId]);
    }

    // Store message in the conversation's chat subcollection
    // Structure: conversations/{conversationId}/chat/{messageId}
    const conversationRef = doc(db, "conversations", conversationId);
    const messagesRef = collection(conversationRef, "chat");
    const docRef = doc(messagesRef);
    
    const messageData: any = {
      senderId: message.senderId,
      receiverId: message.receiverId,
      messageText: message.message,
      message: message.message, // Keep both for backward compatibility
      messageType: message.messageType || 'text',
      seen: false,
      isRead: false, // Keep both for backward compatibility
      timestamp: Timestamp.now(),
      createdAt: Timestamp.now(),
      conversationId: conversationId
    };
    
    // Only include fileUrl and fileName if they are defined
    if (message.fileUrl !== undefined && message.fileUrl !== null) {
      messageData.fileUrl = message.fileUrl;
    }
    if (message.fileName !== undefined && message.fileName !== null) {
      messageData.fileName = message.fileName;
    }
    
    await setDoc(docRef, messageData);

    // Update conversation
    await updateConversation(conversationId, message.message, message.senderId);

    // Create notification for receiver if they are a recruiter
    try {
      const conversationDoc = await getDoc(doc(db, "conversations", message.conversationId));
      if (conversationDoc.exists()) {
        const conversationData = conversationDoc.data() as Conversation;
        const receiverId = message.receiverId;
        
        // Check if receiver is a recruiter
        const roleDoc = await getDoc(doc(db, "userRoles", receiverId));
        if (roleDoc.exists() && roleDoc.data().role === 'recruiter') {
          // Get sender profile for notification
          const senderProfile = await getProfile(message.senderId);
          const senderName = senderProfile?.fullName || 'A candidate';
          
          await createRecruiterNotification({
            recruiterId: receiverId,
            type: 'candidate_response',
            title: 'New Message',
            message: `${senderName} sent you a message`,
            relatedId: message.conversationId,
            isRead: false
          });
        }
      }
    } catch (notifError) {
      console.error("Error creating recruiter notification:", notifError);
      // Don't throw - message was sent successfully
    }

    return docRef.id;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

export const getMessagesByConversation = async (conversationId: string): Promise<Message[]> => {
  try {
    // Try new structure first: messages/{conversationId}/chat/{messageId}
    const conversationRef = doc(db, "conversations", conversationId);
    const messagesRef = collection(conversationRef, "chat");
    const q = query(messagesRef, orderBy("timestamp", "asc"));
    
    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          senderId: doc.data().senderId,
          receiverId: doc.data().receiverId,
          message: doc.data().messageText || doc.data().message || '',
          messageType: doc.data().messageType || 'text',
          fileUrl: doc.data().fileUrl,
          fileName: doc.data().fileName,
          isRead: doc.data().seen || doc.data().isRead || false,
          conversationId: conversationId,
          createdAt: doc.data().timestamp?.toDate() || doc.data().createdAt?.toDate() || new Date()
        })) as Message[];
      }
    } catch (subcollectionError) {
      // Fallback to old structure if subcollection doesn't exist
      console.log('Falling back to old message structure');
    }
    
    // Fallback to old structure: messages collection with conversationId field
    const oldQ = query(collection(db, "messages"), where("conversationId", "==", conversationId), orderBy("createdAt", "asc"));
    const oldQuerySnapshot = await getDocs(oldQ);
    return oldQuerySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    })) as Message[];
  } catch (error) {
    console.error("Error getting messages:", error);
    return [];
  }
};

export const getConversationsByUser = async (userId: string): Promise<Conversation[]> => {
  try {
    const q = query(collection(db, "conversations"), where("participants", "array-contains", userId), orderBy("lastMessageTime", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      lastMessageTime: doc.data().lastMessageTime.toDate(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as Conversation[];
  } catch (error) {
    console.error("Error getting conversations:", error);
    return [];
  }
};

/**
 * Get or create a conversation between two users
 * Ensures only one conversation exists per pair of users
 */
export const getOrCreateConversation = async (participants: string[]): Promise<string> => {
  try {
    // Sort participants to ensure consistent conversation ID lookup
    const sortedParticipants = [...participants].sort();
    
    // Check if conversation already exists
    // Firestore doesn't support direct array equality, so we check if both participants are in the array
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", sortedParticipants[0])
    );
    const querySnapshot = await getDocs(q);
    
    // Find conversation that has both participants
    const existingConversation = querySnapshot.docs.find(doc => {
      const data = doc.data();
      const docParticipants = data.participants || [];
      return docParticipants.length === sortedParticipants.length &&
             sortedParticipants.every(p => docParticipants.includes(p));
    });
    
    if (existingConversation) {
      // Return existing conversation ID
      return existingConversation.id;
    }
    
    // Create new conversation
    const docRef = doc(collection(db, "conversations"));
    const conversationData = {
      participants: sortedParticipants,
      lastMessage: "",
      lastMessageTime: Timestamp.now(),
      unreadCount: sortedParticipants.reduce((acc, participant) => ({ ...acc, [participant]: 0 }), {}),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    await setDoc(docRef, conversationData);
    return docRef.id;
  } catch (error) {
    console.error("Error getting or creating conversation:", error);
    throw error;
  }
};

export const createConversation = async (participants: string[]): Promise<string> => {
  return getOrCreateConversation(participants);
};

export const updateConversation = async (conversationId: string, lastMessage: string, senderId: string): Promise<void> => {
  try {
    const conversationRef = doc(db, "conversations", conversationId);
    const conversationDoc = await getDoc(conversationRef);

    if (conversationDoc.exists()) {
      const data = conversationDoc.data();
      const unreadCount = { ...data.unreadCount };

      // Increment unread count for all participants except sender
      data.participants.forEach((participant: string) => {
        if (participant !== senderId) {
          unreadCount[participant] = (unreadCount[participant] || 0) + 1;
        }
      });

      await updateDoc(conversationRef, {
        lastMessage,
        lastMessageTime: Timestamp.now(),
        unreadCount,
        updatedAt: Timestamp.now()
      });
    }
  } catch (error) {
    console.error("Error updating conversation:", error);
    throw error;
  }
};

export const markMessagesAsRead = async (conversationId: string, userId: string): Promise<void> => {
  try {
    // Update conversation unread count
    const conversationRef = doc(db, "conversations", conversationId);
    const conversationDoc = await getDoc(conversationRef);

    if (conversationDoc.exists()) {
      const data = conversationDoc.data();
      const unreadCount = { ...data.unreadCount };
      unreadCount[userId] = 0;

      await updateDoc(conversationRef, { unreadCount });
    }

    // Mark individual messages as read in new structure
    const messagesRef = collection(conversationRef, "chat");
    const q = query(
      messagesRef,
      where("receiverId", "==", userId)
    );
    
    try {
      const querySnapshot = await getDocs(q);
      const updatePromises = querySnapshot.docs
        .filter(doc => !doc.data().seen && !doc.data().isRead)
        .map(doc => updateDoc(doc.ref, { seen: true, isRead: true }));
      
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }
    } catch (subcollectionError) {
      // Fallback to old structure
      const oldQ = query(
        collection(db, "messages"),
        where("conversationId", "==", conversationId),
        where("receiverId", "==", userId),
        where("isRead", "==", false)
      );
      const oldQuerySnapshot = await getDocs(oldQ);
      const updatePromises = oldQuerySnapshot.docs.map(doc =>
        updateDoc(doc.ref, { isRead: true })
      );
      await Promise.all(updatePromises);
    }
  } catch (error) {
    console.error("Error marking messages as read:", error);
    throw error;
  }
};

// Interview Scheduling
export const scheduleInterview = async (interview: Omit<Interview, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = doc(collection(db, "interviews"));
    const interviewData = {
      ...interview,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    await setDoc(docRef, interviewData);
    return docRef.id;
  } catch (error) {
    console.error("Error scheduling interview:", error);
    throw error;
  }
};

export const getInterviewsByRecruiter = async (recruiterId: string): Promise<Interview[]> => {
  try {
    const q = query(collection(db, "interviews"), where("recruiterId", "==", recruiterId), orderBy("scheduledAt", "asc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scheduledAt: doc.data().scheduledAt.toDate(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as Interview[];
  } catch (error) {
    console.error("Error getting interviews:", error);
    return [];
  }
};

export const updateInterview = async (interviewId: string, updates: Partial<Interview>): Promise<void> => {
  try {
    await updateDoc(doc(db, "interviews", interviewId), {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Error updating interview:", error);
    throw error;
  }
};

// Shortlist Management
export const addToShortlist = async (shortlist: Omit<Shortlist, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const docRef = doc(collection(db, "shortlist"));
    const shortlistData = {
      ...shortlist,
      createdAt: Timestamp.now()
    };
    await setDoc(docRef, shortlistData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding to shortlist:", error);
    throw error;
  }
};

export const getShortlistByRecruiter = async (recruiterId: string): Promise<Shortlist[]> => {
  try {
    const q = query(collection(db, "shortlist"), where("recruiterId", "==", recruiterId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    })) as Shortlist[];
  } catch (error) {
    console.error("Error getting shortlist:", error);
    return [];
  }
};

export const removeFromShortlist = async (shortlistId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "shortlist", shortlistId));
  } catch (error) {
    console.error("Error removing from shortlist:", error);
    throw error;
  }
};

// Analytics
export const getRecruiterAnalytics = async (recruiterId: string): Promise<RecruiterAnalytics> => {
  try {
    // Get jobs
    const jobs = await getJobsByRecruiter(recruiterId);
    const activeJobs = jobs.filter(job => job.status === 'open').length;

    // Get applications
    const applications = await getApplicationsByRecruiter(recruiterId);
    const totalApplicants = applications.length;

    // Calculate new applicants this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newApplicantsThisWeek = applications.filter(app => app.appliedAt >= oneWeekAgo).length;

    // Calculate hired candidates
    const hiredCandidates = applications.filter(app => app.status === 'hired').length;

    // Get shortlist
    const shortlist = await getShortlistByRecruiter(recruiterId);
    const shortlistedCandidates = shortlist.length;

    // Calculate average time to hire (simplified)
    const hiredApplications = applications.filter(app => app.status === 'hired');
    const averageTimeToHire = hiredApplications.length > 0
      ? hiredApplications.reduce((sum, app) => {
          const job = jobs.find(j => j.id === app.jobId);
          if (job) {
            const timeDiff = app.updatedAt.getTime() - job.createdAt.getTime();
            return sum + (timeDiff / (1000 * 60 * 60 * 24)); // days
          }
          return sum;
        }, 0) / hiredApplications.length
      : 0;

    // Monthly activity (simplified - last 6 months)
    const monthlyActivity = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleString('default', { month: 'short' });

      const jobsPosted = jobs.filter(job => {
        const jobDate = new Date(job.createdAt);
        return jobDate.getMonth() === date.getMonth() && jobDate.getFullYear() === date.getFullYear();
      }).length;

      const applicantsReceived = applications.filter(app => {
        const appDate = new Date(app.appliedAt);
        return appDate.getMonth() === date.getMonth() && appDate.getFullYear() === date.getFullYear();
      }).length;

      const interviewsScheduled = 0; // Would need to implement interview tracking

      monthlyActivity.push({
        month: monthName,
        jobsPosted,
        applicantsReceived,
        interviewsScheduled
      });
    }

    return {
      totalJobs: jobs.length,
      activeJobs,
      totalApplicants,
      newApplicantsThisWeek,
      averageTimeToHire: Math.round(averageTimeToHire),
      shortlistedCandidates,
      hiredCandidates,
      monthlyActivity
    };
  } catch (error) {
    console.error("Error getting recruiter analytics:", error);
    return {
      totalJobs: 0,
      activeJobs: 0,
      totalApplicants: 0,
      newApplicantsThisWeek: 0,
      averageTimeToHire: 0,
      shortlistedCandidates: 0,
      hiredCandidates: 0,
      monthlyActivity: []
    };
  }
};

// Real-time listeners for recruiter dashboard
export const subscribeToJobs = (recruiterId: string, callback: (jobs: Job[]) => void) => {
  let unsubscribeFn: (() => void) | null = null;
  
  try {
    const q = query(
      collection(db, "jobs"),
      where("recruiterId", "==", recruiterId),
      orderBy("createdAt", "desc")
    );
    
    unsubscribeFn = onSnapshot(
      q,
      (querySnapshot) => {
        try {
          const jobs = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
      id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              deadline: data.deadline?.toDate ? data.deadline.toDate() : (data.deadline instanceof Date ? data.deadline : new Date()),
              applicationDeadline: data.applicationDeadline?.toDate ? data.applicationDeadline.toDate() : (data.applicationDeadline instanceof Date ? data.applicationDeadline : undefined)
            };
          }) as Job[];
    callback(jobs);
        } catch (error) {
          console.error('Error processing jobs:', error);
          callback([]);
        }
      },
      (error) => {
        console.error('Error in subscribeToJobs:', error);
        // If it's a missing index error, try fallback query
        if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
          console.warn('Missing Firestore index. Trying query without orderBy...');
          if (unsubscribeFn) {
            unsubscribeFn(); // Unsubscribe from the first query
          }
          
          const fallbackQuery = query(
            collection(db, "jobs"),
            where("recruiterId", "==", recruiterId)
          );
          
          unsubscribeFn = onSnapshot(
            fallbackQuery,
            (querySnapshot) => {
              const jobs = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                  id: doc.id,
                  ...data,
                  createdAt: data.createdAt?.toDate() || new Date(),
                  updatedAt: data.updatedAt?.toDate() || new Date(),
                  deadline: data.deadline?.toDate ? data.deadline.toDate() : data.deadline,
                  applicationDeadline: data.applicationDeadline?.toDate ? data.applicationDeadline.toDate() : data.applicationDeadline
                };
              }) as Job[];
              // Sort manually by createdAt
              jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
              callback(jobs);
            },
            (fallbackError) => {
              console.error('Error in fallback query:', fallbackError);
              callback([]); // Return empty array on error
            }
          );
        } else {
          callback([]); // Return empty array on other errors
        }
      }
    );
    
    return () => {
      if (unsubscribeFn) {
        unsubscribeFn();
      }
    };
  } catch (error) {
    console.error('Error setting up subscribeToJobs:', error);
    // Return a no-op unsubscribe function
    return () => {};
  }
};

export const subscribeToApplicationsByRecruiter = (recruiterId: string, callback: (applications: Application[]) => void) => {
  let unsubscribeFn: (() => void) | null = null;
  
  try {
    console.log('[subscribeToApplicationsByRecruiter] Setting up subscription for recruiterId:', recruiterId);
    const q = query(
      collection(db, "applications"),
      where("recruiterId", "==", recruiterId),
      orderBy("appliedAt", "desc")
    );
    
    unsubscribeFn = onSnapshot(
      q,
      (querySnapshot) => {
        console.log('[subscribeToApplicationsByRecruiter] Received', querySnapshot.docs.length, 'applications for recruiterId:', recruiterId);
        const applications = querySnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('[subscribeToApplicationsByRecruiter] Application doc:', {
      id: doc.id,
            recruiterId: data.recruiterId,
            userId: data.userId,
            jobId: data.jobId,
            jobTitle: data.jobTitle,
            userName: data.userName
          });
          return {
            id: doc.id,
            ...data,
            appliedAt: data.appliedAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          };
        }) as Application[];
        callback(applications);
      },
      (error) => {
        console.error('Error in subscribeToApplicationsByRecruiter:', error);
        // If it's a missing index error, try fallback query
        if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
          console.warn('Missing Firestore index. Trying query without orderBy...');
          if (unsubscribeFn) {
            unsubscribeFn(); // Unsubscribe from the first query
          }
          
          const fallbackQuery = query(
            collection(db, "applications"),
            where("recruiterId", "==", recruiterId)
          );
          
          unsubscribeFn = onSnapshot(
            fallbackQuery,
            (querySnapshot) => {
              const applications = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                  id: doc.id,
                  ...data,
                  appliedAt: data.appliedAt?.toDate() || new Date(),
                  updatedAt: data.updatedAt?.toDate() || new Date()
                };
              }) as Application[];
              // Sort manually by appliedAt
              applications.sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime());
              callback(applications);
            },
            (fallbackError) => {
              console.error('Error in fallback query:', fallbackError);
              callback([]); // Return empty array on error
            }
          );
        } else {
          callback([]); // Return empty array on other errors
        }
      }
    );
    
    return () => {
      if (unsubscribeFn) {
        unsubscribeFn();
      }
    };
  } catch (error) {
    console.error('Error setting up subscribeToApplicationsByRecruiter:', error);
    // Return a no-op unsubscribe function
    return () => {};
  }
};

export const subscribeToMessages = (userId: string, callback: (messages: Message[]) => void) => {
  const q = query(collection(db, "messages"),
    where("receiverId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  return onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    })) as Message[];
    callback(messages);
  });
};

export const subscribeToMessagesByConversation = (conversationId: string, callback: (messages: Message[]) => void) => {
  // Use new structure: conversations/{conversationId}/chat/{messageId}
  const conversationRef = doc(db, "conversations", conversationId);
  const messagesRef = collection(conversationRef, "chat");
  const q = query(messagesRef, orderBy("timestamp", "asc"));
  
  let fallbackUnsubscribe: (() => void) | null = null;
  let isUnsubscribed = false;
  let lastMessageIds = new Set<string>(); // Track message IDs to prevent duplicates
  
  // Try new structure first - onSnapshot provides real-time updates
  const unsubscribe = onSnapshot(q, 
    (querySnapshot) => {
      if (isUnsubscribed) return; // Prevent callback after unsubscribe
      
      const messages = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          senderId: data.senderId,
          receiverId: data.receiverId,
          message: data.messageText || data.message || '',
          messageType: data.messageType || 'text',
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          isRead: data.seen || data.isRead || false,
          conversationId: conversationId,
          createdAt: data.timestamp?.toDate() || data.createdAt?.toDate() || new Date()
        } as Message;
      });
      
      // Deduplicate messages by ID
      const uniqueMessages = messages.filter((msg, index, self) => 
        index === self.findIndex(m => m.id === msg.id)
      );
      
      // Only call callback if messages actually changed
      const currentIds = new Set(uniqueMessages.map(m => m.id));
      if (currentIds.size !== lastMessageIds.size || 
          ![...currentIds].every(id => lastMessageIds.has(id))) {
        lastMessageIds = currentIds;
        callback(uniqueMessages);
      }
    },
    (error) => {
      if (isUnsubscribed) return;
      
      // If subcollection doesn't exist or query fails, fallback to old structure
      console.log('Falling back to old message structure for real-time updates:', error);
      const oldQ = query(
        collection(db, "messages"),
        where("conversationId", "==", conversationId),
        orderBy("createdAt", "asc")
      );
      // Set up fallback subscription for real-time updates
      fallbackUnsubscribe = onSnapshot(oldQ, (querySnapshot) => {
        if (isUnsubscribed) return;
        
        const messages = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        })) as Message[];
        
        // Deduplicate messages by ID
        const uniqueMessages = messages.filter((msg, index, self) => 
          index === self.findIndex(m => m.id === msg.id)
        );
        
        // Only call callback if messages actually changed
        const currentIds = new Set(uniqueMessages.map(m => m.id));
        if (currentIds.size !== lastMessageIds.size || 
            ![...currentIds].every(id => lastMessageIds.has(id))) {
          lastMessageIds = currentIds;
          callback(uniqueMessages);
        }
      });
    }
  );
  
  // Return unsubscribe function that cleans up both listeners
  return () => {
    isUnsubscribed = true;
    unsubscribe();
    if (fallbackUnsubscribe) {
      fallbackUnsubscribe();
    }
  };
};

export const subscribeToConversations = (userId: string, callback: (conversations: Conversation[]) => void) => {
  const q = query(collection(db, "conversations"), where("participants", "array-contains", userId), orderBy("lastMessageTime", "desc"));
  return onSnapshot(q, (querySnapshot) => {
    const conversations = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      lastMessageTime: doc.data().lastMessageTime.toDate(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as Conversation[];
    callback(conversations);
  });
};

export const subscribeToInterviews = (recruiterId: string, callback: (interviews: Interview[]) => void) => {
  const q = query(collection(db, "interviews"), where("recruiterId", "==", recruiterId), orderBy("scheduledAt", "asc"));
  return onSnapshot(q, (querySnapshot) => {
    const interviews = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scheduledAt: doc.data().scheduledAt.toDate(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as Interview[];
    callback(interviews);
  });
};

// Recruiter Settings
export const getRecruiterSettings = async (recruiterId: string): Promise<RecruiterSettings | null> => {
  try {
    const docRef = doc(db, "recruiterSettings", recruiterId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        updatedAt: docSnap.data().updatedAt.toDate()
      } as RecruiterSettings;
    }

    // Create default settings if not exists
    const defaultSettings: Omit<RecruiterSettings, 'id'> = {
      recruiterId,
      emailNotifications: true,
      applicationAlerts: true,
      interviewReminders: true,
      weeklyReports: true,
      language: 'en',
      timezone: 'UTC',
      updatedAt: new Date()
    };

    await setDoc(docRef, defaultSettings);
    return { id: recruiterId, ...defaultSettings };
  } catch (error) {
    console.error("Error getting recruiter settings:", error);
    return null;
  }
};

export const updateRecruiterSettings = async (recruiterId: string, updates: Partial<RecruiterSettings>): Promise<void> => {
  try {
    await updateDoc(doc(db, "recruiterSettings", recruiterId), {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("Error updating recruiter settings:", error);
    throw error;
  }
};

// Recruiter Notifications
export const getRecruiterNotifications = async (recruiterId: string): Promise<RecruiterNotification[]> => {
  try {
    const q = query(collection(db, "recruiterNotifications"), where("recruiterId", "==", recruiterId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    })) as RecruiterNotification[];
  } catch (error) {
    console.error("Error getting recruiter notifications:", error);
    return [];
  }
};

export const markRecruiterNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, "recruiterNotifications", notificationId), { isRead: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

export const createRecruiterNotification = async (notification: Omit<RecruiterNotification, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const docRef = doc(collection(db, "recruiterNotifications"));
    const notificationData = {
      ...notification,
      createdAt: Timestamp.now()
    };
    await setDoc(docRef, notificationData);
    return docRef.id;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

export const subscribeToRecruiterNotifications = (recruiterId: string, callback: (notifications: RecruiterNotification[]) => void) => {
  const q = query(
    collection(db, "recruiterNotifications"),
    where("recruiterId", "==", recruiterId),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  return onSnapshot(q, (querySnapshot) => {
    const notifications = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    })) as RecruiterNotification[];
    callback(notifications);
  });
};

// Certificate Management
export const getCertificatesByUser = async (userId: string): Promise<Certificate[]> => {
  try {
    const q = query(collection(db, 'certificates'), where('userId', '==', userId), orderBy('submittedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      submittedAt: doc.data().submittedAt?.toDate(),
      reviewedAt: doc.data().reviewedAt?.toDate()
    } as Certificate));
  } catch (error) {
    console.error('Error getting user certificates:', error);
    return [];
  }
};

export const deleteCertificate = async (certificateId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'certificates', certificateId));
  } catch (error) {
    console.error('Error deleting certificate:', error);
    throw new Error('Failed to delete certificate');
  }
};

export const addCertificate = async (certificate: Omit<Certificate, 'id' | 'createdAt' | 'status'>): Promise<string> => {
  try {
    // Ensure submittedAt is a Firestore Timestamp
    const submittedAt = certificate.submittedAt 
      ? (certificate.submittedAt instanceof Date 
          ? Timestamp.fromDate(certificate.submittedAt) 
          : Timestamp.now())
      : Timestamp.now();
    
    const certificateData = {
      ...certificate,
      submittedAt: submittedAt, // Store as Firestore Timestamp
      status: 'pending' as const,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'certificates'), certificateData);
    console.log('[addCertificate] Certificate created with ID:', docRef.id, 'submittedAt:', submittedAt);
    return docRef.id;
  } catch (error) {
    console.error('Error adding certificate:', error);
    throw new Error('Failed to add certificate');
  }
};

// Enhanced certificate management
export const getCertificatesByStatus = async (status: 'pending' | 'verified' | 'rejected'): Promise<Certificate[]> => {
  try {
    const q = query(collection(db, "certificates"), where("status", "==", status), orderBy("submittedAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      submittedAt: doc.data().submittedAt?.toDate(),
      reviewedAt: doc.data().reviewedAt?.toDate()
    })) as Certificate[];
  } catch (error) {
    console.error("Error getting certificates by status:", error);
    return [];
  }
};

// Admin user management
export const addAdminUser = async (email: string, name: string): Promise<string> => {
  try {
    // Create auth user (this would need to be handled by Firebase Auth admin SDK on backend)
    // For now, we'll just store the admin info
    const adminData = {
      email,
      name,
      isActive: true,
      createdAt: Timestamp.now(),
      lastLogin: null as Date | null
    };
    const docRef = await addDoc(collection(db, "adminUsers"), adminData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding admin user:", error);
    throw error;
  }
};

export const getAdminUsers = async (): Promise<AdminUser[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "adminUsers"));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      lastLogin: doc.data().lastLogin?.toDate()
    })) as AdminUser[];
  } catch (error) {
    console.error("Error getting admin users:", error);
    return [];
  }
};

// Data reset functions (use with caution)
export const resetPlatformData = async (): Promise<void> => {
  try {
    // This is a dangerous operation - in production, this should have additional safeguards
    // For now, we'll just log the activity
    await addActivityLog({
      userId: 'admin',
      userName: 'Admin',
      action: 'Platform Data Reset',
      details: 'Platform data reset initiated by admin',
      adminId: 'admin',
      adminName: 'Admin'
    });
    // Actual reset logic would be implemented based on requirements
  } catch (error) {
    console.error("Error resetting platform data:", error);
    throw error;
  }
};

// Networking functions
export const getNetworkConnections = async (userId: string): Promise<Connection[]> => {
  try {
    const connections = await getConnectionsByUser(userId);
    return connections.filter(c => c.status === 'accepted');
  } catch (error) {
    console.error("Error getting network connections:", error);
    return [];
  }
};

export const getPendingConnectionRequests = async (userId: string): Promise<Connection[]> => {
  try {
    const connections = await getConnectionsByUser(userId);
    return connections.filter(c => c.status === 'pending' && c.initiatedBy !== userId);
  } catch (error) {
    console.error("Error getting pending requests:", error);
    return [];
  }
};

// Ratings and Reviews
export const addCandidateRating = async (rating: Omit<CandidateRating, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = doc(collection(db, "candidateRatings"));
    const ratingData = {
      ...rating,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    await setDoc(docRef, ratingData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding candidate rating:", error);
    throw error;
  }
};

export const getCandidateRatings = async (candidateId: string): Promise<CandidateRating[]> => {
  try {
    const q = query(collection(db, "candidateRatings"), where("candidateId", "==", candidateId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as CandidateRating[];
  } catch (error) {
    console.error("Error getting candidate ratings:", error);
    return [];
  }
};

// Saved Searches
export const saveSearchQuery = async (search: Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = doc(collection(db, "savedSearches"));
    const searchData = {
      ...search,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    await setDoc(docRef, searchData);
    return docRef.id;
  } catch (error) {
    console.error("Error saving search:", error);
    throw error;
  }
};

export const getSavedSearches = async (recruiterId: string): Promise<SavedSearch[]> => {
  try {
    const q = query(collection(db, "savedSearches"), where("recruiterId", "==", recruiterId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate(),
      lastRunAt: doc.data().lastRunAt?.toDate()
    })) as SavedSearch[];
  } catch (error) {
    console.error("Error getting saved searches:", error);
    return [];
  }
};

export const deleteSavedSearch = async (searchId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "savedSearches", searchId));
  } catch (error) {
    console.error("Error deleting saved search:", error);
    throw error;
  }
};

// Candidate Comparison
export const createCandidateComparison = async (comparison: Omit<import("./types").CandidateComparison, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const docRef = doc(collection(db, "candidateComparisons"));
    const comparisonData = {
      ...comparison,
      createdAt: Timestamp.now()
    };
    await setDoc(docRef, comparisonData);
    return docRef.id;
  } catch (error) {
    console.error("Error creating candidate comparison:", error);
    throw error;
  }
};

export const getCandidateComparisons = async (recruiterId: string): Promise<import("./types").CandidateComparison[]> => {
  try {
    const q = query(collection(db, "candidateComparisons"), where("recruiterId", "==", recruiterId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    })) as import("./types").CandidateComparison[];
  } catch (error) {
    console.error("Error getting candidate comparisons:", error);
    return [];
  }
};

// Get ratings by recruiter (helper function)
export const getRatingsByRecruiter = async (recruiterId: string): Promise<CandidateRating[]> => {
  try {
    const q = query(collection(db, "candidateRatings"), where("recruiterId", "==", recruiterId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as CandidateRating[];
  } catch (error) {
    console.error("Error getting ratings by recruiter:", error);
    return [];
  }
};

// Job Template Functions
export const createJobTemplate = async (templateData: Omit<JobTemplate, 'id' | 'createdAt' | 'updatedAt'> | any): Promise<string> => {
  try {
    const docRef = doc(collection(db, "jobTemplates"));
    const now = Timestamp.now();
    
    // Handle both flat structure (from component) and nested structure (from interface)
    // If templateData has title, description, requirements directly, store them
    // Otherwise, use the jobData structure
    const templateDoc: any = {
      recruiterId: templateData.recruiterId,
      name: templateData.name,
      category: templateData.category || '',
      createdAt: now,
      updatedAt: now
    };
    
    // If flat structure (title, description, requirements at top level)
    if (templateData.title || templateData.description || templateData.requirements || templateData.experienceLevel) {
      templateDoc.title = templateData.title || '';
      templateDoc.description = templateData.description || '';
      templateDoc.requirements = templateData.requirements || '';
      templateDoc.experienceLevel = templateData.experienceLevel || 'mid';
      // Also store in jobData for compatibility
      templateDoc.jobData = {
        title: templateData.title || '',
        description: templateData.description || '',
        requirements: templateData.requirements || '',
        experienceLevel: templateData.experienceLevel || 'mid',
        category: templateData.category || ''
      };
    } else if (templateData.jobData) {
      // If nested structure
      templateDoc.jobData = templateData.jobData;
    }
    
    templateDoc.isDefault = templateData.isDefault || false;
    
    await setDoc(docRef, templateDoc);
    return docRef.id;
  } catch (error) {
    console.error("Error creating job template:", error);
    throw error;
  }
};

export const getJobTemplates = async (recruiterId: string): Promise<JobTemplate[]> => {
  try {
    const q = query(
      collection(db, "jobTemplates"),
      where("recruiterId", "==", recruiterId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      // Handle both flat and nested structures
      const template: any = {
        id: doc.id,
        recruiterId: data.recruiterId,
        name: data.name,
        category: data.category || '',
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        isDefault: data.isDefault || false
      };
      
      // If flat structure exists, use it (for component compatibility)
      if (data.title !== undefined) {
        template.title = data.title;
        template.description = data.description || '';
        template.requirements = data.requirements || '';
        template.experienceLevel = data.experienceLevel || 'mid';
      }
      
      // Also include jobData if it exists
      if (data.jobData) {
        template.jobData = data.jobData;
      } else if (data.title) {
        // Create jobData from flat structure
        template.jobData = {
          title: data.title || '',
          description: data.description || '',
          requirements: data.requirements || '',
          experienceLevel: data.experienceLevel || 'mid',
          category: data.category || ''
        };
      }
      
      return template as JobTemplate;
    });
  } catch (error) {
    console.error("Error getting job templates:", error);
    // If orderBy fails, try without it
    try {
      const q = query(
        collection(db, "jobTemplates"),
        where("recruiterId", "==", recruiterId)
      );
      const querySnapshot = await getDocs(q);
      const templates = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const template: any = {
          id: doc.id,
          recruiterId: data.recruiterId,
          name: data.name,
          category: data.category || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          isDefault: data.isDefault || false
        };
        
        if (data.title !== undefined) {
          template.title = data.title;
          template.description = data.description || '';
          template.requirements = data.requirements || '';
          template.experienceLevel = data.experienceLevel || 'mid';
        }
        
        if (data.jobData) {
          template.jobData = data.jobData;
        } else if (data.title) {
          template.jobData = {
            title: data.title || '',
            description: data.description || '',
            requirements: data.requirements || '',
            experienceLevel: data.experienceLevel || 'mid',
            category: data.category || ''
          };
        }
        
        return template as JobTemplate;
      });
      // Sort manually by createdAt
      return templates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (fallbackError) {
      console.error("Error getting job templates (fallback):", fallbackError);
      return [];
    }
  }
};

export const updateJobTemplate = async (templateId: string, updates: Partial<JobTemplate> | any): Promise<void> => {
  try {
    const updateData: any = {
      updatedAt: Timestamp.now()
    };
    
    // Handle both flat and nested structures
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.isDefault !== undefined) updateData.isDefault = updates.isDefault;
    
    // If flat structure (title, description, requirements at top level)
    if (updates.title !== undefined || updates.description !== undefined || updates.requirements !== undefined || updates.experienceLevel !== undefined) {
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.requirements !== undefined) updateData.requirements = updates.requirements;
      if (updates.experienceLevel !== undefined) updateData.experienceLevel = updates.experienceLevel;
      
      // Also update jobData for compatibility
      updateData.jobData = {
        title: updates.title !== undefined ? updates.title : (updates.jobData?.title || ''),
        description: updates.description !== undefined ? updates.description : (updates.jobData?.description || ''),
        requirements: updates.requirements !== undefined ? updates.requirements : (updates.jobData?.requirements || ''),
        experienceLevel: updates.experienceLevel !== undefined ? updates.experienceLevel : (updates.jobData?.experienceLevel || 'mid'),
        category: updates.category !== undefined ? updates.category : (updates.jobData?.category || '')
      };
    } else if (updates.jobData) {
      // If nested structure
      updateData.jobData = updates.jobData;
    }
    
    await updateDoc(doc(db, "jobTemplates", templateId), updateData);
  } catch (error) {
    console.error("Error updating job template:", error);
    throw error;
  }
};

export const deleteJobTemplate = async (templateId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "jobTemplates", templateId));
  } catch (error) {
    console.error("Error deleting job template:", error);
    throw error;
  }
};
