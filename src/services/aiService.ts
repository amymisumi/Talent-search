import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  addDoc, 
  orderBy, 
  Timestamp, 
  doc, 
  setDoc, 
  updateDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { JobPosting, LearningResource, AIChatMessage, UserProfile, Portfolio, Certificate, Review } from '@/integrations/firebase/types';
import { claudeService, Language } from './claudeService';

const JOB_MATCH_KEYWORDS = ['job', 'career', 'work', 'position', 'role', 'kazi', 'ajira'];
const LEARNING_KEYWORDS = ['learn', 'skill', 'course', 'study', 'education', 'jifunze', 'ujuzi'];
const CV_KEYWORDS = ['cv', 'resume', 'curriculum vitae'];
const INTERVIEW_KEYWORDS = ['interview', 'meeting', 'discussion', 'mahojiano'];
const MOTIVATION_KEYWORDS = ['motivate', 'motivation', 'inspire', 'encourage', 'support', 'motivational', 'inspiration', 'hamasa', 'kuhamasisha'];

// Firebase Chat Service Functions
export const saveChatMessage = async (messageData: {
  userId: string;
  content: string;
  sender: 'user' | 'assistant';
  type?: string;
  data?: any;
  language?: 'en' | 'sw' | 'mixed';
  pinned?: boolean;
}): Promise<string> => {
  try {
    const messageRef = collection(db, 'chats', messageData.userId, 'messages');
    const docRef = await addDoc(messageRef, {
      messageId: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sender: messageData.sender,
      content: messageData.content,
      timestamp: serverTimestamp(),
      language: messageData.language || 'en',
      pinned: messageData.pinned || false,
      type: messageData.type || 'response',
      data: messageData.data || null,
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving chat message:', error);
    throw error;
  }
};

export const getChatHistory = async (userId: string): Promise<AIChatMessage[]> => {
  try {
    const messagesRef = collection(db, 'chats', userId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        messageId: data.messageId || doc.id,
        userId,
        sender: data.sender,
        content: data.content,
        timestamp: data.timestamp?.toDate() || new Date(),
        language: data.language || 'en',
        pinned: data.pinned || false,
        type: data.type,
        data: data.data,
      } as AIChatMessage;
    });
  } catch (error) {
    console.error('Error getting chat history:', error);
    return [];
  }
};

export const subscribeToChatMessages = (
  userId: string,
  callback: (messages: AIChatMessage[]) => void
): (() => void) => {
  const messagesRef = collection(db, 'chats', userId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        messageId: data.messageId || doc.id,
        userId,
        sender: data.sender,
        content: data.content,
        timestamp: data.timestamp?.toDate() || new Date(),
        language: data.language || 'en',
        pinned: data.pinned || false,
        type: data.type,
        data: data.data,
      } as AIChatMessage;
    });
    callback(messages);
  });
};

export const pinMessage = async (userId: string, messageId: string, pinned: boolean): Promise<void> => {
  try {
    const messageRef = doc(db, 'chats', userId, 'messages', messageId);
    await updateDoc(messageRef, { pinned });
  } catch (error) {
    console.error('Error pinning message:', error);
    throw error;
  }
};

export const deleteMessage = async (userId: string, messageId: string): Promise<void> => {
  try {
    const messageRef = doc(db, 'chats', userId, 'messages', messageId);
    await deleteDoc(messageRef);
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};

export const clearChatHistory = async (userId: string): Promise<void> => {
  try {
    const messagesRef = collection(db, 'chats', userId, 'messages');
    const querySnapshot = await getDocs(messagesRef);
    
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error clearing chat history:', error);
    throw error;
  }
};

export const searchChatHistory = async (
  userId: string,
  searchTerm: string
): Promise<AIChatMessage[]> => {
  try {
    const messagesRef = collection(db, 'chats', userId, 'messages');
    const querySnapshot = await getDocs(messagesRef);
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return querySnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          messageId: data.messageId || doc.id,
          userId,
          sender: data.sender,
          content: data.content,
          timestamp: data.timestamp?.toDate() || new Date(),
          language: data.language || 'en',
          pinned: data.pinned || false,
          type: data.type,
          data: data.data,
        } as AIChatMessage;
      })
      .filter(msg => msg.content.toLowerCase().includes(lowerSearchTerm))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  } catch (error) {
    console.error('Error searching chat history:', error);
    return [];
  }
};

// Helper Functions
const getLearningResources = async (skills: string[] = [], careerField?: string): Promise<any[]> => {
  // Comprehensive learning resources covering multiple fields
  const allResources: any[] = [
    // Tech Resources
    {
      id: '1',
      name: 'Introduction to Web Development',
      description: 'Learn HTML, CSS, and JavaScript fundamentals. Perfect for beginners starting their web development journey.',
      url: 'https://www.coursera.org/learn/html-css-javascript-for-web-developers',
      type: 'course',
      skills: ['HTML', 'CSS', 'JavaScript', 'Web Development'],
      category: 'Technology',
    },
    {
      id: '2',
      name: 'React - The Complete Guide',
      description: 'Master React.js from basics to advanced concepts including hooks, context, and Redux.',
      url: 'https://www.udemy.com/course/react-the-complete-guide-incl-redux/',
      type: 'course',
      skills: ['React', 'JavaScript', 'Frontend Development'],
      category: 'Technology',
    },
    {
      id: '3',
      name: 'freeCodeCamp - Full Stack Web Development',
      description: 'Free comprehensive curriculum covering HTML, CSS, JavaScript, React, Node.js, and databases.',
      url: 'https://www.freecodecamp.org/learn',
      type: 'course',
      skills: ['Full Stack', 'Web Development', 'JavaScript', 'Node.js'],
      category: 'Technology',
    },
    {
      id: '4',
      name: 'Python for Everybody',
      description: 'Learn Python programming from scratch. Great for data science, automation, and backend development.',
      url: 'https://www.coursera.org/specializations/python',
      type: 'course',
      skills: ['Python', 'Programming', 'Data Science'],
      category: 'Technology',
    },
    // Design & Creative
    {
      id: '5',
      name: 'UI/UX Design Fundamentals',
      description: 'Learn user interface and user experience design principles. Create beautiful and functional designs.',
      url: 'https://www.coursera.org/learn/ui-ux-design',
      type: 'course',
      skills: ['UI/UX', 'Design', 'Figma', 'User Research'],
      category: 'Design',
    },
    {
      id: '6',
      name: 'Graphic Design Bootcamp',
      description: 'Learn Adobe Photoshop, Illustrator, and InDesign. Create professional designs.',
      url: 'https://www.udemy.com/course/graphic-design-bootcamp/',
      type: 'course',
      skills: ['Graphic Design', 'Photoshop', 'Illustrator', 'Design'],
      category: 'Design',
    },
    {
      id: '7',
      name: 'Video Editing with Adobe Premiere Pro',
      description: 'Master video editing, color grading, and post-production techniques.',
      url: 'https://www.udemy.com/course/premiere-pro-course/',
      type: 'course',
      skills: ['Video Editing', 'Premiere Pro', 'Post-Production'],
      category: 'Design',
    },
    // Marketing & Business
    {
      id: '8',
      name: 'Digital Marketing Course',
      description: 'Master social media marketing, SEO, content marketing, and analytics.',
      url: 'https://www.coursera.org/learn/digital-marketing',
      type: 'course',
      skills: ['Digital Marketing', 'SEO', 'Social Media', 'Analytics'],
      category: 'Marketing',
    },
    {
      id: '9',
      name: 'Content Writing Masterclass',
      description: 'Learn to write engaging content for blogs, social media, and marketing materials.',
      url: 'https://www.udemy.com/course/content-writing-masterclass/',
      type: 'course',
      skills: ['Content Writing', 'Copywriting', 'SEO Writing'],
      category: 'Marketing',
    },
    {
      id: '10',
      name: 'Social Media Marketing Specialization',
      description: 'Learn to create and manage effective social media campaigns across multiple platforms.',
      url: 'https://www.coursera.org/specializations/social-media-marketing',
      type: 'course',
      skills: ['Social Media Marketing', 'Content Strategy', 'Community Management'],
      category: 'Marketing',
    },
    // Business & Finance
    {
      id: '11',
      name: 'Business Fundamentals',
      description: 'Learn essential business skills including finance, operations, and strategy.',
      url: 'https://www.coursera.org/specializations/wharton-business-fundamentals',
      type: 'course',
      skills: ['Business Strategy', 'Finance', 'Operations', 'Management'],
      category: 'Business',
    },
    {
      id: '12',
      name: 'Project Management Professional (PMP)',
      description: 'Master project management methodologies and best practices.',
      url: 'https://www.coursera.org/learn/project-management',
      type: 'course',
      skills: ['Project Management', 'Leadership', 'Planning', 'Agile'],
      category: 'Business',
    },
    {
      id: '13',
      name: 'Financial Accounting Fundamentals',
      description: 'Learn the basics of financial accounting, bookkeeping, and financial statements.',
      url: 'https://www.coursera.org/learn/wharton-accounting',
      type: 'course',
      skills: ['Accounting', 'Finance', 'Bookkeeping', 'Financial Analysis'],
      category: 'Business',
    },
    // Sales & Customer Service
    {
      id: '14',
      name: 'Sales Training: Practical Sales Techniques',
      description: 'Learn proven sales techniques, negotiation skills, and customer relationship management.',
      url: 'https://www.coursera.org/learn/sales-training',
      type: 'course',
      skills: ['Sales', 'Negotiation', 'Customer Relations', 'Communication'],
      category: 'Sales',
    },
    {
      id: '15',
      name: 'Customer Service Excellence',
      description: 'Master customer service skills, handling complaints, and building customer loyalty.',
      url: 'https://www.coursera.org/learn/customer-service',
      type: 'course',
      skills: ['Customer Service', 'Communication', 'Problem Solving', 'Empathy'],
      category: 'Sales',
    },
    // Healthcare & Wellness
    {
      id: '16',
      name: 'Healthcare Administration',
      description: 'Learn healthcare management, medical billing, and healthcare operations.',
      url: 'https://www.coursera.org/learn/healthcare-administration',
      type: 'course',
      skills: ['Healthcare Management', 'Medical Billing', 'Healthcare Operations'],
      category: 'Healthcare',
    },
    {
      id: '17',
      name: 'Nutrition and Wellness',
      description: 'Learn about nutrition, healthy living, and wellness coaching.',
      url: 'https://www.coursera.org/learn/nutrition',
      type: 'course',
      skills: ['Nutrition', 'Wellness', 'Health Coaching', 'Lifestyle'],
      category: 'Healthcare',
    },
    // Education & Training
    {
      id: '18',
      name: 'Teaching and Learning Strategies',
      description: 'Learn effective teaching methods, curriculum design, and student engagement techniques.',
      url: 'https://www.coursera.org/learn/teaching-learning',
      type: 'course',
      skills: ['Teaching', 'Curriculum Design', 'Student Engagement', 'Education'],
      category: 'Education',
    },
    {
      id: '19',
      name: 'Online Course Creation',
      description: 'Learn how to create and sell online courses. Master course design and student engagement.',
      url: 'https://www.udemy.com/course/create-online-course/',
      type: 'course',
      skills: ['Course Creation', 'Online Teaching', 'Content Creation', 'E-Learning'],
      category: 'Education',
    },
    // Hospitality & Tourism
    {
      id: '20',
      name: 'Hospitality Management',
      description: 'Learn hotel operations, guest services, and hospitality industry best practices.',
      url: 'https://www.coursera.org/learn/hospitality-management',
      type: 'course',
      skills: ['Hospitality', 'Hotel Management', 'Guest Services', 'Tourism'],
      category: 'Hospitality',
    },
    {
      id: '21',
      name: 'Event Planning and Management',
      description: 'Master event planning, coordination, and management skills.',
      url: 'https://www.coursera.org/learn/event-planning',
      type: 'course',
      skills: ['Event Planning', 'Coordination', 'Management', 'Organization'],
      category: 'Hospitality',
    },
    // Agriculture & Farming
    {
      id: '22',
      name: 'Sustainable Agriculture',
      description: 'Learn modern farming techniques, sustainable practices, and agricultural business management.',
      url: 'https://www.coursera.org/learn/sustainable-agriculture',
      type: 'course',
      skills: ['Agriculture', 'Farming', 'Sustainability', 'Agribusiness'],
      category: 'Agriculture',
    },
    // Construction & Trades
    {
      id: '23',
      name: 'Construction Management',
      description: 'Learn construction project management, safety, and building codes.',
      url: 'https://www.coursera.org/learn/construction-management',
      type: 'course',
      skills: ['Construction', 'Project Management', 'Safety', 'Building Codes'],
      category: 'Construction',
    },
    // Soft Skills
    {
      id: '24',
      name: 'Communication Skills for Professionals',
      description: 'Improve your verbal and written communication, presentation skills, and professional networking.',
      url: 'https://www.coursera.org/learn/communication-skills',
      type: 'course',
      skills: ['Communication', 'Presentation', 'Networking', 'Professional Skills'],
      category: 'Soft Skills',
    },
    {
      id: '25',
      name: 'Leadership and Team Management',
      description: 'Develop leadership skills, team building, and people management techniques.',
      url: 'https://www.coursera.org/learn/leadership',
      type: 'course',
      skills: ['Leadership', 'Team Management', 'People Skills', 'Management'],
      category: 'Soft Skills',
    },
    {
      id: '26',
      name: 'Time Management and Productivity',
      description: 'Learn effective time management, productivity techniques, and goal setting.',
      url: 'https://www.coursera.org/learn/time-management',
      type: 'course',
      skills: ['Time Management', 'Productivity', 'Goal Setting', 'Organization'],
      category: 'Soft Skills',
    },
  ];

  // Filter by career field first if available
  let filteredResources = allResources;
  if (careerField) {
    const fieldLower = careerField.toLowerCase();
    console.log('[getLearningResources] Filtering by career field:', fieldLower);
    
    // Map common career field names to categories
    const fieldToCategoryMap: { [key: string]: string[] } = {
      'technology': ['Technology'],
      'tech': ['Technology'],
      'design': ['Design'],
      'business': ['Business', 'Sales'],
      'marketing': ['Marketing', 'Sales'],
      'healthcare': ['Healthcare'],
      'health': ['Healthcare'],
      'education': ['Education'],
      'hospitality': ['Hospitality'],
      'tourism': ['Hospitality'],
      'agriculture': ['Agriculture'],
      'farming': ['Agriculture'],
      'construction': ['Construction'],
      'sales': ['Sales', 'Marketing'],
      'customer service': ['Sales'],
    };
    
    // Find matching categories
    const matchingCategories: string[] = [];
    for (const [key, categories] of Object.entries(fieldToCategoryMap)) {
      if (fieldLower.includes(key) || key.includes(fieldLower)) {
        matchingCategories.push(...categories);
      }
    }
    
    // Also check direct category match
    const directMatch = allResources.find(r => 
      (r.category || '').toLowerCase() === fieldLower
    );
    if (directMatch && !matchingCategories.includes(directMatch.category)) {
      matchingCategories.push(directMatch.category);
    }
    
    console.log('[getLearningResources] Matching categories:', matchingCategories);
    
    if (matchingCategories.length > 0) {
      const fieldResources = allResources.filter(resource => 
        matchingCategories.includes(resource.category || '')
      );
      if (fieldResources.length > 0) {
        filteredResources = fieldResources;
        console.log('[getLearningResources] Filtered to', fieldResources.length, 'resources');
      } else {
        // If no match, exclude tech and show diverse resources
        filteredResources = allResources.filter(r => r.category !== 'Technology');
        console.log('[getLearningResources] No match, excluding tech, showing', filteredResources.length, 'resources');
      }
    } else {
      // If no category match, try skill-based matching
      const fieldResources = allResources.filter(resource => {
        const categoryLower = (resource.category || '').toLowerCase();
        const skillsLower = resource.skills.map((s: string) => s.toLowerCase()).join(' ');
        return categoryLower.includes(fieldLower) || 
               skillsLower.includes(fieldLower) ||
               fieldLower.includes(categoryLower);
      });
      
      if (fieldResources.length > 0) {
        filteredResources = fieldResources;
        console.log('[getLearningResources] Skill-based filter found', fieldResources.length, 'resources');
      } else {
        // If still no match, exclude tech and show diverse resources
        filteredResources = allResources.filter(r => r.category !== 'Technology');
        console.log('[getLearningResources] No match, excluding tech, showing', filteredResources.length, 'resources');
      }
    }
  } else {
    // If no career field, exclude tech-heavy resources and show diverse options
    filteredResources = allResources.filter(r => r.category !== 'Technology');
    console.log('[getLearningResources] No career field, showing diverse resources (excluding tech)');
  }
  
  // If user has skills, filter and prioritize relevant resources
  if (skills.length > 0) {
    const skillLower = skills.map(s => s.toLowerCase());
    const relevantResources = filteredResources.filter(resource => 
      resource.skills.some((skill: string) => 
        skillLower.some(userSkill => 
          skill.toLowerCase().includes(userSkill) || 
          userSkill.includes(skill.toLowerCase())
        )
      )
    );
    
    // If we found relevant resources, return them; otherwise return filtered by career field or all
    return relevantResources.length > 0 ? relevantResources : filteredResources;
  }

  // Return filtered resources by career field, or all if no filter
  return filteredResources;
};

const analyzeUserProfile = async (
  userProfile?: UserProfile,
  portfolios?: Portfolio[],
  certificates?: Certificate[],
  reviews?: Review[],
  language: 'en' | 'sw' = 'en'
): Promise<{
  content: string;
  type: string;
  data?: any;
}> => {
  if (!userProfile) {
    return {
      content: language === 'sw'
        ? 'Samahani, sijaona wasifu wako. Tafadhali jaza wasifu wako kwanza.'
        : 'Sorry, I cannot find your profile. Please complete your profile first.',
      type: 'error',
    };
  }

  const analysis = [];
  const recommendations = [];

  // Skills analysis
  if (userProfile.skills && userProfile.skills.length > 0) {
    analysis.push(
      language === 'sw'
        ? `Ujuzi wako: ${userProfile.skills.join(', ')}`
        : `Your skills: ${userProfile.skills.join(', ')}`
    );
  } else {
    recommendations.push(
      language === 'sw'
        ? 'Ongeza ujuzi wako kwenye wasifu wako'
        : 'Add your skills to your profile'
    );
  }

  // Portfolio analysis
  if (portfolios && portfolios.length > 0) {
    analysis.push(
      language === 'sw'
        ? `Una miradi ${portfolios.length} kwenye portfolio yako`
        : `You have ${portfolios.length} projects in your portfolio`
    );
  } else {
    recommendations.push(
      language === 'sw'
        ? 'Ongeza miradi 2-3 kwenye portfolio yako ili kuongeza mwonekano'
        : 'Add 2-3 projects to your portfolio to increase visibility'
    );
  }

  // Certificates analysis
  if (certificates && certificates.length > 0) {
    const verifiedCount = certificates.filter(c => c.status === 'verified').length;
    analysis.push(
      language === 'sw'
        ? `Una vyeti ${certificates.length}, ${verifiedCount} vimehakikiwa`
        : `You have ${certificates.length} certificates, ${verifiedCount} verified`
    );
  } else {
    recommendations.push(
      language === 'sw'
        ? 'Pakia vyeti vyako ili kuongeza uaminifu'
        : 'Upload your certificates to increase credibility'
    );
  }

  // Reviews analysis
  if (reviews && reviews.length > 0) {
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    analysis.push(
      language === 'sw'
        ? `Una mapitio ${reviews.length} na wastani wa alama ${avgRating.toFixed(1)}/5`
        : `You have ${reviews.length} reviews with an average rating of ${avgRating.toFixed(1)}/5`
    );
  }

  const content = language === 'sw'
    ? `Uchambuzi wa Wasifu Wako:\n\n${analysis.join('\n')}\n\nMapendekezo:\n${recommendations.join('\n')}`
    : `Your Profile Analysis:\n\n${analysis.join('\n')}\n\nRecommendations:\n${recommendations.join('\n')}`;

  return {
    content,
    type: 'profile_analysis',
    data: { analysis, recommendations },
  };
};

const recommendJobs = async (
  userSkills: string[],
  userProfile?: UserProfile,
  language: 'en' | 'sw' = 'en'
): Promise<{
  content: string;
  type: string;
  data?: any;
}> => {
  try {
    console.log('[recommendJobs] Starting job recommendation');
    console.log('[recommendJobs] User skills:', userSkills);
    console.log('[recommendJobs] User profile:', userProfile ? { fullName: userProfile.fullName } : 'null');
    
    // Normalize userSkills to ensure all are strings
    const normalizedSkills = userSkills.map(skill => 
      typeof skill === 'string' ? skill : (skill?.skillName || String(skill))
    ).filter(skill => skill && skill.length > 0);
    
    console.log('[recommendJobs] Normalized skills:', normalizedSkills);
    
    // Query jobs with status 'open' (not 'active')
    const jobsQuery = query(
      collection(db, 'jobs'),
      where('status', '==', 'open'),
      limit(10)
    );

    const querySnapshot = await getDocs(jobsQuery);
    console.log('[recommendJobs] Query snapshot size:', querySnapshot.docs.length);
    
    const jobs = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        company: data.companyName || data.company || 'Unknown Company',
        location: data.location,
        type: data.remoteType || data.jobType || 'Full-time',
        description: data.description || '',
        requiredSkills: data.skillsRequired || data.requiredSkills || [],
        postedAt: data.createdAt?.toDate() || data.postedAt?.toDate() || new Date(),
        status: data.status || 'open',
      } as JobPosting;
    });

    console.log('[recommendJobs] Mapped jobs:', jobs.length);
    console.log('[recommendJobs] First job sample:', jobs[0] ? { title: jobs[0].title, requiredSkills: jobs[0].requiredSkills } : 'none');

    // Filter jobs by user skills if available
    let matchedJobs = jobs;
    if (normalizedSkills.length > 0) {
      matchedJobs = jobs.filter(job => {
        const jobSkills = (job.requiredSkills || []).map(skill => 
          typeof skill === 'string' ? skill : String(skill)
        );
        return jobSkills.some(jobSkill =>
          normalizedSkills.some(userSkill =>
            userSkill.toLowerCase().includes(jobSkill.toLowerCase()) ||
            jobSkill.toLowerCase().includes(userSkill.toLowerCase())
          )
        );
      });
      
      // If no matches, still return all jobs but mention they're general recommendations
      if (matchedJobs.length === 0) {
        matchedJobs = jobs.slice(0, 5); // Return top 5 jobs
      }
    }

    // Format skills for display (limit to 3 for readability)
    const skillsDisplay = normalizedSkills.length > 0 
      ? normalizedSkills.slice(0, 3).join(', ') + (normalizedSkills.length > 3 ? '...' : '')
      : '';

    const responseText = language === 'en'
      ? (matchedJobs.length > 0
        ? `Here are ${matchedJobs.length} job opportunity${matchedJobs.length > 1 ? 'ies' : 'y'} that match your skills${skillsDisplay ? ` (${skillsDisplay})` : ''}:`
        : 'I found some job opportunities for you:')
      : (matchedJobs.length > 0
        ? `Hapa kuna fursa ${matchedJobs.length} za kazi ambazo zinaendana na ujuzi wako${skillsDisplay ? ` (${skillsDisplay})` : ''}:`
        : 'Nimepata fursa za kazi kwa ajili yako:');

    console.log('[recommendJobs] Returning response with', matchedJobs.length, 'jobs');
    return {
      content: responseText,
      type: 'job_match',
      data: { jobs: matchedJobs },
    };
  } catch (error: any) {
    console.error('[recommendJobs] Error recommending jobs:', error);
    console.error('[recommendJobs] Error details:', error?.message, error?.stack);
    
    // Return error response instead of throwing
    return {
      content: language === 'en'
        ? `Sorry, I encountered an error while searching for jobs: ${error?.message || 'Unknown error'}. Please try again later.`
        : `Samahani, kuna hitilafu wakati wa kutafuta kazi: ${error?.message || 'Hitilafu isiyojulikana'}. Tafadhali jaribu tena baadaye.`,
      type: 'error',
      data: { error: error?.message },
    };
    return {
      content: language === 'sw'
        ? 'Samahani, nimepata kosa wakati wa kutafuta kazi. Tafadhali jaribu tena.'
        : 'Sorry, I encountered an error while searching for jobs. Please try again.',
      type: 'error',
    };
  }
};

const improveCV = async (
  userProfile?: UserProfile,
  portfolios?: Portfolio[],
  certificates?: Certificate[],
  language: 'en' | 'sw' = 'en'
): Promise<{
  content: string;
  type: string;
  data?: any;
}> => {
  // Use Claude for personalized CV advice if profile is available
  if (userProfile) {
    try {
      const talentArea = userProfile.talentArea || userProfile.preferredCareerField || userProfile.industryType || '';
      const name = userProfile.fullName || userProfile.name || 'you';
      
      const cvPrompt = `Provide personalized CV/resume improvement tips for ${name}, who is ${talentArea ? `a ${talentArea} professional/athlete` : 'a professional'}. 

CRITICAL: All CV tips MUST be specifically tailored to ${talentArea || 'their career field'}. If they are a swimmer, provide swimming/sports-specific CV tips (e.g., highlighting competition results, training achievements, sports-related certifications, etc.). If they are in tech, provide tech-specific CV tips.

User details:
- Talent/Career Field: ${talentArea || 'Not specified'} (THIS IS THE PRIMARY FIELD - ALL TIPS MUST RELATE TO THIS)
- Skills: ${userProfile.skills ? (Array.isArray(userProfile.skills) ? userProfile.skills.map(s => typeof s === 'string' ? s : s.skillName).join(', ') : '') : 'Not specified'}
- Years of Experience: ${userProfile.yearsOfExperience || 'Not specified'}
${userProfile.bio ? `- Bio: ${userProfile.bio}` : ''}

Provide 5-7 specific, actionable CV improvement tips that are directly relevant to ${talentArea || 'their career field'}. Include:
1. How to highlight ${talentArea || 'field'}-specific achievements
2. Keywords and phrases relevant to ${talentArea || 'their field'}
3. Sections to emphasize for ${talentArea || 'their field'}
4. Formatting tips for ${talentArea || 'their field'}
5. Common mistakes to avoid in ${talentArea || 'their field'} CVs

Make it specific and actionable for ${talentArea || 'their career field'}.`;

      const claudeResponse = await claudeService.generateResponseWithRetry(
        cvPrompt,
        userProfile,
        language,
        []
      );

      return {
        content: claudeResponse,
        type: 'cv_improvement',
        data: { tips: [], portfolios, certificates },
      };
    } catch (error) {
      console.error('[aiService] Error getting personalized CV advice:', error);
      // Fallback to generic tips
    }
  }

  // Fallback to generic tips
  const tips = language === 'sw'
    ? [
        '1. Iwe fupi na wazi (ukurasa 1-2)',
        '2. Tumia vitenzi vya kitendo (mfano: "alikubali", "alisimamia", "alikuboresha")',
        '3. Kadiria mafanikio kwa nambari na asilimia',
        '4. Rekebisha CV kulingana na kazi unayoomba',
        '5. Angalia makosa ya kisarufi na ya kihisabati',
        '6. Ongeza ujuzi unaoendana na kazi',
        '7. Tumia muundo unaoonekana vizuri na ATS (Applicant Tracking Systems)',
      ]
    : [
        '1. Keep it concise (1-2 pages)',
        '2. Use action verbs (e.g., "developed", "managed", "improved")',
        '3. Quantify achievements with numbers and percentages',
        '4. Tailor your CV to each job application',
        '5. Proofread for grammar and spelling errors',
        '6. Highlight skills relevant to the job',
        '7. Use ATS-friendly formatting',
      ];

  const content = language === 'sw'
    ? `Vidokezo vya Kuboresha CV Yako:\n\n${tips.join('\n')}\n\nUngependa nichunguze CV yako ya sasa?`
    : `Tips to Improve Your CV:\n\n${tips.join('\n')}\n\nWould you like me to analyze your current CV?`;

  return {
    content,
    type: 'cv_improvement',
    data: { tips, portfolios, certificates },
  };
};

// Main AI Response Generator
export const generateAIResponse = async (
  message: string,
  userSkills: string[] = [],
  userProfile?: UserProfile,
  portfolios?: Portfolio[],
  certificates?: Certificate[],
  reviews?: Review[],
  language: 'en' | 'sw' = 'en',
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<{
  content: string;
  type: 'suggestion' | 'response' | 'error' | 'job_match' | 'learning_resource' | 'profile_analysis' | 'cv_improvement';
  data?: any;
}> => {
  try {
    // Normalize userSkills to ensure all are strings
    const normalizedUserSkills = userSkills.map(skill => 
      typeof skill === 'string' ? skill : (skill?.skillName || String(skill))
    ).filter(skill => skill && skill.length > 0);
    
    const lowerMessage = message.toLowerCase();

    // Handle special button actions
    if (lowerMessage.includes('analyze my profile') || lowerMessage.includes('chambua wasifu')) {
      return await analyzeUserProfile(userProfile, portfolios, certificates, reviews, language);
    }

    if (lowerMessage.includes('recommend jobs') || lowerMessage.includes('pendekeza kazi') || lowerMessage.includes('tafuta kazi')) {
      return await recommendJobs(normalizedUserSkills, userProfile, language);
    }

    if (lowerMessage.includes('improve my cv') || lowerMessage.includes('boresha cv')) {
      return await improveCV(userProfile, portfolios, certificates, language);
    }

    // Handle career advice
    if (lowerMessage.includes('career advice') || lowerMessage.includes('ushauri wa kazi') || lowerMessage.includes('give me career advice')) {
      console.log('[aiService] Handling career advice request');
      console.log('[aiService] User profile available:', !!userProfile);
      console.log('[aiService] User skills:', userSkills);
      console.log('[aiService] User talent area:', userProfile?.talentArea || userProfile?.preferredCareerField);
      
      // Use Claude for personalized career advice
      try {
        const talentArea = userProfile?.talentArea || userProfile?.preferredCareerField || userProfile?.industryType || '';
        const skillsList = normalizedUserSkills.join(', ') || 'None specified';
        const experience = userProfile?.yearsOfExperience || 'Not specified';
        const education = userProfile?.educationLevel || 'Not specified';
        const location = userProfile?.location || userProfile?.city || 'Not specified';
        const name = userProfile?.fullName || userProfile?.name || 'the user';
        
        const advicePrompt = userProfile 
          ? `Provide comprehensive, personalized career advice for ${name}, who is ${talentArea ? `a ${talentArea} professional/athlete` : 'a professional'}. 

CRITICAL: All advice MUST be specifically tailored to ${talentArea || 'their field'}. If they are a swimmer, provide swimming-specific career advice (e.g., competitive swimming careers, coaching, sports management, sports marketing, sports science, etc.). If they are in tech, provide tech-specific advice. 

User details:
- Talent/Career Field: ${talentArea || 'Not specified'} (THIS IS THE PRIMARY FIELD - ALL ADVICE MUST RELATE TO THIS)
- Skills: ${skillsList}
- Years of Experience: ${experience}
- Education Level: ${education}
- Location: ${location}
${userProfile.bio ? `- Bio: ${userProfile.bio}` : ''}

Provide actionable, specific advice that directly relates to ${talentArea || 'their career field'}. Include:
1. Career paths specific to ${talentArea || 'their field'}
2. Skills they should develop for ${talentArea || 'their field'}
3. Opportunities in ${talentArea || 'their field'}
4. Networking strategies for ${talentArea || 'their field'}
5. Industry-specific tips and insights

Make it personal and relevant to ${talentArea || 'their specific career field'}.`
          : 'Provide general career advice for someone starting their career journey.';
        
        const claudeResponse = await claudeService.generateResponseWithRetry(
          advicePrompt,
          userProfile,
          language,
          conversationHistory
        );
        
        console.log('[aiService] Career advice response received');
        return {
          content: claudeResponse,
          type: 'response',
        };
      } catch (error) {
        console.error('[aiService] Error getting career advice:', error);
        return {
          content: language === 'sw' 
            ? 'Samahani, kuna hitilafu katika kupata ushauri wa kazi. Tafadhali jaribu tena baadaye.'
            : 'Sorry, there was an error getting career advice. Please try again later.',
          type: 'error',
        };
      }
    }

    // Check for job/career related queries
    if (JOB_MATCH_KEYWORDS.some(keyword => lowerMessage.includes(keyword))) {
      return await recommendJobs(normalizedUserSkills, userProfile, language);
    }

    // Check for learning/skill related queries
    if (LEARNING_KEYWORDS.some(keyword => lowerMessage.includes(keyword)) || 
        lowerMessage.includes('what skills should i learn') || 
        lowerMessage.includes('ujuzi gani nifunze')) {
      console.log('[aiService] Handling learning/skills request');
      
      // Extract skills from profile if normalizedUserSkills is empty
      let skillsToUse = normalizedUserSkills;
      if (skillsToUse.length === 0 && userProfile?.skills) {
        skillsToUse = userProfile.skills
          .map(skill => typeof skill === 'string' ? skill : (skill?.skillName || ''))
          .filter(skill => skill.length > 0);
      }
      
      console.log('[aiService] Skills to use for recommendations:', skillsToUse);
      
      // Use Claude AI for personalized skill recommendations
      try {
        const skillsPrompt = userProfile 
          ? `Based on this user's profile, provide personalized recommendations for skills they should learn next. User details: Current Skills: ${skillsToUse.join(', ') || 'None specified'}, Preferred Career Field: ${userProfile.preferredCareerField || 'Not specified'}, Years of Experience: ${userProfile.yearsOfExperience || 'Not specified'}, Education Level: ${userProfile.educationLevel || 'Not specified'}, Location: ${userProfile.location || userProfile.city || 'Not specified'}. Provide 3-5 specific skills they should learn, explain why each skill is valuable for their career path, and suggest how to get started learning each skill. Be specific and actionable.`
          : 'Provide general recommendations for essential skills to learn for career development. Suggest 5-7 key skills across different areas (technical, soft skills, etc.) and explain why each is important.';
        
        const claudeResponse = await claudeService.generateResponseWithRetry(
          skillsPrompt,
          userProfile,
          language,
          conversationHistory
        );
        
        console.log('[aiService] Personalized skills response received');
        
        // Also get learning resources filtered by their skills and career field
        const careerField = userProfile?.preferredCareerField || userProfile?.talentArea || userProfile?.industryType;
        console.log('[aiService] Getting resources for career field:', careerField);
        const resources = await getLearningResources(skillsToUse, careerField);
        console.log('[aiService] Filtered resources count:', resources.length);
        
        // Combine Claude's personalized advice with learning resources
        const responseText = language === 'en'
          ? `${claudeResponse}\n\nHere are some learning resources to help you develop these skills:\n\n`
          : `${claudeResponse}\n\nHapa kuna rasilimali za kujifunza kukusaidia kukuza ujuzi huu:\n\n`;

        return {
          content: responseText,
          type: 'learning_resource',
          data: { resources, personalizedAdvice: claudeResponse },
        };
      } catch (error: any) {
        console.error('[aiService] Error getting personalized skills advice:', error);
        console.error('[aiService] Error details:', error?.message);
        
        // Fallback: Show resources filtered by career field WITHOUT error message
        const careerField = userProfile?.preferredCareerField || userProfile?.talentArea || userProfile?.industryType;
        console.log('[aiService] Fallback - Getting resources for career field:', careerField);
        const resources = await getLearningResources(skillsToUse, careerField);
        console.log('[aiService] Fallback - Filtered resources count:', resources.length);
        
        // Build response based on what we have
        let responseText = '';
        if (language === 'en') {
          if (careerField) {
            responseText = `Based on your career field (${careerField}), here are some skills you should consider learning and resources to help you:\n\n`;
          } else if (skillsToUse.length > 0) {
            responseText = `Based on your current skills (${skillsToUse.join(', ')}), here are some learning resources to help you grow:\n\n`;
          } else {
            responseText = 'Here are some excellent learning resources across different fields to help you develop new skills and advance your career:\n\n';
          }
        } else {
          if (careerField) {
            responseText = `Kulingana na uwanja wako wa kazi (${careerField}), hapa kuna ujuzi unapaswa kuzingatia kujifunza na rasilimali za kukusaidia:\n\n`;
          } else if (skillsToUse.length > 0) {
            responseText = `Kulingana na ujuzi wako wa sasa (${skillsToUse.join(', ')}), hapa kuna rasilimali za kujifunza:\n\n`;
          } else {
            responseText = 'Hapa kuna rasilimali bora katika maeneo mbalimbali kukusaidia kukuza ujuzi mpya:\n\n';
          }
        }

        return {
          content: responseText,
          type: 'learning_resource',
          data: { resources },
        };
      }
    }

    // CV/Resume related queries
    if (CV_KEYWORDS.some(keyword => lowerMessage.includes(keyword))) {
      return await improveCV(userProfile, portfolios, certificates, language);
    }

    // Motivation and encouragement queries
    if (MOTIVATION_KEYWORDS.some(keyword => lowerMessage.includes(keyword))) {
      console.log('[aiService] Handling motivation request');
      try {
        const talentArea = userProfile?.talentArea || userProfile?.preferredCareerField || userProfile?.industryType || '';
        const name = userProfile?.fullName || userProfile?.name || 'there';
        const skillsList = normalizedUserSkills.join(', ') || 'developing';
        const experience = userProfile?.yearsOfExperience || 'growing';
        
        const motivationPrompt = userProfile?.fullName || talentArea || normalizedUserSkills.length > 0
          ? `Provide personalized motivation and encouragement for ${name}, who is ${talentArea ? `a ${talentArea} professional/athlete` : 'working on their career'}. 

CRITICAL: Make the motivation specific to ${talentArea || 'their career field'}. If they are a swimmer, reference swimming achievements, training, competition, and career paths in swimming/sports. If they are in tech, reference tech achievements and growth. 

User details:
- Name: ${name}
- Talent/Career Field: ${talentArea || 'their chosen field'} (THIS IS THEIR PRIMARY FIELD - REFERENCE IT IN MOTIVATION)
- Skills: ${skillsList}
- Experience: ${experience} years
${userProfile?.bio ? `- Bio: ${userProfile.bio}` : ''}

Provide uplifting, specific, and actionable motivation that directly relates to their journey in ${talentArea || 'their field'}. Include:
1. Encouragement specific to ${talentArea || 'their career field'}
2. Examples of success in ${talentArea || 'their field'}
3. Reminders of their progress and potential in ${talentArea || 'their field'}
4. Actionable next steps for ${talentArea || 'their career field'}

Be encouraging, inspiring, and directly relevant to ${talentArea || 'their specific career field'}.`
          : 'Provide general motivation and encouragement for someone working on their career development. Be uplifting, inspiring, and actionable.';
        
        const claudeResponse = await claudeService.generateResponseWithRetry(
          motivationPrompt,
          userProfile,
          language,
          conversationHistory
        );
        
        console.log('[aiService] Motivation response received');
        return {
          content: claudeResponse,
          type: 'response',
        };
      } catch (error: any) {
        console.error('[aiService] Error getting motivation:', error);
        // Fallback motivational messages
        const fallbackMessages = language === 'sw'
          ? [
              'Unajua nini? Unayo uwezo wa kufikia malengo yako! Kila hatua ndogo unayoichukua leo inakusaidia kuwa karibu na ndoto zako. Endelea kujitahidi, na usisahau kuwa mafanikio yanakuja kwa wale ambao hawajakata tamaa.',
              'Kumbuka: Watu wote wakuu walikuwa wakianza mahali fulani. Tofauti ni kuwa hawakukata tamaa. Unayo nguvu za kufikia chochote unachokitaka. Endelea kujifunza, endelea kujitahidi, na uwe na imani katika uwezo wako.',
              'Leo ni siku nzuri ya kuanza kitu kipya! Kila kitu unachokifanya leo kinaongeza thamani kwa maisha yako ya baadaye. Usiache kujitahidi, na ujue kuwa unafanya vizuri.',
            ]
          : [
              'You know what? You have the power to achieve your goals! Every small step you take today brings you closer to your dreams. Keep pushing forward, and remember that success comes to those who never give up.',
              'Remember: All great people started somewhere. The difference is they never quit. You have the strength to achieve anything you set your mind to. Keep learning, keep trying, and believe in your potential.',
              'Today is a great day to start something new! Everything you do today adds value to your future. Don\'t stop trying, and know that you\'re doing great.',
              'Your journey is unique, and every challenge you face is making you stronger. Trust the process, stay focused on your goals, and remember that progress, not perfection, is what matters.',
            ];
        
        const randomMessage = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
        return {
          content: randomMessage,
          type: 'response',
        };
      }
    }

    // Interview related queries
    if (INTERVIEW_KEYWORDS.some(keyword => lowerMessage.includes(keyword)) || 
        lowerMessage.includes('help me prepare for an interview')) {
      console.log('[aiService] Handling interview preparation request');
      const talentArea = userProfile?.talentArea || userProfile?.preferredCareerField || userProfile?.industryType || '';
      const name = userProfile?.fullName || userProfile?.name || 'you';
      
      try {
        const interviewPrompt = userProfile
          ? `Provide personalized interview preparation tips for ${name}, who is ${talentArea ? `a ${talentArea} professional/athlete` : 'a professional'}. 

CRITICAL: All interview tips MUST be specifically tailored to ${talentArea || 'their career field'}. If they are a swimmer, provide swimming/sports-specific interview tips (e.g., discussing competition experience, training regimens, sports achievements, etc.). If they are in tech, provide tech-specific interview tips.

User details:
- Talent/Career Field: ${talentArea || 'Not specified'} (THIS IS THE PRIMARY FIELD - ALL TIPS MUST RELATE TO THIS)
- Skills: ${normalizedUserSkills.join(', ') || 'Not specified'}
- Years of Experience: ${userProfile.yearsOfExperience || 'Not specified'}
${userProfile.bio ? `- Bio: ${userProfile.bio}` : ''}

Provide comprehensive interview preparation advice that is directly relevant to ${talentArea || 'their career field'}. Include:
1. Common interview questions in ${talentArea || 'their field'}
2. How to answer questions about ${talentArea || 'their field'}-specific experience
3. What to highlight from their background in ${talentArea || 'their field'}
4. Industry-specific interview formats (e.g., technical tests for tech, practical demonstrations for sports)
5. Questions they should ask about ${talentArea || 'their field'}
6. Body language and presentation tips for ${talentArea || 'their field'} interviews

Make it specific, actionable, and directly relevant to ${talentArea || 'their career field'}.`
          : 'Provide general interview preparation tips for job seekers. Include common questions, STAR method, and best practices.';
        
        const claudeResponse = await claudeService.generateResponseWithRetry(
          interviewPrompt,
          userProfile,
          language,
          conversationHistory
        );
        
        return {
          content: claudeResponse,
          type: 'response',
        };
      } catch (error) {
        console.error('[aiService] Error getting interview tips:', error);
        // Fallback to generic tips
        const tips = language === 'sw'
          ? [
              '1. Chunguza kampuni na jukumu kabla ya mahojiano',
              '2. Andaa mifano kwa kutumia njia ya STAR (Situation, Task, Action, Result)',
              '3. Vaa mavazi yanayofaa',
              '4. Fika dakika 10-15 mapema',
              '5. Andaa maswali ya kumuuliza mhojaji',
              '6. Fanya mazoezi ya maswali ya kawaida',
              '7. Kuwa na ujasiri na uwe na tabia nzuri',
            ]
          : [
              '1. Research the company and role before the interview',
              '2. Prepare examples using the STAR method (Situation, Task, Action, Result)',
              '3. Dress appropriately',
              '4. Arrive 10-15 minutes early',
              '5. Prepare questions to ask the interviewer',
              '6. Practice common interview questions',
              '7. Be confident and maintain a positive attitude',
            ];

        const content = language === 'sw'
          ? `Vidokezo vya Mahojiano:\n\n${tips.join('\n')}\n\nUngependa mazoezi ya maswali ya mahojiano?`
          : `Interview Tips:\n\n${tips.join('\n')}\n\nWould you like practice interview questions?`;

        return {
          content,
          type: 'response',
        };
      }
    }

    // Use Claude API for intelligent responses
    const claudeResponse = await claudeService.generateResponseWithRetry(
      message,
      userProfile,
      language as Language,
      conversationHistory
    );

    return {
      content: claudeResponse,
      type: 'response',
    };
  } catch (error) {
    console.error('Error generating AI response:', error);
    const errorText = language === 'en'
      ? 'Sorry, I encountered an error while processing your request. Please try again.'
      : 'Samahani, nimepata kosa wakati wa kuchakata ombi lako. Tafadhali jaribu tena.';
    return {
      content: errorText,
      type: 'error',
    };
  }
};
