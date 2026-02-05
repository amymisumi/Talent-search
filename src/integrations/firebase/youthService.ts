import { db, storage } from './config';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  serverTimestamp,
  query,
  where,
  getDocs,
  Timestamp,
  increment
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
}

export interface Language {
  id: string;
  name: string;
  proficiency: 'basic' | 'conversational' | 'fluent' | 'native';
}

export interface Certificate {
  id: string;
  name: string;
  institution: string;
  issueDate: string;
  expiryDate?: string;
  fileUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  adminComment?: string;
  verifiedAt?: Date;
  verifiedBy?: string;
  skills: string[];
}

export interface Review {
  id: string;
  recruiterId: string;
  recruiterName: string;
  recruiterAvatar?: string;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: 'image' | 'video' | 'document' | 'other';
  fileExtension: string;
  fileSize: number;
  isPublic: boolean;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface YouthProfile {
  userId: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  skills: string[];
  education: Education[];
  workExperience: WorkExperience[];
  languages: Language[];
  achievements: string[];
  certificates: Certificate[];
  portfolio: PortfolioItem[];
  reviews: Review[];
  averageRating: number;
  reviewCount: number;
  location?: {
    city?: string;
    country?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  contactInfo?: {
    email?: string;
    phone?: string;
    website?: string;
    linkedin?: string;
    github?: string;
    twitter?: string;
  };
  settings?: {
    isProfilePublic: boolean;
    isPortfolioPublic: boolean;
    isContactInfoPublic: boolean;
    receiveJobAlerts: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  lastActive: Date;
}

// Profile Management
export const getYouthProfile = async (userId: string): Promise<YouthProfile | null> => {
  const profileRef = doc(db, 'youth', userId);
  const profileSnap = await getDoc(profileRef);
  
  if (!profileSnap.exists()) {
    return null;
  }
  
  return {
    userId: profileSnap.id,
    ...profileSnap.data(),
    createdAt: profileSnap.data().createdAt?.toDate(),
    updatedAt: profileSnap.data().updatedAt?.toDate(),
    lastActive: profileSnap.data().lastActive?.toDate()
  } as YouthProfile;
};

export const createOrUpdateYouthProfile = async (userId: string, data: Partial<YouthProfile>) => {
  const profileRef = doc(db, 'youth', userId);
  const now = new Date();
  
  await setDoc(profileRef, {
    ...data,
    updatedAt: serverTimestamp(),
    lastActive: serverTimestamp(),
    _updatedAt: now.getTime() // For easier querying
  }, { merge: true });
  
  return getYouthProfile(userId);
};

// Skills Management
export const addSkill = async (userId: string, skill: string) => {
  const profileRef = doc(db, 'youth', userId);
  await updateDoc(profileRef, {
    skills: arrayUnion(skill),
    updatedAt: serverTimestamp()
  });
};

export const removeSkill = async (userId: string, skill: string) => {
  const profileRef = doc(db, 'youth', userId);
  await updateDoc(profileRef, {
    skills: arrayRemove(skill),
    updatedAt: serverTimestamp()
  });
};

// Education Management
export const addEducation = async (userId: string, education: Omit<Education, 'id'>) => {
  const profileRef = doc(db, 'youth', userId);
  const educationId = uuidv4();
  
  await updateDoc(profileRef, {
    education: arrayUnion({ ...education, id: educationId }),
    updatedAt: serverTimestamp()
  });
  
  return educationId;
};

export const updateEducation = async (userId: string, educationId: string, updates: Partial<Education>) => {
  const profileRef = doc(db, 'youth', userId);
  const profile = await getYouthProfile(userId);
  
  if (!profile) throw new Error('Profile not found');
  
  const updatedEducation = profile.education.map(edu => 
    edu.id === educationId ? { ...edu, ...updates } : edu
  );
  
  await updateDoc(profileRef, {
    education: updatedEducation,
    updatedAt: serverTimestamp()
  });
};

export const removeEducation = async (userId: string, educationId: string) => {
  const profileRef = doc(db, 'youth', userId);
  const profile = await getYouthProfile(userId);
  
  if (!profile) throw new Error('Profile not found');
  
  const updatedEducation = profile.education.filter(edu => edu.id !== educationId);
  
  await updateDoc(profileRef, {
    education: updatedEducation,
    updatedAt: serverTimestamp()
  });
};

// Work Experience Management (similar to education)
// ... (implement similar CRUD operations for work experience)

// Certificate Management
export const uploadCertificate = async (
  userId: string, 
  file: File, 
  data: Omit<Certificate, 'id' | 'fileUrl' | 'status' | 'verifiedAt' | 'verifiedBy' | 'skills'>
): Promise<string> => {
  // Upload file to storage
  const fileExt = file.name.split('.').pop();
  const fileName = `certificates/${userId}/${uuidv4()}.${fileExt}`;
  const fileRef = ref(storage, fileName);
  
  await uploadBytes(fileRef, file);
  const fileUrl = await getDownloadURL(fileRef);
  
  // Save certificate data
  const certificateId = uuidv4();
  const profileRef = doc(db, 'youth', userId);
  
  await updateDoc(profileRef, {
    certificates: arrayUnion({
      id: certificateId,
      ...data,
      fileUrl,
      status: 'pending',
      skills: [], // Extract skills from certificate name/description
      createdAt: serverTimestamp()
    }),
    updatedAt: serverTimestamp()
  });
  
  return certificateId;
};

// Portfolio Management
export const uploadPortfolioItem = async (
  userId: string,
  file: File,
  data: { title: string; description?: string; isPublic: boolean }
): Promise<string> => {
  // Determine file type
  const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const videoTypes = ['mp4', 'webm', 'mov'];
  const documentTypes = ['pdf', 'doc', 'docx', 'txt'];
  
  let fileType: 'image' | 'video' | 'document' | 'other' = 'other';
  if (imageTypes.includes(fileExt)) fileType = 'image';
  else if (videoTypes.includes(fileExt)) fileType = 'video';
  else if (documentTypes.includes(fileExt)) fileType = 'document';
  
  // Upload file
  const fileName = `portfolio/${userId}/${uuidv4()}.${fileExt}`;
  const fileRef = ref(storage, fileName);
  
  await uploadBytes(fileRef, file);
  const fileUrl = await getDownloadURL(fileRef);
  
  // Save portfolio item
  const itemId = uuidv4();
  const profileRef = doc(db, 'youth', userId);
  
  await updateDoc(profileRef, {
    portfolio: arrayUnion({
      id: itemId,
      ...data,
      fileUrl,
      fileType,
      fileExtension: fileExt,
      fileSize: file.size,
      isApproved: false, // For admin moderation
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }),
    updatedAt: serverTimestamp()
  });
  
  return itemId;
};

// Review Management
export const addReview = async (
  youthId: string,
  reviewData: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const reviewId = uuidv4();
  const now = new Date();
  
  // Add review to youth's profile
  const profileRef = doc(db, 'youth', youthId);
  
  await updateDoc(profileRef, {
    reviews: arrayUnion({
      id: reviewId,
      ...reviewData,
      createdAt: now,
      updatedAt: now
    }),
    // Update average rating
    averageRating: increment(reviewData.rating),
    reviewCount: increment(1),
    updatedAt: serverTimestamp()
  });
  
  return reviewId;
};

// Generate CV (PDF)
export const generateCV = async (userId: string): Promise<string> => {
  // In a real implementation, this would generate a PDF using jsPDF
  // For now, we'll just return a placeholder URL
  return `https://api.yourdomain.com/generate-cv?userId=${userId}&timestamp=${Date.now()}`;
};

// Real-time Listeners
export const subscribeToYouthProfile = (
  userId: string, 
  callback: (profile: YouthProfile | null) => void
) => {
  const profileRef = doc(db, 'youth', userId);
  
  // Return the unsubscribe function
  return () => {
    // Unsubscribe logic would go here
    // This is a simplified example
    console.log('Unsubscribed from profile updates');
  };
};

// Search and Filter
export const searchYouth = async (filters: {
  skills?: string[];
  education?: string[];
  minRating?: number;
  location?: string;
  limit?: number;
}) => {
  let q = query(collection(db, 'youth'));
  
  // Apply filters
  if (filters.skills?.length) {
    q = query(q, where('skills', 'array-contains-any', filters.skills));
  }
  
  if (filters.minRating) {
    q = query(q, where('averageRating', '>=', filters.minRating));
  }
  
  // Execute query
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    // Convert Firestore timestamps to Date objects
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
    lastActive: doc.data().lastActive?.toDate()
  } as YouthProfile));
};
