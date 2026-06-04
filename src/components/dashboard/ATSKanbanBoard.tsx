import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import {
  getApplicationsByRecruiter,
  updateApplicationStatus,
  getJobsByRecruiter,
  subscribeToApplicationsByRecruiter
} from '@/integrations/firebase/services';
import { Application, Job } from '@/integrations/firebase/types';
import {
  Search,
  Filter,
  User,
  FileText,
  Calendar,
  MessageSquare,
  Eye,
  MoreHorizontal,
  X,
  CheckCircle,
  Clock,
  UserCheck,
  CalendarDays,
  ClipboardCheck,
  Users,
  Briefcase,
  XCircle,
  Download,
  Share2,
  Tag,
  Star
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

type ApplicationStage = 'new' | 'under_review' | 'shortlisted' | 'interview_scheduled' | 'technical_assessment' | 'final_interview' | 'offer_extended' | 'hired' | 'rejected';

interface ApplicationCardProps {
  application: Application;
  job?: Job;
  onView: (application: Application) => void;
  onMove: (applicationId: string, newStage: ApplicationStage) => void;
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({ application, job, onView, onMove }) => {
  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      under_review: 'bg-yellow-100 text-yellow-800',
      shortlisted: 'bg-purple-100 text-purple-800',
      interview_scheduled: 'bg-indigo-100 text-indigo-800',
      technical_assessment: 'bg-orange-100 text-orange-800',
      final_interview: 'bg-pink-100 text-pink-800',
      offer_extended: 'bg-green-100 text-green-800',
      hired: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card
      className="mb-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onView(application)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={application.applicantPhoto} />
            <AvatarFallback>
              {application.userName?.[0]?.toUpperCase() || 'A'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm truncate">{application.userName}</h4>
                <p className="text-xs text-muted-foreground truncate">{job?.title || application.jobTitle}</p>
              </div>
              {application.score && (
                <Badge variant="outline" className="text-xs">
                  {application.score}%
                </Badge>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(application.appliedAt, { addSuffix: true })}
            </div>
            {application.tags && application.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {application.tags.slice(0, 2).map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <div className="mt-2">
              <Badge className={`text-xs ${getStageColor(application.status)}`}>
                {application.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface StageColumnProps {
  stage: ApplicationStage;
  title: string;
  applications: Application[];
  jobs: Job[];
  onView: (application: Application) => void;
  onMove: (applicationId: string, newStage: ApplicationStage) => void;
}

const StageColumn: React.FC<StageColumnProps> = ({
  stage,
  title,
  applications,
  jobs,
  onView,
  onMove
}) => {
  return (
    <div className="flex-1 min-w-[260px] sm:min-w-[280px]">
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-xs sm:text-sm font-medium flex items-center justify-between gap-2">
            <span className="truncate">{title}</span>
            <Badge variant="secondary" className="text-xs flex-shrink-0">{applications.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-1 sm:p-2 flex-1 overflow-hidden">
          <ScrollArea className="h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px]">
            {applications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No applications
              </div>
            ) : (
              applications.map((app) => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  job={jobs.find(j => j.id === app.jobId)}
                  onView={onView}
                  onMove={onMove}
                />
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export const ATSKanbanBoard: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showApplicationDetail, setShowApplicationDetail] = useState(false);

  const stages: Array<{ key: ApplicationStage; title: string; icon: React.ReactNode }> = [
    { key: 'new', title: 'New', icon: <Clock className="h-4 w-4" /> },
    { key: 'under_review', title: 'Under Review', icon: <Eye className="h-4 w-4" /> },
    { key: 'shortlisted', title: 'Shortlisted', icon: <UserCheck className="h-4 w-4" /> },
    { key: 'interview_scheduled', title: 'Interview', icon: <CalendarDays className="h-4 w-4" /> },
    { key: 'technical_assessment', title: 'Technical', icon: <ClipboardCheck className="h-4 w-4" /> },
    { key: 'final_interview', title: 'Final Interview', icon: <Users className="h-4 w-4" /> },
    { key: 'offer_extended', title: 'Offer', icon: <Briefcase className="h-4 w-4" /> },
    { key: 'hired', title: 'Hired', icon: <CheckCircle className="h-4 w-4" /> },
    { key: 'rejected', title: 'Rejected', icon: <XCircle className="h-4 w-4" /> }
  ];

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser?.uid) return;

      try {
        setLoading(true);
        console.log('[ATSKanbanBoard] Loading applications for recruiter:', currentUser.uid);
        const [applicationsData, jobsData] = await Promise.all([
          getApplicationsByRecruiter(currentUser.uid),
          getJobsByRecruiter(currentUser.uid)
        ]);
        console.log('[ATSKanbanBoard] Loaded', applicationsData.length, 'applications and', jobsData.length, 'jobs');
        setApplications(applicationsData);
        setJobs(jobsData);
      } catch (error) {
        console.error('[ATSKanbanBoard] Error loading ATS data:', error);
        toast({
          title: t('error'),
          description: 'Failed to load applications. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Set up real-time listener
    if (currentUser?.uid) {
      console.log('[ATSKanbanBoard] Setting up real-time subscription for recruiter:', currentUser.uid);
      const unsubscribe = subscribeToApplicationsByRecruiter(currentUser.uid, (apps) => {
        console.log('[ATSKanbanBoard] Real-time update received:', apps.length, 'applications');
        setApplications(apps);
        setLoading(false);
      });
      return () => {
        console.log('[ATSKanbanBoard] Unsubscribing from applications');
        unsubscribe();
      };
    }
  }, [currentUser, t, toast]);

  const handleMoveApplication = async (applicationId: string, newStage: ApplicationStage) => {
    try {
      await updateApplicationStatus(applicationId, newStage);
      toast({
        title: t('success'),
        description: 'Application moved successfully'
      });
    } catch (error) {
      console.error('Error moving application:', error);
      toast({
        title: t('error'),
        description: 'Failed to move application. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleViewApplication = (application: Application) => {
    setSelectedApplication(application);
    setShowApplicationDetail(true);
  };

  // Filter applications
  const filteredApplications = applications.filter(app => {
    const matchesSearch = searchTerm === '' ||
      app.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesJob = jobFilter === 'all' || app.jobId === jobFilter;
    return matchesSearch && matchesJob;
  });

  // Group applications by stage
  const applicationsByStage = stages.reduce((acc, stage) => {
    acc[stage.key] = filteredApplications.filter(app => app.status === stage.key);
    return acc;
  }, {} as Record<ApplicationStage, Application[]>);

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
          <h2 className="text-2xl font-bold">Applicant Tracking System</h2>
          <p className="text-muted-foreground">Manage and track all job applications</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/recruiter/applications/list')}>
            <FileText className="h-4 w-4 mr-2" />
            List View
          </Button>
          <Button variant="outline" onClick={() => navigate('/recruiter/applications/export')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search applicants by name..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by Job" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                {jobs.map(job => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <StageColumn
            key={stage.key}
            stage={stage.key}
            title={stage.title}
            applications={applicationsByStage[stage.key] || []}
            jobs={jobs}
            onView={handleViewApplication}
            onMove={handleMoveApplication}
          />
        ))}
      </div>

      {/* Application Detail Dialog */}
      <Dialog open={showApplicationDetail} onOpenChange={setShowApplicationDetail}>
        <DialogContent className="max-w-full sm:max-w-2xl md:max-w-4xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle>
              {selectedApplication?.userName} - {selectedApplication?.jobTitle}
            </DialogTitle>
            <DialogDescription>
              View and manage application details
            </DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Select
                    value={selectedApplication.status}
                    onValueChange={(value) => {
                      handleMoveApplication(selectedApplication.id, value as ApplicationStage);
                      setSelectedApplication({ ...selectedApplication, status: value as ApplicationStage });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map(stage => (
                        <SelectItem key={stage.key} value={stage.key}>
                          {stage.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-sm font-medium">Match Score</p>
                  <p className="text-2xl font-bold">{selectedApplication.score || 0}%</p>
                </div>
              </div>
              {selectedApplication.coverLetter && (
                <div>
                  <p className="text-sm font-medium mb-2">Cover Letter</p>
                  <p className="text-sm text-muted-foreground">{selectedApplication.coverLetter}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={() => navigate(`/recruiter/candidates/${selectedApplication.userId}`)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Full Profile
                </Button>
                <Button variant="outline" onClick={() => navigate(`/recruiter/messages?userId=${selectedApplication.userId}`)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                <Button variant="outline" onClick={() => navigate(`/recruiter/interviews/new?applicationId=${selectedApplication.id}`)}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Interview
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

