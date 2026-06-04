import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeToJobs,
  subscribeToApplicationsByRecruiter,
  getProfile
} from '@/integrations/firebase/services';
import { Job, Application, UserProfile } from '@/integrations/firebase/types';
import {
  Briefcase,
  Users,
  MapPin,
  TrendingUp,
  Eye,
  Calendar,
  Award,
  Target,
  BarChart3,
  Globe
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { format } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const EnhancedAnalyticsDashboard: React.FC = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicantProfiles, setApplicantProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('30d');

  // Real-time subscription to jobs
  useEffect(() => {
    if (!currentUser?.uid) return;

    console.log('[EnhancedAnalyticsDashboard] Setting up real-time job subscription');
    const unsubscribeJobs = subscribeToJobs(currentUser.uid, (jobsData) => {
      console.log('[EnhancedAnalyticsDashboard] Jobs updated:', jobsData.length);
      setJobs(jobsData);
      setLoading(false);
    });

    return () => {
      console.log('[EnhancedAnalyticsDashboard] Unsubscribing from jobs');
      unsubscribeJobs();
    };
  }, [currentUser]);

  // Real-time subscription to applications
  useEffect(() => {
    if (!currentUser?.uid) return;

    console.log('[EnhancedAnalyticsDashboard] Setting up real-time applications subscription');
    const unsubscribeApplications = subscribeToApplicationsByRecruiter(
      currentUser.uid,
      (applicationsData) => {
        console.log('[EnhancedAnalyticsDashboard] Applications updated:', applicationsData.length);
        setApplications(applicationsData);
        setLoading(false);
      }
    );

    return () => {
      console.log('[EnhancedAnalyticsDashboard] Unsubscribing from applications');
      unsubscribeApplications();
    };
  }, [currentUser]);

  // Load applicant profiles when applications change
  useEffect(() => {
    if (applications.length === 0) return;

    const loadProfiles = async () => {
      // Get current profiles to check what we already have
      const currentProfiles = new Map(applicantProfiles);
      const uniqueUserIds = [...new Set(applications.map(app => app.userId))];
      
      // Filter out user IDs we already have profiles for
      const userIdsToLoad = uniqueUserIds.filter(userId => !currentProfiles.has(userId));
      
      if (userIdsToLoad.length === 0) return; // All profiles already loaded
      
      const profilesMap = new Map<string, UserProfile>();
      
      // Load profiles in batches to avoid overwhelming the system
      const batchSize = 10;
      for (let i = 0; i < userIdsToLoad.length; i += batchSize) {
        const batch = userIdsToLoad.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (userId) => {
            try {
              const profile = await getProfile(userId);
              if (profile) {
                profilesMap.set(userId, profile);
              }
            } catch (error) {
              console.error(`Error loading profile for ${userId}:`, error);
            }
          })
        );
      }
      
      // Update profiles map with new profiles
      if (profilesMap.size > 0) {
        setApplicantProfiles(prev => {
          const updated = new Map(prev);
          profilesMap.forEach((profile, userId) => {
            updated.set(userId, profile);
          });
          return updated;
        });
      }
    };

    loadProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applications.length]); // Only depend on length to avoid infinite loops

  // 1. Overview of Active Job Listings
  const activeJobs = useMemo(() => jobs.filter(job => job.status === 'open'), [jobs]);
  const recentJobs = useMemo(() => {
    return activeJobs
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map(job => ({
        ...job,
        applicantCount: applications.filter(app => app.jobId === job.id).length
      }));
  }, [activeJobs, applications]);

  // 2. Applicant Statistics
  const applicantsPerJob = useMemo(() => {
    const jobMap = new Map<string, { title: string; count: number }>();
    applications.forEach(app => {
      const existing = jobMap.get(app.jobId) || { title: app.jobTitle, count: 0 };
      existing.count++;
      jobMap.set(app.jobId, existing);
    });
    return Array.from(jobMap.values()).sort((a, b) => b.count - a.count);
  }, [applications]);

  const topSkills = useMemo(() => {
    const skillCounts = new Map<string, number>();
    applicantProfiles.forEach(profile => {
      const skills = profile.skills || [];
      skills.forEach(skill => {
        const skillName = typeof skill === 'string' ? skill : (skill as any)?.skillName || String(skill);
        if (skillName) {
          skillCounts.set(skillName, (skillCounts.get(skillName) || 0) + 1);
        }
      });
    });
    return Array.from(skillCounts.entries())
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [applicantProfiles]);

  const geographicDistribution = useMemo(() => {
    const locationCounts = new Map<string, number>();
    applicantProfiles.forEach(profile => {
      const location = profile.location || profile.city || profile.country || 'Unknown';
      locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
    });
    return Array.from(locationCounts.entries())
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);
  }, [applicantProfiles]);

  // 3. Profile Engagement
  const jobViews = useMemo(() => {
    return activeJobs.map(job => ({
      id: job.id,
      title: job.title,
      views: job.viewsCount || 0,
      applicants: applications.filter(app => app.jobId === job.id).length
    })).sort((a, b) => b.views - a.views);
  }, [activeJobs, applications]);

  const applicantStatusBreakdown = useMemo(() => {
    const statusCounts = new Map<string, number>();
    applications.forEach(app => {
      const status = app.status || 'new';
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    });
    return Array.from(statusCounts.entries()).map(([status, count]) => ({
      status: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count
    }));
  }, [applications]);

  const applicationTrends = useMemo(() => {
    const days = timeRange === '7d' ? 7 : 30;
    const trends = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = format(date, 'MMM dd');
      const count = applications.filter(app => {
        const appDate = new Date(app.appliedAt);
        return appDate.toDateString() === date.toDateString();
      }).length;
      return { date: dateStr, applications: count };
    });
    return trends;
  }, [applications, timeRange]);

  // 4. Job Matching - Top Matched Candidates
  const topMatchedCandidates = useMemo(() => {
    return applications
      .map(app => {
        const profile = applicantProfiles.get(app.userId);
        if (!profile) return null;

        const job = jobs.find(j => j.id === app.jobId);
        if (!job) return null;

        // Calculate match score based on skills
        const jobSkills = job.tags || [];
        const userSkills = (profile.skills || []).map(s => 
          typeof s === 'string' ? s.toLowerCase() : ((s as any)?.skillName || '').toLowerCase()
        );
        
        const matchingSkills = jobSkills.filter(js => 
          userSkills.some(us => us.includes(js.toLowerCase()) || js.toLowerCase().includes(us))
        );
        const matchScore = jobSkills.length > 0 
          ? Math.round((matchingSkills.length / jobSkills.length) * 100)
          : 50;

        return {
          applicationId: app.id,
          userId: app.userId,
          name: profile.fullName || app.userName,
          jobTitle: app.jobTitle,
          matchScore,
          skills: userSkills.slice(0, 5),
          location: profile.location || profile.city || 'Unknown',
          status: app.status,
          appliedAt: app.appliedAt
        };
      })
      .filter(candidate => candidate !== null)
      .sort((a, b) => (b?.matchScore || 0) - (a?.matchScore || 0))
      .slice(0, 10) as Array<{
        applicationId: string;
        userId: string;
        name: string;
        jobTitle: string;
        matchScore: number;
        skills: string[];
        location: string;
        status: string;
        appliedAt: Date;
      }>;
  }, [applications, applicantProfiles, jobs]);

  const jobPerformanceComparison = useMemo(() => {
    return activeJobs.map(job => {
      const jobApplications = applications.filter(app => app.jobId === job.id);
      const views = job.viewsCount || 0;
      const applicants = jobApplications.length;
      const conversionRate = views > 0 ? (applicants / views) * 100 : 0;
      
      return {
        title: job.title.length > 25 ? job.title.substring(0, 25) + '...' : job.title,
        views,
        applicants,
        conversionRate: Math.round(conversionRate * 10) / 10
      };
    }).sort((a, b) => b.views - a.views).slice(0, 10);
  }, [activeJobs, applications]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Track your job postings and applicant insights</p>
        </div>
        <Select value={timeRange} onValueChange={(value: '7d' | '30d') => setTimeRange(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 1. Overview of Active Job Listings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Overview of Active Job Listings
          </CardTitle>
          <CardDescription>Total active listings: {activeJobs.length}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentJobs.map((job) => (
                <Card key={job.id} className="border">
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2">{job.title}</h3>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {job.remoteType}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {job.applicantCount} applicant{job.applicantCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {recentJobs.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No active job listings</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. Applicant Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Number of Applicants per Job
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={applicantsPerJob.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="title" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Skills of Applicants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topSkills} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="skill" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#00C49F" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Geographic Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
              {geographicDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{item.location}</span>
                  </div>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
              ))}
            </div>
            {geographicDistribution.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No location data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. Profile Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Profile Views (Past {timeRange === '7d' ? 'Week' : 'Month'})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {jobViews.slice(0, 10).map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{job.title}</p>
                    <p className="text-sm text-muted-foreground">{job.applicants} applicants</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{job.views}</p>
                    <p className="text-xs text-muted-foreground">views</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Applicant Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={applicantStatusBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, count }) => `${status}: ${count}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {applicantStatusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Application Trends (Last {timeRange === '7d' ? '7' : '30'} Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={applicationTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="applications" stroke="#0088FE" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 4. Job Matching */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top-Matched Candidates
            </CardTitle>
            <CardDescription>Best fit candidates based on skills and experience</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topMatchedCandidates.map((candidate) => (
                <div key={candidate.applicationId} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold">{candidate.name}</h4>
                      <p className="text-sm text-muted-foreground">{candidate.jobTitle}</p>
                    </div>
                    <Badge variant="default" className="bg-green-600">
                      {candidate.matchScore}% match
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <MapPin className="h-3 w-3" />
                    {candidate.location}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {candidate.skills.slice(0, 3).map((skill, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Status: {candidate.status.replace(/_/g, ' ')}</span>
                    <span>{format(new Date(candidate.appliedAt), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              ))}
              {topMatchedCandidates.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No matched candidates found</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Job Post Analytics
            </CardTitle>
            <CardDescription>Compare engagement levels across job posts</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={jobPerformanceComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="title" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 10 }}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="views" fill="#0088FE" name="Views" />
                <Bar yAxisId="left" dataKey="applicants" fill="#00C49F" name="Applicants" />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="conversionRate" 
                  stroke="#FF8042" 
                  name="Conversion %"
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
