import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  getInterviewsByRecruiter,
  scheduleInterview,
  updateInterview,
  subscribeToInterviews,
  getProfile,
  getShortlistByRecruiter
} from '@/integrations/firebase/services';
import { Interview, InterviewFeedback, Job, Application } from '@/integrations/firebase/types';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  Plus,
  Edit,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  FileText,
  BarChart3,
  Filter,
  Search,
  Star,
  TrendingUp,
  Users,
  CalendarDays,
  VideoIcon,
  Building,
  Download,
  Upload,
  X,
  Briefcase
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface InterviewWithDetails extends Interview {
  candidateName?: string;
  candidatePhoto?: string;
  jobTitle?: string;
  feedback?: InterviewFeedback;
}

interface FeedbackFormData {
  strengths: string[];
  weaknesses: string[];
  technicalSkills: number;
  communication: number;
  cultureFit: number;
  overallRating: number;
  notes: string;
}

export const EnhancedInterviewManagement: React.FC = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [interviews, setInterviews] = useState<InterviewWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<InterviewWithDetails | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [candidates, setCandidates] = useState<Array<{ id: string; name: string; email?: string }>>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  const [formData, setFormData] = useState({
    candidateId: searchParams.get('candidateId') || '',
    candidateName: '',
    jobId: searchParams.get('jobId') || '',
    jobTitle: '',
    applicationId: searchParams.get('applicationId') || '',
    scheduledAt: '',
    duration: 60,
    meetingType: 'virtual' as 'virtual' | 'in-person',
    meetingLink: '',
    location: '',
    notes: '',
    panel: [] as string[]
  });

  const [feedbackForm, setFeedbackForm] = useState<FeedbackFormData>({
    strengths: [],
    weaknesses: [],
    technicalSkills: 5,
    communication: 5,
    cultureFit: 5,
    overallRating: 5,
    notes: ''
  });

  const [newStrength, setNewStrength] = useState('');
  const [newWeakness, setNewWeakness] = useState('');

  useEffect(() => {
    if (currentUser?.uid) {
      const unsubscribe = subscribeToInterviews(currentUser.uid, async (interviewsData) => {
        // Load candidate and job details
        const interviewsWithDetails = await Promise.all(
          interviewsData.map(async (interview) => {
            try {
              const [candidateProfile] = await Promise.all([
                getProfile(interview.youthId)
              ]);
              return {
                ...interview,
                candidateName: candidateProfile?.fullName || 'Unknown',
                candidatePhoto: candidateProfile?.profileImageUrl
              };
            } catch (error) {
              console.error('Error loading interview details:', error);
              return {
                ...interview,
                candidateName: 'Unknown',
                candidatePhoto: undefined
              };
            }
          })
        );
        setInterviews(interviewsWithDetails);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [currentUser]);

  // Load candidates when dialog opens
  useEffect(() => {
    const loadCandidates = async () => {
      if (!currentUser?.uid || !isScheduleDialogOpen) return;

      try {
        setLoadingCandidates(true);
        const shortlist = await getShortlistByRecruiter(currentUser.uid);
        
        // Load profile details for each shortlisted candidate
        const candidatesWithDetails = await Promise.all(
          shortlist.map(async (item) => {
            try {
              const profile = await getProfile(item.youthId);
              return {
                id: item.youthId,
                name: profile?.fullName || 'Unknown Candidate',
                email: profile?.email
              };
            } catch (error) {
              console.error(`Error loading profile for ${item.youthId}:`, error);
              return {
                id: item.youthId,
                name: 'Unknown Candidate',
                email: undefined
              };
            }
          })
        );

        setCandidates(candidatesWithDetails);
      } catch (error) {
        console.error('Error loading candidates:', error);
        toast({
          title: t('error'),
          description: 'Failed to load candidates',
          variant: 'destructive'
        });
      } finally {
        setLoadingCandidates(false);
      }
    };

    loadCandidates();
  }, [currentUser, isScheduleDialogOpen]);

  const handleScheduleInterview = async () => {
    if (!currentUser?.uid || !formData.candidateId || !formData.scheduledAt) {
      toast({
        title: t('error'),
        description: 'Please fill all required fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      await scheduleInterview({
        jobId: formData.jobId || '',
        applicationId: formData.applicationId || '',
        recruiterId: currentUser.uid,
        youthId: formData.candidateId,
        scheduledAt: new Date(formData.scheduledAt),
        duration: formData.duration,
        meetingType: formData.meetingType,
        meetingLink: formData.meetingLink || undefined,
        location: formData.location || undefined,
        notes: formData.notes || undefined,
        status: 'scheduled'
      });

      toast({
        title: t('success'),
        description: 'Interview scheduled successfully'
      });

      resetForm();
      setIsScheduleDialogOpen(false);
    } catch (error) {
      console.error('Error scheduling interview:', error);
      toast({
        title: t('error'),
        description: 'Failed to schedule interview. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleSubmitFeedback = async () => {
    if (!selectedInterview || !currentUser?.uid) return;

    try {
      // In production, would save feedback to Firebase
      const feedback: InterviewFeedback = {
        strengths: feedbackForm.strengths,
        weaknesses: feedbackForm.weaknesses,
        technicalSkills: feedbackForm.technicalSkills,
        communication: feedbackForm.communication,
        cultureFit: feedbackForm.cultureFit,
        overallRating: feedbackForm.overallRating,
        notes: feedbackForm.notes,
        submittedAt: new Date(),
        submittedBy: currentUser.uid
      };

      await updateInterview(selectedInterview.id, {
        status: 'completed',
        notes: feedbackForm.notes
      });

      toast({
        title: t('success'),
        description: 'Feedback submitted successfully'
      });

      setIsFeedbackDialogOpen(false);
      setSelectedInterview(null);
      resetFeedbackForm();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: t('error'),
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleCancelInterview = async (interviewId: string) => {
    if (!confirm('Are you sure you want to cancel this interview?')) return;

    try {
      await updateInterview(interviewId, { status: 'cancelled' });
      toast({
        title: t('success'),
        description: 'Interview cancelled successfully'
      });
    } catch (error) {
      console.error('Error cancelling interview:', error);
      toast({
        title: t('error'),
        description: 'Failed to cancel interview. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      candidateId: '',
      candidateName: '',
      jobId: '',
      jobTitle: '',
      applicationId: '',
      scheduledAt: '',
      duration: 60,
      meetingType: 'virtual',
      meetingLink: '',
      location: '',
      notes: '',
      panel: []
    });
  };

  const resetFeedbackForm = () => {
    setFeedbackForm({
      strengths: [],
      weaknesses: [],
      technicalSkills: 5,
      communication: 5,
      cultureFit: 5,
      overallRating: 5,
      notes: ''
    });
    setNewStrength('');
    setNewWeakness('');
  };

  const addStrength = () => {
    if (newStrength.trim() && !feedbackForm.strengths.includes(newStrength.trim())) {
      setFeedbackForm(prev => ({
        ...prev,
        strengths: [...prev.strengths, newStrength.trim()]
      }));
      setNewStrength('');
    }
  };

  const removeStrength = (strength: string) => {
    setFeedbackForm(prev => ({
      ...prev,
      strengths: prev.strengths.filter(s => s !== strength)
    }));
  };

  const addWeakness = () => {
    if (newWeakness.trim() && !feedbackForm.weaknesses.includes(newWeakness.trim())) {
      setFeedbackForm(prev => ({
        ...prev,
        weaknesses: [...prev.weaknesses, newWeakness.trim()]
      }));
      setNewWeakness('');
    }
  };

  const removeWeakness = (weakness: string) => {
    setFeedbackForm(prev => ({
      ...prev,
      weaknesses: prev.weaknesses.filter(w => w !== weakness)
    }));
  };

  const filteredInterviews = interviews.filter(interview => {
    const matchesSearch = searchTerm === '' ||
      interview.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interview.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || interview.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const upcomingInterviews = filteredInterviews.filter(
    i => i.status === 'scheduled' && new Date(i.scheduledAt) > new Date()
  );
  const completedInterviews = filteredInterviews.filter(i => i.status === 'completed');
  const cancelledInterviews = filteredInterviews.filter(i => i.status === 'cancelled');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderStarRating = (rating: number, onChange?: (rating: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-5 w-5 cursor-pointer ${
              i < rating
                ? 'text-yellow-500 fill-yellow-500'
                : 'text-gray-300'
            }`}
            onClick={() => onChange && onChange(i + 1)}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Interview Management</h2>
          <p className="text-muted-foreground">Schedule and manage interviews</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setView(view === 'list' ? 'calendar' : 'list')}>
            {view === 'list' ? <CalendarDays className="h-4 w-4 mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
            {view === 'list' ? 'Calendar View' : 'List View'}
          </Button>
          <Button onClick={() => {
            resetForm();
            setIsScheduleDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Interview
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interviews</CardTitle>
            <Calendar className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{interviews.length}</div>
            <p className="text-xs text-muted-foreground mt-1">All Time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Clock className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{upcomingInterviews.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completedInterviews.length}</div>
            <p className="text-xs text-muted-foreground mt-1">With Feedback</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No-Show Rate</CardTitle>
            <TrendingUp className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {interviews.length > 0
                ? Math.round((cancelledInterviews.length / interviews.length) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Cancellation Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search interviews..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Interviews List */}
      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingInterviews.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedInterviews.length})
          </TabsTrigger>
          <TabsTrigger value="all">All Interviews</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingInterviews.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No upcoming interviews</p>
              </CardContent>
            </Card>
          ) : (
            upcomingInterviews.map((interview) => (
              <Card key={interview.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={interview.candidatePhoto} />
                        <AvatarFallback>
                          {interview.candidateName?.[0]?.toUpperCase() || 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{interview.candidateName}</h3>
                          <Badge className={getStatusColor(interview.status)}>
                            {interview.status}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Briefcase className="h-4 w-4" />
                            {interview.jobTitle || 'Job Interview'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(interview.scheduledAt), 'PPP p')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {interview.duration} {interview.duration === 1 ? 'Minute' : 'Minutes'}
                          </div>
                          {interview.meetingType === 'virtual' ? (
                            <div className="flex items-center gap-1">
                              <Video className="h-4 w-4" />
                              {interview.meetingLink || 'Video Call'}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {interview.location || 'In Person'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {interview.meetingType === 'virtual' && interview.meetingLink && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(interview.meetingLink, '_blank')}
                        >
                          <VideoIcon className="h-4 w-4 mr-2" />
                          Join Meeting
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedInterview(interview);
                          setIsFeedbackDialogOpen(true);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Add Feedback
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelInterview(interview.id)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedInterviews.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No completed interviews</p>
              </CardContent>
            </Card>
          ) : (
            completedInterviews.map((interview) => (
              <Card key={interview.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={interview.candidatePhoto} />
                      <AvatarFallback>
                        {interview.candidateName?.[0]?.toUpperCase() || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{interview.candidateName}</h3>
                        <Badge className={getStatusColor(interview.status)}>
                          {interview.status}
                        </Badge>
                        {interview.feedback && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm">{interview.feedback.overallRating}/5</span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>{format(new Date(interview.scheduledAt), 'PPP')}</div>
                        {interview.feedback && (
                          <div className="mt-2">
                            <p className="font-medium">Feedback:</p>
                            <p className="text-sm">{interview.feedback.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {!interview.feedback && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedInterview(interview);
                          setIsFeedbackDialogOpen(true);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Add Feedback
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {filteredInterviews.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No interviews found</p>
              </CardContent>
            </Card>
          ) : (
            filteredInterviews.map((interview) => (
              <Card key={interview.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={interview.candidatePhoto} />
                      <AvatarFallback>
                        {interview.candidateName?.[0]?.toUpperCase() || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{interview.candidateName}</h3>
                        <Badge className={getStatusColor(interview.status)}>
                          {interview.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(interview.scheduledAt), 'PPP p')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Schedule Interview Dialog */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>
              Schedule an interview with a candidate from your shortlist
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="candidateId">Candidate *</Label>
                <Select
                  value={formData.candidateId || undefined}
                  onValueChange={(value) => {
                    const selectedCandidate = candidates.find(c => c.id === value);
                    setFormData(prev => ({
                      ...prev,
                      candidateId: value,
                      candidateName: selectedCandidate?.name || ''
                    }));
                  }}
                  disabled={loadingCandidates || candidates.length === 0}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder={loadingCandidates ? "Loading candidates..." : candidates.length === 0 ? "No candidates available" : "Select candidate"} />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.length > 0 && candidates.map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        {candidate.name} {candidate.email && `(${candidate.email})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {candidates.length === 0 && !loadingCandidates && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Add candidates to your shortlist to schedule interviews with them.
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="jobId">Job</Label>
                <Input
                  id="jobId"
                  value={formData.jobTitle || formData.jobId}
                  onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                  placeholder="Select job"
                  className="mt-2"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scheduledAt">Date and Time *</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                  min={15}
                  step={15}
                  className="mt-2"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="meetingType">Meeting Type</Label>
              <Select
                value={formData.meetingType}
                onValueChange={(value: 'virtual' | 'in-person') =>
                  setFormData(prev => ({ ...prev, meetingType: value }))
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="virtual">Virtual (Video Call)</SelectItem>
                  <SelectItem value="in-person">In Person</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.meetingType === 'virtual' ? (
              <div>
                <Label htmlFor="meetingLink">Meeting Link</Label>
                <Input
                  id="meetingLink"
                  value={formData.meetingLink}
                  onChange={(e) => setFormData(prev => ({ ...prev, meetingLink: e.target.value }))}
                  placeholder="https://zoom.us/j/..."
                  className="mt-2"
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Enter location"
                  className="mt-2"
                />
              </div>
            )}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add notes"
                rows={3}
                className="mt-2"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleScheduleInterview} className="flex-1">
                Schedule
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsScheduleDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Interview Feedback: {selectedInterview?.candidateName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label className="flex items-center justify-between mb-2">
                  <span>Technical Skills</span>
                  <span className="text-sm text-muted-foreground">{feedbackForm.technicalSkills}/5</span>
                </Label>
                {renderStarRating(
                  feedbackForm.technicalSkills,
                  (rating) => setFeedbackForm(prev => ({ ...prev, technicalSkills: rating }))
                )}
              </div>

              <div>
                <Label className="flex items-center justify-between mb-2">
                  <span>Communication</span>
                  <span className="text-sm text-muted-foreground">{feedbackForm.communication}/5</span>
                </Label>
                {renderStarRating(
                  feedbackForm.communication,
                  (rating) => setFeedbackForm(prev => ({ ...prev, communication: rating }))
                )}
              </div>

              <div>
                <Label className="flex items-center justify-between mb-2">
                  <span>Culture Fit</span>
                  <span className="text-sm text-muted-foreground">{feedbackForm.cultureFit}/5</span>
                </Label>
                {renderStarRating(
                  feedbackForm.cultureFit,
                  (rating) => setFeedbackForm(prev => ({ ...prev, cultureFit: rating }))
                )}
              </div>

              <div>
                <Label className="flex items-center justify-between mb-2">
                  <span>Overall Rating</span>
                  <span className="text-sm text-muted-foreground">{feedbackForm.overallRating}/5</span>
                </Label>
                {renderStarRating(
                  feedbackForm.overallRating,
                  (rating) => setFeedbackForm(prev => ({ ...prev, overallRating: rating }))
                )}
              </div>

              <div>
                <Label>Strengths</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newStrength}
                    onChange={(e) => setNewStrength(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addStrength()}
                    placeholder="Add strength"
                  />
                  <Button type="button" onClick={addStrength}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {feedbackForm.strengths.map((strength, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      {strength}
                      <button onClick={() => removeStrength(strength)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Weaknesses</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newWeakness}
                    onChange={(e) => setNewWeakness(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addWeakness()}
                    placeholder="Add weakness"
                  />
                  <Button type="button" onClick={addWeakness}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {feedbackForm.weaknesses.map((weakness, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      {weakness}
                      <button onClick={() => removeWeakness(weakness)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="feedbackNotes">Additional Notes</Label>
                <Textarea
                  id="feedbackNotes"
                  value={feedbackForm.notes}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add detailed feedback"
                  rows={6}
                  className="mt-2"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmitFeedback} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Submit Feedback
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsFeedbackDialogOpen(false);
                  resetFeedbackForm();
                }}
              >
                {t('cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

