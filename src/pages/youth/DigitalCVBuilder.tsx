import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import DigitalCVProfileBuilder from '@/components/cv/DigitalCVProfileBuilder';
import { getProfile } from '@/integrations/firebase/services';
import { getPortfoliosByProfile } from '@/integrations/firebase/services';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { 
  getYouthSkills, 
  subscribeToYouthSkills,
  type YouthSkill 
} from '@/integrations/firebase/youthSkillsService';
import { 
  getYouthCertificatesForCV,
  subscribeToYouthCertificates,
  type YouthCertificate 
} from '@/integrations/firebase/youthCertificatesService';
import { Loader2 } from 'lucide-react';

const DigitalCVBuilder = () => {
  const { currentUser } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [portfolioProjects, setPortfolioProjects] = useState<any[]>([]);
  const [skills, setSkills] = useState<YouthSkill[]>([]);
  const [certificates, setCertificates] = useState<YouthCertificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load profile data with real-time subscription
  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // Set up real-time listener for profile changes
    const profileRef = doc(db, 'profiles', currentUser.uid);
    const unsubscribe = onSnapshot(
      profileRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const profile = {
            id: snapshot.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
          };
          
          console.log('[DigitalCVBuilder] Profile updated (real-time):', {
            profilePicture: profile.profileImageUrl || profile.profilePicture,
            location: profile.location,
            city: profile.city,
            country: profile.country,
            hasProfile: !!profile
          });
          
          setProfileData(profile as any);
        } else {
          // If profile doesn't exist, try loading it once
          getProfile(currentUser.uid).then(profile => {
            if (profile) {
              setProfileData(profile);
            }
          });
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('[DigitalCVBuilder] Error in profile subscription:', error);
        // Fallback to one-time load if subscription fails
        getProfile(currentUser.uid).then(profile => {
          setProfileData(profile);
          setIsLoading(false);
        });
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Load portfolio projects
  useEffect(() => {
    const loadPortfolio = async () => {
      if (!currentUser) return;

      try {
        const portfolios = await getPortfoliosByProfile(currentUser.uid);
        setPortfolioProjects(portfolios);
      } catch (error) {
        console.error('Error loading portfolio:', error);
      }
    };

    loadPortfolio();
  }, [currentUser]);

  // Real-time subscription to skills
  useEffect(() => {
    if (!currentUser) {
      setSkills([]);
      return;
    }

    // Set up real-time listener for skills
    const unsubscribeSkills = subscribeToYouthSkills(currentUser.uid, (updatedSkills) => {
      setSkills(updatedSkills);
      setIsLoading(false);
    });

    return () => unsubscribeSkills();
  }, [currentUser]);

  // Real-time subscription to certificates
  useEffect(() => {
    if (!currentUser) return;

    // Set up real-time listener for certificates (only verified and pending)
    const unsubscribeCerts = subscribeToYouthCertificates(currentUser.uid, (updatedCerts) => {
      // Filter out rejected certificates for CV display
      const filteredCerts = updatedCerts.filter(cert => cert.verificationStatus !== 'Rejected');
      setCertificates(filteredCerts);
    });

    return () => unsubscribeCerts();
  }, [currentUser]);

  // Transform skills for CV format
  const transformedSkills = useMemo(() => {
    return skills.map(skill => ({
      id: skill.id,
      name: skill.skillName,
      proficiency: skill.proficiencyLevel,
      category: 'technical' as const, // Default category, can be enhanced later
    }));
  }, [skills]);

  // Transform certificates for CV format
  const transformedCertificates = useMemo(() => {
    return certificates.map(cert => ({
      id: cert.id,
      name: cert.certificateName,
      issuer: cert.issuingOrganization,
      issueDate: cert.completionDate,
      expiryDate: undefined,
      credentialId: cert.id,
      credentialUrl: cert.linkUrl || cert.fileUrl || '',
      verificationStatus: cert.verificationStatus,
    }));
  }, [certificates]);

  // Prepare initial data for DigitalCVProfileBuilder
  const initialData = useMemo(() => {
    if (!profileData) return null;

    // Get profile picture from multiple possible field names
    const profilePicture = profileData.profileImageUrl || 
                          profileData.profilePicture || 
                          profileData.photoURL || 
                          '';

    // Get location - prioritize location field, then construct from city/country
    let location = profileData.location || '';
    if (!location && (profileData.city || profileData.country)) {
      const parts = [profileData.city, profileData.country].filter(Boolean);
      location = parts.join(', ');
    }

    console.log('[DigitalCVBuilder] Loading initial data:', {
      profilePicture,
      location,
      city: profileData.city,
      country: profileData.country,
      hasProfileData: !!profileData
    });

    return {
      displayName: profileData.fullName || profileData.displayName || '',
      firstName: profileData.firstName || profileData.fullName?.split(' ')[0] || '',
      lastName: profileData.lastName || profileData.fullName?.split(' ').slice(1).join(' ') || '',
      email: profileData.email || '',
      phone: profileData.phone || '',
      location: location,
      city: profileData.city || '',
      country: profileData.country || '',
      profilePicture: profilePicture,
      professionalSummary: profileData.bio || profileData.professionalSummary || '',
      bio: profileData.bio || profileData.professionalSummary || '',
      skills: transformedSkills,
      certifications: transformedCertificates,
      education: profileData.education || [],
      experience: profileData.experience || [],
      portfolio: portfolioProjects.map(proj => ({
        id: proj.id,
        title: proj.title || '',
        description: proj.description || '',
        link: proj.projectUrl || proj.imageUrl || '',
        techStack: proj.technologies || [],
        featured: false,
      })),
    };
  }, [profileData, transformedSkills, transformedCertificates, portfolioProjects]);

  // Handle save - persist to Firebase
  const handleSave = async (data: any) => {
    if (!currentUser) return;
    
    try {
      // Import Firebase functions
      const { doc, updateDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('@/integrations/firebase/client');
      const { updateProfile: updateAuthProfile } = await import('firebase/auth');
      const { auth } = await import('@/integrations/firebase/client');
      
      // Parse location into city and country if it's a string
      let city = data.city || '';
      let country = data.country || '';
      if (data.location && !city && !country) {
        const locationParts = data.location.split(',').map((part: string) => part.trim());
        if (locationParts.length >= 2) {
          city = locationParts[0];
          country = locationParts.slice(1).join(', ');
        } else if (locationParts.length === 1) {
          city = locationParts[0];
        }
      }
      
      // Prepare profile data with correct field names
      const profileData = {
        ...data,
        userId: currentUser.uid,
        // Map profilePicture to profileImageUrl for consistency
        profileImageUrl: data.profilePicture || data.profileImageUrl || '',
        profilePicture: data.profilePicture || data.profileImageUrl || '',
        // Ensure location, city, and country are all saved
        location: data.location || (city && country ? `${city}, ${country}` : city || country || ''),
        city: city,
        country: country,
        fullName: data.displayName || data.fullName || '',
        updatedAt: serverTimestamp(),
      };
      
      // Save to profiles collection
      const profileRef = doc(db, 'profiles', currentUser.uid);
      await setDoc(profileRef, profileData, { merge: true });
      console.log('[DigitalCVBuilder] Saved to profiles collection:', profileData);
      
      // Also update user document with key fields
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        displayName: data.displayName || data.fullName,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        location: profileData.location,
        city: profileData.city,
        country: profileData.country,
        bio: data.bio || data.professionalSummary,
        profilePicture: profileData.profilePicture,
        profileImageUrl: profileData.profileImageUrl,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      console.log('[DigitalCVBuilder] Saved to users collection');
      
      // Update Firebase Auth photoURL if profile picture exists
      if (profileData.profilePicture) {
        try {
          await updateAuthProfile(auth.currentUser!, {
            photoURL: profileData.profilePicture,
            displayName: data.displayName || data.fullName || auth.currentUser?.displayName
          });
          console.log('[DigitalCVBuilder] Updated Firebase Auth photoURL');
        } catch (authError) {
          console.warn('[DigitalCVBuilder] Could not update Auth photoURL:', authError);
          // Don't fail the save if Auth update fails
        }
      }
      
      // Wait a bit for Firebase to sync, then reload profile data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reload profile data to get the latest from Firebase
      const updatedProfile = await getProfile(currentUser.uid);
      if (updatedProfile) {
        console.log('[DigitalCVBuilder] Reloaded profile data after save:', {
          profilePicture: updatedProfile.profileImageUrl || updatedProfile.profilePicture,
          location: updatedProfile.location,
          city: updatedProfile.city,
          country: updatedProfile.country
        });
        setProfileData(updatedProfile);
      } else {
        console.warn('[DigitalCVBuilder] Profile not found after save, this might indicate a save issue');
      }
      
      console.log('[DigitalCVBuilder] CV data saved successfully');
    } catch (error) {
      console.error('[DigitalCVBuilder] Error saving CV data:', error);
      throw error;
    }
  };

  if (isLoading && !initialData) {
    return (
      <DashboardShell heading="Digital CV Builder" subheading="Building your professional CV">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell 
      heading="Digital CV & Profile Builder" 
      subheading="Build your professional CV with real-time updates from your skills and certificates"
    >
      <DigitalCVProfileBuilder
        initialData={initialData || {}}
        portfolioProjects={portfolioProjects}
        certificates={transformedCertificates}
        skills={transformedSkills}
        onSave={handleSave}
      />
    </DashboardShell>
  );
};

export default DigitalCVBuilder;
