import { db } from './client';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  onSnapshot,
  writeBatch,
  arrayContains,
  arrayContainsAny,
} from 'firebase/firestore';
import { getProfile, getAllProfiles } from './services';
import { UserProfile, Connection } from './types';

// Extended user profile for network discovery
export interface DiscoverableUser {
  id: string;
  userId: string;
  fullName: string;
  profileImageUrl?: string;
  role: 'youth' | 'recruiter';
  // Youth-specific
  field?: string; // Tech, Film, Music, Design, Fashion, etc.
  skills?: Array<{ skillName: string; proficiencyLevel?: string; category?: string }>;
  location?: { city?: string; country?: string };
  hasPortfolio?: boolean;
  portfolioCount?: number;
  averageRating?: number;
  ratingCount?: number;
  profileCompleteness?: number;
  availability?: 'freelance' | 'part-time' | 'full-time' | 'unavailable';
  lookingForJobs?: boolean;
  // Recruiter-specific
  companyName?: string;
  companyLogo?: string;
  industry?: string;
  rolesHiringFor?: string[];
  isVerified?: boolean;
  activelyHiring?: boolean;
  companySize?: string;
}

// Connection status types
export type ConnectionStatus = 'connect' | 'pending' | 'connected' | 'blocked';

// Filter options
export interface NetworkFilters {
  // Search
  searchTerm?: string;
  
  // Youth filters
  skills?: string[];
  field?: string;
  location?: string;
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'expert';
  availability?: 'freelance' | 'part-time' | 'full-time' | 'any';
  hasPortfolio?: boolean;
  minRating?: number;
  lookingForJobs?: boolean;
  
  // Recruiter filters
  industry?: string;
  roleType?: string;
  companySize?: string;
  activelyHiring?: boolean;
  verifiedOnly?: boolean;
}

/**
 * Get all discoverable youths for network
 */
export const getDiscoverableYouths = async (
  currentUserId: string,
  filters: NetworkFilters = {}
): Promise<DiscoverableUser[]> => {
  try {
    // Get all profiles and filter for youth
    const allProfiles = await getAllProfiles();
    
    // Filter for youths only - those without companyName and role === 'youth'
    let youths = allProfiles
      .filter(profile => {
        // Exclude current user
        if (profile.userId === currentUserId) return false;
        // Must not have a company name (recruiters have company names)
        if (profile.companyName) return false;
        // Should have role as 'youth' or no role (defaults to youth)
        return !profile.role || profile.role === 'youth';
      })
      .map(profile => ({
        id: profile.id || profile.userId,
        userId: profile.userId,
        fullName: profile.fullName || 'Unknown',
        profileImageUrl: profile.profileImageUrl,
        role: 'youth' as const,
        field: profile.preferredCareerField || profile.talentArea,
        skills: profile.skills || [],
        location: {
          city: profile.city,
          country: profile.country,
        },
        availability: profile.availabilityStatus as any,
        lookingForJobs: profile.availabilityStatus !== 'unavailable',
      }));

    // Apply filters
    youths = applyYouthFilters(youths, filters);

    return youths;
  } catch (error) {
    console.error('Error getting discoverable youths:', error);
    return [];
  }
};

/**
 * Get all discoverable recruiters for network
 */
export const getDiscoverableRecruiters = async (
  currentUserId: string,
  filters: NetworkFilters = {}
): Promise<DiscoverableUser[]> => {
  try {
    const allProfiles = await getAllProfiles();
    
    // Filter for recruiters only - those with companyName or role === 'recruiter'
    let recruiters = allProfiles
      .filter(profile => {
        // Exclude current user
        if (profile.userId === currentUserId) return false;
        // Must have company name OR role as recruiter
        return profile.companyName || profile.role === 'recruiter';
      })
      .map(profile => ({
        id: profile.id || profile.userId,
        userId: profile.userId,
        fullName: profile.fullName || profile.companyName || 'Unknown',
        profileImageUrl: profile.profileImageUrl,
        role: 'recruiter' as const,
        companyName: profile.companyName,
        industry: profile.companyName, // Can be enhanced with actual industry field
        isVerified: profile.isVerified || false,
        activelyHiring: true, // Can be enhanced with actual hiring status
      }));

    // Apply filters
    recruiters = applyRecruiterFilters(recruiters, filters);

    return recruiters;
  } catch (error) {
    console.error('Error getting discoverable recruiters:', error);
    return [];
  }
};

/**
 * Apply filters to youth list
 */
const applyYouthFilters = (youths: DiscoverableUser[], filters: NetworkFilters): DiscoverableUser[] => {
  let filtered = [...youths];

  // Search term
  if (filters.searchTerm) {
    const searchLower = filters.searchTerm.toLowerCase();
    filtered = filtered.filter(youth =>
      youth.fullName.toLowerCase().includes(searchLower) ||
      youth.field?.toLowerCase().includes(searchLower) ||
      youth.skills?.some(skill => 
        (typeof skill === 'string' ? skill : skill.skillName)?.toLowerCase().includes(searchLower)
      ) ||
      youth.location?.city?.toLowerCase().includes(searchLower) ||
      youth.location?.country?.toLowerCase().includes(searchLower)
    );
  }

  // Skills filter
  if (filters.skills && filters.skills.length > 0) {
    filtered = filtered.filter(youth =>
      filters.skills!.some(filterSkill =>
        youth.skills?.some(skill => {
          const skillName = typeof skill === 'string' ? skill : skill.skillName;
          return skillName?.toLowerCase() === filterSkill.toLowerCase();
        })
      )
    );
  }

  // Field filter
  if (filters.field) {
    filtered = filtered.filter(youth =>
      youth.field?.toLowerCase() === filters.field!.toLowerCase()
    );
  }

  // Location filter
  if (filters.location) {
    const locationLower = filters.location.toLowerCase();
    filtered = filtered.filter(youth =>
      youth.location?.city?.toLowerCase().includes(locationLower) ||
      youth.location?.country?.toLowerCase().includes(locationLower)
    );
  }

  // Availability filter
  if (filters.availability && filters.availability !== 'any') {
    filtered = filtered.filter(youth =>
      youth.availability === filters.availability
    );
  }

  // Looking for jobs filter
  if (filters.lookingForJobs !== undefined) {
    filtered = filtered.filter(youth =>
      youth.lookingForJobs === filters.lookingForJobs
    );
  }

  return filtered;
};

/**
 * Apply filters to recruiter list
 */
const applyRecruiterFilters = (recruiters: DiscoverableUser[], filters: NetworkFilters): DiscoverableUser[] => {
  let filtered = [...recruiters];

  // Search term
  if (filters.searchTerm) {
    const searchLower = filters.searchTerm.toLowerCase();
    filtered = filtered.filter(recruiter =>
      recruiter.fullName.toLowerCase().includes(searchLower) ||
      recruiter.companyName?.toLowerCase().includes(searchLower) ||
      recruiter.industry?.toLowerCase().includes(searchLower)
    );
  }

  // Industry filter
  if (filters.industry) {
    filtered = filtered.filter(recruiter =>
      recruiter.industry?.toLowerCase() === filters.industry!.toLowerCase()
    );
  }

  // Verified only
  if (filters.verifiedOnly) {
    filtered = filtered.filter(recruiter => recruiter.isVerified);
  }

  // Actively hiring
  if (filters.activelyHiring !== undefined) {
    filtered = filtered.filter(recruiter =>
      recruiter.activelyHiring === filters.activelyHiring
    );
  }

  return filtered;
};

/**
 * Get connection status between two users
 */
export const getConnectionStatus = async (
  currentUserId: string,
  targetUserId: string
): Promise<ConnectionStatus> => {
  try {
    // Check flat connections collection
    const connectionsRef = collection(db, 'connections');
    const q = query(
      connectionsRef,
      where('userId', '==', currentUserId),
      where('connectedUserId', '==', targetUserId)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const connectionData = querySnapshot.docs[0].data();
      if (connectionData.status === 'accepted') return 'connected';
      if (connectionData.status === 'pending') return 'pending';
      if (connectionData.status === 'blocked') return 'blocked';
      if (connectionData.status === 'declined') return 'connect';
    }

    // Also check reverse connection (where target user is userId and current is connectedUserId)
    const reverseQ = query(
      connectionsRef,
      where('userId', '==', targetUserId),
      where('connectedUserId', '==', currentUserId)
    );
    const reverseSnapshot = await getDocs(reverseQ);
    
    if (!reverseSnapshot.empty) {
      const connectionData = reverseSnapshot.docs[0].data();
      if (connectionData.status === 'accepted') return 'connected';
      if (connectionData.status === 'pending') return 'pending';
      if (connectionData.status === 'blocked') return 'blocked';
    }

    return 'connect';
  } catch (error) {
    console.error('Error getting connection status:', error);
    return 'connect';
  }
};

/**
 * Get smart matching suggestions for youth
 */
export const getSmartMatches = async (
  currentUserId: string,
  limitCount: number = 10
): Promise<Array<DiscoverableUser & { matchReason: string; matchScore: number }>> => {
  try {
    // Get current user profile
    const currentUserProfile = await getProfile(currentUserId);
    if (!currentUserProfile) return [];

    // Get existing connections
    const connectionsRef = collection(db, 'connections', currentUserId, 'connections');
    const connectionsSnapshot = await getDocs(connectionsRef);
    const connectedUserIds = new Set(connectionsSnapshot.docs.map(doc => doc.data().connectedUserId));
    connectedUserIds.add(currentUserId);

    // Get discoverable users
    const youths = await getDiscoverableYouths(currentUserId);
    const recruiters = await getDiscoverableRecruiters(currentUserId);

    // Calculate match scores
    const matches: Array<DiscoverableUser & { matchReason: string; matchScore: number }> = [];

    // Match with youths
    for (const youth of youths) {
      if (connectedUserIds.has(youth.userId)) continue;

      let matchScore = 0;
      const reasons: string[] = [];

      // Same skills
      const currentSkills = (currentUserProfile.skills || []).map((s: any) => 
        typeof s === 'string' ? s : s.skillName
      );
      const youthSkills = (youth.skills || []).map((s: any) => 
        typeof s === 'string' ? s : s.skillName
      );
      
      const commonSkills = currentSkills.filter((skill: string) =>
        youthSkills.some(ys => ys?.toLowerCase() === skill?.toLowerCase())
      );
      
      if (commonSkills.length > 0) {
        matchScore += commonSkills.length * 10;
        reasons.push(`Shared ${commonSkills.length} skill${commonSkills.length > 1 ? 's' : ''}`);
      }

      // Same field
      if (currentUserProfile.preferredCareerField && youth.field &&
          currentUserProfile.preferredCareerField.toLowerCase() === youth.field.toLowerCase()) {
        matchScore += 20;
        reasons.push('Same field');
      }

      // Same location
      if (currentUserProfile.city && youth.location?.city &&
          currentUserProfile.city.toLowerCase() === youth.location.city.toLowerCase()) {
        matchScore += 15;
        reasons.push('Same location');
      }

      if (matchScore > 0) {
        matches.push({
          ...youth,
          matchScore,
          matchReason: reasons.join(', '),
        });
      }
    }

    // Match with recruiters (based on skills they hire for)
    for (const recruiter of recruiters) {
      if (connectedUserIds.has(recruiter.userId)) continue;

      let matchScore = 0;
      const reasons: string[] = [];

      // Check if recruiter is looking for user's skills
      const currentSkills = (currentUserProfile.skills || []).map((s: any) => 
        typeof s === 'string' ? s : s.skillName
      );

      if (recruiter.rolesHiringFor && recruiter.rolesHiringFor.some(role =>
        currentSkills.some((skill: string) => role?.toLowerCase().includes(skill?.toLowerCase()))
      )) {
        matchScore += 30;
        reasons.push('Hiring for your skills');
      }

      if (recruiter.industry && currentUserProfile.preferredCareerField &&
          recruiter.industry.toLowerCase() === currentUserProfile.preferredCareerField.toLowerCase()) {
        matchScore += 25;
        reasons.push('Your industry');
      }

      if (matchScore > 0) {
        matches.push({
          ...recruiter,
          matchScore,
          matchReason: reasons.join(', '),
        });
      }
    }

    // Sort by match score and return top matches
    return matches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limitCount);
  } catch (error) {
    console.error('Error getting smart matches:', error);
    return [];
  }
};

/**
 * Block a user
 */
export const blockUser = async (
  currentUserId: string,
  targetUserId: string
): Promise<void> => {
  try {
    const batch = writeBatch(db);

    // Create block connection
    const blockRef = doc(db, 'connections', currentUserId, 'connections', targetUserId);
    batch.set(blockRef, {
      connectedUserId: targetUserId,
      status: 'blocked',
      blockedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    });

    await batch.commit();
  } catch (error) {
    console.error('Error blocking user:', error);
    throw error;
  }
};

/**
 * Report a user
 */
export const reportUser = async (
  currentUserId: string,
  targetUserId: string,
  reason: string,
  details?: string
): Promise<void> => {
  try {
    const reportsRef = collection(db, 'reports');
    await doc(reportsRef).set({
      reporterId: currentUserId,
      reportedUserId: targetUserId,
      reason,
      details,
      status: 'pending',
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error reporting user:', error);
    throw error;
  }
};

