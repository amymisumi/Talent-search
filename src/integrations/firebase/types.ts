// Firebase types for the application

export interface UserProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  country?: string;
  city?: string;
  phone?: string;
  bio?: string;
  yearsOfExperience?: number;
  educationLevel?: string;
  profileImageUrl?: string;
  cvUrl?: string;
  age?: number;
  preferredCareerField?: string;
  companyName?: string;
  companyWebsite?: string;
  companyLogoUrl?: string;
  industryType?: string;
  companyDescription?: string;
  talentArea?: string;
  isVerified?: boolean;
  isSuspended?: boolean;
  savedJobs?: string[]; // Array of job IDs
  appliedJobs?: string[]; // Array of job IDs
  skills?: Array<string | { skillName: string; proficiencyLevel?: string }>; // Support both string and object formats
  location?: string; // Full location string
  createdAt: Date;
  updatedAt: Date;
}

export interface Skill {
  id: string;
  profileId: string;
  skillName: string;
  proficiencyLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category?: 'technical' | 'soft_skills' | 'languages' | 'tools';
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  verifiedAt?: Date;
  verifiedBy?: string;
  quizScore?: number;
  quizCompletedAt?: Date;
  endorsements?: SkillEndorsement[];
  isTrending?: boolean;
  industryDemand?: number; // 1-10 scale
  learningResources?: LearningResource[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface SkillEndorsement {
  id: string;
  endorserId: string;
  endorserName: string;
  endorserRole: 'peer' | 'recruiter' | 'mentor';
  comment?: string;
  endorsedAt: Date;
}

export interface LearningResource {
  id: string;
  title: string;
  type: 'course' | 'article' | 'video' | 'book' | 'tutorial';
  url: string;
  platform: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration?: string; // e.g., "2 hours", "5 weeks"
  rating?: number;
  isFree: boolean;
}

export interface SkillQuiz {
  id: string;
  skillId: string;
  questions: QuizQuestion[];
  passingScore: number;
  timeLimit?: number; // in minutes
  createdAt: Date;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // index of correct option
  explanation?: string;
}

export interface SkillGapAnalysis {
  skillName: string;
  currentLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  requiredLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  gap: number; // -3 to +3 scale
  recommendations: string[];
}

export interface SkillsReport {
  userId: string;
  userName: string;
  generatedAt: Date;
  totalSkills: number;
  verifiedSkills: number;
  endorsedSkills: number;
  trendingSkills: number;
  skillCategories: { [category: string]: number };
  proficiencyDistribution: { [level: string]: number };
  topSkills: string[];
  skillGaps: SkillGapAnalysis[];
  recommendations: string[];
}

export interface Portfolio {
  id: string;
  profileId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  projectUrl?: string;
  technologies?: string[];
  isFlagged?: boolean;
  createdAt: Date;
}

export interface Review {
  id: string;
  youthId: string; // Changed from profileId for consistency
  recruiterId: string;
  recruiterName: string;
  rating: number; // Overall rating (1-5, can be decimal)
  // Multiple criteria ratings
  professionalism?: number;
  communication?: number;
  skillsCompetency?: number;
  projectQuality?: number;
  reviewText?: string; // Optional textual feedback (max 2000 chars)
  projectId?: string; // Optional link to specific project
  status: 'draft' | 'submitted' | 'edited';
  createdAt: Date;
  updatedAt?: Date;
  submittedAt?: Date; // When status changed to 'submitted'
}

export type UserRole = 'youth' | 'recruiter' | 'admin';

export interface UserData {
  displayName?: string;
  email?: string;
  photoURL?: string;
  role?: UserRole;
  bio?: string;
  skills?: string[];
  education?: Array<{
    id: string;
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
    current: boolean;
  }>;
  experience?: Array<{
    id: string;
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
  }>;
  profilePicture?: string;
  portfolioItems?: Array<{
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    tags: string[];
  }>;
  // Add other user data fields as needed
}

// New interfaces for youth-specific data
export interface Connection {
  id: string;
  userId: string; // youth user ID
  connectedUserId: string; // other user ID (could be recruiter or another youth)
  connectedUserName: string;
  connectedUserRole: UserRole;
  status: 'pending' | 'accepted' | 'declined';
  initiatedBy: string; // userId who initiated the connection
  createdAt: Date;
  acceptedAt?: Date;
}

export interface JobMatch {
  id: string;
  userId: string; // youth user ID
  jobId: string;
  jobTitle: string;
  companyName: string;
  matchScore: number; // percentage match
  status: 'new' | 'viewed' | 'applied' | 'rejected';
  createdAt: Date;
  viewedAt?: Date;
  appliedAt?: Date;
}

export interface Application {
  id: string;
  userId: string; // youth user ID
  userName: string;
  userEmail: string;
  recruiterId: string; // recruiter who posted the job
  jobId: string;
  jobTitle: string;
  companyName: string;
  status: 'new' | 'under_review' | 'shortlisted' | 'interview_scheduled' | 'technical_assessment' | 'final_interview' | 'offer_extended' | 'hired' | 'rejected';
  appliedAt: Date;
  updatedAt: Date;
  notes?: string;
  cvUrl?: string;
  coverLetter?: string;
  applicantPhoto?: string;
  stageHistory?: ApplicationStageHistory[];
  score?: number; // 0-100
  tags?: string[];
  assignedTo?: string; // recruiter ID
  priority?: 'low' | 'medium' | 'high';
  source?: string; // how they found the job
  duplicateOf?: string; // application ID if duplicate
}

export interface Notification {
  id: string;
  userId: string; // recipient user ID
  type: 'connection_request' | 'connection_accepted' | 'job_match' | 'application_update' | 'message' | 'admin_notification';
  title: string;
  message: string;
  isRead: boolean;
  relatedId?: string; // ID of related entity (connection, job, etc.)
  createdAt: Date;
  senderId?: string;
  senderName?: string;
}

// Admin-specific interfaces
export interface Certificate {
  id: string;
  userId: string;
  userName: string;
  certificateType: string;
  fileUrl: string;
  status: 'pending' | 'verified' | 'rejected';
  submittedAt: Date;
  reviewedAt?: Date;
  adminNotes?: string;
  reviewerId?: string;
  description?: string;
}

export interface SupportReport {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  status: 'open' | 'resolved' | 'unresolved';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  resolvedAt?: Date;
  adminResponse?: string;
}

export interface ActivityLog {
  id: string;
  userId?: string;
  userName?: string;
  action: string;
  details: string;
  timestamp: Date;
  adminId?: string;
  adminName?: string;
}

export interface LandingPageContent {
  id: string;
  section: 'hero' | 'about' | 'contact' | 'guidelines';
  title?: string;
  content: string;
  imageUrl?: string;
  updatedAt: Date;
  updatedBy: string;
}

export interface SystemSettings {
  id: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowNewRegistrations: boolean;
  maxFileSize: number; // in MB
  updatedAt: Date;
  updatedBy: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

// Recruiter Dashboard Interfaces
export interface Job {
  id: string;
  recruiterId: string;
  title: string;
  description: string;
  requirements: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  location: string;
  remoteType: 'remote' | 'hybrid' | 'on-site';
  tags: string[];
  qualifications: string[];
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive' | 'youth' | 'amateur' | 'professional' | 'semi-professional' | 'collegiate' | 'academy' | 'junior' | 'veteran' | 'elite' | 'beginner' | 'intermediate' | 'advanced';
  compensationType?: 'fixed-salary' | 'performance-based' | 'club-dependent' | 'contract-based' | 'stipend' | 'scholarship' | 'commission' | 'hourly' | 'project-based' | 'retainer' | 'negotiable' | 'volunteer' | 'unpaid-internship' | 'paid-internship';
  deadline: Date;
  status: 'open' | 'suspended' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  applicantsCount: number;
  department?: string;
  reportingStructure?: string;
  benefits?: string[];
  companyCulture?: string;
  applicationDeadline?: Date;
  numberOfOpenings?: number;
  isSponsored?: boolean;
  isFeatured?: boolean;
  viewsCount?: number;
  applicationsCount?: number;
  conversionRate?: number;
  templateId?: string;
  isDraft?: boolean;
  companyName?: string; // Company name for the job posting
  jobCategory?: string; // Job category/field
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  messageType: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  isRead: boolean;
  createdAt: Date;
  conversationId: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: { [userId: string]: number };
  createdAt: Date;
  updatedAt: Date;
}

export interface Interview {
  id: string;
  jobId: string;
  applicationId: string;
  recruiterId: string;
  youthId: string;
  scheduledAt: Date;
  duration: number; // in minutes
  meetingType: 'virtual' | 'in-person';
  meetingLink?: string;
  location?: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface Shortlist {
  id: string;
  recruiterId: string;
  youthId: string;
  jobId?: string; // optional - can shortlist for general purposes
  notes?: string;
  createdAt: Date;
}

export interface RecruiterAnalytics {
  totalJobs: number;
  activeJobs: number;
  totalApplicants: number;
  newApplicantsThisWeek: number;
  averageTimeToHire: number; // in days
  shortlistedCandidates: number;
  hiredCandidates: number;
  monthlyActivity: {
    month: string;
    jobsPosted: number;
    applicantsReceived: number;
    interviewsScheduled: number;
  }[];
}

export interface RecruiterNotification {
  id: string;
  recruiterId: string;
  type: 'new_application' | 'interview_reminder' | 'job_expiring' | 'candidate_response' | 'system_update';
  title: string;
  message: string;
  relatedId?: string; // jobId, applicationId, etc.
  isRead: boolean;
  createdAt: Date;
}

export interface RecruiterSettings {
  id: string;
  recruiterId: string;
  emailNotifications: boolean;
  applicationAlerts: boolean;
  interviewReminders: boolean;
  weeklyReports: boolean;
  language: 'en' | 'sw';
  timezone: string;
  updatedAt: Date;
}

// AI Chat Message types
export interface AIChatMessage {
  messageId: string;
  userId: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: Date | any; // Firebase Timestamp
  language: 'en' | 'sw' | 'mixed';
  pinned?: boolean;
  type?: 'suggestion' | 'response' | 'error' | 'job_match' | 'learning_resource' | 'profile_analysis' | 'cv_improvement';
  data?: any;
}

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  description: string;
  requiredSkills?: string[];
  postedAt: Date;
  status?: 'active' | 'closed' | 'suspended';
}

// Enhanced Application with stage history
export interface ApplicationStageHistory {
  stage: Application['status'];
  changedAt: Date;
  changedBy: string;
  notes?: string;
}

// Enhanced Interview with feedback
export interface InterviewFeedback {
  strengths: string[];
  weaknesses: string[];
  technicalSkills: number; // 1-5
  communication: number; // 1-5
  cultureFit: number; // 1-5
  overallRating: number; // 1-5
  notes?: string;
  submittedAt: Date;
  submittedBy: string;
}

// Enhanced Shortlist with collections
export interface ShortlistCollection {
  id: string;
  recruiterId: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Enhanced Shortlist
export interface EnhancedShortlist extends Shortlist {
  collectionId?: string;
  tags?: string[];
  notes?: string;
  rating?: number;
  customFields?: Record<string, any>;
}

// Talent Search
export interface SavedSearch {
  id: string;
  recruiterId: string;
  name: string;
  filters: TalentSearchFilters;
  alertEnabled: boolean;
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TalentSearchFilters {
  skills?: string[];
  skillOperator?: 'AND' | 'OR';
  locations?: string[];
  radius?: number;
  willingToRelocate?: boolean;
  educationLevel?: string[];
  educationInstitution?: string;
  educationField?: string;
  gpaMin?: number;
  gpaMax?: number;
  experienceLevel?: ('entry' | 'junior' | 'mid' | 'senior' | 'expert')[];
  yearsOfExperienceMin?: number;
  yearsOfExperienceMax?: number;
  certifications?: string[];
  languages?: Array<{ language: string; proficiency: string }>;
  availability?: ('immediate' | '1_month' | '3_months' | 'not_specified')[];
  jobTypePreference?: ('remote' | 'hybrid' | 'on-site')[];
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  verifiedOnly?: boolean;
  hasPortfolio?: boolean;
  hasFeaturedProjects?: boolean;
  minRating?: number;
  lastActive?: ('24h' | '7d' | '30d' | 'custom');
  lastActiveCustom?: Date;
}

// AI Matching
export interface AIMatchResult {
  candidateId: string;
  matchScore: number; // 0-100
  reasoning: string;
  skillMatches: Array<{ skill: string; match: boolean; proficiency: string }>;
  experienceMatch: number;
  educationMatch: number;
  recommendedQuestions?: string[];
  skillsGap?: Array<{ skill: string; current: string; required: string }>;
}

// Candidate Comparison
export interface CandidateComparison {
  id: string;
  recruiterId: string;
  candidateIds: string[]; // max 5
  jobId?: string;
  createdAt: Date;
}

// Networking
export interface NetworkConnection {
  id: string;
  recruiterId: string;
  connectedUserId: string;
  connectedUserRole: 'youth' | 'recruiter';
  status: 'pending' | 'accepted' | 'rejected';
  initiatedBy: string;
  tags?: string[];
  notes?: string;
  createdAt: Date;
  acceptedAt?: Date;
}

// Enhanced Analytics
export interface RecruiterAnalyticsEnhanced extends RecruiterAnalytics {
  jobPerformance: Array<{
    jobId: string;
    jobTitle: string;
    views: number;
    applications: number;
    conversionRate: number;
    timeToFill?: number;
  }>;
  candidateMetrics: {
    sources: Record<string, number>;
    skillsInDemand: Array<{ skill: string; count: number }>;
    locations: Record<string, number>;
    education: Record<string, number>;
    experience: Record<string, number>;
    ratings: { average: number; distribution: Record<number, number> };
  };
  hiringMetrics: {
    hiresByMonth: Record<string, number>;
    hiresByDepartment: Record<string, number>;
    hiresByCategory: Record<string, number>;
    timeToHireTrends: Array<{ month: string; averageDays: number }>;
  };
  teamPerformance: {
    reviewedApplications: number;
    interviews: number;
    averageResponseTime: number; // hours
    workload: Record<string, number>;
  };
  platformUsage: {
    searches: number;
    messages: number;
    profileViews: number;
    featureUsage: Record<string, number>;
  };
}

// Custom Report
export interface CustomReport {
  id: string;
  recruiterId: string;
  name: string;
  description?: string;
  metrics: string[];
  dateRange: { start: Date; end: Date };
  visualization: 'chart' | 'table' | 'both';
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// Rating & Review
export interface CandidateRating {
  id: string;
  recruiterId: string;
  candidateId: string;
  jobId?: string;
  technicalSkills: number; // 1-5
  communication: number; // 1-5
  teamwork: number; // 1-5
  reliability: number; // 1-5
  cultureFit: number; // 1-5
  overallRating: number; // 1-5
  feedback?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Enhanced Settings
export interface RecruiterSettingsEnhanced extends RecruiterSettings {
  integrations: {
    linkedin?: { enabled: boolean; apiKey?: string };
    gmail?: { enabled: boolean; email?: string };
    outlook?: { enabled: boolean; email?: string };
    googleCalendar?: { enabled: boolean; calendarId?: string };
    outlookCalendar?: { enabled: boolean; calendarId?: string };
    zoom?: { enabled: boolean; apiKey?: string };
    teams?: { enabled: boolean; tenantId?: string };
    hris?: { enabled: boolean; system?: string; apiKey?: string };
    backgroundCheck?: { enabled: boolean; provider?: string; apiKey?: string };
    assessmentTools?: Array<{ name: string; enabled: boolean; apiKey?: string }>;
  };
  security: {
    twoFactorEnabled: boolean;
    loginHistory: Array<{ date: Date; ip: string; device: string; location?: string }>;
    activeSessions: Array<{ sessionId: string; device: string; ip: string; lastActivity: Date }>;
  };
  emailSignature?: string;
  billing?: {
    plan: string;
    paymentMethod?: string;
    billingAddress?: string;
  };
}

// Message Template
export interface MessageTemplate {
  id: string;
  recruiterId: string;
  name: string;
  subject?: string;
  body: string;
  variables?: string[]; // e.g., ['{{candidateName}}', '{{jobTitle}}']
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Activity Feed Item
export interface ActivityFeedItem {
  id: string;
  recruiterId: string;
  type: 'application' | 'message' | 'profile_view' | 'interview' | 'job_post' | 'candidate_action';
  title: string;
  description: string;
  relatedId?: string;
  relatedType?: string;
  icon?: string;
  createdAt: Date;
  isRead: boolean;
}

// Job Template
export interface JobTemplate {
  id: string;
  recruiterId: string;
  name: string;
  category?: string;
  jobData?: Partial<Job>;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Flat structure fields (for component compatibility)
  title?: string;
  description?: string;
  requirements?: string;
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
}

// Company Profile Enhanced
export interface CompanyProfileEnhanced extends UserProfile {
  coverImageUrl?: string;
  companySize?: string;
  foundedYear?: number;
  headquarters?: { city: string; country: string; address?: string };
  socialMediaLinks?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
  };
  mission?: string;
  values?: string;
  cultureGallery?: Array<{ id: string; url: string; caption?: string; type: 'image' | 'video' }>;
  benefits?: string[];
  employeeTestimonials?: Array<{
    id: string;
    name: string;
    role: string;
    content: string;
    rating: number;
    photoUrl?: string;
  }>;
  awards?: Array<{
    id: string;
    title: string;
    year: string;
    description: string;
    imageUrl?: string;
  }>;
  officeLocations?: Array<{
    id: string;
    city: string;
    country: string;
    address: string;
    coordinates?: { lat: number; lng: number };
  }>;
  profileVisibility?: 'public' | 'private';
  profileCompletion?: number;
}
