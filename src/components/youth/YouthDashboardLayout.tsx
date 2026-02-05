import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Link, useNavigate } from 'react-router-dom';

const isDevelopment = process.env.NODE_ENV === 'development';
import { 
  Briefcase, 
  Clock, 
  AlertCircle, 
  FileText, 
  MessageSquare, 
  ChevronRight 
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  orderBy, 
  doc, 
  updateDoc,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bookmark } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

// Icons
import { 
  Briefcase, 
  FileText, 
  MessageSquare,
  Bell,
  ChevronRight,
  AlertCircle,
  LogOut,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Search,
  BarChart2,
  Award,
  Settings,
  Home,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Users,
  Mail,
  FileCheck,
  Star,
  UserPlus,
  FileEdit,
  FilePlus,
  Network,
  ArrowUpRight,
  Calendar,
  MapPin,
  DollarSign,
  Clock as ClockIcon,
  Loader2
} from 'lucide-react';

// Types
type ApplicationStatus = 'applied' | 'interview' | 'rejected' | 'offer' | 'accepted';

interface Opportunity {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary?: string;
  description?: string;
  requirements?: string[];
  matchScore: number;
  skills: string[];
  postedAt: Timestamp | Date;
  deadline?: Timestamp | Date;
  companyLogo?: string;
  applicationStatus?: ApplicationStatus;
  isSaved?: boolean;
}

interface Activity {
  id: string;
  type: 'application' | 'message' | 'recommendation' | 'reminder' | 'system' | 'connection' | 'job_match';
  title: string;
  message: string;
  timestamp: Timestamp | Date;
  read: boolean;
  action?: {
    label: string;
    path: string;
  };
  icon?: React.ReactNode;
  userId?: string;
  jobId?: string;
}

interface UserProfile {
  id: string;
  userId: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  photoURL?: string;
  email?: string;
  title?: string;
  location?: string;
  bio?: string;
  skills?: string[];
  connections?: string[];
  JobMatches?: string[];
  applicationIds?: string[]; // For backward compatibility
  applications?: Array<{
    opportunityId: string;
    status: ApplicationStatus;
    appliedAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
  }>;
  education?: Array<{
    id: string;
    degree: string;
    institution: string;
    fieldOfStudy?: string;
    startDate: Timestamp | Date | string;
    endDate?: Timestamp | Date | string | null;
    description?: string;
  }>;
  experience?: Array<{
    id: string;
    title: string;
    company: string;
    location?: string;
    startDate: Timestamp | Date | string;
    endDate?: Timestamp | Date | string | null;
    current: boolean;
    description?: string;
  }>;
  portfolio?: {
    cvUrl?: string;
    projects?: Array<{
      id: string;
      title: string;
      description: string;
      url?: string;
      skills?: string[];
    }>;
  };
  portfolioItems?: Array<{
    id: string;
    title: string;
    description: string;
    imageUrl?: string;
  }>;
  profileCompletion?: number;
  lastUpdated?: Timestamp | Date;
  preferences?: {
    jobTypes?: string[];
    locations?: string[];
    salaryExpectations?: string;
    remotePreference?: 'remote' | 'hybrid' | 'onsite';
  };
}

// Navigation items
const navItems = [
  { name: 'Dashboard', icon: Home, path: '/youth-dashboard' },
  { name: 'My Profile', icon: User, path: '/profile' },
  { name: 'Job Matches', icon: Briefcase, path: '/jobs' },
  { name: 'Network', icon: Users, path: '/network' },
  { name: 'Messages', icon: MessageSquare, path: '/messages' },
  { name: 'Saved Jobs', icon: Bookmark, path: '/saved-jobs' },
  { name: 'Settings', icon: Settings, path: '/settings' },
  { name: 'Jobs', icon: Briefcase, path: '/jobs' },
  { name: 'Applications', icon: FileText, path: '/applications' },
  { name: 'Messages', icon: MessageSquare, path: '/messages' },
  { name: 'Learning', icon: BookOpen, path: '/learning' },
  { name: 'Certifications', icon: Award, path: '/certifications' },
  { name: 'Analytics', icon: BarChart2, path: '/analytics' },
  { name: 'Settings', icon: Settings, path: '/settings' },
];

// Mock data for opportunities
const mockOpportunities: Opportunity[] = [
  {
    id: '1',
    title: 'Frontend Developer',
    company: 'TechCorp',
    location: 'Nairobi, Kenya',
    type: 'Full-time',
    salary: 'KSh 250,000 - 350,000',
    description: 'We are looking for a skilled Frontend Developer to join our team...',
    requirements: [
      '3+ years of experience with React',
      'Strong knowledge of TypeScript',
      'Experience with modern CSS frameworks',
    ],
    matchScore: 87,
    skills: ['React', 'TypeScript', 'CSS', 'Redux'],
    postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    companyLogo: 'https://logo.clearbit.com/techcorp.com',
  },
  // Add more mock opportunities as needed
];

// Mock activities
const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'application',
    title: 'Application Viewed',
    message: 'Your application for Frontend Developer at TechCorp has been viewed',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    read: false,
    action: { label: 'View Application', path: '/applications/1' },
  },
  {
    id: '2',
    type: 'recommendation',
    title: 'New Job Matches',
    message: 'New job matches found based on your profile',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    read: true,
    action: { label: 'View Jobs', path: '/jobs/recommended' },
  },
  // Add more mock activities as needed
];

// Helper function to calculate profile completion percentage
const calculateProfileCompletion = (profile: UserProfile): number => {
  if (!profile) return 0;
  
  const fields = [
    profile.photoURL,
    profile.firstName,
    profile.lastName,
    profile.title,
    profile.location,
    profile.bio,
    profile.skills?.length > 0,
    profile.education?.length > 0,
    profile.experience?.length > 0,
    profile.portfolio?.cvUrl
  ];
  
  const completedFields = fields.filter(Boolean).length;
  return Math.round((completedFields / fields.length) * 100);
};

// Stat Card Component
const StatCard = ({ title, value, icon, change, className = '' }: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode;
  change?: string;
  className?: string;
}) => (
  <Card className={className}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className="h-4 w-4 text-muted-foreground">
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {change && <p className="text-xs text-muted-foreground">{change}</p>}
    </CardContent>
  </Card>
);

// Quick Action Component
const QuickAction = ({ 
  title, 
  description, 
  icon: Icon, 
  onClick 
}: { 
  title: string; 
  description: string; 
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) => (
  <Card 
    className="group hover:bg-accent/50 transition-colors cursor-pointer"
    onClick={onClick}
  >
    <CardContent className="p-4">
      <div className="flex items-center space-x-4">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-medium group-hover:underline">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Activity Item Component
const ActivityItem = ({ 
  activity, 
  onMarkAsRead 
}: { 
  activity: Activity; 
  onMarkAsRead: (id: string) => void;
}) => {
  const markActivityAsRead = async (activityId: string) => {
    onMarkAsRead(activityId);
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'application':
        return <FileCheck className="h-4 w-4 text-blue-500" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      case 'recommendation':
        return <Star className="h-4 w-4 text-amber-500" />;
      case 'connection':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'job_match':
        return <Briefcase className="h-4 w-4 text-indigo-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div 
      className={`flex items-start p-4 border-b hover:bg-accent/50 ${!activity.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
      onClick={() => !activity.read && markActivityAsRead(activity.id)}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getActivityIcon()}
      </div>
      <div className="ml-4 flex-1 min-w-0">
        <div className="flex justify-between">
          <h3 className="text-sm font-medium">{activity.title}</h3>
          <span className="text-xs text-muted-foreground">
            {format(activity.timestamp instanceof Timestamp ? activity.timestamp.toDate() : activity.timestamp, 'MMM d')}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{activity.message}</p>
        {!activity.read && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-2 h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              markActivityAsRead(activity.id);
            }}
          >
            Mark as read
          </Button>
        )}
      </div>
    </div>
  );
};

// Job Card Component
const JobCard = ({ job, onSave, onApply }: { 
  job: Opportunity; 
  onSave: (jobId: string, isSaved: boolean) => void;
  onApply: (jobId: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  
  const handleApplyJob = async (jobId: string) => {
    onApply(jobId);
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div className="flex items-start space-x-4">
              {job.companyLogo ? (
                <img 
                  src={job.companyLogo} 
                  alt={job.company} 
                  className="h-12 w-12 rounded-md object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <h3 className="font-medium">{job.title}</h3>
                <p className="text-sm text-muted-foreground">{job.company} • {job.location}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {job.type}
                  </Badge>
                  {job.salary && (
                    <Badge variant="outline" className="text-xs">
                      {job.salary}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {job.matchScore}% Match
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => onSave(job.id, !job.isSaved)}
              >
                {job.isSaved ? (
                  <Bookmark className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </Button>
              <Button 
                size="sm" 
                onClick={() => handleApplyJob(job.id)}
                disabled={job.applicationStatus !== undefined}
              >
                {job.applicationStatus ? (
                  <span className="flex items-center">
                    {job.applicationStatus === 'applied' && <CheckCircle2 className="h-4 w-4 mr-1" />}
                    {job.applicationStatus === 'interview' && <Calendar className="h-4 w-4 mr-1" />}
                    {job.applicationStatus === 'rejected' && <XCircle className="h-4 w-4 mr-1" />}
                    {job.applicationStatus === 'offer' && <Award className="h-4 w-4 mr-1" />}
                    {job.applicationStatus === 'accepted' && <CheckCircle2 className="h-4 w-4 mr-1" />}
                    {job.applicationStatus.charAt(0).toUpperCase() + job.applicationStatus.slice(1)}
                  </span>
                ) : 'Apply Now'}
              </Button>
            </div>
          </div>
          
          <div className="mt-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-sm text-primary p-0 h-auto"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Show less' : 'Show more details'}
              {expanded ? (
                <ChevronUp className="ml-1 h-4 w-4" />
              ) : (
                <ChevronDown className="ml-1 h-4 w-4" />
              )}
            </Button>
            
            {expanded && (
              <div className="mt-4 space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Job Description</h4>
                  <div 
                    className="text-sm text-muted-foreground prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: job.description || 'No description available.' }}
                  />
                </div>
                
                {job.requirements && job.requirements.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Requirements</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                      {job.requirements.map((req, i) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="flex items-center text-sm text-muted-foreground">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  <span>Posted {format(job.postedAt instanceof Timestamp ? job.postedAt.toDate() : job.postedAt, 'MMM d, yyyy')}</span>
                  {job.deadline && (
                    <span className="ml-4">
                      <span className="font-medium">Deadline:</span> {format(job.deadline instanceof Timestamp ? job.deadline.toDate() : job.deadline, 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {job.applicationStatus && (
          <div className={`px-6 py-3 text-sm ${
            job.applicationStatus === 'accepted' ? 'bg-green-50 text-green-800 dark:bg-green-900/20' :
            job.applicationStatus === 'rejected' ? 'bg-red-50 text-red-800 dark:bg-red-900/20' :
            job.applicationStatus === 'interview' ? 'bg-blue-50 text-blue-800 dark:bg-blue-900/20' :
            job.applicationStatus === 'offer' ? 'bg-purple-50 text-purple-800 dark:bg-purple-900/20' :
            'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20'
          }`}>
            <div className="flex items-center">
              {job.applicationStatus === 'applied' && <ClockIcon className="h-4 w-4 mr-2" />}
              {job.applicationStatus === 'interview' && <Calendar className="h-4 w-4 mr-2" />}
              {job.applicationStatus === 'rejected' && <XCircle className="h-4 w-4 mr-2" />}
              {job.applicationStatus === 'offer' && <Award className="h-4 w-4 mr-2" />}
              {job.applicationStatus === 'accepted' && <CheckCircle2 className="h-4 w-4 mr-2" />}
              
              <span>
                {job.applicationStatus === 'applied' && 'Application submitted'}
                {job.applicationStatus === 'interview' && 'Interview scheduled'}
                {job.applicationStatus === 'rejected' && 'Application not selected'}
                {job.applicationStatus === 'offer' && 'Offer received'}
                {job.applicationStatus === 'accepted' && 'Offer accepted'}
              </span>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-auto h-7 text-xs"
                onClick={() => {
                  // Navigate to application status page
                }}
              >
                View status <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const YouthDashboardLayout = () => {
  const { currentUser, userData, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isDevelopment = process.env.NODE_ENV === 'development';
  const [stats, setStats] = useState({
    connections: 0,
    jobmatches: 0,
    applications: 0,
    profilestrength: 0,
    unreadmessages: 0,
    savedjobs: 0
  });
  const [loading, setLoading] = useState({
    profile: true,
    opportunities: true,
    activities: true,
    stats: true
  });
  const [error, setError] = useState({
    profile: '',
    opportunities: '',
    activities: '',
    stats: ''
  });

  // Fetch activities
  const fetchActivities = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(prev => ({ ...prev, activities: true }));
      const activitiesRef = collection(db, 'activities');
      const q = query(
        activitiesRef,
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc'),
        limit(5)
      );
      
      const querySnapshot = await getDocs(q);
      const activitiesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      })) as Activity[];
      
      setActivities(activitiesData);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError(prev => ({ ...prev, activities: 'Failed to load activities' }));
      toast({
        title: 'Error',
        description: 'Failed to load activities',
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, activities: false }));
    }
  }, [user, toast]);

  // Mark activity as read
  const markAsRead = useCallback(async (activityId: string) => {
    if (!user) return;
    
    try {
      const activityRef = doc(db, 'activities', activityId);
      await updateDoc(activityRef, { read: true });
      
      setActivities(prev => 
        prev.map(activity => 
          activity.id === activityId 
            ? { ...activity, read: true } 
            : activity
        )
      );
    } catch (err) {
      console.error('Error marking activity as read:', err);
      toast({
        title: 'Error',
        description: 'Failed to mark activity as read',
        variant: 'destructive',
      });
    }
  }, [user, toast]);

  // Set up real-time listener for activities
  useEffect(() => {
    if (!user) return;
    
    const activitiesRef = collection(db, 'activities');
    const q = query(
      activitiesRef,
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedActivities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      })) as Activity[];
      
      setActivities(updatedActivities);
      setLoading(prev => ({ ...prev, activities: false }));
    }, (err) => {
      console.error('Error listening to activities:', err);
      setLoading(prev => ({ ...prev, activities: false }));
      setError(prev => ({ ...prev, activities: 'Error loading activities' }));
    });
    
    return () => unsubscribe();
  }, [user]);

  // Time ago helper function
  const timeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
      second: 1
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
      }
    }
    
    return 'just now';
  };

  // Activity icon component
  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'application':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      case 'recommendation':
        return <Briefcase className="h-4 w-4 text-green-500" />;
      case 'reminder':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };
    
    return (
      <div className="space-y-2">
        {loading.activities ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border-b">
                <div className="flex items-start space-x-3">
                  <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error.activities ? (
          <div className="p-4 text-center text-red-500">
            {error.activities}
          </div>
        ) : activities.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No activities yet
          </div>
        ) : (
          activities.map((activity) => (
          <div 
            key={activity.id}
            className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
              !activity.read ? 'bg-blue-50' : ''
            }`}
            onClick={() => !activity.read && markAsRead(activity.id)}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                <div className="h-8 w-8 rounded-full bg-white border flex items-center justify-center">
                  {getActivityIcon(activity.type)}
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm text-gray-800">
                  {activity.message}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {timeAgo(activity.timestamp)}
                  </span>
                  {!activity.read && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      New
                    </span>
                  )}
                </div>
                {activity.action && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="h-auto p-0 mt-2 text-blue-600 hover:text-blue-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(activity.action!.path);
                    }}
                  >
                    {activity.action.label}
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Loading skeleton
  const renderSkeleton = () => (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
        </CardContent>
      </Card>
      
      {/* Quick Actions Skeleton */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center">
                <Skeleton className="h-10 w-10 rounded-full mr-3" />
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
      
      {/* Content Skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border rounded-lg">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-3" />
                <div className="flex gap-1">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start">
                <Skeleton className="h-10 w-10 rounded-full mt-1 mr-3" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
  
  // Loading skeleton
  const renderSkeleton = () => (
    <div className="min-h-screen bg-gray-50">
      <div className="animate-pulse">
        {/* Add your skeleton UI here */}
        <div className="h-16 bg-gray-200"></div>
        <div className="flex">
          <div className="w-64 h-screen bg-gray-100"></div>
          <div className="flex-1 p-8">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-white rounded-lg shadow"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-96 bg-white rounded-lg shadow"></div>
              <div className="h-96 bg-white rounded-lg shadow"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Show skeleton loader when loading in production
  if (isLoading && !isDevelopment) {
    return renderSkeleton();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <button
        type="button"
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        <span className="sr-only">Open sidebar</span>
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <Link to="/" className="flex items-center">
              <span className="text-xl font-bold text-indigo-600">Talent Search</span>
            </Link>
            <button
              type="button"
              className="md:hidden p-1 rounded-md text-gray-400 hover:text-gray-500"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  location.pathname === item.path
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 ${
                    location.pathname === item.path
                      ? 'text-indigo-500'
                      : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User profile */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Avatar>
                  <AvatarImage src={profile?.photoURL} alt={profile?.displayName} />
                  <AvatarFallback>
                    {profile?.displayName
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">
                  {profile?.displayName || 'User'}
                </p>
                <p className="text-xs text-gray-500">
                  {profile?.title || 'Job Seeker'}
                </p>
                <button
                  onClick={handleLogout}
                  className="mt-1 flex items-center text-xs font-medium text-gray-500 hover:text-gray-700"
                >
                  <LogOut className="h-3 w-3 mr-1" /> Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Top navigation */}
        <header className="bg-white shadow-sm z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-lg font-semibold text-gray-900">
                  Dashboard
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" className="relative">
                  <Bell className="h-4 w-4 mr-2" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-white"></span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Welcome Card */}
            <Card className="shadow-sm mb-6">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                      Welcome back, {profile?.displayName || 'User'}! 👋
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Here's what's happening with your job search today.
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="hidden md:flex items-center"
                      onClick={() => {
                        // In a real app, this would open a notification panel
                        toast({
                          title: 'Notifications',
                          description: 'You have 3 unread notifications.',
                        });
                      }}
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Notifications
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="flex items-center"
                      onClick={() => navigate('/profile/edit')}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Complete Profile
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm font-medium mb-1">
                      <span>Profile Completion</span>
                      <span>{profileCompletion}%</span>
                    </div>
                    <Progress value={profileCompletion} className="h-2" />
                    {profileCompletion < 100 ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        Complete your profile to increase your visibility to recruiters. {
                          profileCompletion < 50 ? 'You\'re almost there!' : 
                          profileCompletion < 80 ? 'Looking good! Keep going!' : 
                          'Just a few more details to go!'
                        }
                      </p>
                    ) : (
                      <p className="text-xs text-green-600 font-medium mt-1 flex items-center">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Your profile is complete! Great job!
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-3">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">Update Resume</h3>
                      <p className="text-sm text-muted-foreground">
                        Upload your latest resume
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardFooter className="pt-0">
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="h-auto p-0 text-blue-600 hover:text-blue-800"
                    onClick={() => navigate('/profile/resume')}
                  >
                    Update now
                  </Button>
                </CardFooter>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-3">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">Add Project</h3>
                      <p className="text-sm text-muted-foreground">Showcase your work</p>
                    </div>
                  </div>
                </CardHeader>
                <CardFooter className="pt-0">
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="h-auto p-0 text-blue-600 hover:text-blue-800"
                    onClick={() => navigate('/portfolio/new')}
                  >
                    Add project
                  </Button>
                </CardFooter>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-green-100 text-green-600 mr-3">
                      <Search className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">Find Jobs</h3>
                      <p className="text-sm text-muted-foreground">Browse latest opportunities</p>
                    </div>
                  </div>
                </CardHeader>
                <CardFooter className="pt-0">
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="h-auto p-0 text-blue-600 hover:text-blue-800"
                    onClick={() => navigate('/jobs')}
                  >
                    Browse jobs
                  </Button>
                </CardFooter>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-amber-100 text-amber-600 mr-3">
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">Skills Assessment</h3>
                      <p className="text-sm text-muted-foreground">Test your skills</p>
                    </div>
                  </div>
                </CardHeader>
                <CardFooter className="pt-0">
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="h-auto p-0 text-blue-600 hover:text-blue-800"
                    onClick={() => navigate('/assessments')}
                  >
                    Take assessment
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Job Matches */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Recommended Jobs</h2>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-sm text-blue-600 hover:text-blue-800"
                    onClick={() => navigate('/jobs/recommended')}
                  >
                    View all <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                
                {loading.opportunities ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="p-4">
                        <div className="flex items-start space-x-3">
                          <Skeleton className="h-10 w-10 rounded-md" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                            <div className="flex space-x-2">
                              <Skeleton className="h-5 w-16" />
                              <Skeleton className="h-5 w-20" />
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : opportunities.length > 0 ? (
                  <div className="space-y-4">
                    {opportunities.map(opp => renderOpportunityCard(opp, handleApplyJob))}
                    <div className="text-center">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate('/jobs')}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Show more jobs
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Card className="p-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                      <Briefcase className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="mt-3 text-sm font-medium text-gray-900">No job matches yet</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Update your profile to see personalized job recommendations.
                    </p>
                    <div className="mt-6">
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => navigate('/profile/edit')}
                      >
                        <User className="mr-2 h-4 w-4" />
                        Complete Profile
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
              
              {/* Recent Activity */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-sm text-blue-600 hover:text-blue-800"
                    onClick={() => navigate('/activity')}
                  >
                    View all <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                
                <Card>
                  <CardContent className="p-0">
                    {loading.activities ? (
                      <div className="space-y-4 p-4">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="flex items-start space-x-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="flex-1 space-y-1">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : activities.length > 0 ? (
                      <div className="divide-y">
                        {activities.slice(0, 4).map((activity) => (
                          <div 
                            key={activity.id}
                            className={`p-3 rounded-lg transition-colors ${!activity.read ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                            onClick={() => !activity.read && markAsRead(activity.id)}
                          >
                            <div className="flex items-start">
                              <div className="flex-shrink-0 mt-0.5">
                                <div className="h-8 w-8 rounded-full bg-white border flex items-center justify-center">
                                  {getActivityIcon(activity.type)}
                                </div>
                              </div>
                              <div className="ml-3 flex-1 min-w-0">
                                <p className="text-sm text-gray-800">
                                  {activity.message}
                                </p>
                                <div className="mt-1 flex items-center justify-between">
                                  <span className="text-xs text-gray-500">
                                    {timeAgo(activity.timestamp)}
                                  </span>
                                  {!activity.read && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      New
                                    </span>
                                  )}
                                </div>
                                {activity.action && (
                                  <Button 
                                    variant="link" 
                                    size="sm" 
                                    className="h-auto p-0 mt-2 text-blue-600 hover:text-blue-800"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(activity.action!.path);
                                    }}
                                  >
                                    {activity.action.label}
                                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                          <Bell className="h-6 w-6 text-gray-400" />
                        </div>
                        <h3 className="mt-3 text-sm font-medium text-gray-900">No activity yet</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Your recent activities will appear here.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Application Status */}
                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Application Status</h2>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-sm text-blue-600 hover:text-blue-800"
                      onClick={() => navigate('/applications')}
                    >
                      View all <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                  
                  <Card>
                    <CardContent className="p-0">
                      <div className="p-4">
                        <div className="grid grid-cols-4 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-blue-600">12</div>
                            <div className="text-xs text-gray-500">Applied</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-purple-600">4</div>
                            <div className="text-xs text-gray-500">Interviews</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-600">1</div>
                            <div className="text-xs text-gray-500">Offers</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-gray-600">2</div>
                            <div className="text-xs text-gray-500">Rejected</div>
                          </div>
                        </div>
                        <div className="mt-4">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500" 
                              style={{ width: '85%' }}
                            />
                          </div>
                          <div className="mt-2 flex justify-between text-xs text-gray-500">
                            <span>Application Progress</span>
                            <span>85%</span>
                          </div>
                        </div>
                      </div>
                      <div className="border-t p-4">
                        <h3 className="text-sm font-medium mb-2">Recent Applications</h3>
                        <div className="space-y-3">
                          {[
                            { id: '1', company: 'TechCorp', position: 'Senior Frontend Developer', status: 'interview', date: '2 days ago' },
                            { id: '2', company: 'DesignHub', position: 'UI/UX Designer', status: 'applied', date: '1 week ago' },
                            { id: '3', company: 'DataSystems', position: 'Data Scientist', status: 'rejected', date: '2 weeks ago' },
                          ].map((app) => (
                            <div key={app.id} className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium">{app.position}</div>
                                <div className="text-xs text-gray-500">{app.company} • {app.date}</div>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getStatusBadge(app.status as ApplicationStatus)}`}
                              >
                                {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default YouthDashboardLayout;
