import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  getJobMatchesByUser,
  getProfile,
  addApplication,
  updateJobMatch,
  subscribeToJobMatches,
  getAllProfiles
} from '@/integrations/firebase/services';
import { JobMatch, UserProfile } from '@/integrations/firebase/types';
import {
  Briefcase,
  MapPin,
  Clock,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  TrendingUp,
  Star
} from 'lucide-react';

const JobMatchesSection = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [recruiters, setRecruiters] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [bookmarkedJobs, setBookmarkedJobs] = useState<Set<string>>(new Set());

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        const [matches, profile, allRecruiters] = await Promise.all([
          getJobMatchesByUser(currentUser.uid),
          getProfile(currentUser.uid),
          getAllProfiles()
        ]);

        setJobMatches(matches);
        setUserProfile(profile);
        setRecruiters(allRecruiters.filter(r => r.companyName));

        // Initialize bookmarked jobs
        const bookmarked = new Set(matches.filter(m => m.bookmarked).map(m => m.id));
        setBookmarkedJobs(bookmarked);
      } catch (error) {
        console.error('Error loading job matches:', error);
        toast({
          title: "Error",
          description: "Failed to load job matches",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser, toast]);

  // Set up real-time listener
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToJobMatches(currentUser.uid, setJobMatches);
    return unsubscribe;
  }, [currentUser]);

  // Calculate match score based on user profile
  const calculateMatchScore = (job: JobMatch): number => {
    if (!userProfile) return job.matchScore || 0;

    let score = 0;
    const maxScore = 100;

    // Talent area match (30 points)
    if (userProfile.talentArea && job.jobTitle?.toLowerCase().includes(userProfile.talentArea.toLowerCase())) {
      score += 30;
    }

    // Skills match (40 points)
    // Note: This would need actual skills data from the job posting
    // For now, using a basic implementation
    if (userProfile.yearsOfExperience && userProfile.yearsOfExperience >= 2) {
      score += 20;
    }

    // Education match (20 points)
    if (userProfile.educationLevel && ['Bachelor\'s Degree', 'Master\'s Degree'].includes(userProfile.educationLevel)) {
      score += 20;
    }

    // Experience match (10 points)
    if (userProfile.yearsOfExperience && userProfile.yearsOfExperience > 0) {
      score += 10;
    }

    return Math.min(score, maxScore);
  };

  // Handle applying to a job
  const handleApply = async (jobMatch: JobMatch) => {
    if (!currentUser || !userProfile) return;

    setApplying(jobMatch.id);
    try {
      await addApplication({
        userId: currentUser.uid,
        jobId: jobMatch.jobId,
        jobTitle: jobMatch.jobTitle,
        companyName: jobMatch.companyName || 'Unknown Company',
        status: 'pending'
      });

      // Update job match status
      await updateJobMatch(jobMatch.id, {
        status: 'applied',
        appliedAt: new Date()
      });

      toast({
        title: "Application Submitted",
        description: `Your application for ${jobMatch.jobTitle} has been submitted!`,
      });
    } catch (error) {
      console.error('Error applying to job:', error);
      toast({
        title: "Error",
        description: "Failed to submit application",
        variant: "destructive",
      });
    } finally {
      setApplying(null);
    }
  };

  // Handle bookmarking a job
  const handleBookmark = async (jobMatch: JobMatch) => {
    const isBookmarked = bookmarkedJobs.has(jobMatch.id);
    const newBookmarked = new Set(bookmarkedJobs);

    try {
      if (isBookmarked) {
        newBookmarked.delete(jobMatch.id);
      } else {
        newBookmarked.add(jobMatch.id);
      }

      setBookmarkedJobs(newBookmarked);
      await updateJobMatch(jobMatch.id, { bookmarked: !isBookmarked });

      toast({
        title: isBookmarked ? "Bookmark Removed" : "Job Bookmarked",
        description: isBookmarked
          ? "Job removed from bookmarks"
          : "Job added to bookmarks",
      });
    } catch (error) {
      console.error('Error updating bookmark:', error);
      // Revert on error
      if (isBookmarked) {
        newBookmarked.add(jobMatch.id);
      } else {
        newBookmarked.delete(jobMatch.id);
      }
      setBookmarkedJobs(newBookmarked);
    }
  };

  // Get skill development suggestions
  const getSkillSuggestions = (): string[] => {
    if (!userProfile) return [];

    const suggestions = [];

    if (!userProfile.talentArea) {
      suggestions.push('Define your talent area to get better matches');
    }

    if (!userProfile.yearsOfExperience || userProfile.yearsOfExperience < 2) {
      suggestions.push('Gain more experience in your field');
    }

    if (!userProfile.educationLevel || userProfile.educationLevel === 'High School') {
      suggestions.push('Consider pursuing higher education');
    }

    if (!userProfile.cvUrl) {
      suggestions.push('Upload your CV to improve your profile');
    }

    return suggestions;
  };

  // Separate matches by status
  const newMatches = jobMatches.filter(m => m.status === 'new');
  const appliedJobs = jobMatches.filter(m => m.status === 'applied');
  const viewedJobs = jobMatches.filter(m => m.status === 'viewed');

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Job Matches</h2>
          <p className="mt-1 text-sm text-gray-600">
            AI-powered job recommendations based on your profile
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="secondary">
            {newMatches.length} new matches
          </Badge>
          <Badge variant="outline">
            {appliedJobs.length} applied
          </Badge>
        </div>
      </div>

      {/* Skill Development Suggestions */}
      {getSkillSuggestions().length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              <TrendingUp className="mr-2 h-5 w-5" />
              Skill Development Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {getSkillSuggestions().map((suggestion, index) => (
                <li key={index} className="flex items-start">
                  <Star className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-sm text-blue-800">{suggestion}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* New Job Matches */}
      {newMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Briefcase className="mr-2 h-5 w-5" />
              New Matches ({newMatches.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {newMatches.slice(0, 5).map((match) => {
                const matchScore = calculateMatchScore(match);
                const isBookmarked = bookmarkedJobs.has(match.id);
                const isApplying = applying === match.id;

                return (
                  <div key={match.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{match.jobTitle}</h3>
                        <p className="text-muted-foreground">{match.companyName}</p>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{match.location || 'Remote'}</span>
                          <Clock className="h-4 w-4 ml-4 mr-1" />
                          <span>{new Date(match.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center mb-2">
                          <Progress value={matchScore} className="w-16 mr-2" />
                          <span className="text-sm font-medium">{matchScore}%</span>
                        </div>
                        <Badge variant={matchScore >= 80 ? "default" : matchScore >= 60 ? "secondary" : "outline"}>
                          {matchScore >= 80 ? 'Excellent' : matchScore >= 60 ? 'Good' : 'Fair'} Match
                        </Badge>
                      </div>
                    </div>

                    {match.description && (
                      <div 
                        className="text-sm text-muted-foreground mb-3 line-clamp-2 prose prose-sm max-w-none [&_p]:mb-1 [&_strong]:font-semibold"
                        dangerouslySetInnerHTML={{ __html: match.description }}
                      />
                    )}

                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleApply(match)}
                          disabled={isApplying}
                        >
                          {isApplying ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                          ) : (
                            <Briefcase className="h-4 w-4 mr-2" />
                          )}
                          Apply Now
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBookmark(match)}
                        >
                          {isBookmarked ? (
                            <BookmarkCheck className="h-4 w-4 mr-2" />
                          ) : (
                            <Bookmark className="h-4 w-4 mr-2" />
                          )}
                          {isBookmarked ? 'Bookmarked' : 'Bookmark'}
                        </Button>
                      </div>
                      <Button size="sm" variant="ghost">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Applied Jobs */}
      {appliedJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Briefcase className="mr-2 h-5 w-5" />
              Applied Jobs ({appliedJobs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {appliedJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{job.jobTitle}</h4>
                      <p className="text-sm text-muted-foreground">{job.companyName}</p>
                      <p className="text-xs text-muted-foreground">
                        Applied {job.appliedAt ? new Date(job.appliedAt).toLocaleDateString() : 'Recently'}
                      </p>
                    </div>
                    <Badge variant="outline">Applied</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Viewed Jobs */}
      {viewedJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Briefcase className="mr-2 h-5 w-5" />
              Viewed Jobs ({viewedJobs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {viewedJobs.slice(0, 10).map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <h4 className="font-medium text-sm">{job.jobTitle}</h4>
                      <p className="text-xs text-muted-foreground">{job.companyName}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleApply(job)}>
                      Apply
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {jobMatches.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Briefcase className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Job Matches Yet</h3>
            <p className="text-muted-foreground mb-4">
              Complete your profile to get personalized job recommendations
            </p>
            <Button>Update Profile</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default JobMatchesSection;
