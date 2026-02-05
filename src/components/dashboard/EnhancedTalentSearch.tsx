import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAllProfiles,
  getSkillsByProfile,
  getPortfoliosByProfile,
  getReviewsByProfile,
  getAllYouthUsers,
  getConnectionsByUser
} from '@/integrations/firebase/services';
import { UserProfile, Skill, Portfolio, Review, TalentSearchFilters, Connection } from '@/integrations/firebase/types';
import {
  Search,
  Filter,
  Star,
  MapPin,
  Award,
  Briefcase,
  GraduationCap,
  Users,
  ChevronDown,
  ChevronUp,
  X,
  Save,
  Download,
  Bookmark,
  GitCompare,
  Sparkles,
  SlidersHorizontal,
  Plus,
  Trash2,
  MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TalentProfile extends UserProfile {
  avgRating: number;
  reviewCount: number;
  skills: Skill[];
  portfolios: Portfolio[];
  matchScore: number;
  lastActive?: Date;
}

export const EnhancedTalentSearch: React.FC = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<TalentProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<TalentProfile[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'rating' | 'experience' | 'name'>('relevance');
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [showAIMatch, setShowAIMatch] = useState(false);
  const [jobDescription, setJobDescription] = useState('');

  // Check if recruiter is connected to a youth user
  const isConnectedToYouth = (youthUserId: string): boolean => {
    if (!currentUser?.uid || !youthUserId) return false;
    
    return connections.some(connection => 
      connection.status === 'accepted' &&
      (
        (connection.userId === currentUser.uid && connection.connectedUserId === youthUserId) ||
        (connection.connectedUserId === currentUser.uid && connection.userId === youthUserId)
      )
    );
  };

  const [filters, setFilters] = useState<TalentSearchFilters>({
    skills: [],
    skillOperator: 'AND',
    locations: [],
    radius: 50,
    willingToRelocate: false,
    educationLevel: [],
    experienceLevel: [],
    yearsOfExperienceMin: 0,
    yearsOfExperienceMax: 20,
    certifications: [],
    languages: [],
    availability: [],
    jobTypePreference: [],
    salaryMin: 0,
    salaryMax: 200000,
    currency: 'USD',
    verifiedOnly: false,
    hasPortfolio: false,
    hasFeaturedProjects: false,
    minRating: 0,
    lastActive: undefined
  });

  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);

  const loadConnections = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const userConnections = await getConnectionsByUser(currentUser.uid);
      setConnections(userConnections);
    } catch (error) {
      console.error('Error loading connections:', error);
      // Don't block the UI if connections fail to load
      setConnections([]);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const initializeData = async () => {
      try {
        await loadTalentData();
        if (currentUser?.uid && isMounted) {
          await loadConnections();
        }
      } catch (error) {
        console.error('Error initializing data:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    initializeData();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid]);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [profiles, searchTerm, filters, sortBy]);

  const loadTalentData = async () => {
    try {
      setLoading(true);
      console.log('Loading talent data...');
      
      // Try getAllYouthUsers first, fallback to getAllProfiles if needed
      let profilesData = await getAllYouthUsers();
      console.log('Loaded profiles from getAllYouthUsers:', profilesData?.length || 0);
      
      // If no profiles found, try getAllProfiles and filter for youth (non-recruiters)
      if (!profilesData || profilesData.length === 0) {
        console.log('Trying getAllProfiles as fallback...');
        const allProfiles = await getAllProfiles();
        profilesData = allProfiles.filter(profile => !profile.companyName); // Youth don't have companyName
        console.log('Loaded profiles from getAllProfiles (filtered):', profilesData?.length || 0);
      }

      if (profilesData && profilesData.length > 0) {
        console.log('Processing profiles...');
        const talentProfiles: TalentProfile[] = await Promise.all(
          profilesData.map(async (profile) => {
            try {
              const [reviewsData, skillsData, portfoliosData] = await Promise.all([
                getReviewsByProfile(profile.id).catch(() => []),
                getSkillsByProfile(profile.id).catch(() => []),
                getPortfoliosByProfile(profile.id).catch(() => [])
              ]);

              const avgRating = reviewsData && reviewsData.length > 0
                ? reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length
                : 0;

              const matchScore = calculateMatchScore(profile, skillsData || [], reviewsData || []);

              return {
                ...profile,
                avgRating,
                reviewCount: reviewsData?.length || 0,
                skills: skillsData || [],
                portfolios: portfoliosData || [],
                matchScore,
                lastActive: profile.updatedAt
              };
            } catch (err) {
              console.error('Error processing profile:', profile.id, err);
              // Return profile with defaults if processing fails
              return {
                ...profile,
                avgRating: 0,
                reviewCount: 0,
                skills: [],
                portfolios: [],
                matchScore: 50,
                lastActive: profile.updatedAt
              };
            }
          })
        );

        console.log('Processed talent profiles:', talentProfiles.length);
        setProfiles(talentProfiles);

        const allSkills = talentProfiles.flatMap(profile =>
          profile.skills.map(skill => skill.skillName)
        );
        setAvailableSkills([...new Set(allSkills)]);
        console.log('Available skills:', allSkills.length);
      } else {
        console.log('No profiles found');
        setProfiles([]);
        setAvailableSkills([]);
        toast({
          title: 'No Candidates Found',
          description: 'There are currently no youth candidates in the system. Please check back later.',
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Error loading talent data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load talent data. Please try again.',
        variant: 'destructive'
      });
      setProfiles([]);
      setAvailableSkills([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateMatchScore = (profile: UserProfile, skills: Skill[], reviews: Review[]): number => {
    let score = 50;

    if (profile.yearsOfExperience) {
      score += Math.min(profile.yearsOfExperience * 2, 20);
    }

    if (profile.educationLevel) {
      const educationLevels = ['high_school', 'diploma', 'bachelor', 'master', 'phd'];
      const levelIndex = educationLevels.indexOf(profile.educationLevel);
      score += (levelIndex + 1) * 3;
    }

    const verifiedSkills = skills.filter(skill => skill.verificationStatus === 'verified').length;
    score += verifiedSkills * 5;

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;
    score += avgRating * 10;

    if (profile.isVerified) score += 10;

    return Math.min(score, 100);
  };

  const applyFiltersAndSearch = () => {
    let filtered = profiles.filter(profile => {
      // Text search
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          profile.fullName.toLowerCase().includes(searchLower) ||
          profile.bio?.toLowerCase().includes(searchLower) ||
          profile.preferredCareerField?.toLowerCase().includes(searchLower) ||
          profile.skills.some(skill => skill.skillName.toLowerCase().includes(searchLower));

        if (!matchesSearch) return false;
      }

      // Skills filter with operator
      if (filters.skills && filters.skills.length > 0) {
        if (filters.skillOperator === 'AND') {
          const hasAllSkills = filters.skills.every(requiredSkill =>
            profile.skills.some(skill => skill.skillName === requiredSkill)
          );
          if (!hasAllSkills) return false;
        } else {
          const hasAnySkill = filters.skills.some(requiredSkill =>
            profile.skills.some(skill => skill.skillName === requiredSkill)
          );
          if (!hasAnySkill) return false;
        }
      }

      // Experience level
      if (filters.experienceLevel && filters.experienceLevel.length > 0) {
        const expMap: Record<string, [number, number]> = {
          'entry': [0, 2],
          'junior': [1, 3],
          'mid': [3, 5],
          'senior': [6, 10],
          'expert': [11, 100]
        };
        const matchesLevel = filters.experienceLevel.some(level => {
          const [min, max] = expMap[level] || [0, 100];
          const years = profile.yearsOfExperience || 0;
          return years >= min && years <= max;
        });
        if (!matchesLevel) return false;
      }

      // Years of experience range
      if (profile.yearsOfExperience !== undefined) {
        if (profile.yearsOfExperience < (filters.yearsOfExperienceMin || 0) ||
            profile.yearsOfExperience > (filters.yearsOfExperienceMax || 100)) {
          return false;
        }
      }

      // Education level
      if (filters.educationLevel && filters.educationLevel.length > 0) {
        if (!profile.educationLevel || !filters.educationLevel.includes(profile.educationLevel)) {
          return false;
        }
      }

      // Location filter
      if (filters.locations && filters.locations.length > 0) {
        const matchesLocation = filters.locations.some(loc =>
          profile.city?.toLowerCase().includes(loc.toLowerCase()) ||
          profile.country?.toLowerCase().includes(loc.toLowerCase())
        );
        if (!matchesLocation && !filters.willingToRelocate) return false;
      }

      // Rating filter
      if (profile.avgRating < (filters.minRating || 0)) {
        return false;
      }

      // Verification filter
      if (filters.verifiedOnly && !profile.isVerified) {
        return false;
      }

      // Portfolio filter
      if (filters.hasPortfolio && profile.portfolios.length === 0) {
        return false;
      }

      // Featured projects filter
      if (filters.hasFeaturedProjects) {
        // Would need to check if portfolios have featured flag
        if (profile.portfolios.length === 0) return false;
      }

      return true;
    });

    // Sort results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.avgRating - a.avgRating;
        case 'experience':
          return (b.yearsOfExperience || 0) - (a.yearsOfExperience || 0);
        case 'name':
          return a.fullName.localeCompare(b.fullName);
        case 'relevance':
        default:
          return b.matchScore - a.matchScore;
      }
    });

    setFilteredProfiles(filtered);
  };

  const handleSkillToggle = (skill: string) => {
    setFilters(prev => ({
      ...prev,
      skills: prev.skills?.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...(prev.skills || []), skill]
    }));
  };

  const handleAIMatch = async () => {
    if (!jobDescription.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a job description',
        variant: 'destructive'
      });
      return;
    }

    // Extract skills from job description (simplified - would use AI in production)
    const extractedSkills = extractSkillsFromDescription(jobDescription);
    
    setFilters(prev => ({
      ...prev,
      skills: extractedSkills,
      skillOperator: 'AND'
    }));

    toast({
      title: 'Success',
      description: 'Skills extracted from job description. Matching candidates...'
    });
  };

  const extractSkillsFromDescription = (description: string): string[] => {
    // Simplified extraction - in production would use AI/NLP
    const commonSkills = availableSkills.filter(skill =>
      description.toLowerCase().includes(skill.toLowerCase())
    );
    return commonSkills.slice(0, 10);
  };

  const handleSaveSearch = () => {
    const searchName = prompt('Enter a name for this search:');
    if (searchName) {
      const newSearch = {
        id: Date.now().toString(),
        name: searchName,
        filters: { ...filters },
        createdAt: new Date()
      };
      setSavedSearches([...savedSearches, newSearch]);
      toast({
        title: 'Success',
        description: 'Search saved successfully'
      });
    }
  };

  const handleLoadSearch = (search: any) => {
    setFilters(search.filters);
    toast({
      title: 'Success',
      description: 'Search loaded successfully'
    });
  };


  const handleCompareCandidates = () => {
    if (selectedCandidates.length < 2) {
      toast({
        title: 'Error',
        description: 'Please select at least two candidates to compare',
        variant: 'destructive'
      });
      return;
    }
    if (selectedCandidates.length > 5) {
      toast({
        title: 'Error',
        description: 'You can compare a maximum of 5 candidates at once',
        variant: 'destructive'
      });
      return;
    }
    navigate(`/recruiter/compare?ids=${selectedCandidates.join(',')}`);
  };

  const toggleCandidateSelection = (candidateId: string) => {
    setSelectedCandidates(prev =>
      prev.includes(candidateId)
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Find Talent</h2>
          <p className="text-muted-foreground">Search and connect with top talent</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedCandidates.length > 0 && (
            <Button variant="outline" onClick={handleCompareCandidates}>
              <GitCompare className="h-4 w-4 mr-2" />
              Compare ({selectedCandidates.length})
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowAIMatch(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            AI Matching
          </Button>
          <Button variant="outline" onClick={handleSaveSearch}>
            <Save className="h-4 w-4 mr-2" />
            Save Search
          </Button>
        </div>
      </div>

      {/* AI Matching Dialog */}
      <Dialog open={showAIMatch} onOpenChange={setShowAIMatch}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Job Matching</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="jobDescription">Job Description</Label>
              <Textarea
                id="jobDescription"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste job description here..."
                rows={8}
                className="mt-2"
              />
            </div>
            <Button onClick={handleAIMatch} className="w-full">
              <Sparkles className="h-4 w-4 mr-2" />
              Extract Skills and Match
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Advanced Talent Search
            </CardTitle>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by name, skills, or bio..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <Tabs defaultValue="skills" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="skills">Skills</TabsTrigger>
                <TabsTrigger value="location">Location</TabsTrigger>
                <TabsTrigger value="experience">Experience</TabsTrigger>
                <TabsTrigger value="education">Education</TabsTrigger>
                <TabsTrigger value="other">Other</TabsTrigger>
              </TabsList>

              <TabsContent value="skills" className="space-y-4 mt-4">
                <div>
                  <Label>Skill Operator</Label>
                  <Select
                    value={filters.skillOperator}
                    onValueChange={(value: 'AND' | 'OR') =>
                      setFilters(prev => ({ ...prev, skillOperator: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">All Skills (AND)</SelectItem>
                      <SelectItem value="OR">Any Skill (OR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Select Skills</Label>
                  <div className="mt-2 max-h-48 overflow-y-auto border rounded p-3 space-y-2">
                    {availableSkills.slice(0, 50).map(skill => (
                      <div key={skill} className="flex items-center space-x-2">
                        <Checkbox
                          id={skill}
                          checked={filters.skills?.includes(skill)}
                          onCheckedChange={() => handleSkillToggle(skill)}
                        />
                        <Label htmlFor={skill} className="text-sm cursor-pointer">{skill}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="location" className="space-y-4 mt-4">
                <div>
                  <Label>Locations</Label>
                  <Input
                    placeholder="Enter locations (comma-separated)"
                    value={filters.locations?.join(', ') || ''}
                    onChange={(e) =>
                      setFilters(prev => ({
                        ...prev,
                        locations: e.target.value.split(',').map(l => l.trim()).filter(Boolean)
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Radius ({filters.radius} km)</Label>
                  <Slider
                    value={[filters.radius || 50]}
                    onValueChange={(value) =>
                      setFilters(prev => ({ ...prev, radius: value[0] }))
                    }
                    min={0}
                    max={500}
                    step={10}
                    className="mt-2"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="relocate"
                    checked={filters.willingToRelocate}
                    onCheckedChange={(checked) =>
                      setFilters(prev => ({ ...prev, willingToRelocate: checked as boolean }))
                    }
                  />
                  <Label htmlFor="relocate">Willing to Relocate</Label>
                </div>
              </TabsContent>

              <TabsContent value="experience" className="space-y-4 mt-4">
                <div>
                  <Label>Experience Level</Label>
                  <div className="mt-2 space-y-2">
                    {['entry', 'junior', 'mid', 'senior', 'expert'].map(level => (
                      <div key={level} className="flex items-center space-x-2">
                        <Checkbox
                          id={level}
                          checked={filters.experienceLevel?.includes(level)}
                          onCheckedChange={(checked) => {
                            setFilters(prev => ({
                              ...prev,
                              experienceLevel: checked
                                ? [...(prev.experienceLevel || []), level]
                                : prev.experienceLevel?.filter(l => l !== level) || []
                            }));
                          }}
                        />
                        <Label htmlFor={level} className="text-sm capitalize">{level}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>
                    Years of Experience: {filters.yearsOfExperienceMin} - {filters.yearsOfExperienceMax}
                  </Label>
                  <div className="flex gap-4 mt-2">
                    <Slider
                      value={[filters.yearsOfExperienceMin || 0, filters.yearsOfExperienceMax || 20]}
                      onValueChange={(value) =>
                        setFilters(prev => ({
                          ...prev,
                          yearsOfExperienceMin: value[0],
                          yearsOfExperienceMax: value[1]
                        }))
                      }
                      min={0}
                      max={20}
                      step={1}
                      className="flex-1"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="education" className="space-y-4 mt-4">
                <div>
                  <Label>Education Level</Label>
                  <div className="mt-2 space-y-2">
                    {['high_school', 'diploma', 'bachelor', 'master', 'phd'].map(level => (
                      <div key={level} className="flex items-center space-x-2">
                        <Checkbox
                          id={level}
                          checked={filters.educationLevel?.includes(level)}
                          onCheckedChange={(checked) => {
                            setFilters(prev => ({
                              ...prev,
                              educationLevel: checked
                                ? [...(prev.educationLevel || []), level]
                                : prev.educationLevel?.filter(l => l !== level) || []
                            }));
                          }}
                        />
                        <Label htmlFor={level} className="text-sm">
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="other" className="space-y-4 mt-4">
                <div>
                  <Label>Minimum Rating</Label>
                  <Select
                    value={filters.minRating?.toString()}
                    onValueChange={(value) =>
                      setFilters(prev => ({ ...prev, minRating: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Any Rating</SelectItem>
                      <SelectItem value="3">3+ ⭐</SelectItem>
                      <SelectItem value="4">4+ ⭐</SelectItem>
                      <SelectItem value="5">5 ⭐</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="verified"
                      checked={filters.verifiedOnly}
                      onCheckedChange={(checked) =>
                        setFilters(prev => ({ ...prev, verifiedOnly: checked as boolean }))
                      }
                    />
                    <Label htmlFor="verified">Verified Only</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="portfolio"
                      checked={filters.hasPortfolio}
                      onCheckedChange={(checked) =>
                        setFilters(prev => ({ ...prev, hasPortfolio: checked as boolean }))
                      }
                    />
                    <Label htmlFor="portfolio">Has Portfolio</Label>
                  </div>
                </div>
                <div>
                  <Label>Salary Range</Label>
                  <div className="flex gap-4 mt-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.salaryMin}
                      onChange={(e) =>
                        setFilters(prev => ({ ...prev, salaryMin: parseInt(e.target.value) || 0 }))
                      }
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.salaryMax}
                      onChange={(e) =>
                        setFilters(prev => ({ ...prev, salaryMax: parseInt(e.target.value) || 200000 }))
                      }
                    />
                    <Select
                      value={filters.currency}
                      onValueChange={(value) =>
                        setFilters(prev => ({ ...prev, currency: value }))
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="KES">KES</SelectItem>
                        <SelectItem value="TZS">TZS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

          )}

          {/* Sort and Actions */}
          <div className="flex items-center justify-between">
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="experience">Experience</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saved Searches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {savedSearches.map(search => (
                <Badge
                  key={search.id}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleLoadSearch(search)}
                >
                  {search.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Found {filteredProfiles.length} {filteredProfiles.length === 1 ? 'Candidate' : 'Candidates'}
          </h3>
        </div>

        {filteredProfiles.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {profiles.length === 0 
                  ? 'No Candidates Available' 
                  : 'No Candidates Match Your Filters'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {profiles.length === 0
                  ? 'There are currently no youth candidates registered in the system. Check back later or contact support.'
                  : 'Try adjusting your search filters or search terms to find more candidates.'}
              </p>
              {profiles.length > 0 && (
                <Button variant="outline" onClick={() => {
                  setSearchTerm('');
                  setFilters({
                    skills: [],
                    skillOperator: 'AND',
                    locations: [],
                    radius: 50,
                    willingToRelocate: false,
                    educationLevel: [],
                    experienceLevel: [],
                    yearsOfExperienceMin: 0,
                    yearsOfExperienceMax: 20,
                    certifications: [],
                    languages: [],
                    availability: [],
                    jobTypePreference: [],
                    salaryMin: 0,
                    salaryMax: 200000,
                    currency: 'USD',
                    verifiedOnly: false,
                    hasPortfolio: false,
                    hasFeaturedProjects: false,
                    minRating: 0,
                    lastActive: undefined
                  });
                }}>
                  Clear All Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredProfiles.map((profile) => (
              <Card
                key={profile.id}
                className={`hover:shadow-lg transition-shadow ${
                  selectedCandidates.includes(profile.userId) ? 'ring-2 ring-primary' : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="relative">
                        <Checkbox
                          checked={selectedCandidates.includes(profile.userId)}
                          onCheckedChange={() => toggleCandidateSelection(profile.userId)}
                          className="absolute -top-2 -left-2 z-10"
                        />
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={profile.profileImageUrl} />
                          <AvatarFallback>
                            {profile.fullName?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-xl font-semibold">{profile.fullName}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {profile.city}, {profile.country}
                              </div>
                              <div className="flex items-center gap-1">
                                <Briefcase className="w-4 h-4" />
                                {profile.yearsOfExperience} {profile.yearsOfExperience === 1 ? 'year' : 'years'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 mb-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < Math.round(profile.avgRating)
                                      ? 'text-yellow-500 fill-yellow-500'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {profile.matchScore}% Match
                            </Badge>
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-3 line-clamp-2">
                          {profile.bio || 'No bio provided'}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {profile.skills.slice(0, 5).map((skill) => (
                            <Badge
                              key={skill.id}
                              variant={skill.verificationStatus === 'verified' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {skill.skillName}
                              {skill.verificationStatus === 'verified' && <Award className="w-3 h-3 ml-1" />}
                            </Badge>
                          ))}
                          {profile.skills.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{profile.skills.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => navigate(`/recruiter/candidates/${profile.userId}`)}
                        className="w-full lg:w-auto"
                      >
                        View Profile
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full lg:w-auto"
                        onClick={() => {
                          if (!isConnectedToYouth(profile.userId)) {
                            toast({
                              title: 'Connection Required',
                              description: `You must be connected to ${profile.fullName} before you can message them. Please connect with them first.`,
                              variant: 'destructive'
                            });
                            return;
                          }
                          navigate(`/recruiter/messages?userId=${profile.userId}`);
                        }}
                        disabled={!isConnectedToYouth(profile.userId)}
                        title={!isConnectedToYouth(profile.userId) ? 'You must be connected to message this candidate' : 'Send message'}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

