import { db, storage } from './config';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

export type CertificateStatus = 'pending' | 'approved' | 'rejected';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

export interface ProfileData {
  userId: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  skills: string[];
  education: Education[];
  workExperience: WorkExperience[];
  languages: Language[];
  achievements: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
}

export interface Language {
  id: string;
  name: string;
  proficiency: 'Beginner' | 'Intermediate' | 'Fluent' | 'Native';
}

export interface PortfolioItem {
  id: string;
  userId: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: 'image' | 'video' | 'document' | 'design';
  thumbnailUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Certificate {
  id: string;
  userId: string;
  title: string;
  institution: string;
  issueDate: string;
  expirationDate?: string;
  fileUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  adminComment?: string;
  skills: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Review {
  id: string;
  userId: string; // ID of the user being reviewed
  reviewerId: string; // ID of the recruiter writing the review
  reviewerName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: Timestamp;
}

// Profile Management
export const getProfile = async (userId: string): Promise<ProfileData | null> => {
  const profileRef = doc(db, 'users', userId, 'profile', 'data');
  const profileSnap = await getDoc(profileRef);
  return profileSnap.exists() ? profileSnap.data() as ProfileData : null;
};

export const createOrUpdateProfile = async (userId: string, profileData: Partial<ProfileData>) => {
  const profileRef = doc(db, 'users', userId, 'profile', 'data');
  await setDoc(profileRef, {
    ...profileData,
    userId,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, { merge: true });
};

// Portfolio Management
export const uploadPortfolioItem = async (
  userId: string, 
  file: File, 
  metadata: Omit<PortfolioItem, 'id' | 'userId' | 'fileUrl' | 'createdAt' | 'updatedAt'>
): Promise<PortfolioItem> => {
  const fileExt = file.name.split('.').pop();
  const filePath = `portfolios/${userId}/${uuidv4()}.${fileExt}`;
  const storageRef = ref(storage, filePath);
  
  // Upload file
  await uploadBytes(storageRef, file);
  const fileUrl = await getDownloadURL(storageRef);
  
  // Create portfolio item in Firestore
  const portfolioItem: Omit<PortfolioItem, 'id'> = {
    ...metadata,
    userId,
    fileUrl,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
  
  const portfolioRef = doc(collection(db, 'users', userId, 'portfolio'));
  await setDoc(portfolioRef, portfolioItem);
  
  return { id: portfolioRef.id, ...portfolioItem };
};

export const deletePortfolioItem = async (userId: string, itemId: string, fileUrl: string) => {
  // Delete file from storage
  const fileRef = ref(storage, fileUrl);
  await deleteObject(fileRef).catch(error => {
    console.error('Error deleting file:', error);
  });
  
  // Delete document from Firestore
  const itemRef = doc(db, 'users', userId, 'portfolio', itemId);
  await deleteDoc(itemRef);
};

// Certificate Management
export const uploadCertificate = async (
  userId: string, 
  file: File, 
  certificateData: Omit<Certificate, 'id' | 'userId' | 'fileUrl' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<Certificate> => {
  const fileExt = file.name.split('.').pop();
  const filePath = `certificates/${userId}/${uuidv4()}.${fileExt}`;
  const storageRef = ref(storage, filePath);
  
  // Upload file
  await uploadBytes(storageRef, file);
  const fileUrl = await getDownloadURL(storageRef);
  
  // Create certificate in Firestore
  const certificate: Omit<Certificate, 'id'> = {
    ...certificateData,
    userId,
    fileUrl,
    status: 'pending',
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
  
  const certRef = doc(collection(db, 'users', userId, 'certificates'));
  await setDoc(certRef, certificate);
  
  return { id: certRef.id, ...certificate };
};

// Reviews and Ratings
export const addReview = async (review: Omit<Review, 'id' | 'createdAt'>) => {
  const reviewData = {
    ...review,
    createdAt: serverTimestamp(),
  };
  
  const reviewRef = doc(collection(db, 'users', review.userId, 'reviews'));
  await setDoc(reviewRef, reviewData);
  
  // Update user's average rating
  await updateUserRating(review.userId);
};

const updateUserRating = async (userId: string) => {
  const reviewsRef = collection(db, 'users', userId, 'reviews');
  const q = query(reviewsRef);
  const querySnapshot = await getDocs(q);
  
  let totalRating = 0;
  querySnapshot.forEach((doc) => {
    totalRating += doc.data().rating;
  });
  
  const averageRating = querySnapshot.size > 0 ? totalRating / querySnapshot.size : 0;
  
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    rating: averageRating,
    ratingCount: querySnapshot.size
  });
};

// Generate PDF for CV
export const generateCV = async (userId: string): Promise<string> => {
  // This is a placeholder. In a real implementation, you would:
  // 1. Fetch the user's profile data
  // 2. Use a library like jsPDF to generate a PDF
  // 3. Upload the PDF to Firebase Storage
  // 4. Return the download URL
  
  // For now, we'll return a placeholder URL
  return `https://example.com/cv/${userId}.pdf`;
};
