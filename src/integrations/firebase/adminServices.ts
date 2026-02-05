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
  addDoc,
  writeBatch,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { sendPasswordResetEmail } from "firebase/auth";
import { db, storage, auth } from "./client";
import { 
  UserProfile, 
  Certificate, 
  Portfolio, 
  Review, 
  Connection, 
  SupportReport, 
  ActivityLog, 
  SystemSettings, 
  AdminUser,
  Notification,
  UserRole
} from "./types";

// ==================== ADMIN AUTHENTICATION & AUTHORIZATION ====================

export const isAdmin = async (userId: string): Promise<boolean> => {
  try {
    const roleDoc = await getDoc(doc(db, "userRoles", userId));
    if (roleDoc.exists()) {
      const role = roleDoc.data().role;
      return role === 'admin' || role === 'superadmin';
    }
    return false;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
};

export const getAdminRole = async (userId: string): Promise<'admin' | 'superadmin' | null> => {
  try {
    const roleDoc = await getDoc(doc(db, "userRoles", userId));
    if (roleDoc.exists()) {
      const role = roleDoc.data().role;
      if (role === 'admin' || role === 'superadmin') {
        return role;
      }
    }
    return null;
  } catch (error) {
    console.error("Error getting admin role:", error);
    return null;
  }
};


// ==================== ADMIN OVERVIEW DASHBOARD ====================

export interface AdminDashboardStats {
  totalYouth: number;
  totalRecruiters: number;
  verifiedYouth: number;
  pendingCertificates: number;
  totalCertificates: number;
  totalProjects: number;
  totalReviews: number;
  pendingReports: number;
  totalConnections: number;
  dailyGrowth: {
    youth: number;
    recruiters: number;
    projects: number;
    reviews: number;
  };
  weeklyGrowth: {
    youth: number;
    recruiters: number;
    projects: number;
    reviews: number;
  };
  systemAlerts: SystemAlert[];
}

export interface SystemAlert {
  id: string;
  type: 'flagged_account' | 'spam_detection' | 'suspicious_activity' | 'system_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  targetId?: string;
  targetType?: string;
  timestamp: Date;
  isResolved: boolean;
}

export const getAdminDashboardStats = async (): Promise<AdminDashboardStats> => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dayAgo = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // Get all users and profiles in parallel
    const [usersSnapshot, profilesSnapshot, userRolesSnapshot] = await Promise.all([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "profiles")),
      getDocs(collection(db, "userRoles"))
    ]);
    
    const roleMap = new Map<string, string>();
    userRolesSnapshot.docs.forEach(doc => {
      roleMap.set(doc.id, doc.data().role);
    });

    // Create maps for quick lookup
    const userDataMap = new Map<string, any>();
    usersSnapshot.docs.forEach(doc => {
      userDataMap.set(doc.id, doc.data());
    });

    const profileDataMap = new Map<string, any>();
    profilesSnapshot.docs.forEach(doc => {
      profileDataMap.set(doc.id, doc.data());
    });

    // Get all unique user IDs
    const allUserIds = new Set<string>();
    usersSnapshot.docs.forEach(doc => allUserIds.add(doc.id));
    profilesSnapshot.docs.forEach(doc => allUserIds.add(doc.id));

    let totalYouth = 0;
    let totalRecruiters = 0;
    let verifiedYouth = 0;

    // Count users from both collections
    allUserIds.forEach(userId => {
      const userData = userDataMap.get(userId) || {};
      const profileData = profileDataMap.get(userId) || {};
      
      // Determine role: check roleMap first, then profile data (recruiters have companyName)
      let role = roleMap.get(userId);
      if (!role) {
        role = profileData.companyName ? 'recruiter' : 'youth';
      }

      const isVerified = profileData.isVerified !== undefined ? profileData.isVerified : userData.isVerified || false;
      const createdAt = profileData.createdAt?.toDate 
        ? profileData.createdAt.toDate() 
        : userData.createdAt?.toDate 
          ? userData.createdAt.toDate() 
          : new Date(userData.createdAt || profileData.createdAt || now);
      
      if (role === 'youth') {
        totalYouth++;
        if (isVerified) verifiedYouth++;
      } else if (role === 'recruiter') {
        totalRecruiters++;
      }
    });

    // Get certificates
    const certificatesSnapshot = await getDocs(collection(db, "certificates"));
    const totalCertificates = certificatesSnapshot.docs.length;
    const pendingCertificates = certificatesSnapshot.docs.filter(
      doc => {
        const status = doc.data().status;
        return status === 'pending' || !status;
      }
    ).length;

    // Get projects
    const projectsSnapshot = await getDocs(collection(db, "portfolios"));
    const totalProjects = projectsSnapshot.docs.length;

    // Get reviews
    const reviewsSnapshot = await getDocs(collection(db, "reviews"));
    const totalReviews = reviewsSnapshot.docs.length;

    // Get reports
    let pendingReports = 0;
    try {
      const reportsSnapshot = await getDocs(query(
        collection(db, "reports"),
        where("status", "in", ["open", "pending"])
      ));
      pendingReports = reportsSnapshot.docs.length;
    } catch (error) {
      console.warn("Error fetching reports:", error);
      // Try without the 'in' query
      try {
        const allReportsSnapshot = await getDocs(collection(db, "reports"));
        pendingReports = allReportsSnapshot.docs.filter(
          doc => {
            const status = doc.data().status;
            return status === 'open' || status === 'pending';
          }
        ).length;
      } catch (err) {
        console.warn("Error fetching reports (fallback):", err);
      }
    }

    // Get connections count
    let totalConnections = 0;
    try {
      const connectionsSnapshot = await getDocs(collection(db, "connections"));
      totalConnections = connectionsSnapshot.docs.length;
    } catch (error) {
      console.warn("Error fetching connections:", error);
    }

    // Calculate daily growth (checking both users and profiles)
    const dailyYouth = Array.from(allUserIds).filter(userId => {
      const userData = userDataMap.get(userId) || {};
      const profileData = profileDataMap.get(userId) || {};
      const role = roleMap.get(userId) || (profileData.companyName ? 'recruiter' : 'youth');
      const createdAt = profileData.createdAt?.toDate 
        ? profileData.createdAt.toDate() 
        : userData.createdAt?.toDate 
          ? userData.createdAt.toDate() 
          : new Date(userData.createdAt || profileData.createdAt || 0);
      return role === 'youth' && createdAt >= dayAgo;
    }).length;

    const dailyRecruiters = Array.from(allUserIds).filter(userId => {
      const userData = userDataMap.get(userId) || {};
      const profileData = profileDataMap.get(userId) || {};
      const role = roleMap.get(userId) || (profileData.companyName ? 'recruiter' : 'youth');
      const createdAt = profileData.createdAt?.toDate 
        ? profileData.createdAt.toDate() 
        : userData.createdAt?.toDate 
          ? userData.createdAt.toDate() 
          : new Date(userData.createdAt || profileData.createdAt || 0);
      return role === 'recruiter' && createdAt >= dayAgo;
    }).length;

    const dailyProjects = projectsSnapshot.docs.filter(doc => {
      const createdAt = doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt);
      return createdAt >= dayAgo;
    }).length;

    const dailyReviews = reviewsSnapshot.docs.filter(doc => {
      const createdAt = doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt);
      return createdAt >= dayAgo;
    }).length;

    // Calculate weekly growth (checking both users and profiles)
    const weeklyYouth = Array.from(allUserIds).filter(userId => {
      const userData = userDataMap.get(userId) || {};
      const profileData = profileDataMap.get(userId) || {};
      const role = roleMap.get(userId) || (profileData.companyName ? 'recruiter' : 'youth');
      const createdAt = profileData.createdAt?.toDate 
        ? profileData.createdAt.toDate() 
        : userData.createdAt?.toDate 
          ? userData.createdAt.toDate() 
          : new Date(userData.createdAt || profileData.createdAt || 0);
      return role === 'youth' && createdAt >= weekAgo;
    }).length;

    const weeklyRecruiters = Array.from(allUserIds).filter(userId => {
      const userData = userDataMap.get(userId) || {};
      const profileData = profileDataMap.get(userId) || {};
      const role = roleMap.get(userId) || (profileData.companyName ? 'recruiter' : 'youth');
      const createdAt = profileData.createdAt?.toDate 
        ? profileData.createdAt.toDate() 
        : userData.createdAt?.toDate 
          ? userData.createdAt.toDate() 
          : new Date(userData.createdAt || profileData.createdAt || 0);
      return role === 'recruiter' && createdAt >= weekAgo;
    }).length;

    const weeklyProjects = projectsSnapshot.docs.filter(doc => {
      const createdAt = doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt);
      return createdAt >= weekAgo;
    }).length;

    const weeklyReviews = reviewsSnapshot.docs.filter(doc => {
      const createdAt = doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt);
      return createdAt >= weekAgo;
    }).length;

    // Get system alerts (without orderBy to avoid index requirement, we'll sort in memory)
    let systemAlerts: SystemAlert[] = [];
    try {
      const alertsSnapshot = await getDocs(query(
        collection(db, "systemAlerts"),
        where("isResolved", "==", false),
        limit(50) // Get more and sort in memory
      ));
      systemAlerts = alertsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : new Date(doc.data().timestamp)
        }))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10) as SystemAlert[];
    } catch (error) {
      console.warn("Error fetching system alerts (index may be required):", error);
      // Continue without alerts if query fails
      systemAlerts = [];
    }

    return {
      totalYouth,
      totalRecruiters,
      verifiedYouth,
      pendingCertificates,
      totalCertificates,
      totalProjects,
      totalReviews,
      pendingReports,
      totalConnections,
      dailyGrowth: {
        youth: dailyYouth,
        recruiters: dailyRecruiters,
        projects: dailyProjects,
        reviews: dailyReviews
      },
      weeklyGrowth: {
        youth: weeklyYouth,
        recruiters: weeklyRecruiters,
        projects: weeklyProjects,
        reviews: weeklyReviews
      },
      systemAlerts
    };
  } catch (error) {
    console.error("Error getting admin dashboard stats:", error);
    throw error;
  }
};

export const subscribeToAdminDashboardStats = (
  callback: (stats: AdminDashboardStats) => void
): (() => void) => {
  // Subscribe to multiple collections for real-time updates
  const unsubscribers: (() => void)[] = [];

  const updateStats = async () => {
    try {
      const stats = await getAdminDashboardStats();
      callback(stats);
    } catch (error) {
      console.error("Error updating dashboard stats:", error);
    }
  };

  // Subscribe to users
  unsubscribers.push(
    onSnapshot(collection(db, "users"), updateStats)
  );
  
  // Subscribe to certificates
  unsubscribers.push(
    onSnapshot(collection(db, "certificates"), updateStats)
  );
  
  // Subscribe to portfolios
  unsubscribers.push(
    onSnapshot(collection(db, "portfolios"), updateStats)
  );
  
  // Subscribe to reviews
  unsubscribers.push(
    onSnapshot(collection(db, "reviews"), updateStats)
  );
  
  // Subscribe to reports
  unsubscribers.push(
    onSnapshot(query(collection(db, "reports"), where("status", "in", ["open", "pending"])), updateStats)
  );

  // Initial load
  updateStats();

  return () => {
    unsubscribers.forEach(unsub => unsub());
  };
};

// ==================== USER MANAGEMENT ====================

export interface AdminUserProfile extends UserProfile {
  role: UserRole;
  lastActive?: Date;
  loginHistory?: Array<{
    timestamp: Date;
    ipAddress?: string;
    device?: string;
  }>;
  adminNotes?: string;
  skills?: Array<{
    id: string;
    name: string;
    verified: boolean;
  }>;
  certificates?: Array<{
    id: string;
    type: string;
    status: string;
  }>;
  portfolioCount?: number;
  reviewCount?: number;
  connectionCount?: number;
}

export const getAllUsersForAdmin = async (): Promise<AdminUserProfile[]> => {
  try {
    // Fetch all collections in parallel
    const [usersSnapshot, profilesSnapshot, rolesSnapshot] = await Promise.all([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "profiles")),
      getDocs(collection(db, "userRoles"))
    ]);

    // Create maps for quick lookup
    const roleMap = new Map<string, string>();
    rolesSnapshot.docs.forEach(doc => {
      roleMap.set(doc.id, doc.data().role);
    });

    const userDataMap = new Map<string, any>();
    usersSnapshot.docs.forEach(doc => {
      userDataMap.set(doc.id, doc.data());
    });

    const profileDataMap = new Map<string, any>();
    profilesSnapshot.docs.forEach(doc => {
      profileDataMap.set(doc.id, doc.data());
    });

    // Get all unique user IDs from both collections
    const allUserIds = new Set<string>();
    usersSnapshot.docs.forEach(doc => allUserIds.add(doc.id));
    profilesSnapshot.docs.forEach(doc => allUserIds.add(doc.id));

    // Process all users
    const users = await Promise.all(
      Array.from(allUserIds).map(async (userId) => {
        const userData = userDataMap.get(userId) || {};
        const profileData = profileDataMap.get(userId) || {};
        
        // Determine role: check roleMap first, then profile data (recruiters have companyName)
        let role = roleMap.get(userId);
        if (!role) {
          role = profileData.companyName ? 'recruiter' : 'youth';
        }

        // Merge user and profile data, prioritizing profile data for display info
        const mergedData = {
          ...userData,
          ...profileData,
          // Prefer profile displayName/fullName over user email
          fullName: profileData.fullName || profileData.displayName || userData.displayName || userData.email || 'Unknown',
          email: userData.email || profileData.email || 'No email',
          userId: userId,
          // Determine verification status
          isVerified: profileData.isVerified !== undefined ? profileData.isVerified : userData.isVerified || false,
          isSuspended: profileData.isSuspended !== undefined ? profileData.isSuspended : userData.isSuspended || false,
        };

        // Get additional data (only for youth users to avoid unnecessary queries for recruiters)
        let skillsSnapshot, certsSnapshot, portfoliosSnapshot, reviewsSnapshot, connectionsSnapshot;
        
        try {
          if (role === 'youth') {
            [skillsSnapshot, certsSnapshot, portfoliosSnapshot, reviewsSnapshot, connectionsSnapshot] = await Promise.all([
              getDocs(query(collection(db, "skills"), where("profileId", "==", userId))).catch(() => ({ docs: [] } as any)),
              getDocs(query(collection(db, "certificates"), where("userId", "==", userId))).catch(() => ({ docs: [] } as any)),
              getDocs(query(collection(db, "portfolios"), where("profileId", "==", userId))).catch(() => ({ docs: [] } as any)),
              getDocs(query(collection(db, "reviews"), where("youthId", "==", userId))).catch(() => ({ docs: [] } as any)),
              getDocs(query(collection(db, "connections"), where("userId", "==", userId))).catch(() => ({ docs: [] } as any))
            ]);
          } else {
            // For recruiters, we can skip some queries or get different data
            [skillsSnapshot, certsSnapshot, portfoliosSnapshot, reviewsSnapshot, connectionsSnapshot] = await Promise.all([
              Promise.resolve({ docs: [] } as any),
              Promise.resolve({ docs: [] } as any),
              Promise.resolve({ docs: [] } as any),
              getDocs(query(collection(db, "reviews"), where("recruiterId", "==", userId))).catch(() => ({ docs: [] } as any)),
              Promise.resolve({ docs: [] } as any)
            ]);
          }
        } catch (queryError) {
          console.warn(`Error fetching additional data for user ${userId}:`, queryError);
          // Set defaults if queries fail
          skillsSnapshot = { docs: [] } as any;
          certsSnapshot = { docs: [] } as any;
          portfoliosSnapshot = { docs: [] } as any;
          reviewsSnapshot = { docs: [] } as any;
          connectionsSnapshot = { docs: [] } as any;
        }

        // Handle date conversion
        const createdAt = mergedData.createdAt?.toDate 
          ? mergedData.createdAt.toDate() 
          : mergedData.createdAt instanceof Date 
            ? mergedData.createdAt 
            : mergedData.createdAt 
              ? new Date(mergedData.createdAt) 
              : new Date();

        const updatedAt = mergedData.updatedAt?.toDate 
          ? mergedData.updatedAt.toDate() 
          : mergedData.updatedAt instanceof Date 
            ? mergedData.updatedAt 
            : mergedData.updatedAt 
              ? new Date(mergedData.updatedAt) 
              : new Date();

        return {
          id: userId,
          userId: userId,
          fullName: mergedData.fullName,
          email: mergedData.email,
          role: role as UserRole,
          country: mergedData.country || profileData.country || 'N/A',
          isVerified: mergedData.isVerified,
          isSuspended: mergedData.isSuspended,
          createdAt: createdAt,
          updatedAt: updatedAt,
          photoURL: mergedData.photoURL || profileData.photoURL,
          companyName: profileData.companyName,
          skills: skillsSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().skillName || doc.data().name,
            verified: doc.data().verificationStatus === 'verified' || doc.data().verified === true
          })),
          certificates: certsSnapshot.docs.map(doc => ({
            id: doc.id,
            type: doc.data().certificateType || doc.data().type,
            status: doc.data().status
          })),
          portfolioCount: portfoliosSnapshot.docs.length,
          reviewCount: reviewsSnapshot.docs.length,
          connectionCount: connectionsSnapshot.docs.length
        } as AdminUserProfile;
      })
    );

    // Sort by creation date (newest first)
    users.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    console.log(`Successfully loaded ${users.length} users for admin`);
    return users;
  } catch (error) {
    console.error("Error getting all users for admin:", error);
    // Return empty array instead of throwing to prevent UI crashes
    // The error is already logged for debugging
    return [];
  }
};

export const getUserDetailsForAdmin = async (userId: string): Promise<AdminUserProfile | null> => {
  try {
    const [userDoc, roleDoc] = await Promise.all([
      getDoc(doc(db, "users", userId)),
      getDoc(doc(db, "userRoles", userId))
    ]);

    if (!userDoc.exists()) return null;

    const userData = userDoc.data();
    const role = roleDoc.exists() ? roleDoc.data().role : 'youth';

    // Get all related data
    const [skillsSnapshot, certsSnapshot, portfoliosSnapshot, reviewsSnapshot, connectionsSnapshot] = await Promise.all([
      getDocs(query(collection(db, "skills"), where("profileId", "==", userId))),
      getDocs(query(collection(db, "certificates"), where("userId", "==", userId))),
      getDocs(query(collection(db, "portfolios"), where("profileId", "==", userId))),
      getDocs(query(collection(db, "reviews"), where("youthId", "==", userId))),
      getDocs(query(collection(db, "connections"), where("userId", "==", userId)))
    ]);

    return {
      id: userId,
      ...userData,
      role: role as UserRole,
      createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt),
      updatedAt: userData.updatedAt?.toDate ? userData.updatedAt.toDate() : new Date(userData.updatedAt),
      skills: skillsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().skillName,
        verified: doc.data().verificationStatus === 'verified'
      })),
      certificates: certsSnapshot.docs.map(doc => ({
        id: doc.id,
        type: doc.data().certificateType,
        status: doc.data().status
      })),
      portfolioCount: portfoliosSnapshot.docs.length,
      reviewCount: reviewsSnapshot.docs.length,
      connectionCount: connectionsSnapshot.docs.length
    } as AdminUserProfile;
  } catch (error) {
    console.error("Error getting user details for admin:", error);
    return null;
  }
};

export const verifyUser = async (
  adminId: string,
  userId: string,
  isVerified: boolean,
  reason?: string
): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    const previousData = userDoc.exists() ? userDoc.data() : null;
    
    // Use setDoc with merge to create the document if it doesn't exist, or update if it does
    await setDoc(userRef, {
      isVerified,
      verifiedAt: isVerified ? Timestamp.now() : null,
      updatedAt: Timestamp.now()
    }, { merge: true });

  } catch (error) {
    console.error("Error verifying user:", error);
    throw error;
  }
};

export const suspendUser = async (
  adminId: string,
  userId: string,
  isSuspended: boolean,
  reason?: string,
  duration?: number // in days
): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId);
    const previousData = (await getDoc(userRef)).data();
    
    const updateData: any = {
      isSuspended,
      suspendedAt: isSuspended ? Timestamp.now() : null,
      updatedAt: Timestamp.now()
    };

    if (isSuspended && duration) {
      const suspensionEnd = new Date();
      suspensionEnd.setDate(suspensionEnd.getDate() + duration);
      updateData.suspensionEnd = Timestamp.fromDate(suspensionEnd);
    } else {
      updateData.suspensionEnd = null;
    }

    if (reason) {
      updateData.suspensionReason = reason;
    }

    await updateDoc(userRef, updateData);

  } catch (error) {
    console.error("Error suspending user:", error);
    throw error;
  }
};

export const deleteUserAccount = async (
  adminId: string,
  userId: string,
  reason?: string
): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId);
    const previousData = (await getDoc(userRef)).data();

    // Mark as deleted instead of actually deleting
    await updateDoc(userRef, {
      isDeleted: true,
      deletedAt: Timestamp.now(),
      deletedBy: adminId,
      deletionReason: reason,
      updatedAt: Timestamp.now()
    });

  } catch (error) {
    console.error("Error deleting user account:", error);
    throw error;
  }
};

export const resetUserPassword = async (
  adminId: string,
  userEmail: string
): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, userEmail);
    
  } catch (error) {
    console.error("Error resetting user password:", error);
    throw error;
  }
};

export const addAdminNote = async (
  adminId: string,
  userId: string,
  note: string
): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    const existingNotes = userDoc.data()?.adminNotes || [];
    
    await updateDoc(userRef, {
      adminNotes: arrayUnion({
        note,
        addedBy: adminId,
        addedAt: Timestamp.now()
      }),
      updatedAt: Timestamp.now()
    });

  } catch (error) {
    console.error("Error adding admin note:", error);
    throw error;
  }
};

// ==================== CERTIFICATE VERIFICATION ====================

export const getAllCertificatesForAdmin = async (): Promise<Certificate[]> => {
  try {
    console.log('[getAllCertificatesForAdmin] Fetching all certificates...');
    
    let certificatesSnapshot;
    try {
      // Try query with orderBy first
      certificatesSnapshot = await getDocs(
        query(collection(db, "certificates"), orderBy("submittedAt", "desc"))
      );
      console.log('[getAllCertificatesForAdmin] Found', certificatesSnapshot.docs.length, 'certificates with orderBy');
    } catch (orderByError: any) {
      // If orderBy fails (missing index or field), try without orderBy
      if (orderByError?.code === 'failed-precondition' || orderByError?.message?.includes('index')) {
        console.warn('[getAllCertificatesForAdmin] Missing Firestore index for submittedAt. Using fallback query without orderBy.');
        certificatesSnapshot = await getDocs(collection(db, "certificates"));
        console.log('[getAllCertificatesForAdmin] Found', certificatesSnapshot.docs.length, 'certificates without orderBy');
      } else {
        throw orderByError;
      }
    }
    

    // Process certificates from top-level collection
    const topLevelCerts = certificatesSnapshot.docs.map(doc => {
      const data = doc.data();
      console.log('[getAllCertificatesForAdmin] Certificate:', {
        id: doc.id,
        userId: data.userId,
        status: data.status,
        hasSubmittedAt: !!data.submittedAt,
        submittedAtType: typeof data.submittedAt
      });
      
      // Handle submittedAt conversion
      let submittedAt: Date;
      if (data.submittedAt) {
        if (data.submittedAt.toDate) {
          submittedAt = data.submittedAt.toDate();
        } else if (data.submittedAt instanceof Date) {
          submittedAt = data.submittedAt;
        } else if (typeof data.submittedAt === 'string') {
          submittedAt = new Date(data.submittedAt);
        } else {
          submittedAt = new Date();
        }
      } else {
        submittedAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
      }
      
      // Handle reviewedAt conversion
      let reviewedAt: Date | undefined;
      if (data.reviewedAt) {
        if (data.reviewedAt.toDate) {
          reviewedAt = data.reviewedAt.toDate();
        } else if (data.reviewedAt instanceof Date) {
          reviewedAt = data.reviewedAt;
        } else if (typeof data.reviewedAt === 'string') {
          reviewedAt = new Date(data.reviewedAt);
        }
      }
      
      // Ensure status is properly set
      let status: 'pending' | 'verified' | 'rejected' = 'pending';
      if (data.status === 'verified' || data.status === 'Verified') {
        status = 'verified';
      } else if (data.status === 'rejected' || data.status === 'Rejected') {
        status = 'rejected';
      }
      
      return {
        id: doc.id,
        userId: data.userId || '',
        userName: data.userName || 'Unknown User',
        certificateType: data.certificateType || data.certificateName || 'Certificate',
        fileUrl: data.fileUrl || data.linkUrl || '',
        status: status,
        submittedAt,
        reviewedAt,
        adminNotes: data.adminNotes,
        reviewerId: data.reviewerId,
        description: data.description || `${data.certificateType || data.certificateName || 'Certificate'} from ${data.issuingOrganization || 'Unknown Organization'}`
      } as Certificate;
    });
    
    // ALSO check subcollections (users/{userId}/certifications) for certificates that might not be in the top-level collection
    console.log('[getAllCertificatesForAdmin] Also checking subcollections for certificates...');
    const subcollectionCerts: Certificate[] = [];
    try {
      // Check both users and profiles collections
      const [usersSnapshot, profilesSnapshot] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "profiles"))
      ]);
      
      const allUserIds = new Set<string>();
      usersSnapshot.docs.forEach(doc => allUserIds.add(doc.id));
      profilesSnapshot.docs.forEach(doc => allUserIds.add(doc.id));
      
      console.log('[getAllCertificatesForAdmin] Checking', allUserIds.size, 'users for certificates in subcollections');
      
      for (const userId of allUserIds) {
        try {
          const certsRef = collection(db, 'users', userId, 'certifications');
          const certsSnapshot = await getDocs(certsRef);
          
          if (certsSnapshot.docs.length > 0) {
            console.log(`[getAllCertificatesForAdmin] Found ${certsSnapshot.docs.length} certificates in subcollection for user ${userId}`);
          }
          
          for (const certDoc of certsSnapshot.docs) {
            const certData = certDoc.data();
            const verificationStatus = certData.verificationStatus || certData.status || 'Pending';
            
            console.log(`[getAllCertificatesForAdmin] Processing certificate ${certDoc.id} for user ${userId}, status: ${verificationStatus}`);
            
            // Check if this certificate already exists in the top-level collection
            // Only skip if it's already verified/rejected in top-level (to avoid duplicates)
            // But include pending ones from subcollections even if they exist in top-level
            const existsInTopLevel = topLevelCerts.find(cert => {
              // Check by document ID first (most reliable)
              if (cert.id === certDoc.id) {
                return true;
              }
              // Then check by userId and certificate name/type and file URL
              if (cert.userId === userId) {
                const certNameMatch = cert.certificateType === (certData.certificateName || certData.certificateType || '');
                const fileUrlMatch = cert.fileUrl === (certData.fileUrl || certData.linkUrl || '');
                if (certNameMatch || fileUrlMatch) {
                  return true;
                }
              }
              return false;
            });
            
            // Always include ALL certificates from subcollections
            // Don't skip any - we want to show all pending certificates
            console.log(`[getAllCertificatesForAdmin] Including certificate ${certDoc.id} from subcollection (verificationStatus: ${verificationStatus})`);
            
            // Get user name from either users or profiles collection
            let userName = 'Unknown User';
            try {
              const userDoc = usersSnapshot.docs.find(d => d.id === userId);
              const profileDoc = profilesSnapshot.docs.find(d => d.id === userId);
              
              // profileDoc is a QueryDocumentSnapshot, not a DocumentSnapshot, so it always exists if found
              if (profileDoc) {
                const profileData = profileDoc.data();
                userName = profileData.fullName || profileData.name || userName;
              }
              if (userDoc && userName === 'Unknown User') {
                const userData = userDoc.data();
                userName = userData.fullName || userData.displayName || userData.name || userName;
              }
            } catch (nameError) {
              console.warn(`[getAllCertificatesForAdmin] Error getting user name for ${userId}:`, nameError);
            }
            
            // Convert verificationStatus to status format
            let status: 'pending' | 'verified' | 'rejected' = 'pending';
            if (verificationStatus === 'Verified' || verificationStatus === 'verified') {
              status = 'verified';
            } else if (verificationStatus === 'Rejected' || verificationStatus === 'rejected') {
              status = 'rejected';
            }
            
            // Get submittedAt date
            let submittedAt: Date;
            if (certData.createdAt) {
              submittedAt = certData.createdAt.toDate ? certData.createdAt.toDate() : 
                           (certData.createdAt instanceof Date ? certData.createdAt : new Date(certData.createdAt));
            } else if (certData.completionDate) {
              submittedAt = new Date(certData.completionDate);
            } else {
              submittedAt = new Date();
            }
            
            const certToAdd: Certificate = {
              id: certDoc.id,
              userId: userId,
              userName: userName,
              certificateType: certData.certificateName || certData.certificateType || 'Certificate',
              fileUrl: certData.fileUrl || certData.linkUrl || '',
              status: status,
              submittedAt: submittedAt,
              description: `${certData.certificateName || certData.certificateType || 'Certificate'} from ${certData.issuingOrganization || 'Unknown Organization'}`,
            };
            
            subcollectionCerts.push(certToAdd);
            console.log(`[getAllCertificatesForAdmin] Added certificate ${certDoc.id} from subcollection:`, {
              id: certToAdd.id,
              userId: certToAdd.userId,
              userName: certToAdd.userName,
              certificateType: certToAdd.certificateType,
              status: certToAdd.status,
              hasFileUrl: !!certToAdd.fileUrl
            });
          }
        } catch (subError) {
          console.warn(`[getAllCertificatesForAdmin] Error checking subcollection for user ${userId}:`, subError);
          // Continue with other users
        }
      }
      
      console.log('[getAllCertificatesForAdmin] Found', subcollectionCerts.length, 'additional certificates in subcollections');
    } catch (subcollectionError) {
      console.error('[getAllCertificatesForAdmin] Error checking subcollections:', subcollectionError);
      console.error('[getAllCertificatesForAdmin] Error details:', subcollectionError);
      // Continue with just top-level certificates
    }
    
    // Combine both sources - prioritize subcollection certificates (user uploads)
    // Only deduplicate by document ID, not by content matching
    const allCertificates: Certificate[] = [];
    const processedIds = new Set<string>();
    
    console.log(`[getAllCertificatesForAdmin] Combining certificates: ${topLevelCerts.length} from top-level, ${subcollectionCerts.length} from subcollections`);
    
    // First, add ALL subcollection certificates (these are the user uploads we want to verify)
    for (const cert of subcollectionCerts) {
      if (!processedIds.has(cert.id)) {
        allCertificates.push(cert);
        processedIds.add(cert.id);
        console.log(`[getAllCertificatesForAdmin] Added subcollection cert: ${cert.id} - ${cert.certificateType} (status: ${cert.status}, user: ${cert.userName})`);
      } else {
        console.log(`[getAllCertificatesForAdmin] Skipping duplicate subcollection cert ID: ${cert.id}`);
      }
    }
    
    // Then, add top-level certificates that don't have the same ID
    // (These might be certificates that were already verified/rejected)
    for (const cert of topLevelCerts) {
      if (!processedIds.has(cert.id)) {
        allCertificates.push(cert);
        processedIds.add(cert.id);
        console.log(`[getAllCertificatesForAdmin] Added top-level cert: ${cert.id} - ${cert.certificateType} (status: ${cert.status})`);
      } else {
        console.log(`[getAllCertificatesForAdmin] Skipping top-level cert ${cert.id} - already exists in subcollection`);
      }
    }
    
    // Sort by submittedAt (newest first)
    allCertificates.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
    
    // Log final statistics
    const statusCounts = {
      pending: allCertificates.filter(c => c.status === 'pending').length,
      verified: allCertificates.filter(c => c.status === 'verified').length,
      rejected: allCertificates.filter(c => c.status === 'rejected').length
    };
    
    console.log('[getAllCertificatesForAdmin] Final result:', {
      total: allCertificates.length,
      fromTopLevel: topLevelCerts.length,
      fromSubcollections: subcollectionCerts.length,
      statusCounts
    });
    
    return allCertificates;
  } catch (error) {
    console.error("Error getting all certificates:", error);
    // Return empty array on error instead of throwing
    return [];
  }
};

export const verifyCertificate = async (
  adminId: string,
  certificateId: string,
  status: 'verified' | 'rejected' | 'need_more_info',
  adminNotes?: string,
  rejectionReason?: string,
  userIdHint?: string // Optional userId to speed up search
): Promise<void> => {
  try {
    // First, try to find the certificate in the top-level collection
    const certRef = doc(db, "certificates", certificateId);
    let certDoc = await getDoc(certRef);
    
    let previousData: any = null;
    let userId: string | null = null;
    let foundInSubcollection = false;
    
    if (certDoc.exists()) {
      // Certificate exists in top-level collection
      previousData = certDoc.data();
      userId = previousData.userId;
      console.log('[verifyCertificate] Found certificate in top-level collection');
    } else {
      // Certificate might be in a subcollection, try to find it
      console.log('[verifyCertificate] Certificate not found in top-level collection, searching subcollections...');
      console.log('[verifyCertificate] Looking for certificate ID:', certificateId);
      console.log('[verifyCertificate] UserId hint provided:', userIdHint);
      
      // If we have a userId hint, try that first
      if (userIdHint) {
        try {
          const subCertRef = doc(db, 'users', userIdHint, 'certifications', certificateId);
          const subCertDoc = await getDoc(subCertRef);
          
          if (subCertDoc.exists()) {
            previousData = subCertDoc.data();
            userId = userIdHint;
            foundInSubcollection = true;
            console.log(`[verifyCertificate] Found certificate using userId hint for user ${userIdHint}`);
            
            // Create in top-level collection
            const certData = subCertDoc.data();
            const profile = await getDoc(doc(db, "profiles", userIdHint)).catch(() => null);
            const profileData = profile?.exists() ? profile.data() : null;
            const [usersSnapshot] = await Promise.all([getDocs(collection(db, "users"))]);
            const userDoc = usersSnapshot.docs.find(d => d.id === userIdHint);
            const userData = userDoc?.data() || {};
            
            let submittedAtTimestamp: Timestamp;
            if (certData.createdAt) {
              if (certData.createdAt.toDate) {
                submittedAtTimestamp = Timestamp.fromDate(certData.createdAt.toDate());
              } else if (certData.createdAt instanceof Timestamp) {
                submittedAtTimestamp = certData.createdAt;
              } else if (certData.createdAt instanceof Date) {
                submittedAtTimestamp = Timestamp.fromDate(certData.createdAt);
              } else {
                submittedAtTimestamp = Timestamp.now();
              }
            } else if (certData.completionDate) {
              submittedAtTimestamp = Timestamp.fromDate(new Date(certData.completionDate));
            } else {
              submittedAtTimestamp = Timestamp.now();
            }
            
            const topLevelCertData = {
              userId: userIdHint,
              userName: profileData?.fullName || userData?.fullName || userData?.displayName || 'Unknown User',
              certificateType: certData.certificateName || certData.certificateType || 'Certificate',
              fileUrl: certData.fileUrl || certData.linkUrl || '',
              status: status === 'need_more_info' ? 'pending' : status,
              submittedAt: submittedAtTimestamp,
              reviewedAt: Timestamp.now(),
              reviewerId: adminId,
              updatedAt: Timestamp.now(),
              description: `${certData.certificateName || 'Certificate'} from ${certData.issuingOrganization || 'Unknown Organization'}`,
              ...(adminNotes && { adminNotes }),
              ...(status === 'rejected' && rejectionReason && { rejectionReason }),
            };
            
            await setDoc(certRef, topLevelCertData);
            console.log('[verifyCertificate] Created certificate in top-level collection with ID:', certificateId);
            certDoc = await getDoc(certRef);
          }
        } catch (hintError: any) {
          console.warn(`[verifyCertificate] Error using userId hint ${userIdHint}:`, hintError?.message || hintError);
        }
      }
      
      // If still not found, search all users
      if (!previousData || !userId) {
        // Check both users and profiles collections
        const [usersSnapshot, profilesSnapshot] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "profiles"))
        ]);
        
        const allUserIds = new Set<string>();
        usersSnapshot.docs.forEach(doc => allUserIds.add(doc.id));
        profilesSnapshot.docs.forEach(doc => allUserIds.add(doc.id));
        
        console.log(`[verifyCertificate] Checking ${allUserIds.size} users for certificate in subcollections`);
        
        for (const currentUserId of allUserIds) {
          try {
            const subCertRef = doc(db, 'users', currentUserId, 'certifications', certificateId);
            const subCertDoc = await getDoc(subCertRef);
          
            if (subCertDoc.exists()) {
              previousData = subCertDoc.data();
              userId = currentUserId;
              foundInSubcollection = true;
              console.log(`[verifyCertificate] Found certificate in subcollection for user ${currentUserId}`);
              console.log(`[verifyCertificate] Certificate data:`, {
                certificateName: previousData.certificateName,
                verificationStatus: previousData.verificationStatus,
                fileUrl: previousData.fileUrl,
                linkUrl: previousData.linkUrl
              });
              
              // Also create/update it in the top-level collection for future reference
              const certData = subCertDoc.data();
              const profile = await getDoc(doc(db, "profiles", currentUserId)).catch(() => null);
              const profileData = profile?.exists() ? profile.data() : null;
              const userDoc = usersSnapshot.docs.find(d => d.id === currentUserId);
              const userData = userDoc?.data() || {};
              
              // Handle date conversion properly
              let submittedAtTimestamp: Timestamp;
              if (certData.createdAt) {
                if (certData.createdAt.toDate) {
                  submittedAtTimestamp = Timestamp.fromDate(certData.createdAt.toDate());
                } else if (certData.createdAt instanceof Timestamp) {
                  submittedAtTimestamp = certData.createdAt;
                } else if (certData.createdAt instanceof Date) {
                  submittedAtTimestamp = Timestamp.fromDate(certData.createdAt);
                } else {
                  submittedAtTimestamp = Timestamp.now();
                }
              } else if (certData.completionDate) {
                submittedAtTimestamp = Timestamp.fromDate(new Date(certData.completionDate));
              } else {
                submittedAtTimestamp = Timestamp.now();
              }
              
              const topLevelCertData = {
                userId: currentUserId,
                userName: profileData?.fullName || userData?.fullName || userData?.displayName || 'Unknown User',
                certificateType: certData.certificateName || certData.certificateType || 'Certificate',
                fileUrl: certData.fileUrl || certData.linkUrl || '',
                status: status === 'need_more_info' ? 'pending' : status,
                submittedAt: submittedAtTimestamp,
                reviewedAt: Timestamp.now(),
                reviewerId: adminId,
                updatedAt: Timestamp.now(),
                description: `${certData.certificateName || 'Certificate'} from ${certData.issuingOrganization || 'Unknown Organization'}`,
                ...(adminNotes && { adminNotes }),
                ...(status === 'rejected' && rejectionReason && { rejectionReason }),
              };
              
              // Create in top-level collection
              await setDoc(certRef, topLevelCertData);
              console.log('[verifyCertificate] Created certificate in top-level collection with ID:', certificateId);
              
              // Re-fetch the document now that it exists
              certDoc = await getDoc(certRef);
              if (certDoc.exists()) {
                console.log('[verifyCertificate] Successfully verified certificate exists in top-level collection');
              } else {
                console.error('[verifyCertificate] Certificate still not found after creation!');
              }
              break;
            }
          } catch (subError: any) {
            console.warn(`[verifyCertificate] Error checking subcollection for user ${currentUserId}:`, subError?.message || subError);
            // Continue searching
            continue;
          }
        }
        
        // If still not found, try searching all subcollections more thoroughly
        if (!previousData || !userId) {
          console.log('[verifyCertificate] Certificate not found in first pass, trying alternative search...');
          
          // Try searching by getting all certifications and filtering
          for (const currentUserId of allUserIds) {
            try {
              const certsRef = collection(db, 'users', currentUserId, 'certifications');
              const certsSnapshot = await getDocs(certsRef);
            
              console.log(`[verifyCertificate] Checking ${certsSnapshot.docs.length} certificates for user ${currentUserId}`);
              
              const matchingCert = certsSnapshot.docs.find(d => d.id === certificateId);
              if (matchingCert) {
                previousData = matchingCert.data();
                userId = currentUserId;
                foundInSubcollection = true;
                console.log(`[verifyCertificate] Found certificate in alternative search for user ${currentUserId}`);
                
                // Create in top-level collection
                const certData = matchingCert.data();
                const profile = await getDoc(doc(db, "profiles", currentUserId)).catch(() => null);
                const profileData = profile?.exists() ? profile.data() : null;
                const userDoc = usersSnapshot.docs.find(d => d.id === currentUserId);
                const userData = userDoc?.data() || {};
                
                let submittedAtTimestamp: Timestamp;
                if (certData.createdAt) {
                  if (certData.createdAt.toDate) {
                    submittedAtTimestamp = Timestamp.fromDate(certData.createdAt.toDate());
                  } else if (certData.createdAt instanceof Timestamp) {
                    submittedAtTimestamp = certData.createdAt;
                  } else if (certData.createdAt instanceof Date) {
                    submittedAtTimestamp = Timestamp.fromDate(certData.createdAt);
                  } else {
                    submittedAtTimestamp = Timestamp.now();
                  }
                } else if (certData.completionDate) {
                  submittedAtTimestamp = Timestamp.fromDate(new Date(certData.completionDate));
                } else {
                  submittedAtTimestamp = Timestamp.now();
                }
                
                const topLevelCertData = {
                  userId: currentUserId,
                  userName: profileData?.fullName || userData?.fullName || userData?.displayName || 'Unknown User',
                  certificateType: certData.certificateName || certData.certificateType || 'Certificate',
                  fileUrl: certData.fileUrl || certData.linkUrl || '',
                  status: status === 'need_more_info' ? 'pending' : status,
                  submittedAt: submittedAtTimestamp,
                  reviewedAt: Timestamp.now(),
                  reviewerId: adminId,
                  updatedAt: Timestamp.now(),
                  description: `${certData.certificateName || 'Certificate'} from ${certData.issuingOrganization || 'Unknown Organization'}`,
                  ...(adminNotes && { adminNotes }),
                  ...(status === 'rejected' && rejectionReason && { rejectionReason }),
                };
                
                await setDoc(certRef, topLevelCertData);
                console.log('[verifyCertificate] Created certificate in top-level collection via alternative search');
                certDoc = await getDoc(certRef);
                break;
              }
            } catch (altError: any) {
              console.warn(`[verifyCertificate] Error in alternative search for user ${currentUserId}:`, altError?.message || altError);
              continue;
            }
          }
        }
      }
    }
    
    if (!previousData || !userId) {
      throw new Error(`Certificate ${certificateId} not found in any collection`);
    }
    
    // Update the certificate (either in top-level or subcollection)
    const updateData: any = {
      status: status === 'need_more_info' ? 'pending' : status,
      reviewedAt: Timestamp.now(),
      reviewerId: adminId,
      updatedAt: Timestamp.now()
    };

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    if (status === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }
    
    // Update in top-level collection (it should exist now - either it existed before or we just created it)
    if (certDoc.exists()) {
      await updateDoc(certRef, updateData);
      console.log('[verifyCertificate] Updated certificate in top-level collection');
    } else {
      console.warn('[verifyCertificate] Certificate still not found in top-level collection after creation attempt');
    }
    
    // Also update in subcollection if it exists there
    if (foundInSubcollection) {
      try {
        const subCertRef = doc(db, 'users', userId, 'certifications', certificateId);
        const subCertDoc = await getDoc(subCertRef);
        
        if (subCertDoc.exists()) {
          // Map status to verificationStatus format used in subcollection
          const subUpdateData: any = {
            verificationStatus: status === 'verified' ? 'Verified' : status === 'rejected' ? 'Rejected' : 'Pending',
            adminFeedback: adminNotes || '',
            updatedAt: serverTimestamp()
          };
          
          await updateDoc(subCertRef, subUpdateData);
          console.log('[verifyCertificate] Updated certificate in subcollection');
        }
      } catch (subUpdateError) {
        console.warn('[verifyCertificate] Could not update subcollection:', subUpdateError);
        // Continue - the top-level update succeeded
      }
    }

  } catch (error) {
    console.error("Error verifying certificate:", error);
    throw error;
  }
};

export const verifySkill = async (
  adminId: string,
  skillId: string,
  isVerified: boolean
): Promise<void> => {
  try {
    const skillRef = doc(db, "skills", skillId);
    const previousData = (await getDoc(skillRef)).data();

    await updateDoc(skillRef, {
      verificationStatus: isVerified ? 'verified' : 'pending',
      verifiedAt: isVerified ? Timestamp.now() : null,
      verifiedBy: isVerified ? adminId : null,
      updatedAt: Timestamp.now()
    });

  } catch (error) {
    console.error("Error verifying skill:", error);
    throw error;
  }
};

// ==================== PORTFOLIO & PROJECT MODERATION ====================

export const getAllProjectsForAdmin = async (): Promise<Portfolio[]> => {
  try {
    const projectsSnapshot = await getDocs(
      query(collection(db, "portfolios"), orderBy("createdAt", "desc"))
    );

    return projectsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
    })) as Portfolio[];
  } catch (error) {
    console.error("Error getting all projects:", error);
    return [];
  }
};

export const moderateProject = async (
  adminId: string,
  projectId: string,
  action: 'approve' | 'reject' | 'feature' | 'unfeature',
  adminNotes?: string,
  rejectionReason?: string
): Promise<void> => {
  try {
    const projectRef = doc(db, "portfolios", projectId);
    const previousData = (await getDoc(projectRef)).data();

    const updateData: any = {
      updatedAt: Timestamp.now()
    };

    if (action === 'approve') {
      updateData.status = 'approved';
      updateData.isFlagged = false;
    } else if (action === 'reject') {
      updateData.status = 'rejected';
      updateData.rejectionReason = rejectionReason;
    } else if (action === 'feature') {
      updateData.isFeatured = true;
    } else if (action === 'unfeature') {
      updateData.isFeatured = false;
    }

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    await updateDoc(projectRef, updateData);

  } catch (error) {
    console.error("Error moderating project:", error);
    throw error;
  }
};

// ==================== REVIEWS & RATINGS MODERATION ====================

export const getAllReviewsForAdmin = async (): Promise<Review[]> => {
  try {
    const reviewsSnapshot = await getDocs(
      query(collection(db, "reviews"), orderBy("createdAt", "desc"))
    );

    return reviewsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt),
      updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : undefined,
      submittedAt: doc.data().submittedAt?.toDate ? doc.data().submittedAt.toDate() : undefined
    })) as Review[];
  } catch (error) {
    console.error("Error getting all reviews:", error);
    return [];
  }
};

export const moderateReview = async (
  adminId: string,
  reviewId: string,
  action: 'hide' | 'unhide' | 'delete',
  reason?: string
): Promise<void> => {
  try {
    const reviewRef = doc(db, "reviews", reviewId);
    const previousData = (await getDoc(reviewRef)).data();

    if (action === 'delete') {
      await deleteDoc(reviewRef);
    } else {
      await updateDoc(reviewRef, {
        isHidden: action === 'hide',
        hiddenAt: action === 'hide' ? Timestamp.now() : null,
        hiddenBy: action === 'hide' ? adminId : null,
        hiddenReason: action === 'hide' ? reason : null,
        updatedAt: Timestamp.now()
      });
    }

  } catch (error) {
    console.error("Error moderating review:", error);
    throw error;
  }
};

// ==================== NETWORK ACTIVITY MONITORING ====================

export interface AdminConnection extends Connection {
  fromUserName?: string;
  fromUserEmail?: string;
  toUserName?: string;
  toUserEmail?: string;
  initiatedByName?: string;
}

export const getAllConnectionsForAdmin = async (): Promise<AdminConnection[]> => {
  try {
    const connectionsSnapshot = await getDocs(
      query(collection(db, "connections"), orderBy("createdAt", "desc"))
    );

    // Get all unique user IDs
    const userIds = new Set<string>();
    connectionsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.userId) userIds.add(data.userId);
      if (data.connectedUserId) userIds.add(data.connectedUserId);
      if (data.initiatedBy) userIds.add(data.initiatedBy);
    });

    // Fetch user data for all involved users
    const userDataMap = new Map<string, { name: string; email: string }>();
    await Promise.all(
      Array.from(userIds).map(async (uid) => {
        try {
          const [userDoc, profileDoc] = await Promise.all([
            getDoc(doc(db, "users", uid)).catch(() => null),
            getDoc(doc(db, "profiles", uid)).catch(() => null)
          ]);

          const userData = userDoc?.data() || {};
          const profileData = profileDoc?.data() || {};

          const name = profileData.fullName || profileData.displayName || userData.displayName || userData.fullName || 'Unknown User';
          const email = userData.email || profileData.email || 'No email';

          userDataMap.set(uid, { name, email });
        } catch (error) {
          console.warn(`Error fetching user data for ${uid}:`, error);
          userDataMap.set(uid, { name: 'Unknown User', email: 'No email' });
        }
      })
    );

    // Map connections with user names
    return connectionsSnapshot.docs.map(doc => {
      const data = doc.data();
      const fromUser = userDataMap.get(data.userId || '');
      const toUser = userDataMap.get(data.connectedUserId || '');
      const initiator = userDataMap.get(data.initiatedBy || data.userId || '');

      return {
        id: doc.id,
        ...data,
        fromUserName: fromUser?.name || 'Unknown User',
        fromUserEmail: fromUser?.email || 'No email',
        toUserName: toUser?.name || 'Unknown User',
        toUserEmail: toUser?.email || 'No email',
        initiatedByName: initiator?.name || 'Unknown User',
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        acceptedAt: data.acceptedAt?.toDate ? data.acceptedAt.toDate() : undefined
      } as AdminConnection;
    });
  } catch (error) {
    console.error("Error getting all connections:", error);
    return [];
  }
};

export const detectSpamConnections = async (userId: string, threshold: number = 10): Promise<boolean> => {
  try {
    const connectionsSnapshot = await getDocs(
      query(
        collection(db, "connections"),
        where("initiatedBy", "==", userId),
        where("status", "==", "pending")
      )
    );

    return connectionsSnapshot.docs.length >= threshold;
  } catch (error) {
    console.error("Error detecting spam connections:", error);
    return false;
  }
};

export const blockUserFromConnections = async (
  adminId: string,
  userId: string,
  reason?: string
): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      connectionBlocked: true,
      connectionBlockedAt: Timestamp.now(),
      connectionBlockedBy: adminId,
      connectionBlockReason: reason,
      updatedAt: Timestamp.now()
    });

  } catch (error) {
    console.error("Error blocking user from connections:", error);
    throw error;
  }
};

export const removeConnection = async (
  adminId: string,
  connectionId: string,
  reason?: string
): Promise<void> => {
  try {
    await deleteDoc(doc(db, "connections", connectionId));

  } catch (error) {
    console.error("Error removing connection:", error);
    throw error;
  }
};

// ==================== REPORTS & FLAGGED CONTENT ====================

export interface AdminReport extends SupportReport {
  assignedTo?: string;
  assignedToName?: string;
  internalNotes?: Array<{
    note: string;
    addedBy: string;
    addedByName: string;
    addedAt: Date;
  }>;
  resolutionTime?: number; // in hours
}

export const getAllReportsForAdmin = async (): Promise<AdminReport[]> => {
  try {
    const reportsSnapshot = await getDocs(
      query(collection(db, "reports"), orderBy("createdAt", "desc"))
    );

    const reports = await Promise.all(
      reportsSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        let assignedToName = undefined;
        
        if (data.assignedTo) {
          const assignedUserDoc = await getDoc(doc(db, "users", data.assignedTo));
          if (assignedUserDoc.exists()) {
            assignedToName = assignedUserDoc.data().fullName || assignedUserDoc.data().displayName;
          }
        }

        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          resolvedAt: data.resolvedAt?.toDate ? data.resolvedAt.toDate() : undefined,
          assignedToName,
          resolutionTime: data.resolvedAt && data.createdAt
            ? (data.resolvedAt.toDate().getTime() - data.createdAt.toDate().getTime()) / (1000 * 60 * 60)
            : undefined
        } as AdminReport;
      })
    );

    return reports;
  } catch (error) {
    console.error("Error getting all reports:", error);
    return [];
  }
};

export const assignReport = async (
  adminId: string,
  reportId: string,
  assignToAdminId: string
): Promise<void> => {
  try {
    await updateDoc(doc(db, "reports", reportId), {
      assignedTo: assignToAdminId,
      assignedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

  } catch (error) {
    console.error("Error assigning report:", error);
    throw error;
  }
};

export const addReportInternalNote = async (
  adminId: string,
  reportId: string,
  note: string
): Promise<void> => {
  try {
    const reportRef = doc(db, "reports", reportId);
    const reportDoc = await getDoc(reportRef);
    const adminDoc = await getDoc(doc(db, "users", adminId));

    const existingNotes = reportDoc.data()?.internalNotes || [];
    const adminName = adminDoc.exists() 
      ? (adminDoc.data().fullName || adminDoc.data().displayName || 'Unknown')
      : 'Unknown';

    await updateDoc(reportRef, {
      internalNotes: arrayUnion({
        note,
        addedBy: adminId,
        addedByName: adminName,
        addedAt: Timestamp.now()
      }),
      updatedAt: Timestamp.now()
    });

  } catch (error) {
    console.error("Error adding report internal note:", error);
    throw error;
  }
};

export const resolveReport = async (
  adminId: string,
  reportId: string,
  status: 'resolved' | 'unresolved',
  finalSummary?: string
): Promise<void> => {
  try {
    const reportRef = doc(db, "reports", reportId);
    const previousData = (await getDoc(reportRef)).data();

    await updateDoc(reportRef, {
      status,
      resolvedAt: status === 'resolved' ? Timestamp.now() : null,
      resolvedBy: status === 'resolved' ? adminId : null,
      finalSummary: finalSummary || previousData?.finalSummary,
      updatedAt: Timestamp.now()
    });

  } catch (error) {
    console.error("Error resolving report:", error);
    throw error;
  }
};

// ==================== ANNOUNCEMENTS & NOTIFICATIONS ====================

export interface Announcement {
  id: string;
  title: string;
  message: string;
  targetAudience: 'all' | 'youth' | 'recruiters' | 'selected';
  targetUserIds?: string[];
  mediaUrl?: string;
  scheduledFor?: Date;
  sentAt?: Date;
  createdAt: Date;
  createdBy: string;
  createdByName: string;
  openRate?: number;
  engagementRate?: number;
  isDraft: boolean;
}

export const createAnnouncement = async (
  adminId: string,
  announcement: Omit<Announcement, 'id' | 'createdAt' | 'createdBy' | 'createdByName'>
): Promise<string> => {
  try {
    const adminDoc = await getDoc(doc(db, "users", adminId));
    const adminName = adminDoc.exists() 
      ? (adminDoc.data().fullName || adminDoc.data().displayName || 'Unknown')
      : 'Unknown';

    const announcementData = {
      ...announcement,
      createdBy: adminId,
      createdByName: adminName,
      createdAt: Timestamp.now(),
      scheduledFor: announcement.scheduledFor ? Timestamp.fromDate(announcement.scheduledFor) : null
    };

    const docRef = await addDoc(collection(db, "announcements"), announcementData);


    return docRef.id;
  } catch (error) {
    console.error("Error creating announcement:", error);
    throw error;
  }
};

export const sendAnnouncement = async (
  adminId: string,
  announcementId: string
): Promise<void> => {
  try {
    const announcementRef = doc(db, "announcements", announcementId);
    const announcementDoc = await getDoc(announcementRef);
    
    if (!announcementDoc.exists()) {
      throw new Error("Announcement not found");
    }

    const announcement = announcementDoc.data() as Announcement;
    
    // Get target users
    let targetUserIds: string[] = [];
    
    if (announcement.targetAudience === 'all') {
      const allUsersSnapshot = await getDocs(collection(db, "users"));
      targetUserIds = allUsersSnapshot.docs.map(doc => doc.id);
    } else if (announcement.targetAudience === 'youth') {
      const rolesSnapshot = await getDocs(collection(db, "userRoles"));
      const youthUserIds = rolesSnapshot.docs
        .filter(doc => doc.data().role === 'youth')
        .map(doc => doc.id);
      targetUserIds = youthUserIds;
    } else if (announcement.targetAudience === 'recruiters') {
      const rolesSnapshot = await getDocs(collection(db, "userRoles"));
      const recruiterUserIds = rolesSnapshot.docs
        .filter(doc => doc.data().role === 'recruiter')
        .map(doc => doc.id);
      targetUserIds = recruiterUserIds;
    } else if (announcement.targetAudience === 'selected' && announcement.targetUserIds) {
      targetUserIds = announcement.targetUserIds;
    }

    // Create notifications for all target users
    const batch = writeBatch(db);
    const notificationPromises = targetUserIds.map(userId => {
      const notificationRef = doc(collection(db, "notifications"));
      return batch.set(notificationRef, {
        userId,
        type: 'admin_notification',
        title: announcement.title,
        message: announcement.message,
        isRead: false,
        createdAt: Timestamp.now(),
        relatedId: announcementId
      });
    });

    await batch.commit();

    // Update announcement
    await updateDoc(announcementRef, {
      sentAt: Timestamp.now(),
      isDraft: false,
      updatedAt: Timestamp.now()
    });

  } catch (error) {
    console.error("Error sending announcement:", error);
    throw error;
  }
};

// ==================== SYSTEM SETTINGS ====================

export const getSystemSettings = async (): Promise<SystemSettings | null> => {
  try {
    const settingsSnapshot = await getDocs(collection(db, "systemSettings"));
    
    if (settingsSnapshot.empty) {
      // Create default settings
      const defaultSettings: Omit<SystemSettings, 'id'> = {
        maintenanceMode: false,
        maintenanceMessage: "We're currently performing maintenance. Please check back soon.",
        allowNewRegistrations: true,
        maxFileSize: 10,
        updatedAt: new Date(),
        updatedBy: 'system'
      };

      const docRef = await addDoc(collection(db, "systemSettings"), {
        ...defaultSettings,
        updatedAt: Timestamp.now()
      });

      return {
        id: docRef.id,
        ...defaultSettings
      };
    }

    const settingsDoc = settingsSnapshot.docs[0];
    return {
      id: settingsDoc.id,
      ...settingsDoc.data(),
      updatedAt: settingsDoc.data().updatedAt.toDate()
    } as SystemSettings;
  } catch (error) {
    console.error("Error getting system settings:", error);
    return null;
  }
};

export const updateSystemSettings = async (
  adminId: string,
  settings: Partial<SystemSettings>
): Promise<void> => {
  try {
    const settingsSnapshot = await getDocs(collection(db, "systemSettings"));
    
    if (settingsSnapshot.empty) {
      await addDoc(collection(db, "systemSettings"), {
        ...settings,
        updatedAt: Timestamp.now(),
        updatedBy: adminId
      });
    } else {
      const settingsRef = settingsSnapshot.docs[0].ref;
      const previousData = settingsSnapshot.docs[0].data();
      
      await updateDoc(settingsRef, {
        ...settings,
        updatedAt: Timestamp.now(),
        updatedBy: adminId
      });

    }
  } catch (error) {
    console.error("Error updating system settings:", error);
    throw error;
  }
};

// ==================== ADMIN USER MANAGEMENT ====================

export const addAdminUser = async (
  superAdminId: string,
  email: string,
  name: string,
  role: 'admin' | 'superadmin' = 'admin'
): Promise<void> => {
  try {
    // Check if current user is superadmin
    const currentUserRole = await getAdminRole(superAdminId);
    if (currentUserRole !== 'superadmin') {
      throw new Error("Only superadmins can add admin users");
    }

    // Create admin user document
    const adminUserRef = doc(collection(db, "admins"));
    await setDoc(adminUserRef, {
      email,
      name,
      role,
      createdAt: Timestamp.now(),
      isActive: true,
      addedBy: superAdminId
    });

  } catch (error) {
    console.error("Error adding admin user:", error);
    throw error;
  }
};

export const getAllAdminUsers = async (): Promise<AdminUser[]> => {
  try {
    const adminsSnapshot = await getDocs(
      query(collection(db, "admins"), orderBy("createdAt", "desc"))
    );

    return adminsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      lastLogin: doc.data().lastLogin?.toDate()
    })) as AdminUser[];
  } catch (error) {
    console.error("Error getting all admin users:", error);
    return [];
  }
};

// Export all functions
export default {
  isAdmin,
  getAdminRole,
  getAdminDashboardStats,
  subscribeToAdminDashboardStats,
  getAllUsersForAdmin,
  getUserDetailsForAdmin,
  verifyUser,
  suspendUser,
  deleteUserAccount,
  resetUserPassword,
  addAdminNote,
  getAllCertificatesForAdmin,
  verifyCertificate,
  verifySkill,
  getAllProjectsForAdmin,
  moderateProject,
  getAllReviewsForAdmin,
  moderateReview,
  getAllConnectionsForAdmin,
  detectSpamConnections,
  blockUserFromConnections,
  removeConnection,
  getAllReportsForAdmin,
  assignReport,
  addReportInternalNote,
  resolveReport,
  createAnnouncement,
  sendAnnouncement,
  getSystemSettings,
  updateSystemSettings,
  addAdminUser,
  getAllAdminUsers
};

