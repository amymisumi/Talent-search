import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import {
  getJobsByRecruiter,
  createJob,
  updateJob,
  deleteJob,
  duplicateJob,
  subscribeToJobs,
  getApplicationsByJob
} from '@/integrations/firebase/services';
import { Job, Application } from '@/integrations/firebase/types';
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Pause,
  Play,
  Share2,
  Eye,
  BarChart3,
  Filter,
  Search,
  MoreVertical,
  Calendar,
  MapPin,
  DollarSign,
  Users,
  Briefcase,
  FileText,
  Save,
  X,
  Download,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  XCircle,
  Archive,
  Star
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const currencies = ['USD', 'KES', 'ZAR', 'EUR', 'GBP'] as const;

// Helper function to format experience level labels
const formatExperienceLevel = (level: string): string => {
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
  return labels[level] || level.charAt(0).toUpperCase() + level.slice(1).replace(/-/g, ' ');
};

interface JobFormData {
  title: string;
  description: string;
  requirements: string;
  qualifications: string[];
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  location: string;
  remoteType: 'remote' | 'hybrid' | 'on-site';
  tags: string[];
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive' | 'youth' | 'amateur' | 'professional' | 'semi-professional' | 'collegiate' | 'academy' | 'junior' | 'veteran' | 'elite' | 'beginner' | 'intermediate' | 'advanced';
  compensationType?: 'fixed-salary' | 'performance-based' | 'club-dependent' | 'contract-based' | 'stipend' | 'scholarship' | 'commission' | 'hourly' | 'project-based' | 'retainer' | 'negotiable' | 'volunteer' | 'unpaid-internship' | 'paid-internship';
  deadline: Date;
  status: 'open' | 'suspended' | 'closed';
  department?: string;
  benefits: string[];
  companyCulture?: string;
  applicationDeadline?: Date;
  numberOfOpenings?: number;
  isDraft: boolean;
  isFeatured: boolean;
  customQuestions: string[];
  visibility: 'public' | 'private' | 'internal';
}

export const EnhancedJobPostingModule: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJobForm, setShowJobForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [selectedJobForView, setSelectedJobForView] = useState<Job | null>(null);
  const [showJobDetailDialog, setShowJobDetailDialog] = useState(false);

  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    description: '',
    requirements: '',
    qualifications: [],
    salaryMin: undefined,
    salaryMax: undefined,
    salaryCurrency: 'USD',
    location: '',
    remoteType: 'on-site',
    tags: [],
    experienceLevel: 'entry',
    compensationType: 'fixed-salary',
    deadline: new Date(),
    status: 'open',
    benefits: [],
    isDraft: false,
    isFeatured: false,
    customQuestions: [],
    visibility: 'public'
  });

  const [newTag, setNewTag] = useState('');
  const [newBenefit, setNewBenefit] = useState('');
  const [newQuestion, setNewQuestion] = useState('');

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    let timeoutId: NodeJS.Timeout;
    let isMounted = true;
    setLoading(true);

    // Set a timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('Jobs loading timeout - trying fallback');
        setLoading(false);
        // Try to load jobs without subscription as fallback
        getJobsByRecruiter(currentUser.uid).then(jobsData => {
          if (isMounted) {
            setJobs(jobsData);
          }
        }).catch(error => {
          console.error('Error loading jobs (fallback):', error);
          if (isMounted) {
            toast({
              title: 'Error',
              description: 'Failed to load jobs. Please refresh the page.',
              variant: 'destructive'
            });
          }
        });
      }
    }, 10000); // 10 second timeout

    try {
      const unsubscribe = subscribeToJobs(currentUser.uid, (jobsData) => {
        if (isMounted) {
          clearTimeout(timeoutId);
          console.log('Jobs loaded:', jobsData.length);
          setJobs(jobsData);
          setLoading(false);
        }
      });

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
        getJobsByRecruiter(currentUser.uid).then(jobsData => {
          if (isMounted) {
            setJobs(jobsData);
          }
        }).catch(fallbackError => {
          console.error('Error loading jobs (fallback):', fallbackError);
        });
      }
    }
  }, [currentUser]);

  const handleCreateJob = async () => {
    if (!currentUser?.uid) return;

    try {
      await createJob({
        recruiterId: currentUser.uid,
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements,
        qualifications: formData.qualifications || [],
        salaryMin: formData.salaryMin,
        salaryMax: formData.salaryMax,
        salaryCurrency: formData.salaryCurrency || 'USD',
        compensationType: formData.compensationType,
        location: formData.location,
        remoteType: formData.remoteType,
        tags: formData.tags || [],
        experienceLevel: formData.experienceLevel,
        deadline: formData.deadline,
        status: formData.isDraft ? 'suspended' : (formData.status || 'open'),
        department: formData.department,
        benefits: formData.benefits || [],
        companyCulture: formData.companyCulture,
        applicationDeadline: formData.applicationDeadline,
        numberOfOpenings: formData.numberOfOpenings || 1,
        isDraft: formData.isDraft,
        isFeatured: formData.isFeatured
      });

      toast({
        title: 'Success',
        description: formData.isDraft ? 'Job saved as draft' : 'Job posted successfully'
      });

      resetForm();
      setShowJobForm(false);
      
      // Force refresh jobs list
      if (currentUser?.uid) {
        setTimeout(() => {
          getJobsByRecruiter(currentUser.uid).then(jobsData => {
            setJobs(jobsData);
          }).catch(error => {
            console.error('Error refreshing jobs:', error);
          });
        }, 500);
      }
    } catch (error) {
      console.error('Error creating job:', error);
      toast({
        title: 'Error',
        description: 'Failed to create job. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateJob = async () => {
    if (!selectedJob) return;

    try {
      await updateJob(selectedJob.id, {
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements,
        qualifications: formData.qualifications || [],
        salaryMin: formData.salaryMin,
        salaryMax: formData.salaryMax,
        salaryCurrency: formData.salaryCurrency || 'USD',
        compensationType: formData.compensationType,
        location: formData.location,
        remoteType: formData.remoteType,
        tags: formData.tags || [],
        experienceLevel: formData.experienceLevel,
        deadline: formData.deadline,
        status: formData.isDraft ? 'suspended' : (formData.status || 'open'),
        department: formData.department,
        benefits: formData.benefits || [],
        companyCulture: formData.companyCulture,
        applicationDeadline: formData.applicationDeadline,
        numberOfOpenings: formData.numberOfOpenings || 1,
        isDraft: formData.isDraft,
        isFeatured: formData.isFeatured
      });

      toast({
        title: 'Success',
        description: 'Job updated successfully'
      });

      resetForm();
      setShowJobForm(false);
      setSelectedJob(null);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating job:', error);
      toast({
        title: 'Error',
        description: 'Failed to update job. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job posting? This action cannot be undone.')) return;

    try {
      await deleteJob(jobId);
      toast({
        title: 'Success',
        description: 'Job deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting job:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete job. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleDuplicateJob = async (jobId: string) => {
    try {
      await duplicateJob(jobId);
      toast({
        title: 'Success',
        description: 'Job duplicated successfully'
      });
    } catch (error) {
      console.error('Error duplicating job:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate job. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleToggleJobStatus = async (job: Job) => {
    try {
      const newStatus = job.status === 'open' ? 'suspended' : 'open';
      await updateJob(job.id, { status: newStatus });
      toast({
        title: 'Success',
        description: 'Job status updated successfully'
      });
    } catch (error) {
      console.error('Error updating job status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      requirements: '',
      qualifications: [],
      salaryMin: undefined,
      salaryMax: undefined,
      salaryCurrency: 'USD',
      location: '',
      remoteType: 'on-site',
      tags: [],
      experienceLevel: 'entry',
    compensationType: 'fixed-salary',
      deadline: new Date(),
      status: 'open',
      benefits: [],
      isDraft: false,
      isFeatured: false,
      customQuestions: [],
      visibility: 'public'
    });
    setNewTag('');
    setNewBenefit('');
    setNewQuestion('');
  };

  const handleEditJob = (job: Job) => {
    setSelectedJob(job);
    setIsEditing(true);
    setFormData({
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      qualifications: job.qualifications || [],
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency || 'USD',
      location: job.location,
      remoteType: job.remoteType,
      tags: job.tags || [],
      experienceLevel: job.experienceLevel,
      compensationType: (job as any).compensationType || 'fixed-salary',
      deadline: job.deadline,
      status: job.status,
      department: job.department,
      benefits: job.benefits || [],
      companyCulture: job.companyCulture,
      applicationDeadline: job.applicationDeadline,
      numberOfOpenings: job.numberOfOpenings || 1,
      isDraft: job.isDraft || false,
      isFeatured: job.isFeatured || false,
      customQuestions: [],
      visibility: 'public'
    });
    setShowJobForm(true);
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const addBenefit = () => {
    if (newBenefit.trim() && !formData.benefits.includes(newBenefit.trim())) {
      setFormData(prev => ({
        ...prev,
        benefits: [...prev.benefits, newBenefit.trim()]
      }));
      setNewBenefit('');
    }
  };

  const removeBenefit = (benefit: string) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.filter(b => b !== benefit)
    }));
  };

  const addQuestion = () => {
    if (newQuestion.trim() && !formData.customQuestions.includes(newQuestion.trim())) {
      setFormData(prev => ({
        ...prev,
        customQuestions: [...prev.customQuestions, newQuestion.trim()]
      }));
      setNewQuestion('');
    }
  };

  const removeQuestion = (question: string) => {
    setFormData(prev => ({
      ...prev,
      customQuestions: prev.customQuestions.filter(q => q !== question)
    }));
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = searchTerm === '' ||
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
          <h2 className="text-2xl font-bold">Job Postings</h2>
          <p className="text-muted-foreground">Manage your job postings and track applications</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/recruiter/jobs/templates')}>
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button onClick={() => {
            resetForm();
            setIsEditing(false);
            setSelectedJob(null);
            setShowJobForm(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Post New Job
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs by title..."
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
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Button
                variant={view === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('list')}
              >
                <FileText className="h-4 w-4" />
              </Button>
              <Button
                variant={view === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('grid')}
              >
                <Briefcase className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List/Grid */}
      {filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No jobs posted yet</p>
            <Button className="mt-4" onClick={() => setShowJobForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Post Your First Job
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
          {filteredJobs.map((job) => (
            <Card key={job.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{job.title}</CardTitle>
                      {job.isFeatured && (
                        <Badge variant="default">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {job.remoteType}
                      </div>
                    </div>
                  </div>
                  <Badge className={getStatusColor(job.status)}>
                    {job.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Applications</span>
                    <span className="font-semibold">{job.applicantsCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Views</span>
                    <span className="font-semibold">{job.viewsCount || 0}</span>
                  </div>
                  {(() => {
                    const compensationType = (job as any).compensationType || 'fixed-salary';
                    if (job.salaryMin && job.salaryMax) {
                      const labels: Record<string, string> = {
                        'fixed-salary': 'Salary',
                        'hourly': 'Hourly Rate',
                        'stipend': 'Stipend',
                        'retainer': 'Retainer',
                        'paid-internship': 'Internship Stipend'
                      };
                      return (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{labels[compensationType] || 'Compensation'}</span>
                          <span className="font-semibold">
                            {job.salaryCurrency || 'USD'} {job.salaryMin.toLocaleString()} - {job.salaryMax.toLocaleString()}
                          </span>
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
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Compensation</span>
                          <span className="font-semibold">{labels[compensationType] || compensationType}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDistanceToNow(job.createdAt, { addSuffix: true })}
                  </div>
                  <div className="flex flex-wrap gap-1 pt-2">
                    {job.tags.slice(0, 3).map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {job.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{job.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedJobForView(job);
                        setShowJobDetailDialog(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditJob(job)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicateJob(job.id)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleJobStatus(job)}
                    >
                      {job.status === 'open' ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Job Form Dialog */}
      <Dialog open={showJobForm} onOpenChange={setShowJobForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Job' : 'Create New Job'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <Tabs defaultValue="basic">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="requirements">Requirements</TabsTrigger>
                <TabsTrigger value="benefits">Benefits</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="title">Job Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter job title"
                    className="mt-2"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Enter location"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="remoteType">Work Type</Label>
                    <Select
                      value={formData.remoteType}
                      onValueChange={(value: 'remote' | 'hybrid' | 'on-site') =>
                        setFormData(prev => ({ ...prev, remoteType: value }))
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="on-site">On-Site</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="experienceLevel">Experience Level</Label>
                    <Select
                      value={formData.experienceLevel}
                      onValueChange={(value: any) =>
                        setFormData(prev => ({ ...prev, experienceLevel: value }))
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entry">Entry Level</SelectItem>
                        <SelectItem value="mid">Mid Level</SelectItem>
                        <SelectItem value="senior">Senior Level</SelectItem>
                        <SelectItem value="executive">Executive</SelectItem>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="youth">Youth</SelectItem>
                        <SelectItem value="junior">Junior</SelectItem>
                        <SelectItem value="amateur">Amateur</SelectItem>
                        <SelectItem value="semi-professional">Semi-Professional</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="elite">Elite</SelectItem>
                        <SelectItem value="collegiate">Collegiate</SelectItem>
                        <SelectItem value="academy">Academy</SelectItem>
                        <SelectItem value="veteran">Veteran</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="compensationType">Compensation Type</Label>
                    <Select
                      value={formData.compensationType || 'fixed-salary'}
                      onValueChange={(value: any) =>
                        setFormData(prev => ({ ...prev, compensationType: value }))
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed-salary">Fixed Salary</SelectItem>
                        <SelectItem value="performance-based">Performance-based</SelectItem>
                        <SelectItem value="club-dependent">Club-dependent</SelectItem>
                        <SelectItem value="contract-based">Contract-based</SelectItem>
                        <SelectItem value="stipend">Stipend</SelectItem>
                        <SelectItem value="scholarship">Scholarship</SelectItem>
                        <SelectItem value="commission">Commission</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="project-based">Project-based</SelectItem>
                        <SelectItem value="retainer">Retainer</SelectItem>
                        <SelectItem value="negotiable">Negotiable</SelectItem>
                        <SelectItem value="volunteer">Volunteer</SelectItem>
                        <SelectItem value="unpaid-internship">Unpaid Internship</SelectItem>
                        <SelectItem value="paid-internship">Paid Internship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Salary fields - only show for fixed salary, hourly, or when salary range is applicable */}
                {(formData.compensationType === 'fixed-salary' || 
                  formData.compensationType === 'hourly' || 
                  formData.compensationType === 'stipend' || 
                  formData.compensationType === 'retainer' ||
                  formData.compensationType === 'paid-internship' ||
                  !formData.compensationType) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="salaryCurrency">Currency</Label>
                      <Select
                        value={formData.salaryCurrency || 'USD'}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, salaryCurrency: value }))}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="salaryMin">
                        {formData.compensationType === 'hourly' ? 'Hourly Rate Min' : 
                         formData.compensationType === 'stipend' ? 'Stipend Min' :
                         'Salary Min'}
                      </Label>
                      <Input
                        id="salaryMin"
                        type="number"
                        value={formData.salaryMin || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, salaryMin: parseInt(e.target.value) || undefined }))}
                        placeholder="0"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="salaryMax">
                        {formData.compensationType === 'hourly' ? 'Hourly Rate Max' : 
                         formData.compensationType === 'stipend' ? 'Stipend Max' :
                         'Salary Max'}
                      </Label>
                      <Input
                        id="salaryMax"
                        type="number"
                        value={formData.salaryMax || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, salaryMax: parseInt(e.target.value) || undefined }))}
                        placeholder="0"
                        className="mt-2"
                      />
                    </div>
                  </div>
                )}
                
                {/* Additional compensation info for other types */}
                {formData.compensationType && 
                 formData.compensationType !== 'fixed-salary' && 
                 formData.compensationType !== 'hourly' && 
                 formData.compensationType !== 'stipend' &&
                 formData.compensationType !== 'retainer' &&
                 formData.compensationType !== 'paid-internship' && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {formData.compensationType === 'performance-based' && 'Compensation will be based on performance metrics and achievements.'}
                      {formData.compensationType === 'club-dependent' && 'Compensation will be determined by the club or organization.'}
                      {formData.compensationType === 'contract-based' && 'Compensation will be specified in the contract terms.'}
                      {formData.compensationType === 'scholarship' && 'This position includes scholarship benefits.'}
                      {formData.compensationType === 'commission' && 'Compensation will be based on commission structure.'}
                      {formData.compensationType === 'project-based' && 'Compensation will be determined per project.'}
                      {formData.compensationType === 'negotiable' && 'Compensation is negotiable based on experience and qualifications.'}
                      {formData.compensationType === 'volunteer' && 'This is a volunteer position with no monetary compensation.'}
                      {formData.compensationType === 'unpaid-internship' && 'This is an unpaid internship position for learning and experience.'}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={formData.department || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                      placeholder="Enter department"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="numberOfOpenings">Number of Openings</Label>
                    <Input
                      id="numberOfOpenings"
                      type="number"
                      value={formData.numberOfOpenings || 1}
                      onChange={(e) => setFormData(prev => ({ ...prev, numberOfOpenings: parseInt(e.target.value) || 1 }))}
                      min={1}
                      className="mt-2"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="deadline">Application Deadline</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline.toISOString().split('T')[0]}
                    onChange={(e) => setFormData(prev => ({ ...prev, deadline: new Date(e.target.value) }))}
                    className="mt-2"
                  />
                </div>
              </TabsContent>

              <TabsContent value="description" className="space-y-4 mt-4">
                <div>
                  <Label>Job Description *</Label>
                  <div className="mt-2">
                    <ReactQuill
                      theme="snow"
                      value={formData.description}
                      onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
                      placeholder="Enter job description"
                      className="bg-background"
                    />
                  </div>
                </div>
                <div>
                  <Label>Company Culture</Label>
                  <Textarea
                    value={formData.companyCulture || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyCulture: e.target.value }))}
                    placeholder="Describe your company culture"
                    rows={4}
                    className="mt-2"
                  />
                </div>
              </TabsContent>

              <TabsContent value="requirements" className="space-y-4 mt-4">
                <div>
                  <Label>Requirements *</Label>
                  <div className="mt-2">
                    <ReactQuill
                      theme="snow"
                      value={formData.requirements}
                      onChange={(value) => setFormData(prev => ({ ...prev, requirements: value }))}
                      placeholder="Enter job requirements"
                      className="bg-background"
                    />
                  </div>
                </div>
                <div>
                  <Label>Custom Application Questions</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addQuestion()}
                      placeholder="Add a question"
                    />
                    <Button type="button" onClick={addQuestion}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.customQuestions.map((question, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1">
                        {question}
                        <button onClick={() => removeQuestion(question)}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="benefits" className="space-y-4 mt-4">
                <div>
                  <Label>Benefits and Perks</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={newBenefit}
                      onChange={(e) => setNewBenefit(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addBenefit()}
                      placeholder="Add benefit or perk"
                    />
                    <Button type="button" onClick={addBenefit}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.benefits.map((benefit, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1">
                        {benefit}
                        <button onClick={() => removeBenefit(benefit)}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Tags</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTag()}
                      placeholder="Add tag"
                    />
                    <Button type="button" onClick={addTag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1">
                        {tag}
                        <button onClick={() => removeTag(tag)}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isDraft">Save as Draft</Label>
                    <Switch
                      id="isDraft"
                      checked={formData.isDraft}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDraft: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isFeatured">Featured Job</Label>
                    <Switch
                      id="isFeatured"
                      checked={formData.isFeatured}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isFeatured: checked }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="visibility">Visibility</Label>
                    <Select
                      value={formData.visibility}
                      onValueChange={(value: 'public' | 'private' | 'internal') =>
                        setFormData(prev => ({ ...prev, visibility: value }))
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="internal">Internal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowJobForm(false);
                  resetForm();
                  setSelectedJob(null);
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFormData(prev => ({ ...prev, isDraft: true }));
                  isEditing ? handleUpdateJob() : handleCreateJob();
                }}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button
                onClick={isEditing ? handleUpdateJob : handleCreateJob}
                className="flex-1"
              >
                {isEditing ? 'Update Job' : 'Publish Job'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Job Detail Dialog */}
      <Dialog open={showJobDetailDialog} onOpenChange={setShowJobDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedJobForView?.title}</DialogTitle>
          </DialogHeader>
          {selectedJobForView && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {selectedJobForView.location}
                </div>
                <div className="flex items-center gap-1">
                  <Briefcase className="h-4 w-4" />
                  {selectedJobForView.remoteType === 'remote' ? 'Remote' : selectedJobForView.remoteType === 'hybrid' ? 'Hybrid' : 'On-site'}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDistanceToNow(selectedJobForView.createdAt, { addSuffix: true })}
                </div>
                {(() => {
                  const compensationType = (selectedJobForView as any).compensationType || 'fixed-salary';
                  if (selectedJobForView.salaryMin && selectedJobForView.salaryMax) {
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
                        {labels[compensationType] || 'Compensation'}: {selectedJobForView.salaryCurrency || 'USD'} {selectedJobForView.salaryMin.toLocaleString()} - {selectedJobForView.salaryMax.toLocaleString()}
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
              </div>

              <div>
                <h3 className="font-semibold mb-2">Job Description</h3>
                <div 
                  className="prose prose-sm max-w-none [&_p]:mb-3 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                  dangerouslySetInnerHTML={{ __html: selectedJobForView.description || 'No description available.' }}
                />
              </div>

              {selectedJobForView.requirements && (
                <div>
                  <h3 className="font-semibold mb-2">Requirements</h3>
                  <div 
                    className="prose prose-sm max-w-none [&_p]:mb-3 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                    dangerouslySetInnerHTML={{ __html: selectedJobForView.requirements }}
                  />
                </div>
              )}

              {selectedJobForView.qualifications && selectedJobForView.qualifications.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Qualifications</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {selectedJobForView.qualifications.map((qual, idx) => (
                      <li key={idx}>{qual}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedJobForView.tags && selectedJobForView.tags.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedJobForView.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/recruiter/applications?jobId=${selectedJobForView.id}`)}
                >
                  View Applications
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    handleEditJob(selectedJobForView);
                    setShowJobDetailDialog(false);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Job
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

