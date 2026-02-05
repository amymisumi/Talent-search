import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { findBestMatches, JobPosting } from '@/integrations/firebase/recruiterService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, User, Briefcase, Star, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type TalentMatch = {
  userId: string;
  jobId: string;
  matchScore: number;
  skillsMatch: string[];
  missingSkills: string[];
  profileCompletion: number;
  lastUpdated: Date;
  userProfile?: {
    displayName: string;
    photoURL?: string;
    title?: string;
    location?: string;
    experience?: number;
  };
};

export const TalentMatchingSystem = ({ jobId }: { jobId?: string }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<TalentMatch[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    minScore: 70,
    requiredSkillsOnly: false,
    location: '',
    experienceLevel: ''
  });

  // Load matches when jobId changes or component mounts
  useEffect(() => {
    if (jobId) {
      loadMatches(jobId);
    }
  }, [jobId]);

  const loadMatches = async (targetJobId: string) => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const results = await findBestMatches(targetJobId);
      setMatches(results);
    } catch (error) {
      console.error('Error loading matches:', error);
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = matches.filter(match => {
    // Apply search query filter
    const matchesSearch = searchQuery === '' || 
      match.userProfile?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.userProfile?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.skillsMatch.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Apply score filter
    const matchesScore = match.matchScore >= filters.minScore;
    
    // Apply required skills filter
    const matchesRequiredSkills = !filters.requiredSkillsOnly || match.missingSkills.length === 0;
    
    // Apply location filter
    const matchesLocation = !filters.location || 
      match.userProfile?.location?.toLowerCase().includes(filters.location.toLowerCase());
    
    // Apply experience filter
    const matchesExperience = !filters.experienceLevel || 
      (filters.experienceLevel === 'entry' && (!match.userProfile?.experience || match.userProfile.experience < 2)) ||
      (filters.experienceLevel === 'mid' && match.userProfile?.experience && match.userProfile.experience >= 2 && match.userProfile.experience < 5) ||
      (filters.experienceLevel === 'senior' && match.userProfile?.experience && match.userProfile.experience >= 5);
    
    return matchesSearch && matchesScore && matchesRequiredSkills && matchesLocation && matchesExperience;
  });

  const handleContactCandidate = (userId: string) => {
    // Implement contact functionality
    console.log('Contacting candidate:', userId);
  };

  const handleSaveCandidate = (userId: string) => {
    // Implement save candidate functionality
    console.log('Saving candidate:', userId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Talent Matches</h2>
          <p className="text-muted-foreground">
            Find the best candidates for your job posting
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search candidates..."
              className="pl-9 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            value={filters.minScore.toString()}
            onValueChange={(value) => setFilters({...filters, minScore: parseInt(value)})}
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Min. Match Score" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50%+ Match</SelectItem>
              <SelectItem value="60">60%+ Match</SelectItem>
              <SelectItem value="70">70%+ Match</SelectItem>
              <SelectItem value="80">80%+ Match</SelectItem>
              <SelectItem value="90">90%+ Match</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <Input 
                  placeholder="City, Country" 
                  value={filters.location}
                  onChange={(e) => setFilters({...filters, location: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Experience Level</label>
                <Select
                  value={filters.experienceLevel}
                  onValueChange={(value) => setFilters({...filters, experienceLevel: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any experience level</SelectItem>
                    <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                    <SelectItem value="mid">Mid Level (2-5 years)</SelectItem>
                    <SelectItem value="senior">Senior Level (5+ years)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="requiredSkillsOnly"
                  checked={filters.requiredSkillsOnly}
                  onChange={(e) => setFilters({...filters, requiredSkillsOnly: e.target.checked})}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="requiredSkillsOnly" className="text-sm font-medium">
                  Only show candidates with all required skills
                </label>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Matching Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Matches</span>
                <span className="font-medium">{matches.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Filtered</span>
                <span className="font-medium">{filteredMatches.length}</span>
              </div>
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Avg. Match Score</span>
                  <span className="text-sm font-medium">
                    {matches.length > 0 
                      ? Math.round(matches.reduce((sum, match) => sum + match.matchScore, 0) / matches.length) 
                      : 0}%
                  </span>
                </div>
                <Progress 
                  value={matches.length > 0 
                    ? matches.reduce((sum, match) => sum + match.matchScore, 0) / matches.length 
                    : 0
                  } 
                  className="h-2" 
                />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Matches List */}
        <div className="lg:col-span-3 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-pulse text-center">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-muted-foreground">Finding the best matches...</p>
              </div>
            </div>
          ) : filteredMatches.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-1">No matches found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters or search query
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchQuery('');
                    setFilters({
                      minScore: 70,
                      requiredSkillsOnly: false,
                      location: '',
                      experienceLevel: ''
                    });
                  }}
                >
                  Clear all filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredMatches.map((match) => (
              <Card key={match.userId} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-shrink-0">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={match.userProfile?.photoURL} alt={match.userProfile?.displayName} />
                        <AvatarFallback>
                          {match.userProfile?.displayName?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <h3 className="font-medium text-lg truncate">
                            {match.userProfile?.displayName || 'Anonymous User'}
                          </h3>
                          <p className="text-muted-foreground text-sm">
                            {match.userProfile?.title || 'No title provided'}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary">
                            <Star className="h-4 w-4 mr-1" />
                            <span className="text-sm font-medium">{match.matchScore}%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex flex-wrap gap-2">
                        {match.skillsMatch.slice(0, 5).map((skill, i) => (
                          <Badge key={i} variant="secondary" className="flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                            {skill}
                          </Badge>
                        ))}
                        
                        {match.missingSkills.length > 0 && (
                          <Badge variant="outline" className="text-muted-foreground">
                            +{match.missingSkills.length} more skills
                          </Badge>
                        )}
                      </div>
                      
                      {match.missingSkills.length > 0 && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          <span className="font-medium">Missing:</span>{' '}
                          {match.missingSkills.slice(0, 3).join(', ')}
                          {match.missingSkills.length > 3 && '...'}
                        </div>
                      )}
                      
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => handleContactCandidate(match.userId)}>
                          Contact
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleSaveCandidate(match.userId)}
                        >
                          Save to Shortlist
                        </Button>
                        <Button variant="ghost" size="sm">
                          View Profile
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
