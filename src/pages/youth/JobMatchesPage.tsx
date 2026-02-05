import React, { useState, useEffect, useMemo } from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import {
  getAllOpenJobs,
  subscribeToAllOpenJobs,
  getProfile,
  addApplication,
  getApplicationsByUser,
  subscribeToApplicationsByUser,
  updateProfile,
  uploadFile,
  deleteApplication
} from '@/integrations/firebase/services';
import { Job, Application, UserProfile } from '@/integrations/firebase/types';
import {
  Briefcase,
  MapPin,
  Clock,
  Bookmark,
  BookmarkCheck,
  Filter,
  Search,
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  FileText,
  CheckCircle2,
  Loader2,
  X,
  Upload,
  Eye,
  Award,
  GraduationCap,
  Trash2
} from 'lucide-react';

interface JobWithMatch extends Job {
  matchScore: number;
  isSaved: boolean;
  isApplied: boolean;
}

const JobMatchesPage = () => {
  const { currentUser, userData } = useAuth();
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedJobType, setSelectedJobType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent'>('recent');
  
  // Application dialog
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedCvUrl, setSelectedCvUrl] = useState<string>('');
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cvSelectionMode, setCvSelectionMode] = useState<'existing' | 'upload'>('existing');
  const [newCvFile, setNewCvFile] = useState<File | null>(null);
  const [uploadingCv, setUploadingCv] = useState(false);
  
  // Job detail dialog
  const [showJobDetailDialog, setShowJobDetailDialog] = useState(false);
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<JobWithMatch | null>(null);
  
  // Delete application state
  const [deletingApplicationId, setDeletingApplicationId] = useState<string | null>(null);

  // Load profile and saved jobs
  useEffect(() => {
    const loadProfile = async () => {
      if (!currentUser) return;
      
      try {
        const userProfile = await getProfile(currentUser.uid);
        if (userProfile) {
          setProfile(userProfile);
          setSavedJobs(userProfile.savedJobs || []);
          // Get CV URL from profile
          if (userProfile.cvUrl) {
            setSelectedCvUrl(userProfile.cvUrl);
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };
    
    loadProfile();
  }, [currentUser]);

  // Load applications
  useEffect(() => {
    const loadApplications = async () => {
      if (!currentUser) return;
      
      try {
        const userApplications = await getApplicationsByUser(currentUser.uid);
        setApplications(userApplications);
      } catch (error) {
        console.error('Error loading applications:', error);
      }
    };
    
    loadApplications();
  }, [currentUser]);

  // Subscribe to real-time jobs
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    let timeoutId: NodeJS.Timeout;
    let isMounted = true;
    
    // Set a timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('Jobs loading timeout - trying fallback');
        setLoading(false);
        // Try to load jobs without subscription as fallback
        getAllOpenJobs().then(jobsData => {
          if (isMounted) {
            setJobs(jobsData);
          }
        }).catch(error => {
          console.error('Error loading jobs (fallback):', error);
          if (isMounted) {
            toast.error('Failed to load jobs. Please refresh the page.');
          }
        });
      }
    }, 10000); // 10 second timeout

    try {
      const unsubscribe = subscribeToAllOpenJobs(
        (jobsData) => {
          if (isMounted) {
            clearTimeout(timeoutId);
            setJobs(jobsData);
            setLoading(false);
          }
        },
        (error) => {
          if (isMounted) {
            clearTimeout(timeoutId);
            console.error('Error in jobs subscription:', error);
            setLoading(false);
            // Try fallback
            getAllOpenJobs().then(jobsData => {
              if (isMounted) {
                setJobs(jobsData);
                toast.warning('Using fallback mode. Some features may be limited.');
              }
            }).catch(fallbackError => {
              console.error('Error loading jobs (fallback):', fallbackError);
              if (isMounted) {
                toast.error('Failed to load jobs. Please check your connection and refresh.');
              }
            });
          }
        }
      );

      return () => {
        isMounted = false;
        clearTimeout(timeoutId);
        unsubscribe();
      };
    } catch (error) {
      if (isMounted) {
        clearTimeout(timeoutId);
        console.error('Error setting up jobs subscription:', error);
        setLoading(false);
        // Try fallback
        getAllOpenJobs().then(jobsData => {
          if (isMounted) {
            setJobs(jobsData);
          }
        }).catch(fallbackError => {
          console.error('Error loading jobs (fallback):', fallbackError);
          if (isMounted) {
            toast.error('Failed to load jobs. Please refresh the page.');
          }
        });
      }
    }
  }, [currentUser]);

  // Subscribe to real-time applications
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToApplicationsByUser(currentUser.uid, (apps) => {
      setApplications(apps);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Calculate match score for a job
  const calculateMatchScore = (job: Job): number => {
    if (!profile) return 0;

    let skillsMatch = 0;
    let categoryMatch = 0;
    let locationMatch = 0;

    // Skills match (40% weight)
    if (job.tags && job.tags.length > 0 && profile.skills && profile.skills.length > 0) {
      const jobSkills = job.tags.map(t => t.toLowerCase());
      const userSkills = profile.skills.map(s => {
        if (typeof s === 'string') return s.toLowerCase();
        return (s as any).skillName?.toLowerCase() || (s as any).name?.toLowerCase() || '';
      });
      
      const matchingSkills = jobSkills.filter(js => 
        userSkills.some(us => us.includes(js) || js.includes(us))
      );
      skillsMatch = (matchingSkills.length / jobSkills.length) * 100;
    }

    // Category match (30% weight) - using preferredCareerField or talentArea
    const userCategory = (profile.preferredCareerField || profile.talentArea || '').toLowerCase();
    const jobTitle = (job.title || '').toLowerCase();
    const jobDescription = (job.description || '').toLowerCase();
    
    if (userCategory && (jobTitle.includes(userCategory) || jobDescription.includes(userCategory))) {
      categoryMatch = 100;
    } else if (job.tags && job.tags.some(tag => tag.toLowerCase().includes(userCategory))) {
      categoryMatch = 70;
    }

    // Location match (30% weight)
    const userLocation = (profile.location || profile.city || profile.country || '').toLowerCase();
    const jobLocation = (job.location || '').toLowerCase();
    
    if (job.remoteType === 'remote') {
      locationMatch = 100; // Remote jobs match everyone
    } else if (userLocation && jobLocation) {
      if (jobLocation.includes(userLocation) || userLocation.includes(jobLocation)) {
        locationMatch = 100;
      } else {
        // Partial match
        const userParts = userLocation.split(/[,\s]+/);
        const jobParts = jobLocation.split(/[,\s]+/);
        const matchingParts = userParts.filter(up => jobParts.some(jp => jp.includes(up) || up.includes(jp)));
        locationMatch = (matchingParts.length / Math.max(userParts.length, 1)) * 50;
      }
    }

    // Calculate final score: (skillsMatch * 0.4) + (categoryMatch * 0.3) + (locationMatch * 0.3)
    const finalScore = Math.round((skillsMatch * 0.4) + (categoryMatch * 0.3) + (locationMatch * 0.3));
    return Math.min(100, Math.max(0, finalScore));
  };

  // Get jobs with match scores
  const jobsWithMatches = useMemo(() => {
    const appliedJobIds = new Set(applications.map(app => app.jobId));
    
    return jobs.map(job => ({
      ...job,
      matchScore: calculateMatchScore(job),
      isSaved: savedJobs.includes(job.id),
      isApplied: appliedJobIds.has(job.id)
    } as JobWithMatch));
  }, [jobs, profile, savedJobs, applications]);

  // Helper function to check if a job is relevant to user's profile
  const isJobRelevant = (job: JobWithMatch): boolean => {
    if (!profile) return false;

    // Extract user skills
    const userSkills = (profile.skills || []).map(s => {
      if (typeof s === 'string') return s.toLowerCase().trim();
      return ((s as any).skillName || (s as any).name || '').toLowerCase().trim();
    }).filter(s => s.length > 0);

    // Extract user career field
    const userCareerField = (profile.preferredCareerField || profile.talentArea || '').toLowerCase().trim();
    
    // Extract job skills from tags, requirements, and skillsRequired
    const jobTags = (job.tags || []).map(t => t.toLowerCase().trim());
    const jobSkillsRequired = ((job as any).skillsRequired || []).map((s: string) => s.toLowerCase().trim());
    const allJobSkills = [...jobTags, ...jobSkillsRequired];
    const jobTitle = (job.title || '').toLowerCase();
    const jobDescription = (job.description || '').toLowerCase();
    const jobRequirements = (job.requirements || '').toLowerCase();
    const jobQualifications = (job.qualifications || []).map(q => q.toLowerCase().trim());
    
    // Combine all job-related text for searching
    const allJobText = `${jobTitle} ${jobDescription} ${jobRequirements} ${allJobSkills.join(' ')} ${jobQualifications.join(' ')}`;

    // Check 1: Must have at least 30% match score
    if (job.matchScore < 30) {
      // Even with low match score, check for strong relevance indicators
      let relevanceScore = 0;
      
      // Check 2: Skill matches (must have at least 2 matching skills or 50% of job skills)
      if (userSkills.length > 0 && allJobSkills.length > 0) {
        const matchingSkills = allJobSkills.filter(jt => 
          userSkills.some(us => {
            // Exact match or one contains the other
            return us === jt || us.includes(jt) || jt.includes(us);
          })
        );
        
        // Require at least 2 matching skills OR 50% of job skills match
        const skillMatchRatio = matchingSkills.length / Math.max(allJobSkills.length, 1);
        if (matchingSkills.length >= 2 || skillMatchRatio >= 0.5) {
          relevanceScore += 40;
        } else if (matchingSkills.length >= 1) {
          relevanceScore += 20;
        }
      }
      
      // Check 3: Career field match (strong indicator)
      if (userCareerField && userCareerField.length > 0) {
        // Check if career field appears in job title, description, or tags
        const careerFieldWords = userCareerField.split(/\s+/).filter(w => w.length > 2);
        const hasCareerMatch = careerFieldWords.some(word => 
          jobTitle.includes(word) || 
          jobDescription.includes(word) ||
          allJobSkills.some(skill => skill.includes(word))
        );
        
        if (hasCareerMatch) {
          relevanceScore += 30;
        }
      }
      
      // Check 4: Check if job requirements/qualifications mention user skills
      if (userSkills.length > 0) {
        const skillsInJobText = userSkills.filter(us => 
          allJobText.includes(us) || 
          allJobSkills.some(skill => skill.includes(us) || us.includes(skill))
        );
        if (skillsInJobText.length >= 2) {
          relevanceScore += 20;
        } else if (skillsInJobText.length >= 1) {
          relevanceScore += 10;
        }
      }
      
      // Check 5: Experience level match
      if (profile.yearsOfExperience !== undefined && job.experienceLevel) {
        const userExp = profile.yearsOfExperience;
        const jobLevel = job.experienceLevel;
        
        // Entry: 0-2 years, Mid: 2-5 years, Senior: 5+ years, Executive: 10+ years
        if (
          (jobLevel === 'entry' && userExp <= 2) ||
          (jobLevel === 'mid' && userExp >= 2 && userExp <= 5) ||
          (jobLevel === 'senior' && userExp >= 5) ||
          (jobLevel === 'executive' && userExp >= 10)
        ) {
          relevanceScore += 10;
        }
      }
      
      // Only include if relevance score is at least 50
      return relevanceScore >= 50;
    }
    
    // If match score is 30% or higher, include it
    return true;
  };

  // Filter and sort jobs
  const filteredJobs = useMemo(() => {
    let filtered = [...jobsWithMatches];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(query) ||
        job.description.toLowerCase().includes(query) ||
        job.location.toLowerCase().includes(query) ||
        (job.tags && job.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(job =>
        job.tags?.some(tag => tag.toLowerCase().includes(selectedCategory.toLowerCase())) ||
        job.title.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }

    // Location filter
    if (selectedLocation !== 'all') {
      if (selectedLocation === 'remote') {
        filtered = filtered.filter(job => job.remoteType === 'remote');
      } else {
        filtered = filtered.filter(job => 
          job.location.toLowerCase().includes(selectedLocation.toLowerCase())
        );
      }
    }

    // Job type filter
    if (selectedJobType !== 'all') {
      filtered = filtered.filter(job => job.remoteType === selectedJobType);
    }

    // Sort by most recent
    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return filtered;
  }, [jobsWithMatches, searchQuery, selectedCategory, selectedLocation, selectedJobType, profile]);

  // Get unique categories and locations
  const categories = useMemo(() => {
    const cats = new Set<string>();
    jobs.forEach(job => {
      job.tags?.forEach(tag => cats.add(tag));
    });
    return Array.from(cats).sort();
  }, [jobs]);

  const locations = useMemo(() => {
    const locs = new Set<string>();
    jobs.forEach(job => {
      if (job.location) locs.add(job.location);
      if (job.remoteType === 'remote') locs.add('Remote');
    });
    return Array.from(locs).sort();
  }, [jobs]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const newMatchesToday = filteredJobs.filter(job => {
      const jobDate = new Date(job.createdAt);
      jobDate.setHours(0, 0, 0, 0);
      return jobDate.getTime() === today.getTime() && !job.isApplied;
    }).length;

    return {
      newMatchesToday,
      savedCount: savedJobs.length,
      appliedCount: applications.length
    };
  }, [filteredJobs, savedJobs, applications]);

  // Handle delete application
  const handleDeleteApplication = async (jobId: string) => {
    if (!currentUser) return;
    
    try {
      // Find the application for this job
      const application = applications.find(app => app.jobId === jobId);
      if (!application) {
        toast.error(t('applicationNotFound'));
        return;
      }
      
      setDeletingApplicationId(application.id);
      await deleteApplication(application.id, currentUser.uid);
      
      // Remove from local state
      setApplications(prev => prev.filter(app => app.id !== application.id));
      
      // Remove from profile's appliedJobs
      if (profile) {
        const updatedAppliedJobs = (profile.appliedJobs || []).filter(id => id !== jobId);
        await updateProfile(currentUser.uid, {
          appliedJobs: updatedAppliedJobs
        });
        setProfile({ ...profile, appliedJobs: updatedAppliedJobs });
      }
      
      toast.success(t('applicationDeleted'));
    } catch (error: any) {
      console.error('Error deleting application:', error);
      toast.error(error.message || t('failedToDeleteApplication'));
    } finally {
      setDeletingApplicationId(null);
    }
  };

  // Handle save/unsave job
  const handleSaveJob = async (jobId: string) => {
    if (!currentUser) return;

    const isCurrentlySaved = savedJobs.includes(jobId);
    const newSavedJobs = isCurrentlySaved
      ? savedJobs.filter(id => id !== jobId)
      : [...savedJobs, jobId];

    try {
      setSavedJobs(newSavedJobs);
      await updateProfile(currentUser.uid, {
        savedJobs: newSavedJobs
      });
      
      toast.success(isCurrentlySaved ? t('jobRemovedFromSaved') : t('jobSavedSuccessfully'));
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error(t('failedToSaveJob'));
      setSavedJobs(savedJobs); // Revert on error
    }
  };

  // Handle apply to job
  const handleApplyClick = (job: Job) => {
    setSelectedJob(job);
    setShowApplicationDialog(true);
    // Reset form state
    setCvSelectionMode('existing');
    setNewCvFile(null);
    setCoverLetter('');
    // Set default CV if available
    if (profile?.cvUrl) {
      setSelectedCvUrl(profile.cvUrl);
    }
  };

  const handleSubmitApplication = async () => {
    if (!currentUser || !selectedJob) {
      toast.error('Missing required information');
      return;
    }

    // Validate CV selection
    if (cvSelectionMode === 'existing' && !selectedCvUrl) {
      toast.error('Please select a CV to apply');
      return;
    }

    if (cvSelectionMode === 'upload' && !newCvFile) {
      toast.error('Please upload a CV file');
      return;
    }

    setSubmitting(true);
    setUploadingCv(true);
    try {
      let finalCvUrl = selectedCvUrl;

      // Upload new CV if one was selected
      if (cvSelectionMode === 'upload' && newCvFile) {
        try {
          const fileExt = newCvFile.name.split('.').pop();
          const filePath = `applications/${currentUser.uid}/${selectedJob.id}/${Date.now()}.${fileExt}`;
          finalCvUrl = await uploadFile(newCvFile, filePath);
        } catch (uploadError) {
          console.error('Error uploading CV:', uploadError);
          toast.error('Failed to upload CV. Please try again.');
          setSubmitting(false);
          setUploadingCv(false);
          return;
        }
      }

      // Create application
      await addApplication({
        userId: currentUser.uid,
        userName: profile?.fullName || userData?.displayName || 'User',
        userEmail: currentUser.email || '',
        jobId: selectedJob.id,
        jobTitle: selectedJob.title,
        companyName: selectedJob.companyName || 'Company', // Get company name from job or use default
        status: 'new',
        cvUrl: finalCvUrl,
        coverLetter: coverLetter.trim() || undefined,
        notes: coverLetter.trim() || undefined
      });

      // Update user's appliedJobs
      const currentAppliedJobs = profile?.appliedJobs || [];
      if (!currentAppliedJobs.includes(selectedJob.id)) {
        await updateProfile(currentUser.uid, {
          appliedJobs: [...currentAppliedJobs, selectedJob.id]
        });
      }

      toast.success(t('applicationSubmitted'));
      setShowApplicationDialog(false);
      setSelectedJob(null);
      setCoverLetter('');
      setNewCvFile(null);
      setCvSelectionMode('existing');
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application');
    } finally {
      setSubmitting(false);
      setUploadingCv(false);
    }
  };

  // Get CV options
  const cvOptions = useMemo(() => {
    const options: { label: string; value: string }[] = [];
    
    if (profile?.cvUrl) {
      options.push({
        label: 'Uploaded CV',
        value: profile.cvUrl
      });
    }
    
    // Check if there's a CV from Digital CV Builder
    // This would be stored in profiles collection
    if (profile && (profile as any).digitalCvUrl) {
      options.push({
        label: 'Digital CV (AI Generated)',
        value: (profile as any).digitalCvUrl
      });
    }

    return options;
  }, [profile]);

  if (loading) {
    return (
      <DashboardShell heading="Job Matches" subheading="Discover opportunities that match your profile">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell heading={t('jobMatches')} subheading={t('discoverOpportunities')}>
      <div className="space-y-6">
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('newMatchesToday')}</p>
                  <p className="text-2xl font-bold">{stats.newMatchesToday}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('savedJobs')}</p>
                  <p className="text-2xl font-bold">{stats.savedCount}</p>
                </div>
                <BookmarkCheck className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('appliedJobs')}</p>
                  <p className="text-2xl font-bold">{stats.appliedCount}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t('filters')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <Label>{t('search')}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('searchJobs')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label>{t('category')}</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('allCategories')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allCategories')}</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('location')}</Label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('allLocations')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allLocations')}</SelectItem>
                    {locations.map(loc => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('jobType')}</Label>
                <Select value={selectedJobType} onValueChange={setSelectedJobType}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('allTypes')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allTypes')}</SelectItem>
                    <SelectItem value="remote">{t('remote')}</SelectItem>
                    <SelectItem value="hybrid">{t('hybrid')}</SelectItem>
                    <SelectItem value="on-site">{t('onSite')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <Label>{t('view')}:</Label>
              <Button
                variant="default"
                size="sm"
              >
                {t('availableJobs')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Jobs List */}
        <div className="space-y-4">
          {filteredJobs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Briefcase className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">{t('noJobsFound')}</h3>
                <p className="text-muted-foreground">
                  {searchQuery || selectedCategory !== 'all' || selectedLocation !== 'all' || selectedJobType !== 'all'
                    ? t('tryAdjustingFilters')
                    : t('noJobsAvailable')}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredJobs.map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold">{job.title}</h3>
                        {job.isApplied && (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {t('applied')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {job.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {job.remoteType === 'remote' ? t('remote') : job.remoteType === 'hybrid' ? t('hybrid') : t('onSite')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(job.createdAt).toLocaleDateString()}
                        </div>
                        {job.salaryMin && job.salaryMax && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {job.salaryCurrency || 'USD'} {job.salaryMin.toLocaleString()} - {job.salaryMax.toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div 
                        className="text-sm text-muted-foreground line-clamp-2 mb-3 prose prose-sm max-w-none [&_p]:mb-2 [&_strong]:font-semibold"
                        dangerouslySetInnerHTML={{ __html: job.description || '' }}
                      />
                      {job.tags && job.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {job.tags.slice(0, 5).map((tag, idx) => (
                            <Badge key={idx} variant="secondary">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedJobForDetail(job);
                          setShowJobDetailDialog(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {t('viewDetails')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSaveJob(job.id)}
                      >
                        {job.isSaved ? (
                          <>
                            <BookmarkCheck className="h-4 w-4 mr-2" />
                            {t('saved')}
                          </>
                        ) : (
                          <>
                            <Bookmark className="h-4 w-4 mr-2" />
                            {t('save')}
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      {!job.isApplied ? (
                        <Button onClick={() => handleApplyClick(job)}>
                          <FileText className="h-4 w-4 mr-2" />
                          {t('applyNow')}
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="outline" disabled>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            {t('applied')}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                disabled={deletingApplicationId === applications.find(app => app.jobId === job.id)?.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('deleteApplication')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('deleteApplicationConfirm')} <strong>{job.title}</strong>? {t('thisActionCannotBeUndone')}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteApplication(job.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  {t('delete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Application Dialog */}
      <Dialog open={showApplicationDialog} onOpenChange={setShowApplicationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('applyFor')} {selectedJob?.title}</DialogTitle>
            <DialogDescription>
              {t('submitApplication')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{t('cvSelection')} *</Label>
              <div className="space-y-3 mt-2">
                {/* Radio buttons for selection mode */}
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="cv-existing"
                      name="cv-mode"
                      checked={cvSelectionMode === 'existing'}
                      onChange={() => setCvSelectionMode('existing')}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="cv-existing" className="font-normal cursor-pointer">
                      {t('useExistingCV')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="cv-upload"
                      name="cv-mode"
                      checked={cvSelectionMode === 'upload'}
                      onChange={() => setCvSelectionMode('upload')}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="cv-upload" className="font-normal cursor-pointer">
                      {t('uploadNewCV')}
                    </Label>
                  </div>
                </div>

                {/* Existing CV selection */}
                {cvSelectionMode === 'existing' && (
                  <div>
                    <Select value={selectedCvUrl} onValueChange={setSelectedCvUrl}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('chooseCV')} />
                      </SelectTrigger>
                      <SelectContent>
                        {cvOptions.length > 0 ? (
                          cvOptions.map((option, idx) => (
                            <SelectItem key={idx} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="" disabled>{t('noCvAvailable')}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {cvOptions.length === 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {t('uploadCvInstructions')}
                      </p>
                    )}
                  </div>
                )}

                {/* New CV upload */}
                {cvSelectionMode === 'upload' && (
                  <div>
                    <label
                      htmlFor="cv-upload-input"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-gray-500" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">{t('clickToUpload')}</span> {t('dragAndDrop')}
                        </p>
                        <p className="text-xs text-gray-500">{t('fileTypes')}</p>
                      </div>
                      <input
                        id="cv-upload-input"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Validate file size (10MB)
                            if (file.size > 10 * 1024 * 1024) {
                              toast.error('File size must be less than 10MB');
                              return;
                            }
                            setNewCvFile(file);
                          }
                        }}
                      />
                    </label>
                    {newCvFile && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="h-4 w-4" />
                        <span>{newCvFile.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => setNewCvFile(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>{t('coverLetter')}</Label>
              <Textarea
                placeholder={t('writeCoverLetter')}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplicationDialog(false)}>
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleSubmitApplication} 
              disabled={submitting || uploadingCv || (cvSelectionMode === 'existing' && !selectedCvUrl) || (cvSelectionMode === 'upload' && !newCvFile)}
            >
              {submitting || uploadingCv ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {uploadingCv ? t('uploadingCV') : t('submitting')}
                </>
              ) : (
                t('submitApplicationButton')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Job Detail Dialog */}
      <Dialog open={showJobDetailDialog} onOpenChange={setShowJobDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedJobForDetail?.title}</DialogTitle>
            <DialogDescription>
              View complete job details and requirements
            </DialogDescription>
          </DialogHeader>
          {selectedJobForDetail && (
            <div className="space-y-6">
              {/* Job Header Info */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground pb-4 border-b">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {selectedJobForDetail.location}
                </div>
                <div className="flex items-center gap-1">
                  <Briefcase className="h-4 w-4" />
                  {selectedJobForDetail.remoteType === 'remote' ? 'Remote' : selectedJobForDetail.remoteType === 'hybrid' ? 'Hybrid' : 'On-site'}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Posted {new Date(selectedJobForDetail.createdAt).toLocaleDateString()}
                </div>
                {(() => {
                  const compensationType = (selectedJobForDetail as any).compensationType || 'fixed-salary';
                  if (selectedJobForDetail.salaryMin && selectedJobForDetail.salaryMax) {
                    const labels: Record<string, string> = {
                      'fixed-salary': 'Salary',
                      'hourly': 'Hourly Rate',
                      'stipend': 'Stipend',
                      'retainer': 'Retainer',
                      'paid-internship': 'Internship Stipend'
                    };
                    return (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {labels[compensationType] || 'Compensation'}: {selectedJobForDetail.salaryCurrency || 'USD'} {selectedJobForDetail.salaryMin.toLocaleString()} - {selectedJobForDetail.salaryMax.toLocaleString()}
                      </div>
                    );
                  } else if (compensationType && compensationType !== 'fixed-salary') {
                    const labels: Record<string, string> = {
                      'performance-based': 'Performance-based',
                      'club-dependent': 'Club-dependent',
                      'contract-based': 'Contract-based',
                      'scholarship': 'Scholarship',
                      'commission': 'Commission',
                      'project-based': 'Project-based',
                      'negotiable': 'Negotiable',
                      'volunteer': 'Volunteer',
                      'unpaid-internship': 'Unpaid Internship'
                    };
                    return (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        Compensation: {labels[compensationType] || compensationType}
                      </div>
                    );
                  }
                  return null;
                })()}
                {selectedJobForDetail.experienceLevel && (
                  <div className="flex items-center gap-1">
                    <Award className="h-4 w-4" />
                    {(() => {
                      const labels: Record<string, string> = {
                        'entry': 'Entry Level',
                        'mid': 'Mid Level',
                        'senior': 'Senior Level',
                        'executive': 'Executive',
                        'beginner': 'Beginner',
                        'intermediate': 'Intermediate',
                        'advanced': 'Advanced',
                        'youth': 'Youth',
                        'junior': 'Junior',
                        'amateur': 'Amateur',
                        'semi-professional': 'Semi-Professional',
                        'professional': 'Professional',
                        'elite': 'Elite',
                        'collegiate': 'Collegiate',
                        'academy': 'Academy',
                        'veteran': 'Veteran'
                      };
                      return labels[selectedJobForDetail.experienceLevel] || selectedJobForDetail.experienceLevel.charAt(0).toUpperCase() + selectedJobForDetail.experienceLevel.slice(1).replace(/-/g, ' ');
                    })()}
                  </div>
                )}
              </div>

              {/* Job Description */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Job Description
                </h3>
                <div 
                  className="prose prose-sm max-w-none [&_p]:mb-3 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5"
                  dangerouslySetInnerHTML={{ __html: selectedJobForDetail.description || 'No description available.' }}
                />
              </div>

              {/* Requirements */}
              {selectedJobForDetail.requirements && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Requirements
                  </h3>
                  <div 
                    className="prose prose-sm max-w-none [&_p]:mb-3 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5"
                    dangerouslySetInnerHTML={{ __html: selectedJobForDetail.requirements }}
                  />
                </div>
              )}

              {/* Qualifications */}
              {selectedJobForDetail.qualifications && selectedJobForDetail.qualifications.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Qualifications
                  </h3>
                  <ul className="list-disc pl-5 space-y-2">
                    {selectedJobForDetail.qualifications.map((qual, idx) => (
                      <li key={idx} className="text-sm">{qual}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Skills/Tags */}
              {selectedJobForDetail.tags && selectedJobForDetail.tags.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedJobForDetail.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Info */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                {selectedJobForDetail.department && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Department:</span>
                    <p className="text-sm">{selectedJobForDetail.department}</p>
                  </div>
                )}
                {selectedJobForDetail.numberOfOpenings && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Openings:</span>
                    <p className="text-sm">{selectedJobForDetail.numberOfOpenings}</p>
                  </div>
                )}
                {selectedJobForDetail.deadline && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Application Deadline:</span>
                    <p className="text-sm">{new Date(selectedJobForDetail.deadline).toLocaleDateString()}</p>
                  </div>
                )}
                {selectedJobForDetail.applicationDeadline && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Application Deadline:</span>
                    <p className="text-sm">{new Date(selectedJobForDetail.applicationDeadline).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              {/* Benefits */}
              {selectedJobForDetail.benefits && selectedJobForDetail.benefits.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Benefits</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    {selectedJobForDetail.benefits.map((benefit, idx) => (
                      <li key={idx} className="text-sm">{benefit}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleSaveJob(selectedJobForDetail.id)}
                  className="flex-1"
                >
                  {selectedJobForDetail.isSaved ? (
                    <>
                      <BookmarkCheck className="h-4 w-4 mr-2" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-4 w-4 mr-2" />
                      Save Job
                    </>
                  )}
                </Button>
                {!selectedJobForDetail.isApplied ? (
                  <Button 
                    onClick={() => {
                      setShowJobDetailDialog(false);
                      handleApplyClick(selectedJobForDetail);
                    }}
                    className="flex-1"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Apply Now
                  </Button>
                ) : (
                  <div className="flex gap-2 flex-1">
                    <Button variant="outline" disabled className="flex-1">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Applied
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive"
                          disabled={deletingApplicationId === applications.find(app => app.jobId === selectedJobForDetail.id)?.id}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Application</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete your application for <strong>{selectedJobForDetail.title}</strong>? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              handleDeleteApplication(selectedJobForDetail.id);
                              setShowJobDetailDialog(false);
                            }}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
};

export default JobMatchesPage;
