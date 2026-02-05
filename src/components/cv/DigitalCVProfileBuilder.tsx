import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  GripVertical, 
  Plus, 
  Trash2, 
  Save, 
  Download, 
  Share2, 
  Eye, 
  Sparkles,
  FileText,
  FileDown,
  Link as LinkIcon,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Upload,
  X,
  ArrowUp,
  ArrowDown,
  Target,
  Award,
  GraduationCap,
  Briefcase,
  Code,
  Globe,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, storage } from '@/integrations/firebase/client';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import jsPDF from 'jspdf';
import { useAnalytics } from '@/hooks/useAnalytics';
import { claudeService } from '@/services/claudeService';

// CV Templates aligned to product spec
type CVTemplate = 'modern' | 'minimal' | 'creative';

interface CVSection {
  id: string;
  type: 'personal' | 'summary' | 'education' | 'experience' | 'skills' | 'languages' | 'certifications' | 'portfolio';
  title: string;
  order: number;
  visible: boolean;
}

interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
  gpa?: string;
  achievements?: string[];
}

interface ExperienceEntry {
  id: string;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
  achievements: string[];
  technologies?: string[];
}

interface SkillEntry {
  id: string;
  name: string;
  proficiency: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  category: 'technical' | 'soft' | 'language' | 'tool';
}

interface LanguageEntry {
  id: string;
  name: string;
  proficiency: 'Beginner' | 'Intermediate' | 'Advanced' | 'Fluent' | 'Native';
}

interface CertificationEntry {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

interface PortfolioEntry {
  id: string;
  title: string;
  description: string;
  link?: string;
  techStack: string[];
  featured: boolean;
  outcomes?: string;
}

interface DigitalCVProfileBuilderProps {
  initialData: any;
  portfolioProjects: any[];
  certificates: any[];
  skills?: any[]; // Real-time skills data
  onSave: (data: any) => Promise<void>;
}

const DigitalCVProfileBuilder: React.FC<DigitalCVProfileBuilderProps> = ({
  initialData,
  portfolioProjects,
  certificates,
  skills,
  onSave,
}) => {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const { track } = useAnalytics();
  
  // State
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [selectedTemplate, setSelectedTemplate] = useState<CVTemplate>('modern');
  const [saving, setSaving] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  
  // Form Data
  const [formData, setFormData] = useState({
    displayName: initialData?.displayName || '',
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    location: initialData?.location || '',
    city: initialData?.city || '',
    country: initialData?.country || '',
    profilePicture: initialData?.profilePicture || '',
    professionalSummary: initialData?.professionalSummary || initialData?.bio || '',
    bio: initialData?.bio || '',
    socialLinks: initialData?.socialLinks || {
      linkedin: '',
      github: '',
      twitter: '',
      portfolio: '',
    },
    education: (initialData?.education || []).map((edu: any) => ({
      id: edu.id || `edu-${Date.now()}-${Math.random()}`,
      institution: edu.institution || edu.school || '',
      degree: edu.degree || '',
      fieldOfStudy: edu.fieldOfStudy || edu.field || '',
      startDate: edu.startDate || '',
      endDate: edu.endDate || '',
      isCurrent: edu.isCurrent || edu.current || false,
      description: edu.description || '',
      gpa: edu.gpa || '',
      achievements: edu.achievements || [],
    })) as EducationEntry[],
    experience: (initialData?.experience || []).map((exp: any) => ({
      id: exp.id || `exp-${Date.now()}-${Math.random()}`,
      company: exp.company || '',
      position: exp.position || exp.title || '',
      location: exp.location || '',
      startDate: exp.startDate || '',
      endDate: exp.endDate || '',
      isCurrent: exp.isCurrent || exp.current || false,
      description: exp.description || exp.responsibilities || '',
      achievements: exp.achievements || [],
      technologies: exp.technologies || [],
    })) as ExperienceEntry[],
    skills: (initialData?.skills || []).map((skill: any, index: number) => ({
      id: typeof skill === 'string' ? `skill-${index}` : (skill.id || `skill-${index}`),
      name: typeof skill === 'string' ? skill : (skill.name || skill),
      proficiency: typeof skill === 'string' ? 'Intermediate' : (skill.proficiency || 'Intermediate'),
      category: typeof skill === 'string' ? 'technical' : (skill.category || 'technical'),
    })) as SkillEntry[],
    languages: (initialData?.languages || []).map((lang: any, index: number) => ({
      id: lang.id || `lang-${index}`,
      name: typeof lang === 'string' ? lang : (lang.name || lang.language || ''),
      proficiency: typeof lang === 'string' ? 'Intermediate' : (lang.proficiency || 'Intermediate'),
    })) as LanguageEntry[],
    certifications: (initialData?.certifications || certificates || []).map((cert: any) => ({
      id: cert.id || `cert-${Date.now()}`,
      name: cert.name || cert.certificateType || '',
      issuer: cert.issuer || 'Issuing Organization',
      issueDate: cert.issueDate || (cert.submittedAt?.toDate?.()?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]),
      expiryDate: cert.expiryDate || '',
      credentialId: cert.credentialId || cert.id,
      credentialUrl: cert.credentialUrl || cert.fileUrl || '',
    })) as CertificationEntry[],
    portfolio: (initialData?.portfolio || portfolioProjects || []).map((proj: any) => ({
      id: proj.id || `proj-${Date.now()}`,
      title: proj.title || '',
      description: proj.description || '',
      link: proj.link || proj.projectUrl || proj.imageUrl || '',
      techStack: proj.techStack || proj.technologies || [],
      featured: proj.featured || false,
      outcomes: proj.outcomes || '',
    })) as PortfolioEntry[],
    careerInterests: initialData?.careerInterests || [],
  });

  // CV Sections with drag-and-drop
  const [sections, setSections] = useState<CVSection[]>([
    { id: 'personal', type: 'personal', title: 'Personal Information', order: 0, visible: true },
    { id: 'summary', type: 'summary', title: 'Professional Summary', order: 1, visible: true },
    { id: 'experience', type: 'experience', title: 'Work Experience', order: 2, visible: true },
    { id: 'education', type: 'education', title: 'Education', order: 3, visible: true },
    { id: 'skills', type: 'skills', title: 'Skills', order: 4, visible: true },
    { id: 'portfolio', type: 'portfolio', title: 'Portfolio Projects', order: 5, visible: true },
    { id: 'certifications', type: 'certifications', title: 'Certifications', order: 6, visible: true },
    { id: 'languages', type: 'languages', title: 'Languages', order: 7, visible: true },
  ]);

  const careerInterestOptions = [
    'Internships',
    'Graduate trainee programs',
    'Full-time jobs',
    'Part-time roles',
    'Temporary roles',
    'Remote opportunities',
  ];

  // Real-time sync for skills and certificates - Merge instead of replace
  // Use a ref to track if we've done initial sync to prevent overwriting manual additions
  const skillsInitializedRef = useRef(false);
  const formDataInitializedRef = useRef(false);
  
  // Sync initialData to formData when it loads from Firebase (but preserve user edits)
  useEffect(() => {
    if (!initialData) return;
    
    // Check if formData is empty (first load or after navigation)
    setFormData(prev => {
      const isFormDataEmpty = !prev.displayName && !prev.email && !prev.firstName && !prev.lastName;
      
      // Only sync if formData is empty (first load or after navigation)
      if (isFormDataEmpty) {
        // Initialize from initialData
        return {
        displayName: initialData?.displayName || '',
        firstName: initialData?.firstName || '',
        lastName: initialData?.lastName || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        location: initialData?.location || '',
        city: initialData?.city || '',
        country: initialData?.country || '',
        profilePicture: initialData?.profilePicture || '',
        professionalSummary: initialData?.professionalSummary || initialData?.bio || '',
        bio: initialData?.bio || '',
        socialLinks: initialData?.socialLinks || {
          linkedin: '',
          github: '',
          twitter: '',
          portfolio: '',
        },
        education: (initialData?.education || []).map((edu: any) => ({
          id: edu.id || `edu-${Date.now()}-${Math.random()}`,
          institution: edu.institution || edu.school || '',
          degree: edu.degree || '',
          fieldOfStudy: edu.fieldOfStudy || edu.field || '',
          startDate: edu.startDate || '',
          endDate: edu.endDate || '',
          isCurrent: edu.isCurrent || edu.current || false,
          description: edu.description || '',
          gpa: edu.gpa || '',
          achievements: edu.achievements || [],
        })) as EducationEntry[],
        experience: (initialData?.experience || []).map((exp: any) => ({
          id: exp.id || `exp-${Date.now()}-${Math.random()}`,
          company: exp.company || '',
          position: exp.position || exp.title || '',
          location: exp.location || '',
          startDate: exp.startDate || '',
          endDate: exp.endDate || '',
          isCurrent: exp.isCurrent || exp.current || false,
          description: exp.description || exp.responsibilities || '',
          achievements: exp.achievements || [],
          technologies: exp.technologies || [],
        })) as ExperienceEntry[],
        skills: (initialData?.skills || []).map((skill: any, index: number) => ({
          id: typeof skill === 'string' ? `skill-${index}` : (skill.id || `skill-${index}`),
          name: typeof skill === 'string' ? skill : (skill.name || skill),
          proficiency: typeof skill === 'string' ? 'Intermediate' : (skill.proficiency || 'Intermediate'),
          category: typeof skill === 'string' ? 'technical' : (skill.category || 'technical'),
        })) as SkillEntry[],
        languages: (initialData?.languages || []).map((lang: any, index: number) => ({
          id: lang.id || `lang-${index}`,
          name: typeof lang === 'string' ? lang : (lang.name || lang.language || ''),
          proficiency: typeof lang === 'string' ? 'Intermediate' : (lang.proficiency || 'Intermediate'),
        })) as LanguageEntry[],
        certifications: (initialData?.certifications || []).map((cert: any) => ({
          id: cert.id || `cert-${Date.now()}`,
          name: cert.name || cert.certificateType || '',
          issuer: cert.issuer || 'Issuing Organization',
          issueDate: cert.issueDate || (cert.submittedAt?.toDate?.()?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]),
          expiryDate: cert.expiryDate || '',
          credentialId: cert.credentialId || cert.id,
          credentialUrl: cert.credentialUrl || cert.fileUrl || '',
        })) as CertificationEntry[],
        portfolio: (initialData?.portfolio || []).map((proj: any) => ({
          id: proj.id || `proj-${Date.now()}`,
          title: proj.title || '',
          description: proj.description || '',
          link: proj.link || proj.projectUrl || proj.imageUrl || '',
          techStack: proj.techStack || proj.technologies || [],
          featured: proj.featured || false,
          outcomes: proj.outcomes || '',
        })) as PortfolioEntry[],
        careerInterests: initialData?.careerInterests || [],
      };
      }
      
      // If formData has data, keep it (preserve user edits)
      return prev;
    });
  }, [initialData]);
  
  useEffect(() => {
    if (skills && skills.length > 0) {
      const transformedSkills = skills.map((skill: any) => ({
        id: skill.id || `skill-${Date.now()}-${Math.random()}`,
        name: skill.name || skill.skillName || skill,
        proficiency: skill.proficiency || skill.proficiencyLevel || 'Intermediate',
        category: skill.category || 'technical',
      }));
      
      setFormData(prev => {
        // Only set skills if formData.skills is empty (initial load)
        if (prev.skills.length === 0 && !skillsInitializedRef.current) {
          skillsInitializedRef.current = true;
          return {
            ...prev,
            skills: transformedSkills,
          };
        }
        // Otherwise, merge: keep manually added skills and add new ones from props
        const existingSkillNames = new Set(prev.skills.map((s: any) => s.name?.toLowerCase().trim()));
        const newSkills = transformedSkills.filter((skill: any) => {
          const skillName = skill.name?.toLowerCase().trim();
          return skillName && !existingSkillNames.has(skillName);
        });
        
        // Only update if there are actually new skills to add
        if (newSkills.length > 0) {
          return {
            ...prev,
            skills: [...prev.skills, ...newSkills],
          };
        }
        return prev;
      });
    }
    // Don't clear skills if props become empty - user might have manually added skills
  }, [skills]);

  useEffect(() => {
    if (certificates && certificates.length > 0) {
      const transformedCerts = certificates.map((cert: any) => ({
        id: cert.id || `cert-${Date.now()}`,
        name: cert.name || cert.certificateName || cert.certificateType || '',
        issuer: cert.issuer || cert.issuingOrganization || 'Issuing Organization',
        issueDate: cert.issueDate || cert.completionDate || (cert.submittedAt?.toDate?.()?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]),
        expiryDate: cert.expiryDate || '',
        credentialId: cert.credentialId || cert.id,
        credentialUrl: cert.credentialUrl || cert.fileUrl || cert.linkUrl || '',
      }));
      
      setFormData(prev => ({
        ...prev,
        certifications: transformedCerts,
      }));
    }
  }, [certificates]);

  // Profile completion
  const profileCompletion = useMemo(() => {
    const fields = [
      formData.displayName,
      formData.email,
      formData.professionalSummary || formData.bio,
      formData.skills.length > 0,
      formData.education.length > 0,
      formData.experience.length > 0,
      formData.location,
    ];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  }, [formData]);

  // Auto-save to Firebase - disabled to prevent conflicts with manual save
  // Manual save button should be used instead
  // useEffect(() => {
  //   if (!currentUser || !formData.displayName) return;

  //   const autoSaveTimer = setTimeout(async () => {
  //     try {
  //       await updateDoc(doc(db, 'profiles', currentUser.uid), {
  //         ...formData,
  //         updatedAt: serverTimestamp(),
  //       });
  //     } catch (error) {
  //       console.error('Auto-save error:', error);
  //     }
  //   }, 2000); // Auto-save after 2 seconds of inactivity

  //   return () => clearTimeout(autoSaveTimer);
  // }, [formData, currentUser]);

  // Generate AI suggestions with timeout
  const generateAISuggestions = useCallback(async () => {
    if (!currentUser || aiLoading) return;
    setAiLoading(true);
    
    // Helper function to create timeout promise
    const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
        ),
      ]);
    };

    // Generate fallback suggestions
    const generateFallbackSuggestions = (): string[] => {
      const fallback: string[] = [];
      if (!formData.professionalSummary && !formData.bio) {
        fallback.push(language === 'sw' 
          ? 'Ongeza muhtasari wa kitaalamu (mistari 3-4) unaoonyesha ujuzi wako mkuu na jukumu lengwa.'
          : 'Add a concise professional summary (3-4 lines) that highlights your top strengths and target role.');
      }
      if (!formData.experience.length) {
        fallback.push(language === 'sw'
          ? 'Ongeza angalau uzoefu mmoja na ongeza nambari za athari (mfano: kuongeza watumiaji kwa 15%).'
          : 'Add at least one experience entry and quantify impact (e.g., increased users by 15%).');
      }
      if (!formData.education.length) {
        fallback.push(language === 'sw'
          ? 'Ongeza elimu yako ya hivi karibuni na tarehe za kuanza/mwisho na mafanikio yoyote muhimu.'
          : 'Add your most recent education with start/end dates and any key achievements.');
      }
      if (!formData.skills.length) {
        fallback.push(language === 'sw'
          ? 'Orodhesha ujuzi 6-10 unaohusika; uzigawanye kwa kiufundi/ujuzi wa kijamii/zana.'
          : 'List 6–10 relevant skills; group them by technical/soft/tools.');
      }
      if (!formData.languages.length) {
        fallback.push(language === 'sw'
          ? 'Ongeza lugha zako na ujuzi (Msingi/Kati/Kifluenti/Juu/Asili).'
          : 'Add your languages with proficiency (Basic/Intermediate/Fluent/Advanced/Native).');
      }
      if (!formData.certifications.length) {
        fallback.push(language === 'sw'
          ? 'Ongeza vyeti au tuzo na mtoaji na tarehe iliyopokelewa.'
          : 'Add certifications or awards with issuer and date earned.');
      }
      if (!formData.careerInterests?.length) {
        fallback.push(language === 'sw'
          ? 'Chagua maslahi ya kazi (mazoezi, kazi za muda kamili, kazi za mbali, nk) ili kuboresha kuendana.'
          : 'Select career interests (internships, full-time, remote, etc.) to improve matching.');
      }
      return fallback.length 
        ? fallback 
        : [language === 'sw' 
          ? 'Mwanzo mzuri! Fikiria kuongeza mafanikio yanayoweza kupimika ili kuimarisha CV yako.'
          : 'Great start! Consider adding measurable achievements to strengthen your CV.'];
    };

    try {
      const prompt = `Analyze this CV data and provide 3-5 specific, actionable suggestions to improve it for ATS (Applicant Tracking Systems) and recruiter appeal. Focus on:
- Missing key sections
- Quantifying achievements using STAR method
- Skill optimization
- Professional summary enhancement
- Industry-specific improvements

CV Data:
- Name: ${formData.displayName}
- Summary: ${formData.professionalSummary || formData.bio || 'Not provided'}
- Experience entries: ${formData.experience.length}
- Education entries: ${formData.education.length}
- Skills: ${formData.skills.length}
- Career field: ${initialData?.preferredCareerField || 'General'}

Provide suggestions in ${language === 'sw' ? 'Swahili' : 'English'}, be specific and actionable.`;

      // Add 15 second timeout to prevent hanging
      const response = await withTimeout(
        claudeService.generateResponse(
          prompt,
          {
            name: formData.displayName,
            skills: formData.skills.map(s => s.name),
            preferredCareerField: initialData?.preferredCareerField,
          },
          language
        ),
        15000 // 15 seconds timeout
      );

      // Parse suggestions (assuming they're separated by newlines or bullets)
      const suggestions = response
        .split(/\n|•|-\s*/)
        .map(s => s.trim())
        .filter(s => s.length > 10 && !s.match(/^(analyze|focus|provide|cv data)/i))
        .slice(0, 5);

      if (suggestions.length > 0) {
        setAiSuggestions(suggestions);
        setShowAISuggestions(true);
      } else {
        // If parsing failed, use fallback
        throw new Error('Failed to parse AI suggestions');
      }
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      // Always show fallback suggestions
      const fallback = generateFallbackSuggestions();
      setAiSuggestions(fallback);
      setShowAISuggestions(true);
      
      // Only show error toast if it's not a timeout (timeout is expected behavior)
      if (error instanceof Error && error.message === 'Request timeout') {
        toast.warning(language === 'sw' 
          ? 'AI inachukua muda mrefu. Mapendekezo ya msingi yametolewa.'
          : 'AI is taking too long. Showing basic suggestions.');
      } else {
        toast.error(language === 'sw' 
          ? 'AI haipatikani, mapendekezo ya msingi yametolewa' 
          : 'AI unavailable; showing basic suggestions.');
      }
    } finally {
      setAiLoading(false);
    }
  }, [formData, currentUser, language, initialData, aiLoading]);

  // Handle form field changes
  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleCareerInterest = (interest: string) => {
    setFormData(prev => {
      const exists = prev.careerInterests?.includes(interest);
      return {
        ...prev,
        careerInterests: exists
          ? prev.careerInterests.filter((i: string) => i !== interest)
          : [...(prev.careerInterests || []), interest],
      };
    });
  };

  const proficiencyToPercent = (proficiency: string) => {
    switch (proficiency) {
      case 'Beginner':
      case 'Basic':
        return 35;
      case 'Intermediate':
        return 65;
      case 'Advanced':
      case 'Fluent':
        return 85;
      case 'Expert':
      case 'Native':
        return 100;
      default:
        return 60;
    }
  };

  const handleNestedFieldChange = (field: string, index: number, subField: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field as keyof typeof prev].map((item: any, i: number) =>
        i === index ? { ...item, [subField]: value } : item
      ),
    }));
  };

  // Add/Remove entries
  const addEntry = (field: string, template: any) => {
    setFormData(prev => {
      const currentArray = prev[field as keyof typeof prev] as any[];
      // For skills, check if skill with same name already exists
      if (field === 'skills' && template.name) {
        const skillName = template.name.toLowerCase().trim();
        const exists = currentArray.some((s: any) => s.name?.toLowerCase().trim() === skillName);
        if (exists) {
          return prev; // Don't add duplicate
        }
      }
      return {
        ...prev,
        [field]: [...currentArray, { ...template, id: `${field}-${Date.now()}-${Math.random()}` }],
      };
    });
  };

  const removeEntry = (field: string, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field as keyof typeof prev] as any[]).filter((_, i) => i !== index),
    }));
  };

  const handleCertificationFileUpload = async (file: File, index: number) => {
    if (!currentUser || !file) return;
    const ext = file.name.split('.').pop();
    const path = `users/${currentUser.uid}/certifications/${Date.now()}.${ext}`;
    const storageReference = ref(storage, path);
    await uploadBytes(storageReference, file);
    const url = await getDownloadURL(storageReference);
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.map((cert, i) => (i === index ? { ...cert, credentialUrl: url } : cert)),
    }));
    toast.success('Certificate uploaded');
  };

  // Move section up/down
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;
    
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    newSections[index].order = index;
    newSections[targetIndex].order = targetIndex;
    
    setSections(newSections);
  };

  // Handle profile picture upload
  const handleProfilePictureUpload = async (file: File) => {
    if (!currentUser) return;

    try {
      const fileRef = ref(storage, `profile-pictures/${currentUser.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      
      handleFieldChange('profilePicture', url);
      toast.success(language === 'sw' ? 'Picha imepakiwa' : 'Picture uploaded');
      track('profile_viewed', { userId: currentUser.uid });
    } catch (error) {
      console.error('Error uploading picture:', error);
      toast.error(language === 'sw' ? 'Kosa la kupakia picha' : 'Error uploading picture');
    }
  };

  // Helper function to check if new page is needed
  const checkNewPage = (doc: jsPDF, currentY: number, requiredSpace: number): number => {
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    if (currentY + requiredSpace > pageHeight - margin) {
      doc.addPage();
      return 20;
    }
    return currentY;
  };

  // Helper function to draw section divider with style
  const drawSectionDivider = (doc: jsPDF, y: number, pageWidth: number, margin: number): number => {
    // Subtle background line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    return y + 5;
  };

  // Helper function to add styled section header with background
  const addSectionHeader = (doc: jsPDF, title: string, y: number, pageWidth: number, margin: number): number => {
    const headerHeight = 8;
    const accentColor = [59, 130, 246]; // Blue accent
    
    // Colored background box for header
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.roundedRect(margin, y - 6, pageWidth - (margin * 2), headerHeight, 2, 2, 'F');
    
    // White text on colored background
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 5, y);
    
    // Reset colors
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    return y + 6;
  };

  // Export to PDF with modern professional layout
  const handleExportPDF = async () => {
    if (!currentUser) return;

    setGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 25;
      const maxWidth = pageWidth - (margin * 2);
      let y = 25;

      // Professional Header with Photo and Full Name
      const photoSize = 50;
      const photoX = pageWidth - margin - photoSize;
      const photoY = y;
      
      // Add profile picture if available
      let imageAdded = false;
      if (formData.profilePicture) {
        try {
          let imgData: string | null = null;
          
          // Method 1: Check if image is already in DOM (from preview) - bypasses CORS
          try {
            const existingImg = document.querySelector(`img[src="${formData.profilePicture}"], img[src*="${formData.profilePicture.split('/').pop()}"]`) as HTMLImageElement;
            if (existingImg && existingImg.complete && existingImg.naturalWidth > 0) {
              const canvas = document.createElement('canvas');
              canvas.width = photoSize;
              canvas.height = photoSize;
              const ctx = canvas.getContext('2d');
              
              if (ctx) {
                ctx.beginPath();
                ctx.arc(photoSize / 2, photoSize / 2, photoSize / 2, 0, 2 * Math.PI);
                ctx.clip();
                ctx.drawImage(existingImg, 0, 0, photoSize, photoSize);
                imgData = canvas.toDataURL('image/jpeg', 0.9);
              }
            }
          } catch (domError) {
            console.warn('DOM method failed:', domError);
          }
          
          // Method 2: Try to load via fetch (handles CORS better)
          if (!imgData) {
            try {
              const response = await fetch(formData.profilePicture, {
                mode: 'cors',
                credentials: 'omit',
              });
              
              if (response.ok) {
                const blob = await response.blob();
                const reader = new FileReader();
                
                imgData = await new Promise<string>((resolve, reject) => {
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
              }
            } catch (fetchError) {
              console.warn('Fetch method failed, trying image element method:', fetchError);
            }
          }
          
          // Method 3: Use Image element if other methods failed
          if (!imgData) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            imgData = await new Promise<string>((resolve) => {
              const timeout = setTimeout(() => {
                console.warn('Image loading timeout');
                resolve('');
              }, 5000);
              
              img.onload = () => {
                clearTimeout(timeout);
                try {
                  const canvas = document.createElement('canvas');
                  canvas.width = photoSize;
                  canvas.height = photoSize;
                  const ctx = canvas.getContext('2d');
                  
                  if (ctx) {
                    ctx.beginPath();
                    ctx.arc(photoSize / 2, photoSize / 2, photoSize / 2, 0, 2 * Math.PI);
                    ctx.clip();
                    ctx.drawImage(img, 0, 0, photoSize, photoSize);
                    resolve(canvas.toDataURL('image/jpeg', 0.9));
                  } else {
                    resolve('');
                  }
                } catch (error) {
                  console.error('Error processing image:', error);
                  resolve('');
                }
              };
              
              img.onerror = () => {
                clearTimeout(timeout);
                console.error('Error loading image from URL:', formData.profilePicture);
                resolve('');
              };
              
              img.src = formData.profilePicture;
            });
          }
          
          // Add image to PDF if we got valid data
          if (imgData && imgData.length > 0) {
            // Add circular border
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(1.5);
            doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2 + 1, 'S');
            
            // Determine image format
            let format = 'JPEG';
            if (imgData.startsWith('data:image/png')) format = 'PNG';
            else if (imgData.startsWith('data:image/jpeg') || imgData.startsWith('data:image/jpg')) format = 'JPEG';
            
            // Add image to PDF
            doc.addImage(imgData, format, photoX, photoY, photoSize, photoSize, undefined, 'FAST');
            imageAdded = true;
          } else {
            console.warn('Could not load profile picture, using placeholder');
          }
        } catch (error) {
          console.error('Error processing profile picture:', error);
        }
      }
      
      // Draw placeholder if image wasn't added
      if (!imageAdded) {
        // Draw placeholder circle if no photo
        doc.setFillColor(230, 230, 230);
        doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(1);
        doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 'S');
        
        // Initial letter
        const initial = (formData.displayName || formData.firstName || 'U').charAt(0).toUpperCase();
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(150, 150, 150);
        const initialWidth = doc.getTextWidth(initial);
        doc.text(initial, photoX + (photoSize - initialWidth) / 2, photoY + photoSize / 2 + 8);
      }
      
      // Full Name - Build complete name from all available parts
      let fullName = '';
      if (formData.displayName) {
        fullName = formData.displayName;
        // If we also have first/last name and they're different, append them
        if (formData.firstName && formData.lastName) {
          const combinedName = `${formData.firstName} ${formData.lastName}`;
          if (combinedName.toLowerCase() !== formData.displayName.toLowerCase()) {
            fullName = `${formData.displayName} (${combinedName})`;
          }
        }
      } else if (formData.firstName && formData.lastName) {
        fullName = `${formData.firstName} ${formData.lastName}`;
      } else if (formData.firstName) {
        fullName = formData.firstName;
      } else if (formData.lastName) {
        fullName = formData.lastName;
      } else {
        fullName = 'Your Name';
      }
      
      // Name styling - positioned to the left of photo
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      const nameX = margin;
      const nameY = photoY + 15;
      
      // Split name if too long to fit
      const maxNameWidth = photoX - margin - 10;
      const nameWidth = doc.getTextWidth(fullName);
      if (nameWidth > maxNameWidth) {
        // Try to split at space
        const nameParts = fullName.split(' ');
        if (nameParts.length > 1) {
          let line1 = '';
          let line2 = '';
          for (let i = 0; i < nameParts.length; i++) {
            const testLine = line1 ? `${line1} ${nameParts[i]}` : nameParts[i];
            if (doc.getTextWidth(testLine) <= maxNameWidth) {
              line1 = testLine;
            } else {
              line2 = nameParts.slice(i).join(' ');
              break;
            }
          }
          doc.text(line1, nameX, nameY);
          if (line2) {
            doc.text(line2, nameX, nameY + 10);
          }
        } else {
          // Single word, just truncate or use smaller font
          doc.setFontSize(24);
          doc.text(fullName.substring(0, 30), nameX, nameY);
        }
      } else {
        doc.text(fullName, nameX, nameY);
      }
      
      // Accent line under name
      const actualNameWidth = Math.min(nameWidth, maxNameWidth);
      doc.setDrawColor(70, 130, 180); // Steel blue accent line
      doc.setLineWidth(1.5);
      const lineY = nameWidth > maxNameWidth ? nameY + 13 : nameY + 3;
      doc.line(nameX, lineY, nameX + actualNameWidth, lineY);
      
      y = photoY + photoSize + 15;

      // Contact Information - Styled box layout
      const contactItems: Array<{label: string, value: string}> = [];
      if (formData.email) contactItems.push({ label: 'Email', value: formData.email });
      if (formData.phone) contactItems.push({ label: 'Phone', value: formData.phone });
      const locationText = formData.location || 
        (formData.city && formData.country ? `${formData.city}, ${formData.country}` : 
         formData.city || formData.country || '');
      if (locationText) contactItems.push({ label: 'Location', value: locationText });
      
      // Social Links
      if (formData.socialLinks) {
        if (formData.socialLinks.linkedin) contactItems.push({ label: 'LinkedIn', value: formData.socialLinks.linkedin });
        if (formData.socialLinks.github) contactItems.push({ label: 'GitHub', value: formData.socialLinks.github });
        if (formData.socialLinks.portfolio) contactItems.push({ label: 'Portfolio', value: formData.socialLinks.portfolio });
        if (formData.socialLinks.twitter) contactItems.push({ label: 'Twitter', value: formData.socialLinks.twitter });
      }

      if (contactItems.length > 0) {
        // Contact info box with light background
        const contactBoxHeight = Math.ceil(contactItems.length / 2) * 7 + 8;
        doc.setFillColor(245, 247, 250);
        doc.roundedRect(margin, y, maxWidth, contactBoxHeight, 3, 3, 'F');
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, y, maxWidth, contactBoxHeight, 3, 3, 'S');
        
        // Display contact info in two columns
        let contactY = y + 6;
        let contactX = margin + 5;
        const columnWidth = maxWidth / 2 - 5;
        
        contactItems.forEach((item, idx) => {
          if (idx > 0 && idx % 2 === 0) {
            contactY += 7;
            contactX = margin + 5;
          }
          if (idx % 2 === 1) {
            contactX = margin + maxWidth / 2;
          }
          
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(59, 130, 246);
          doc.text(`${item.label}:`, contactX, contactY);
          const labelWidth = doc.getTextWidth(`${item.label}: `);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60, 60, 60);
          doc.text(item.value, contactX + labelWidth, contactY);
        });
        
        y += contactBoxHeight + 10;
      }

      y = checkNewPage(doc, y, 30);
      doc.setTextColor(0, 0, 0);

      // Professional Summary with styled box
      if (formData.professionalSummary || formData.bio) {
        y = drawSectionDivider(doc, y, pageWidth, margin);
        y = addSectionHeader(doc, 'PROFESSIONAL SUMMARY', y, pageWidth, margin);
        
        const summary = formData.professionalSummary || formData.bio || '';
        const summaryLines = doc.splitTextToSize(summary, maxWidth - 10);
        const summaryBoxHeight = summaryLines.length * 5 + 10;
        
        // Summary content box
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, y, maxWidth, summaryBoxHeight, 2, 2, 'FD');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        doc.text(summaryLines, margin + 5, y + 6);
        y += summaryBoxHeight + 8;
        doc.setTextColor(0, 0, 0);
        y = checkNewPage(doc, y, 30);
      }

      // Work Experience
      if (formData.experience.length > 0) {
        y = drawSectionDivider(doc, y, pageWidth, margin);
        y = addSectionHeader(doc, 'WORK EXPERIENCE', y, pageWidth, margin);

        formData.experience.forEach((exp, idx) => {
          y = checkNewPage(doc, y, 50);
          
          // Experience entry box
          const entryPadding = 5;
          let entryHeight = 20; // Base height
          
          // Calculate content height
          if (exp.description) {
            const descLines = doc.splitTextToSize(exp.description, maxWidth - 20);
            entryHeight += descLines.length * 5;
          }
          if (exp.achievements && exp.achievements.length > 0) {
            entryHeight += 5 + exp.achievements.length * 5;
          }
          if (exp.technologies && exp.technologies.length > 0) {
            entryHeight += 5;
          }
          
          // Light background box for each experience
          doc.setFillColor(250, 250, 252);
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.5);
          doc.roundedRect(margin, y, maxWidth, entryHeight, 3, 3, 'FD');
          
          const contentY = y + entryPadding + 3;
          
          // Position and Company - Side by side with date
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 30, 30);
          const positionText = exp.position || 'Position';
          doc.text(positionText, margin + entryPadding, contentY);
          
          // Date badge on the right
          const startDate = formatDate(exp.startDate, 'short');
          const endDate = exp.isCurrent ? 'Present' : formatDate(exp.endDate, 'short');
          const dateRange = startDate && endDate ? `${startDate} - ${endDate}` : (startDate || endDate);
          if (dateRange) {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setFillColor(59, 130, 246);
            const dateWidth = doc.getTextWidth(dateRange) + 6;
            doc.roundedRect(pageWidth - margin - dateWidth - 3, contentY - 4, dateWidth, 6, 2, 2, 'F');
            doc.setTextColor(255, 255, 255);
            doc.text(dateRange, pageWidth - margin - dateWidth, contentY);
          }
          
          let currentY = contentY + 6;
          
          // Company and Location
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(59, 130, 246);
          const companyInfo = exp.location 
            ? `${exp.company} | ${exp.location}`
            : exp.company;
          doc.text(companyInfo, margin + entryPadding, currentY);
          currentY += 6;

          // Description
          if (exp.description) {
            doc.setTextColor(50, 50, 50);
            doc.setFontSize(9.5);
            const descLines = doc.splitTextToSize(exp.description, maxWidth - 20);
            doc.text(descLines, margin + entryPadding, currentY);
            currentY += descLines.length * 5 + 3;
          }

          // Achievements
          if (exp.achievements && exp.achievements.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(59, 130, 246);
            doc.text('Key Achievements:', margin + entryPadding, currentY);
            currentY += 5;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(60, 60, 60);
            exp.achievements.forEach(achievement => {
              if (achievement.trim()) {
                const achLines = doc.splitTextToSize(`• ${achievement}`, maxWidth - 25);
                doc.text(achLines, margin + entryPadding + 4, currentY);
                currentY += achLines.length * 4.5;
              }
            });
            currentY += 2;
          }

          // Technologies badge
          if (exp.technologies && exp.technologies.length > 0) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setFillColor(240, 240, 245);
            const techText = exp.technologies.join(' • ');
            const techWidth = doc.getTextWidth(techText) + 8;
            doc.roundedRect(margin + entryPadding, currentY - 3, Math.min(techWidth, maxWidth - 20), 5, 1, 1, 'F');
            doc.setTextColor(80, 80, 80);
            doc.text(techText, margin + entryPadding + 4, currentY);
            currentY += 6;
          }

          y = currentY + entryPadding;
          doc.setTextColor(0, 0, 0);
        });
        y += 5;
        y = checkNewPage(doc, y, 30);
      }

      // Education
      if (formData.education.length > 0) {
        y = drawSectionDivider(doc, y, pageWidth, margin);
        y = addSectionHeader(doc, 'EDUCATION', y, pageWidth, margin);

        formData.education.forEach((edu, idx) => {
          y = checkNewPage(doc, y, 40);

          // Education entry box
          const entryPadding = 5;
          let entryHeight = 25;
          if (edu.description) entryHeight += 15;
          if (edu.achievements && edu.achievements.length > 0) entryHeight += edu.achievements.length * 5;
          
          doc.setFillColor(250, 250, 252);
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.5);
          doc.roundedRect(margin, y, maxWidth, entryHeight, 3, 3, 'FD');
          
          const contentY = y + entryPadding + 3;

          // Degree
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 30, 30);
          doc.text(edu.degree || 'Degree', margin + entryPadding, contentY);
          
          // Date badge on the right
          const startDate = formatDate(edu.startDate, 'year');
          const endDate = edu.isCurrent ? 'Present' : formatDate(edu.endDate, 'year');
          const dateRange = startDate && endDate ? `${startDate} - ${endDate}` : (startDate || endDate);
          if (dateRange) {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setFillColor(59, 130, 246);
            const dateWidth = doc.getTextWidth(dateRange) + 6;
            doc.roundedRect(pageWidth - margin - dateWidth - 3, contentY - 4, dateWidth, 6, 2, 2, 'F');
            doc.setTextColor(255, 255, 255);
            doc.text(dateRange, pageWidth - margin - dateWidth, contentY);
          }
          
          let currentY = contentY + 6;

          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(59, 130, 246);
          
          // Institution and Field
          const institutionInfo = edu.fieldOfStudy
            ? `${edu.institution} | ${edu.fieldOfStudy}`
            : edu.institution;
          doc.text(institutionInfo, margin + entryPadding, currentY);
          currentY += 5;

          // GPA badge
          if (edu.gpa) {
            doc.setFillColor(240, 240, 245);
            doc.setFontSize(8);
            doc.setTextColor(80, 80, 80);
            const gpaText = `GPA: ${edu.gpa}`;
            const gpaWidth = doc.getTextWidth(gpaText) + 6;
            doc.roundedRect(margin + entryPadding, currentY - 3, gpaWidth, 5, 1, 1, 'F');
            doc.text(gpaText, margin + entryPadding + 3, currentY);
            currentY += 6;
          }

          // Description
          if (edu.description) {
            doc.setTextColor(50, 50, 50);
            doc.setFontSize(9);
            const descLines = doc.splitTextToSize(edu.description, maxWidth - 20);
            doc.text(descLines, margin + entryPadding, currentY);
            currentY += descLines.length * 4.5 + 2;
          }

          // Achievements
          if (edu.achievements && edu.achievements.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(59, 130, 246);
            doc.text('Achievements:', margin + entryPadding, currentY);
            currentY += 5;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(60, 60, 60);
            edu.achievements.forEach(achievement => {
              if (achievement.trim()) {
                const achLines = doc.splitTextToSize(`• ${achievement}`, maxWidth - 25);
                doc.text(achLines, margin + entryPadding + 4, currentY);
                currentY += achLines.length * 4.5;
              }
            });
            currentY += 2;
          }

          y = currentY + entryPadding;
          doc.setTextColor(0, 0, 0);
        });
        y += 5;
        y = checkNewPage(doc, y, 30);
      }

      // Skills
      if (formData.skills.length > 0) {
        y = drawSectionDivider(doc, y, pageWidth, margin);
        y = addSectionHeader(doc, 'SKILLS', y, pageWidth, margin);

        // Group skills by category
        const skillsByCategory = formData.skills.reduce((acc: any, skill) => {
          const category = skill.category || 'technical';
          if (!acc[category]) acc[category] = [];
          acc[category].push(skill);
          return acc;
        }, {});

        Object.entries(skillsByCategory).forEach(([category, skills]: [string, any]) => {
          y = checkNewPage(doc, y, 25);
          
          const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
          const skillsWithProficiency = skills.map((s: any) => {
            const proficiency = s.proficiency || 'Intermediate';
            return proficiency !== 'Intermediate' ? `${s.name} (${proficiency})` : s.name;
          });
          
          // Skills box for each category
          const skillsText = skillsWithProficiency.join(' • ');
          const skillsLines = doc.splitTextToSize(skillsText, maxWidth - 20);
          const boxHeight = skillsLines.length * 5 + 10;
          
          doc.setFillColor(250, 250, 252);
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.5);
          doc.roundedRect(margin, y, maxWidth, boxHeight, 3, 3, 'FD');
          
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(59, 130, 246);
          doc.text(`${categoryName}:`, margin + 5, y + 6);
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(60, 60, 60);
          doc.text(skillsLines, margin + 5, y + 12);
          y += boxHeight + 4;
        });
        y += 2;
        y = checkNewPage(doc, y, 30);
        doc.setTextColor(0, 0, 0);
      }

      // Languages
      if (formData.languages.length > 0) {
        y = drawSectionDivider(doc, y, pageWidth, margin);
        y = addSectionHeader(doc, 'LANGUAGES', y, pageWidth, margin);
        
        const languagesText = formData.languages
          .map(lang => `${lang.name} (${lang.proficiency})`)
          .join(' • ');
        const langLines = doc.splitTextToSize(languagesText, maxWidth - 20);
        const langBoxHeight = langLines.length * 5 + 10;
        
        doc.setFillColor(250, 250, 252);
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, y, maxWidth, langBoxHeight, 3, 3, 'FD');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text(langLines, margin + 5, y + 6);
        y += langBoxHeight + 5;
        doc.setTextColor(0, 0, 0);
        y = checkNewPage(doc, y, 30);
      }

      // Certifications
      if (formData.certifications.length > 0) {
        y = drawSectionDivider(doc, y, pageWidth, margin);
        y = addSectionHeader(doc, 'CERTIFICATIONS', y, pageWidth, margin);

        formData.certifications.forEach((cert, idx) => {
          y = checkNewPage(doc, y, 30);
          
          const certDetails: string[] = [];
          if (cert.issueDate) {
            certDetails.push(`Issued: ${formatDate(cert.issueDate, 'long')}`);
          }
          if (cert.expiryDate) {
            certDetails.push(`Expires: ${formatDate(cert.expiryDate, 'long')}`);
          }
          if (cert.credentialId) {
            certDetails.push(`ID: ${cert.credentialId}`);
          }
          
          const detailsText = certDetails.join(' | ');
          const detailsLines = doc.splitTextToSize(detailsText, maxWidth - 20);
          const certBoxHeight = 25 + detailsLines.length * 4;
          
          doc.setFillColor(250, 250, 252);
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.5);
          doc.roundedRect(margin, y, maxWidth, certBoxHeight, 3, 3, 'FD');
          
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 30, 30);
          doc.text(cert.name, margin + 5, y + 6);
          
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(59, 130, 246);
          doc.text(cert.issuer, margin + 5, y + 12);

          if (certDetails.length > 0) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            doc.setTextColor(80, 80, 80);
            doc.text(detailsLines, margin + 5, y + 18);
            doc.setFont('helvetica', 'normal');
          }

          y += certBoxHeight + 4;
          doc.setTextColor(0, 0, 0);
        });
        y += 5;
        y = checkNewPage(doc, y, 30);
      }

      // Portfolio Projects
      if (formData.portfolio.length > 0) {
        y = drawSectionDivider(doc, y, pageWidth, margin);
        y = addSectionHeader(doc, 'PORTFOLIO PROJECTS', y, pageWidth, margin);

        formData.portfolio.forEach((proj, idx) => {
          y = checkNewPage(doc, y, 40);
          
          let projHeight = 20;
          if (proj.description) {
            const descLines = doc.splitTextToSize(proj.description, maxWidth - 20);
            projHeight += descLines.length * 4.5;
          }
          if (proj.techStack && proj.techStack.length > 0) projHeight += 6;
          if (proj.outcomes) projHeight += 8;
          if (proj.link) projHeight += 5;
          
          doc.setFillColor(250, 250, 252);
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.5);
          doc.roundedRect(margin, y, maxWidth, projHeight, 3, 3, 'FD');
          
          const contentY = y + 5;
          
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 30, 30);
          let titleX = margin + 5;
          if (proj.featured) {
            doc.setFillColor(255, 193, 7);
            doc.circle(titleX + 3, contentY - 2, 2, 'F');
            titleX += 8;
          }
          doc.text(proj.title, titleX, contentY);
          
          let currentY = contentY + 6;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(50, 50, 50);
          
          if (proj.description) {
            const descLines = doc.splitTextToSize(proj.description, maxWidth - 20);
            doc.text(descLines, margin + 5, currentY);
            currentY += descLines.length * 4.5 + 3;
          }

          if (proj.techStack && proj.techStack.length > 0) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setFillColor(240, 240, 245);
            const techText = proj.techStack.join(' • ');
            const techWidth = doc.getTextWidth(techText) + 8;
            doc.roundedRect(margin + 5, currentY - 3, Math.min(techWidth, maxWidth - 20), 5, 1, 1, 'F');
            doc.setTextColor(80, 80, 80);
            doc.text(techText, margin + 9, currentY);
            currentY += 6;
          }

          if (proj.outcomes) {
            doc.setFontSize(9);
            doc.setTextColor(60, 60, 60);
            const outcomeLines = doc.splitTextToSize(`Outcomes: ${proj.outcomes}`, maxWidth - 20);
            doc.text(outcomeLines, margin + 5, currentY);
            currentY += outcomeLines.length * 4.5 + 2;
          }

          if (proj.link) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            doc.setTextColor(59, 130, 246);
            doc.text(`Link: ${proj.link}`, margin + 5, currentY);
            currentY += 4;
            doc.setFont('helvetica', 'normal');
          }

          y = currentY + 5;
          doc.setTextColor(0, 0, 0);
        });
        y += 5;
        y = checkNewPage(doc, y, 30);
      }

      // Career Interests
      if (formData.careerInterests && formData.careerInterests.length > 0) {
        y = drawSectionDivider(doc, y, pageWidth, margin);
        y = addSectionHeader(doc, 'CAREER INTERESTS', y, pageWidth, margin);
        
        const interestsText = formData.careerInterests.join(' • ');
        const interestLines = doc.splitTextToSize(interestsText, maxWidth - 20);
        const interestBoxHeight = interestLines.length * 5 + 10;
        
        doc.setFillColor(250, 250, 252);
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, y, maxWidth, interestBoxHeight, 3, 3, 'FD');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text(interestLines, margin + 5, y + 6);
        y += interestBoxHeight + 5;
        doc.setTextColor(0, 0, 0);
      }

      // Footer with generation date
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(
          `Generated on ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}`,
          margin,
          doc.internal.pageSize.height - 10
        );
      }

      doc.save(`${formData.displayName || 'CV'}-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success(language === 'sw' ? 'PDF imehamishwa' : 'PDF exported successfully');
      track('profile_viewed', { userId: currentUser.uid });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(language === 'sw' ? 'Kosa la kuzalisha PDF' : 'Error generating PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Generate shareable link
  const generateShareableLink = () => {
    if (!currentUser) return '';
    return `${window.location.origin}/cv/${currentUser.uid}`;
  };

  const handleCopyLink = () => {
    const link = generateShareableLink();
    navigator.clipboard.writeText(link);
    toast.success(language === 'sw' ? 'Kiungo kimeakiliwa' : 'Link copied to clipboard');
  };

  // Save profile - ensure data persists
  const handleSave = async () => {
    setSaving(true);
    try {
      // Save all form data including personal information
      const dataToSave = {
        ...formData,
        // Ensure all personal info fields are included
        displayName: formData.displayName,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        city: formData.city,
        country: formData.country,
        profilePicture: formData.profilePicture,
        professionalSummary: formData.professionalSummary || formData.bio,
        bio: formData.bio || formData.professionalSummary,
        socialLinks: formData.socialLinks,
        education: formData.education,
        experience: formData.experience,
        skills: formData.skills,
        languages: formData.languages,
        certifications: formData.certifications,
        portfolio: formData.portfolio,
        careerInterests: formData.careerInterests,
      };
      
      await onSave(dataToSave);
      
      // Also save to Firebase profiles collection directly to ensure persistence
      if (currentUser) {
        try {
          // Use setDoc with merge to handle non-existent documents
          await setDoc(doc(db, 'profiles', currentUser.uid), {
            ...dataToSave,
            userId: currentUser.uid,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        } catch (firebaseError) {
          console.warn('Firebase direct save warning:', firebaseError);
          // Don't fail the save if this has an issue
        }
      }
      
      toast.success(language === 'sw' ? 'Wasifu umehifadhiwa' : 'Profile saved successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(language === 'sw' ? 'Kosa la kuhifadhi' : 'Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  // Helper function to safely format dates
  const formatDate = (dateString: string | undefined, format: 'short' | 'long' | 'year' = 'short'): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      if (format === 'year') {
        return date.getFullYear().toString();
      } else if (format === 'long') {
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
    } catch {
      return '';
    }
  };

  // Render CV Preview
  const renderCVPreview = () => (
    <div className="bg-white p-8 shadow-lg max-w-4xl mx-auto" style={{ minHeight: '1123px' }}>
      {/* Header */}
      <div className="text-center mb-6 border-b pb-4">
        <div className="flex items-center justify-center gap-4 mb-4">
          {formData.profilePicture && (
            <Avatar className="h-24 w-24">
              <AvatarImage src={formData.profilePicture} />
              <AvatarFallback className="text-2xl">
                {formData.displayName?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          )}
          <div>
            <h1 className="text-3xl font-bold">{formData.displayName || 'Your Name'}</h1>
            {formData.firstName && formData.lastName && (
              <p className="text-sm text-gray-500 mt-1">
                {formData.firstName} {formData.lastName}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-3 mt-2 text-sm text-gray-600">
          {formData.email && (
            <div className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              <span>{formData.email}</span>
            </div>
          )}
          {formData.phone && (
            <div className="flex items-center gap-1">
              <Phone className="h-4 w-4" />
              <span>{formData.phone}</span>
            </div>
          )}
          {(formData.location || formData.city || formData.country) && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>
                {formData.location || 
                 (formData.city && formData.country ? `${formData.city}, ${formData.country}` : 
                  formData.city || formData.country || '')}
              </span>
            </div>
          )}
        </div>

        {/* Social Links */}
        {(formData.socialLinks?.linkedin || formData.socialLinks?.github || 
          formData.socialLinks?.portfolio || formData.socialLinks?.twitter) && (
          <div className="flex flex-wrap justify-center gap-3 mt-3">
            {formData.socialLinks.linkedin && (
              <a 
                href={formData.socialLinks.linkedin} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
              >
                <LinkIcon className="h-4 w-4" />
                LinkedIn
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {formData.socialLinks.github && (
              <a 
                href={formData.socialLinks.github} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-gray-700 hover:text-gray-900 text-sm"
              >
                <Code className="h-4 w-4" />
                GitHub
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {formData.socialLinks.portfolio && (
              <a 
                href={formData.socialLinks.portfolio} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-purple-600 hover:text-purple-800 text-sm"
              >
                <Globe className="h-4 w-4" />
                Portfolio
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {formData.socialLinks.twitter && (
              <a 
                href={formData.socialLinks.twitter} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-600 text-sm"
              >
                <LinkIcon className="h-4 w-4" />
                Twitter
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Professional Summary */}
      {(formData.professionalSummary || formData.bio) && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2 border-b pb-2 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Professional Summary
          </h2>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {formData.professionalSummary || formData.bio}
          </p>
        </div>
      )}

      {/* Work Experience */}
      {formData.experience.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3 border-b pb-2 flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Work Experience
          </h2>
          {formData.experience.map((exp, idx) => (
            <div key={exp.id || idx} className="mb-5 pb-4 border-b last:border-b-0">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{exp.position}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-gray-700 font-medium">{exp.company}</p>
                    {exp.location && (
                      <>
                        <span className="text-gray-400">•</span>
                        <p className="text-sm text-gray-600">{exp.location}</p>
                      </>
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-500 whitespace-nowrap">
                  {formatDate(exp.startDate, 'short')} - {exp.isCurrent 
                    ? 'Present' 
                    : formatDate(exp.endDate, 'short')}
                </span>
              </div>
              
              {exp.description && (
                <p className="text-sm text-gray-700 mt-2 leading-relaxed whitespace-pre-wrap">
                  {exp.description}
                </p>
              )}

              {exp.achievements && exp.achievements.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-gray-800 mb-1">Key Achievements:</p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-2">
                    {exp.achievements.map((ach, i) => (
                      ach.trim() && <li key={i}>{ach}</li>
                    ))}
                  </ul>
                </div>
              )}

              {exp.technologies && exp.technologies.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-gray-800 mb-1">Technologies:</p>
                  <div className="flex flex-wrap gap-1">
                    {exp.technologies.map((tech, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {formData.education.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3 border-b pb-2 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Education
          </h2>
          {formData.education.map((edu, idx) => (
            <div key={edu.id || idx} className="mb-4 pb-3 border-b last:border-b-0">
              <h3 className="font-semibold text-lg">{edu.degree}</h3>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-gray-700">{edu.institution}</p>
                {edu.fieldOfStudy && (
                  <>
                    <span className="text-gray-400">•</span>
                    <p className="text-sm text-gray-600">{edu.fieldOfStudy}</p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xs text-gray-500">
                  {formatDate(edu.startDate, 'year')} - {edu.isCurrent 
                    ? 'Present' 
                    : formatDate(edu.endDate, 'year')}
                </p>
                {edu.gpa && (
                  <>
                    <span className="text-gray-400">•</span>
                    <p className="text-xs text-gray-600">GPA: {edu.gpa}</p>
                  </>
                )}
              </div>
              {edu.description && (
                <p className="text-sm text-gray-700 mt-2 leading-relaxed whitespace-pre-wrap">
                  {edu.description}
                </p>
              )}
              {edu.achievements && edu.achievements.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-semibold text-gray-800 mb-1">Achievements:</p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-2">
                    {edu.achievements.map((ach, i) => (
                      ach.trim() && <li key={i}>{ach}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {formData.skills.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3 border-b pb-2 flex items-center gap-2">
            <Code className="h-5 w-5" />
            Skills
          </h2>
          
          {/* Group skills by category */}
          {(() => {
            const skillsByCategory = formData.skills.reduce((acc: any, skill) => {
              const category = skill.category || 'technical';
              if (!acc[category]) acc[category] = [];
              acc[category].push(skill);
              return acc;
            }, {});

            return Object.entries(skillsByCategory).map(([category, skills]: [string, any]) => (
              <div key={category} className="mb-3">
                <p className="text-sm font-semibold text-gray-800 mb-2 capitalize">
                  {category} Skills:
                </p>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill: any, idx: number) => (
                    <Badge 
                      key={skill.id || idx} 
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {skill.name}
                      {skill.proficiency && skill.proficiency !== 'Intermediate' && (
                        <span className="text-xs opacity-75">({skill.proficiency})</span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {/* Languages */}
      {formData.languages.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3 border-b pb-2 flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Languages
          </h2>
          <div className="flex flex-wrap gap-2">
            {formData.languages.map((lang, idx) => (
              <Badge key={lang.id || idx} variant="outline" className="text-sm">
                {lang.name} <span className="text-xs opacity-75">({lang.proficiency})</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {formData.certifications.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3 border-b pb-2 flex items-center gap-2">
            <Award className="h-5 w-5" />
            Certifications
          </h2>
          {formData.certifications.map((cert, idx) => (
            <div key={cert.id || idx} className="mb-4 pb-3 border-b last:border-b-0">
              <h3 className="font-semibold text-base">{cert.name}</h3>
              <p className="text-sm text-gray-700 mt-1">{cert.issuer}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                {cert.issueDate && (
                  <span>
                    Issued: {formatDate(cert.issueDate, 'long')}
                  </span>
                )}
                {cert.expiryDate && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span>
                      Expires: {formatDate(cert.expiryDate, 'long')}
                    </span>
                  </>
                )}
              </div>
              {cert.credentialId && (
                <p className="text-xs text-gray-500 mt-1">
                  Credential ID: {cert.credentialId}
                </p>
              )}
              {cert.credentialUrl && (
                <a 
                  href={cert.credentialUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-flex items-center gap-1"
                >
                  View Certificate
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Portfolio Projects */}
      {formData.portfolio.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3 border-b pb-2 flex items-center gap-2">
            <Target className="h-5 w-5" />
            Portfolio Projects
          </h2>
          {formData.portfolio.map((proj, idx) => (
            <div key={proj.id || idx} className="mb-4 pb-4 border-b last:border-b-0">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-lg">{proj.title}</h3>
                {proj.featured && (
                  <Badge variant="default" className="text-xs">Featured</Badge>
                )}
              </div>
              {proj.description && (
                <p className="text-sm text-gray-700 mt-1 leading-relaxed whitespace-pre-wrap">
                  {proj.description}
                </p>
              )}
              {proj.techStack && proj.techStack.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-semibold text-gray-800 mb-1">Technologies:</p>
                  <div className="flex flex-wrap gap-1">
                    {proj.techStack.map((tech, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {proj.outcomes && (
                <div className="mt-2">
                  <p className="text-sm font-semibold text-gray-800 mb-1">Outcomes:</p>
                  <p className="text-sm text-gray-700">{proj.outcomes}</p>
                </div>
              )}
              {proj.link && (
                <a 
                  href={proj.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-flex items-center gap-1"
                >
                  View Project
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Career Interests */}
      {formData.careerInterests && formData.careerInterests.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3 border-b pb-2 flex items-center gap-2">
            <Target className="h-5 w-5" />
            Career Interests
          </h2>
          <div className="flex flex-wrap gap-2">
            {formData.careerInterests.map((interest, idx) => (
              <Badge key={idx} variant="secondary">
                {interest}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            {language === 'sw' ? 'Kijenzi cha CV na Wasifu' : 'Digital CV & Profile Builder'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {language === 'sw' 
              ? 'Jenga wasifu wako wa kitaalamu na CV'
              : 'Build your professional profile and CV'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setActiveTab(activeTab === 'edit' ? 'preview' : 'edit')}
          >
            <Eye className="h-4 w-4 mr-2" />
            {activeTab === 'edit' ? (language === 'sw' ? 'Onyesha' : 'Preview') : (language === 'sw' ? 'Hariri' : 'Edit')}
          </Button>
          <Button
            variant="outline"
            onClick={handleCopyLink}
          >
            <LinkIcon className="h-4 w-4 mr-2" />
            {language === 'sw' ? 'Nakili Kiungo' : 'Copy Link'}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={generatingPDF}
          >
            {generatingPDF ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {language === 'sw' ? 'Pakua PDF' : 'Export PDF'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {language === 'sw' ? 'Hifadhi' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Profile Completion */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <Label>{language === 'sw' ? 'Ukamilifu wa Wasifu' : 'Profile Completion'}</Label>
            <Badge variant={profileCompletion >= 80 ? 'default' : 'secondary'}>
              {profileCompletion}%
            </Badge>
          </div>
          <Progress value={profileCompletion} className="h-2" />
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      {showAISuggestions && aiSuggestions.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {language === 'sw' ? 'Mapendekezo ya AI' : 'AI Suggestions'}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAISuggestions(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {aiSuggestions.map((suggestion, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {activeTab === 'edit' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Sections & Template */}
          <div className="space-y-4">
            {/* Template Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{language === 'sw' ? 'Chagua Kiolezo' : 'Choose Template'}</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedTemplate} onValueChange={(value: CVTemplate) => setSelectedTemplate(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modern">Modern</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                    <SelectItem value="creative">Creative</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Section Ordering */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{language === 'sw' ? 'Mpangilio wa Sehemu' : 'Section Order'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sections.map((section, index) => (
                  <div
                    key={section.id}
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{section.title}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveSection(index, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveSection(index, 'down')}
                        disabled={index === sections.length - 1}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      <Switch
                        checked={section.visible}
                        onCheckedChange={(checked) => {
                          setSections(prev =>
                            prev.map(s => s.id === section.id ? { ...s, visible: checked } : s)
                          );
                        }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* AI Suggestions Button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={generateAISuggestions}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {language === 'sw' ? 'Inapakia...' : 'Loading...'}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {language === 'sw' ? 'Pata Mapendekezo ya AI' : 'Get AI Suggestions'}
                </>
              )}
            </Button>

          </div>

          {/* Main Content - Form */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal">{language === 'sw' ? 'Binafsi' : 'Personal'}</TabsTrigger>
                <TabsTrigger value="experience">{language === 'sw' ? 'Uzoefu' : 'Experience'}</TabsTrigger>
                <TabsTrigger value="education">{language === 'sw' ? 'Elimu' : 'Education'}</TabsTrigger>
                <TabsTrigger value="skills">{language === 'sw' ? 'Ujuzi' : 'Skills'}</TabsTrigger>
              </TabsList>

              {/* Personal Information Tab */}
              <TabsContent value="personal" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{language === 'sw' ? 'Taarifa Binafsi' : 'Personal Information'}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Profile Picture */}
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={formData.profilePicture} />
                        <AvatarFallback>
                          {formData.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Label htmlFor="profile-picture">{language === 'sw' ? 'Picha ya Wasifu' : 'Profile Picture'}</Label>
                        <Input
                          id="profile-picture"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleProfilePictureUpload(file);
                          }}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{language === 'sw' ? 'Jina Kamili' : 'Full Name'} *</Label>
                        <Input
                          value={formData.displayName}
                          onChange={(e) => handleFieldChange('displayName', e.target.value)}
                          placeholder={language === 'sw' ? 'Jina lako kamili' : 'Your full name'}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{language === 'sw' ? 'Barua Pepe' : 'Email'} *</Label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleFieldChange('email', e.target.value)}
                          placeholder="your@email.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{language === 'sw' ? 'Simu' : 'Phone'}</Label>
                        <Input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleFieldChange('phone', e.target.value)}
                          placeholder="+1234567890"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{language === 'sw' ? 'Eneo' : 'Location'}</Label>
                        <Input
                          value={formData.location}
                          onChange={(e) => handleFieldChange('location', e.target.value)}
                          placeholder={language === 'sw' ? 'Jiji, Nchi' : 'City, Country'}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{language === 'sw' ? 'Muhtasari wa Kitaalamu' : 'Professional Summary'} *</Label>
                      <Textarea
                        value={formData.professionalSummary}
                        onChange={(e) => handleFieldChange('professionalSummary', e.target.value)}
                        placeholder={language === 'sw' ? 'Eleza kwa ufupi kuhusu ujuzi wako na malengo...' : 'Briefly describe your expertise and career goals...'}
                        rows={4}
                        maxLength={500}
                      />
                      <p className="text-xs text-muted-foreground">
                        {formData.professionalSummary.length}/500 {language === 'sw' ? 'herufi' : 'characters'}
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>{language === 'sw' ? 'Viungo vya Kijamii' : 'Social Links'}</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">LinkedIn</Label>
                          <Input
                            value={formData.socialLinks.linkedin}
                            onChange={(e) => handleFieldChange('socialLinks', { ...formData.socialLinks, linkedin: e.target.value })}
                            placeholder="https://linkedin.com/in/yourprofile"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">GitHub</Label>
                          <Input
                            value={formData.socialLinks.github}
                            onChange={(e) => handleFieldChange('socialLinks', { ...formData.socialLinks, github: e.target.value })}
                            placeholder="https://github.com/yourusername"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Portfolio</Label>
                          <Input
                            value={formData.socialLinks.portfolio}
                            onChange={(e) => handleFieldChange('socialLinks', { ...formData.socialLinks, portfolio: e.target.value })}
                            placeholder="https://yourportfolio.com"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Experience Tab */}
              <TabsContent value="experience" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{language === 'sw' ? 'Uzoefu wa Kazi' : 'Work Experience'}</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addEntry('experience', {
                          company: '',
                          position: '',
                          location: '',
                          startDate: new Date().toISOString().split('T')[0],
                          endDate: '',
                          isCurrent: false,
                          description: '',
                          achievements: [],
                          technologies: [],
                        })}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {language === 'sw' ? 'Ongeza' : 'Add'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {formData.experience.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {language === 'sw' ? 'Bofya "Ongeza" kuongeza uzoefu wako wa kazi' : 'Click "Add" to add your work experience'}
                      </p>
                    )}
                    {formData.experience.map((exp, index) => (
                      <Card key={exp.id} className="border-2">
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>{language === 'sw' ? 'Kampuni' : 'Company'} *</Label>
                                <Input
                                  value={exp.company}
                                  onChange={(e) => handleNestedFieldChange('experience', index, 'company', e.target.value)}
                                  placeholder={language === 'sw' ? 'Jina la kampuni' : 'Company name'}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{language === 'sw' ? 'Cheo' : 'Position'} *</Label>
                                <Input
                                  value={exp.position}
                                  onChange={(e) => handleNestedFieldChange('experience', index, 'position', e.target.value)}
                                  placeholder={language === 'sw' ? 'Cheo chako' : 'Your position'}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{language === 'sw' ? 'Eneo' : 'Location'}</Label>
                                <Input
                                  value={exp.location}
                                  onChange={(e) => handleNestedFieldChange('experience', index, 'location', e.target.value)}
                                  placeholder={language === 'sw' ? 'Jiji, Nchi' : 'City, Country'}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{language === 'sw' ? 'Tarehe ya Kuanza' : 'Start Date'} *</Label>
                                <Input
                                  type="date"
                                  value={exp.startDate}
                                  onChange={(e) => handleNestedFieldChange('experience', index, 'startDate', e.target.value)}
                                />
                              </div>
                              {!exp.isCurrent && (
                                <div className="space-y-2">
                                  <Label>{language === 'sw' ? 'Tarehe ya Mwisho' : 'End Date'}</Label>
                                  <Input
                                    type="date"
                                    value={exp.endDate}
                                    onChange={(e) => handleNestedFieldChange('experience', index, 'endDate', e.target.value)}
                                  />
                                </div>
                              )}
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={exp.isCurrent}
                                  onCheckedChange={(checked) => handleNestedFieldChange('experience', index, 'isCurrent', checked)}
                                />
                                <Label>{language === 'sw' ? 'Kazi ya Sasa' : 'Current Position'}</Label>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>{language === 'sw' ? 'Maelezo' : 'Description'} *</Label>
                              <Textarea
                                value={exp.description}
                                onChange={(e) => handleNestedFieldChange('experience', index, 'description', e.target.value)}
                                placeholder={language === 'sw' ? 'Eleza majukumu yako na mafanikio (tumia mbinu ya STAR)' : 'Describe your responsibilities and achievements (use STAR method)'}
                                rows={4}
                              />
                              <p className="text-xs text-muted-foreground">
                                💡 {language === 'sw' ? 'Tip: Ongeza nambari na asilimia (mfano: "Kuongeza mauzo kwa 25%")' : 'Tip: Add numbers and percentages (e.g., "Increased sales by 25%")'}
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label>{language === 'sw' ? 'Mafanikio' : 'Key Achievements'}</Label>
                              {exp.achievements.map((ach, achIdx) => (
                                <div key={achIdx} className="flex gap-2">
                                  <Input
                                    value={ach}
                                    onChange={(e) => {
                                      const newAchievements = [...exp.achievements];
                                      newAchievements[achIdx] = e.target.value;
                                      handleNestedFieldChange('experience', index, 'achievements', newAchievements);
                                    }}
                                    placeholder={language === 'sw' ? 'Mafanikio yako' : 'Your achievement'}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      const newAchievements = exp.achievements.filter((_, i) => i !== achIdx);
                                      handleNestedFieldChange('experience', index, 'achievements', newAchievements);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  handleNestedFieldChange('experience', index, 'achievements', [...exp.achievements, '']);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                {language === 'sw' ? 'Ongeza Mafanikio' : 'Add Achievement'}
                              </Button>
                            </div>

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeEntry('experience', index)}
                              className="w-full"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {language === 'sw' ? 'Futa Uzoefu' : 'Remove Experience'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Education Tab */}
              <TabsContent value="education" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{language === 'sw' ? 'Elimu' : 'Education'}</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addEntry('education', {
                          institution: '',
                          degree: '',
                          fieldOfStudy: '',
                          startDate: new Date().toISOString().split('T')[0],
                          endDate: '',
                          isCurrent: false,
                          description: '',
                          gpa: '',
                          achievements: [],
                        })}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {language === 'sw' ? 'Ongeza' : 'Add'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {formData.education.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {language === 'sw' ? 'Bofya "Ongeza" kuongeza elimu yako' : 'Click "Add" to add your education'}
                      </p>
                    )}
                    {formData.education.map((edu, index) => (
                      <Card key={edu.id} className="border-2">
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>{language === 'sw' ? 'Chuo/Shule' : 'Institution'} *</Label>
                                <Input
                                  value={edu.institution}
                                  onChange={(e) => handleNestedFieldChange('education', index, 'institution', e.target.value)}
                                  placeholder={language === 'sw' ? 'Jina la chuo' : 'Institution name'}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{language === 'sw' ? 'Shahada' : 'Degree'} *</Label>
                                <Input
                                  value={edu.degree}
                                  onChange={(e) => handleNestedFieldChange('education', index, 'degree', e.target.value)}
                                  placeholder={language === 'sw' ? 'Mfano: BSc, BA, Diploma' : 'e.g., BSc, BA, Diploma'}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{language === 'sw' ? 'Shamba la Masomo' : 'Field of Study'}</Label>
                                <Input
                                  value={edu.fieldOfStudy}
                                  onChange={(e) => handleNestedFieldChange('education', index, 'fieldOfStudy', e.target.value)}
                                  placeholder={language === 'sw' ? 'Mfano: Computer Science' : 'e.g., Computer Science'}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{language === 'sw' ? 'Tarehe ya Kuanza' : 'Start Date'} *</Label>
                                <Input
                                  type="date"
                                  value={edu.startDate}
                                  onChange={(e) => handleNestedFieldChange('education', index, 'startDate', e.target.value)}
                                />
                              </div>
                              {!edu.isCurrent && (
                                <div className="space-y-2">
                                  <Label>{language === 'sw' ? 'Tarehe ya Mwisho' : 'End Date'}</Label>
                                  <Input
                                    type="date"
                                    value={edu.endDate}
                                    onChange={(e) => handleNestedFieldChange('education', index, 'endDate', e.target.value)}
                                  />
                                </div>
                              )}
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={edu.isCurrent}
                                  onCheckedChange={(checked) => handleNestedFieldChange('education', index, 'isCurrent', checked)}
                                />
                                <Label>{language === 'sw' ? 'Inaendelea' : 'Currently Studying'}</Label>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>{language === 'sw' ? 'Maelezo' : 'Description'}</Label>
                              <Textarea
                                value={edu.description}
                                onChange={(e) => handleNestedFieldChange('education', index, 'description', e.target.value)}
                                placeholder={language === 'sw' ? 'Maelezo ya ziada (si lazima)' : 'Additional details (optional)'}
                                rows={3}
                              />
                            </div>

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeEntry('education', index)}
                              className="w-full"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {language === 'sw' ? 'Futa Elimu' : 'Remove Education'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Skills Tab */}
              <TabsContent value="skills" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{language === 'sw' ? 'Ujuzi' : 'Skills'}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Add Skill */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          id="skill-input"
                          placeholder={language === 'sw' ? 'Jina la ujuzi' : 'Skill name'}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                              const category = (document.querySelector('[data-skill-category]') as HTMLSelectElement)?.value || 'technical';
                              addEntry('skills', {
                                name: (e.target as HTMLInputElement).value.trim(),
                                proficiency: 'Intermediate',
                                category: category as any,
                              });
                              (e.target as HTMLInputElement).value = '';
                            }
                          }}
                        />
                        <Select
                          defaultValue="technical"
                          data-skill-category
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="technical">{language === 'sw' ? 'Kiufundi' : 'Technical'}</SelectItem>
                            <SelectItem value="soft">{language === 'sw' ? 'Ujuzi wa Kijamii' : 'Soft'}</SelectItem>
                            <SelectItem value="tool">{language === 'sw' ? 'Zana' : 'Tool'}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const input = document.getElementById('skill-input') as HTMLInputElement;
                            const categorySelect = document.querySelector('[data-skill-category]') as HTMLSelectElement;
                            if (input?.value.trim()) {
                              const category = categorySelect?.value || 'technical';
                              addEntry('skills', {
                                name: input.value.trim(),
                                proficiency: 'Intermediate',
                                category: category as any,
                              });
                              input.value = '';
                              toast.success(language === 'sw' ? 'Ujuzi umeongezwa' : 'Skill added');
                            }
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {language === 'sw' ? 'Ongeza' : 'Add'}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {language === 'sw' 
                          ? 'Andika jina la ujuzi na ubofye "Ongeza" au bonyeza Enter'
                          : 'Type skill name and click "Add" or press Enter'}
                      </p>
                    </div>

                    {/* Skills List */}
                    <div className="space-y-2">
                      {formData.skills.map((skill, index) => (
                        <div key={skill.id} className="flex flex-col gap-2 p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{skill.name}</Badge>
                            <Select
                              value={skill.proficiency}
                              onValueChange={(value) => handleNestedFieldChange('skills', index, 'proficiency', value)}
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Beginner">{language === 'sw' ? 'Mwanzo' : 'Beginner'}</SelectItem>
                                <SelectItem value="Intermediate">{language === 'sw' ? 'Kati' : 'Intermediate'}</SelectItem>
                                <SelectItem value="Advanced">{language === 'sw' ? 'Juu' : 'Advanced'}</SelectItem>
                                <SelectItem value="Expert">{language === 'sw' ? 'Mtaalamu' : 'Expert'}</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeEntry('skills', index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <Progress value={proficiencyToPercent(skill.proficiency)} />
                        </div>
                      ))}
                    </div>

                    {/* Languages */}
                    <Separator />
                    <div className="space-y-2">
                      <Label>{language === 'sw' ? 'Lugha' : 'Languages'}</Label>
                      {formData.languages.map((lang, index) => (
                        <div key={lang.id} className="flex items-center gap-2">
                          <Input
                            value={lang.name}
                            onChange={(e) => handleNestedFieldChange('languages', index, 'name', e.target.value)}
                            placeholder={language === 'sw' ? 'Jina la lugha' : 'Language name'}
                            className="flex-1"
                          />
                          <Select
                            value={lang.proficiency}
                            onValueChange={(value) => handleNestedFieldChange('languages', index, 'proficiency', value)}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Basic">{language === 'sw' ? 'Msingi' : 'Basic'}</SelectItem>
                              <SelectItem value="Intermediate">{language === 'sw' ? 'Kati' : 'Intermediate'}</SelectItem>
                              <SelectItem value="Fluent">{language === 'sw' ? 'Kifluenti' : 'Fluent'}</SelectItem>
                              <SelectItem value="Advanced">{language === 'sw' ? 'Juu' : 'Advanced'}</SelectItem>
                              <SelectItem value="Native">{language === 'sw' ? 'Asili' : 'Native'}</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeEntry('languages', index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addEntry('languages', {
                          name: '',
                          proficiency: 'Intermediate',
                        })}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {language === 'sw' ? 'Ongeza Lugha' : 'Add Language'}
                      </Button>
                    </div>

                    {/* Career Interests */}
                    <Separator />
                    <div className="space-y-2">
                      <Label>{language === 'sw' ? 'Maslahi ya Kazi' : 'Career Interests'}</Label>
                      <p className="text-xs text-muted-foreground">
                        {language === 'sw'
                          ? 'Chagua aina za nafasi unazotafuta'
                          : 'Select the roles and opportunity types you want'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {careerInterestOptions.map((option) => (
                          <Button
                            key={option}
                            type="button"
                            variant={formData.careerInterests?.includes(option) ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => toggleCareerInterest(option)}
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Portfolio Integration */}
                    <Separator />
                    <div className="space-y-2">
                      <Label>{language === 'sw' ? 'Miradi ya Portfolio' : 'Portfolio Projects'}</Label>
                      <p className="text-xs text-muted-foreground">
                        {language === 'sw' 
                          ? 'Chagua miradi 3-5 bora kutoka portfolio yako'
                          : 'Select 3-5 best projects from your portfolio'}
                      </p>
                      {formData.portfolio.map((proj, index) => (
                        <div key={proj.id} className="flex items-center gap-2 p-2 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{proj.title}</p>
                            <p className="text-xs text-muted-foreground">{proj.description.substring(0, 50)}...</p>
                          </div>
                          <Switch
                            checked={proj.featured}
                            onCheckedChange={(checked) => handleNestedFieldChange('portfolio', index, 'featured', checked)}
                          />
                        </div>
                      ))}
                      {formData.portfolio.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {language === 'sw' 
                            ? 'Hakuna miradi ya portfolio. Ongeza miradi kwenye ukurasa wa Portfolio.'
                            : 'No portfolio projects. Add projects on the Portfolio page.'}
                        </p>
                      )}
                    </div>

                    {/* Certifications */}
                    <Separator />
                    <div className="space-y-2">
                      <Label>{language === 'sw' ? 'Vyeti' : 'Certifications'}</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          addEntry('certifications', {
                            name: '',
                            issuer: '',
                            issueDate: new Date().toISOString().split('T')[0],
                            credentialUrl: '',
                          })
                        }
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {language === 'sw' ? 'Ongeza Cheti' : 'Add Certificate'}
                      </Button>

                      <div className="space-y-3">
                        {formData.certifications.map((cert, index) => (
                          <div key={cert.id} className="space-y-2 rounded-lg border p-3">
                            <div className="grid gap-2 md:grid-cols-2">
                              <div>
                                <Label>{language === 'sw' ? 'Jina la Cheti' : 'Certificate name'}</Label>
                                <Input
                                  value={cert.name}
                                  onChange={(e) => handleNestedFieldChange('certifications', index, 'name', e.target.value)}
                                  placeholder="e.g., AWS Solutions Architect"
                                />
                              </div>
                              <div>
                                <Label>{language === 'sw' ? 'Imetolewa na' : 'Issued by'}</Label>
                                <Input
                                  value={cert.issuer}
                                  onChange={(e) => handleNestedFieldChange('certifications', index, 'issuer', e.target.value)}
                                  placeholder="Issuing organization"
                                />
                              </div>
                            </div>

                            <div className="grid gap-2 md:grid-cols-2">
                              <div>
                                <Label>{language === 'sw' ? 'Tarehe ya Kutolewa' : 'Date earned'}</Label>
                                <Input
                                  type="date"
                                  value={cert.issueDate}
                                  onChange={(e) => handleNestedFieldChange('certifications', index, 'issueDate', e.target.value)}
                                />
                              </div>
                              <div>
                                <Label>{language === 'sw' ? 'Kiungo cha Cheti (hiari)' : 'Certificate file/link (optional)'}</Label>
                                <div className="flex gap-2">
                                  <Input
                                    value={cert.credentialUrl || ''}
                                    onChange={(e) =>
                                      handleNestedFieldChange('certifications', index, 'credentialUrl', e.target.value)
                                    }
                                    placeholder="https://..."
                                  />
                                  <Input
                                    type="file"
                                    accept="application/pdf,image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleCertificationFileUpload(file, index);
                                    }}
                                  />
                                </div>
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => removeEntry('certifications', index)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {language === 'sw' ? 'Futa Cheti' : 'Remove Certificate'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-300px)]">
          {renderCVPreview()}
        </ScrollArea>
      )}
    </div>
  );
};

export default DigitalCVProfileBuilder;

