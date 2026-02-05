import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, storage } from '@/integrations/firebase/client';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  FileText, 
  Download, 
  Share2, 
  Eye, 
  Sparkles, 
  GripVertical,
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  FileDown,
  Link as LinkIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { useAnalytics } from '@/hooks/useAnalytics';
import DigitalCVProfileBuilder from '@/components/cv/DigitalCVProfileBuilder';

const ProfileBuilder = () => {
  const { currentUser, userData, updateUserProfile } = useAuth();
  const { track } = useAnalytics();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [portfolioProjects, setPortfolioProjects] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);

  // Load user data from signup and existing profile
  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);

        // Get user document (from signup)
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userDocData = userDoc.exists() ? userDoc.data() : {};

        // Get profile document
        const profileDoc = await getDoc(doc(db, 'profiles', currentUser.uid));
        const profileDocData = profileDoc.exists() ? profileDoc.data() : {};

        // Get portfolios
        const portfoliosQuery = query(
          collection(db, 'portfolios'),
          where('userId', '==', currentUser.uid)
        );
        const portfoliosSnapshot = await getDocs(portfoliosQuery);
        const portfolios = portfoliosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Get certificates
        const certificatesQuery = query(
          collection(db, 'certificates'),
          where('userId', '==', currentUser.uid)
        );
        const certificatesSnapshot = await getDocs(certificatesQuery);
        const certs = certificatesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Merge signup data with profile data
        const mergedData = {
          // From signup
          displayName: userDocData.displayName || userDocData.firstName || currentUser.displayName || '',
          firstName: userDocData.firstName || userDocData.displayName?.split(' ')[0] || '',
          lastName: userDocData.lastName || userDocData.displayName?.split(' ').slice(1).join(' ') || '',
          email: currentUser.email || userDocData.email || '',
          phone: userDocData.phone || '',
          location: userDocData.city || userDocData.location || userDocData.country ? `${userDocData.city || ''}, ${userDocData.country || ''}`.trim() : '',
          city: userDocData.city || '',
          country: userDocData.country || '',
          age: userDocData.age || '',
          talentArea: userDocData.talentArea || '',
          preferredCareerField: userDocData.preferredCareerField || '',
          bio: userDocData.bio || profileDocData.bio || '',
          profilePicture: userDocData.profilePicture || userDocData.photoURL || currentUser.photoURL || '',
          
          // From profile
          professionalSummary: profileDocData.professionalSummary || profileDocData.bio || '',
          skills: profileDocData.skills || userDocData.skills || [],
          education: profileDocData.education || userDocData.education || [],
          experience: profileDocData.experience || userDocData.experience || [],
          languages: profileDocData.languages || [],
          certifications: certs.map(cert => ({
            id: cert.id,
            name: cert.certificateType || cert.name || '',
            issuer: 'Issuing Organization',
            issueDate: cert.submittedAt?.toDate?.()?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
            credentialId: cert.id,
            credentialUrl: cert.fileUrl || '',
            category: cert.certificateType || 'General',
          })),
          portfolio: portfolios.map(portfolio => ({
            id: portfolio.id,
            title: portfolio.title || '',
            description: portfolio.description || '',
            link: portfolio.projectUrl || portfolio.imageUrl || '',
            techStack: portfolio.technologies || [],
            featured: false,
            category: portfolio.category || 'Project',
          })),
          socialLinks: profileDocData.socialLinks || userDocData.socialLinks || {
            linkedin: '',
            github: '',
            twitter: '',
            portfolio: '',
          },
          availabilityStatus: profileDocData.availabilityStatus || 'Open to opportunities',
          jobPreferences: profileDocData.jobPreferences || [],
          salaryExpectation: profileDocData.salaryExpectation || {},
          visibility: profileDocData.visibility || 'public',
          visibilitySettings: profileDocData.visibilitySettings || {
            showProfile: true,
            showContactInfo: true,
            showPortfolio: true,
            searchable: true,
          },
        };

        setProfileData(mergedData);
        setPortfolioProjects(portfolios);
        setCertificates(certs);

        // Track profile view
        track('profile_viewed', { userId: currentUser.uid });
      } catch (error) {
        console.error('Error loading user data:', error);
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [currentUser, track]);

  // Real-time updates
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = onSnapshot(doc(db, 'profiles', currentUser.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setProfileData((prev: any) => ({
          ...prev,
          ...data,
        }));
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  const profileCompletion = useMemo(() => {
    if (!profileData) return 0;

    const fields = [
      profileData.displayName,
      profileData.email,
      profileData.bio || profileData.professionalSummary,
      profileData.skills?.length > 0,
      profileData.education?.length > 0,
      profileData.experience?.length > 0,
      profileData.profilePicture,
      profileData.location,
    ];

    const completedFields = fields.filter(Boolean).length;
    return Math.round((completedFields / fields.length) * 100);
  }, [profileData]);

  if (loading) {
    return (
      <DashboardShell heading="Digital CV & Profile Builder" subheading="Build your professional profile and CV">
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell heading="Digital CV & Profile Builder" subheading="Build your professional profile and CV">
      <DigitalCVProfileBuilder
        initialData={profileData}
        portfolioProjects={portfolioProjects}
        certificates={certificates}
        onSave={async (data) => {
          setSaving(true);
          try {
            // Update profile in Firestore (use setDoc with merge to handle non-existent docs)
            await setDoc(doc(db, 'profiles', currentUser!.uid), {
              ...data,
              userId: currentUser!.uid,
              updatedAt: serverTimestamp(),
            }, { merge: true });

            // Update user document (use setDoc with merge to handle non-existent docs)
            await setDoc(doc(db, 'users', currentUser!.uid), {
              displayName: data.displayName,
              firstName: data.firstName,
              lastName: data.lastName,
              phone: data.phone,
              location: data.location,
              bio: data.bio || data.professionalSummary,
              skills: data.skills,
              education: data.education,
              experience: data.experience,
              updatedAt: serverTimestamp(),
            }, { merge: true });

            setProfileData(data);
            toast.success('Profile saved successfully');
            track('profile_viewed', { userId: currentUser!.uid });
          } catch (error) {
            console.error('Error saving profile:', error);
            toast.error('Failed to save profile');
          } finally {
            setSaving(false);
          }
        }}
      />
    </DashboardShell>
  );
};

export default ProfileBuilder;
