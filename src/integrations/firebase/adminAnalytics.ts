import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  startAt,
  endAt
} from "firebase/firestore";
import { db } from "./client";

// ==================== ANALYTICS INTERFACES ====================

export interface GrowthAnalytics {
  youthGrowth: Array<{ date: string; count: number }>;
  recruiterGrowth: Array<{ date: string; count: number }>;
  projectGrowth: Array<{ date: string; count: number }>;
  reviewGrowth: Array<{ date: string; count: number }>;
}

export interface SkillAnalytics {
  mostDemandedSkills: Array<{ skill: string; count: number; demand: number }>;
  mostSubmittedCertificates: Array<{ type: string; count: number }>;
  skillVerificationTrends: Array<{ date: string; verified: number; pending: number }>;
}

export interface LocationAnalytics {
  locations: Array<{ location: string; count: number }>;
  countries: Array<{ country: string; count: number }>;
}

export interface CategoryAnalytics {
  categories: Array<{ category: string; count: number }>;
  industries: Array<{ industry: string; count: number }>;
}

export interface PlatformUsageAnalytics {
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  sessions: Array<{ date: string; count: number }>;
  activeHours: Array<{ hour: number; count: number }>;
  featureUsage: Array<{ feature: string; count: number }>;
}

export interface CertificateVerificationAnalytics {
  totalCertificates: number;
  verified: number;
  pending: number;
  rejected: number;
  verificationRate: number;
  averageVerificationTime: number; // in hours
  trends: Array<{ date: string; verified: number; rejected: number }>;
}

export interface RecruiterActivityAnalytics {
  totalRecruiters: number;
  activeRecruiters: number;
  jobsPosted: number;
  reviewsSubmitted: number;
  connectionsMade: number;
  averageActivity: Array<{ date: string; activity: number }>;
}

export interface CompleteAnalytics {
  growth: GrowthAnalytics;
  skills: SkillAnalytics;
  locations: LocationAnalytics;
  categories: CategoryAnalytics;
  platformUsage: PlatformUsageAnalytics;
  certificates: CertificateVerificationAnalytics;
  recruiterActivity: RecruiterActivityAnalytics;
}

// ==================== GROWTH ANALYTICS ====================

export const getGrowthAnalytics = async (
  startDate: Date,
  endDate: Date
): Promise<GrowthAnalytics> => {
  try {
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    // Get all users
    const usersSnapshot = await getDocs(collection(db, "users"));
    const rolesSnapshot = await getDocs(collection(db, "userRoles"));
    
    const roleMap = new Map<string, string>();
    rolesSnapshot.docs.forEach(doc => {
      roleMap.set(doc.id, doc.data().role);
    });

    // Group by date
    const youthByDate = new Map<string, number>();
    const recruitersByDate = new Map<string, number>();
    const projectsByDate = new Map<string, number>();
    const reviewsByDate = new Map<string, number>();

    usersSnapshot.docs.forEach(doc => {
      const role = roleMap.get(doc.id) || 'youth';
      const createdAt = doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt);
      
      if (createdAt >= startDate && createdAt <= endDate) {
        const dateKey = createdAt.toISOString().split('T')[0];
        
        if (role === 'youth') {
          youthByDate.set(dateKey, (youthByDate.get(dateKey) || 0) + 1);
        } else if (role === 'recruiter') {
          recruitersByDate.set(dateKey, (recruitersByDate.get(dateKey) || 0) + 1);
        }
      }
    });

    // Get projects
    const projectsSnapshot = await getDocs(
      query(
        collection(db, "portfolios"),
        where("createdAt", ">=", startTimestamp),
        where("createdAt", "<=", endTimestamp)
      )
    );

    projectsSnapshot.docs.forEach(doc => {
      const createdAt = doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt);
      const dateKey = createdAt.toISOString().split('T')[0];
      projectsByDate.set(dateKey, (projectsByDate.get(dateKey) || 0) + 1);
    });

    // Get reviews
    const reviewsSnapshot = await getDocs(
      query(
        collection(db, "reviews"),
        where("createdAt", ">=", startTimestamp),
        where("createdAt", "<=", endTimestamp)
      )
    );

    reviewsSnapshot.docs.forEach(doc => {
      const createdAt = doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt);
      const dateKey = createdAt.toISOString().split('T')[0];
      reviewsByDate.set(dateKey, (reviewsByDate.get(dateKey) || 0) + 1);
    });

    // Convert to arrays
    const allDates = new Set([
      ...Array.from(youthByDate.keys()),
      ...Array.from(recruitersByDate.keys()),
      ...Array.from(projectsByDate.keys()),
      ...Array.from(reviewsByDate.keys())
    ]);

    const youthGrowth = Array.from(allDates)
      .sort()
      .map(date => ({ date, count: youthByDate.get(date) || 0 }));

    const recruiterGrowth = Array.from(allDates)
      .sort()
      .map(date => ({ date, count: recruitersByDate.get(date) || 0 }));

    const projectGrowth = Array.from(allDates)
      .sort()
      .map(date => ({ date, count: projectsByDate.get(date) || 0 }));

    const reviewGrowth = Array.from(allDates)
      .sort()
      .map(date => ({ date, count: reviewsByDate.get(date) || 0 }));

    return {
      youthGrowth,
      recruiterGrowth,
      projectGrowth,
      reviewGrowth
    };
  } catch (error) {
    console.error("Error getting growth analytics:", error);
    throw error;
  }
};

// ==================== SKILL ANALYTICS ====================

export const getSkillAnalytics = async (): Promise<SkillAnalytics> => {
  try {
    // Get all skills
    const skillsSnapshot = await getDocs(collection(db, "skills"));
    
    const skillCounts = new Map<string, number>();
    const skillDemand = new Map<string, number>();

    skillsSnapshot.docs.forEach(doc => {
      const skillName = doc.data().skillName;
      const demand = doc.data().industryDemand || 0;
      
      skillCounts.set(skillName, (skillCounts.get(skillName) || 0) + 1);
      skillDemand.set(skillName, Math.max(skillDemand.get(skillName) || 0, demand));
    });

    const mostDemandedSkills = Array.from(skillCounts.entries())
      .map(([skill, count]) => ({
        skill,
        count,
        demand: skillDemand.get(skill) || 0
      }))
      .sort((a, b) => b.demand - a.demand || b.count - a.count)
      .slice(0, 20);

    // Get certificates
    const certificatesSnapshot = await getDocs(collection(db, "certificates"));
    
    const certCounts = new Map<string, number>();
    certificatesSnapshot.docs.forEach(doc => {
      const certType = doc.data().certificateType;
      certCounts.set(certType, (certCounts.get(certType) || 0) + 1);
    });

    const mostSubmittedCertificates = Array.from(certCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Get verification trends
    const verifiedSkills = skillsSnapshot.docs.filter(
      doc => doc.data().verificationStatus === 'verified'
    );
    const pendingSkills = skillsSnapshot.docs.filter(
      doc => doc.data().verificationStatus === 'pending'
    );

    // Group by date
    const verificationTrends = new Map<string, { verified: number; pending: number }>();
    
    verifiedSkills.forEach(doc => {
      const verifiedAt = doc.data().verifiedAt?.toDate ? doc.data().verifiedAt.toDate() : new Date();
      const dateKey = verifiedAt.toISOString().split('T')[0];
      const current = verificationTrends.get(dateKey) || { verified: 0, pending: 0 };
      verificationTrends.set(dateKey, { ...current, verified: current.verified + 1 });
    });

    pendingSkills.forEach(doc => {
      const createdAt = doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date();
      const dateKey = createdAt.toISOString().split('T')[0];
      const current = verificationTrends.get(dateKey) || { verified: 0, pending: 0 };
      verificationTrends.set(dateKey, { ...current, pending: current.pending + 1 });
    });

    const skillVerificationTrends = Array.from(verificationTrends.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      mostDemandedSkills,
      mostSubmittedCertificates,
      skillVerificationTrends
    };
  } catch (error) {
    console.error("Error getting skill analytics:", error);
    throw error;
  }
};

// ==================== LOCATION ANALYTICS ====================

export const getLocationAnalytics = async (): Promise<LocationAnalytics> => {
  try {
    const usersSnapshot = await getDocs(collection(db, "users"));
    
    const locationCounts = new Map<string, number>();
    const countryCounts = new Map<string, number>();

    usersSnapshot.docs.forEach(doc => {
      const userData = doc.data();
      const location = userData.city || userData.location || 'Unknown';
      const country = userData.country || 'Unknown';
      
      locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
      countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
    });

    const locations = Array.from(locationCounts.entries())
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    const countries = Array.from(countryCounts.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);

    return {
      locations,
      countries
    };
  } catch (error) {
    console.error("Error getting location analytics:", error);
    throw error;
  }
};

// ==================== CATEGORY ANALYTICS ====================

export const getCategoryAnalytics = async (): Promise<CategoryAnalytics> => {
  try {
    const usersSnapshot = await getDocs(collection(db, "users"));
    
    const categoryCounts = new Map<string, number>();
    const industryCounts = new Map<string, number>();

    usersSnapshot.docs.forEach(doc => {
      const userData = doc.data();
      const category = userData.talentArea || userData.preferredCareerField || 'Unknown';
      const industry = userData.industryType || 'Unknown';
      
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      industryCounts.set(industry, (industryCounts.get(industry) || 0) + 1);
    });

    const categories = Array.from(categoryCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);

    const industries = Array.from(industryCounts.entries())
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);

    return {
      categories,
      industries
    };
  } catch (error) {
    console.error("Error getting category analytics:", error);
    throw error;
  }
};

// ==================== PLATFORM USAGE ANALYTICS ====================

export const getPlatformUsageAnalytics = async (
  startDate: Date,
  endDate: Date
): Promise<PlatformUsageAnalytics> => {
  try {
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    // Get active users
    const usersSnapshot = await getDocs(collection(db, "users"));
    
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let dailyActive = 0;
    let weeklyActive = 0;
    let monthlyActive = 0;

    usersSnapshot.docs.forEach(doc => {
      const lastActive = doc.data().lastActive?.toDate ? doc.data().lastActive.toDate() : doc.data().createdAt?.toDate();
      if (lastActive) {
        if (lastActive >= dayAgo) dailyActive++;
        if (lastActive >= weekAgo) weeklyActive++;
        if (lastActive >= monthAgo) monthlyActive++;
      }
    });

    // Get sessions (simplified - using user activity)
    const sessionsByDate = new Map<string, number>();
    usersSnapshot.docs.forEach(doc => {
      const lastActive = doc.data().lastActive?.toDate ? doc.data().lastActive.toDate() : doc.data().createdAt?.toDate();
      if (lastActive && lastActive >= startDate && lastActive <= endDate) {
        const dateKey = lastActive.toISOString().split('T')[0];
        sessionsByDate.set(dateKey, (sessionsByDate.get(dateKey) || 0) + 1);
      }
    });

    const sessions = Array.from(sessionsByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Active hours (simplified)
    const activeHours = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: Math.floor(Math.random() * 100) // Placeholder - would need actual session data
    }));

    // Feature usage (simplified)
    const featureUsage = [
      { feature: 'Profile View', count: usersSnapshot.docs.length },
      { feature: 'Portfolio Upload', count: (await getDocs(collection(db, "portfolios"))).docs.length },
      { feature: 'Certificate Upload', count: (await getDocs(collection(db, "certificates"))).docs.length },
      { feature: 'Review Submission', count: (await getDocs(collection(db, "reviews"))).docs.length }
    ];

    return {
      activeUsers: {
        daily: dailyActive,
        weekly: weeklyActive,
        monthly: monthlyActive
      },
      sessions,
      activeHours,
      featureUsage
    };
  } catch (error) {
    console.error("Error getting platform usage analytics:", error);
    throw error;
  }
};

// ==================== CERTIFICATE VERIFICATION ANALYTICS ====================

export const getCertificateVerificationAnalytics = async (
  startDate: Date,
  endDate: Date
): Promise<CertificateVerificationAnalytics> => {
  try {
    const certificatesSnapshot = await getDocs(collection(db, "certificates"));
    
    let total = 0;
    let verified = 0;
    let pending = 0;
    let rejected = 0;
    const verificationTimes: number[] = [];
    const trendsByDate = new Map<string, { verified: number; rejected: number }>();

    certificatesSnapshot.docs.forEach(doc => {
      const certData = doc.data();
      total++;
      
      if (certData.status === 'verified') {
        verified++;
        if (certData.submittedAt && certData.reviewedAt) {
          const submitted = certData.submittedAt.toDate();
          const reviewed = certData.reviewedAt.toDate();
          const hours = (reviewed.getTime() - submitted.getTime()) / (1000 * 60 * 60);
          verificationTimes.push(hours);
          
          const dateKey = reviewed.toISOString().split('T')[0];
          const current = trendsByDate.get(dateKey) || { verified: 0, rejected: 0 };
          trendsByDate.set(dateKey, { ...current, verified: current.verified + 1 });
        }
      } else if (certData.status === 'pending') {
        pending++;
      } else if (certData.status === 'rejected') {
        rejected++;
        if (certData.submittedAt && certData.reviewedAt) {
          const reviewed = certData.reviewedAt.toDate();
          const dateKey = reviewed.toISOString().split('T')[0];
          const current = trendsByDate.get(dateKey) || { verified: 0, rejected: 0 };
          trendsByDate.set(dateKey, { ...current, rejected: current.rejected + 1 });
        }
      }
    });

    const verificationRate = total > 0 ? (verified / total) * 100 : 0;
    const averageVerificationTime = verificationTimes.length > 0
      ? verificationTimes.reduce((a, b) => a + b, 0) / verificationTimes.length
      : 0;

    const trends = Array.from(trendsByDate.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalCertificates: total,
      verified,
      pending,
      rejected,
      verificationRate,
      averageVerificationTime,
      trends
    };
  } catch (error) {
    console.error("Error getting certificate verification analytics:", error);
    throw error;
  }
};

// ==================== RECRUITER ACTIVITY ANALYTICS ====================

export const getRecruiterActivityAnalytics = async (
  startDate: Date,
  endDate: Date
): Promise<RecruiterActivityAnalytics> => {
  try {
    const rolesSnapshot = await getDocs(collection(db, "userRoles"));
    const recruiterIds = rolesSnapshot.docs
      .filter(doc => doc.data().role === 'recruiter')
      .map(doc => doc.id);

    const totalRecruiters = recruiterIds.length;

    // Get active recruiters (logged in within last 30 days)
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const usersSnapshot = await getDocs(collection(db, "users"));
    let activeRecruiters = 0;

    usersSnapshot.docs.forEach(doc => {
      if (recruiterIds.includes(doc.id)) {
        const lastActive = doc.data().lastActive?.toDate ? doc.data().lastActive.toDate() : doc.data().createdAt?.toDate();
        if (lastActive && lastActive >= monthAgo) {
          activeRecruiters++;
        }
      }
    });

    // Get jobs posted
    const jobsSnapshot = await getDocs(collection(db, "jobs"));
    const jobsPosted = jobsSnapshot.docs.length;

    // Get reviews submitted
    const reviewsSnapshot = await getDocs(
      query(
        collection(db, "reviews"),
        where("createdAt", ">=", Timestamp.fromDate(startDate)),
        where("createdAt", "<=", Timestamp.fromDate(endDate))
      )
    );
    const reviewsSubmitted = reviewsSnapshot.docs.length;

    // Get connections made
    const connectionsSnapshot = await getDocs(
      query(
        collection(db, "connections"),
        where("createdAt", ">=", Timestamp.fromDate(startDate)),
        where("createdAt", "<=", Timestamp.fromDate(endDate))
      )
    );
    const connectionsMade = connectionsSnapshot.docs.length;

    // Average activity by date
    const activityByDate = new Map<string, number>();
    reviewsSnapshot.docs.forEach(doc => {
      const createdAt = doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date();
      const dateKey = createdAt.toISOString().split('T')[0];
      activityByDate.set(dateKey, (activityByDate.get(dateKey) || 0) + 1);
    });

    const averageActivity = Array.from(activityByDate.entries())
      .map(([date, activity]) => ({ date, activity }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalRecruiters,
      activeRecruiters,
      jobsPosted,
      reviewsSubmitted,
      connectionsMade,
      averageActivity
    };
  } catch (error) {
    console.error("Error getting recruiter activity analytics:", error);
    throw error;
  }
};

// ==================== COMPLETE ANALYTICS ====================

export const getCompleteAnalytics = async (
  startDate: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  endDate: Date = new Date()
): Promise<CompleteAnalytics> => {
  try {
    const [
      growth,
      skills,
      locations,
      categories,
      platformUsage,
      certificates,
      recruiterActivity
    ] = await Promise.all([
      getGrowthAnalytics(startDate, endDate),
      getSkillAnalytics(),
      getLocationAnalytics(),
      getCategoryAnalytics(),
      getPlatformUsageAnalytics(startDate, endDate),
      getCertificateVerificationAnalytics(startDate, endDate),
      getRecruiterActivityAnalytics(startDate, endDate)
    ]);

    return {
      growth,
      skills,
      locations,
      categories,
      platformUsage,
      certificates,
      recruiterActivity
    };
  } catch (error) {
    console.error("Error getting complete analytics:", error);
    throw error;
  }
};

export default {
  getGrowthAnalytics,
  getSkillAnalytics,
  getLocationAnalytics,
  getCategoryAnalytics,
  getPlatformUsageAnalytics,
  getCertificateVerificationAnalytics,
  getRecruiterActivityAnalytics,
  getCompleteAnalytics
};

