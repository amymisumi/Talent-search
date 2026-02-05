import { db, storage } from './client';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

// Enhanced Certificate interface matching requirements
export interface YouthCertificate {
  id: string;
  userId: string;
  certificateName: string;
  issuingOrganization: string;
  completionDate: string; // ISO date string
  fileUrl?: string; // For uploaded files
  linkUrl?: string; // For external links (Coursera, Udemy, LinkedIn, etc.)
  verificationStatus: 'Pending' | 'Verified' | 'Rejected';
  adminFeedback: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

// Get all certificates for a user
export const getYouthCertificates = async (userId: string): Promise<YouthCertificate[]> => {
  try {
    const certsRef = collection(db, 'users', userId, 'certifications');
    const q = query(certsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as YouthCertificate[];
  } catch (error) {
    console.error('Error getting youth certificates:', error);
    throw error;
  }
};

// Get a single certificate
export const getYouthCertificate = async (userId: string, certId: string): Promise<YouthCertificate | null> => {
  try {
    const certRef = doc(db, 'users', userId, 'certifications', certId);
    const certSnap = await getDoc(certRef);
    
    if (!certSnap.exists()) {
      return null;
    }
    
    return {
      id: certSnap.id,
      ...certSnap.data(),
      createdAt: certSnap.data().createdAt?.toDate() || new Date(),
      updatedAt: certSnap.data().updatedAt?.toDate() || new Date(),
    } as YouthCertificate;
  } catch (error) {
    console.error('Error getting youth certificate:', error);
    throw error;
  }
};

// Add a certificate with file upload
export const addYouthCertificateWithFile = async (
  userId: string,
  certificate: Omit<YouthCertificate, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'verificationStatus' | 'adminFeedback'>,
  file: File
): Promise<string> => {
  try {
    const certId = uuidv4();
    
    // Upload file to Firebase Storage
    const fileExt = file.name.split('.').pop();
    const filePath = `certificates/${userId}/${certId}/file.${fileExt}`;
    const storageRef = ref(storage, filePath);
    
    await uploadBytes(storageRef, file);
    const fileUrl = await getDownloadURL(storageRef);
    
    // Save certificate metadata to Firestore subcollection (for user's own view)
    const certRef = doc(db, 'users', userId, 'certifications', certId);
    const certData = {
      userId,
      ...certificate,
      fileUrl,
      verificationStatus: 'Pending' as const,
      adminFeedback: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(certRef, certData);
    
    // ALSO save to top-level certificates collection for admin dashboard
    const { addCertificate } = await import('./services');
    const { getProfile } = await import('./services');
    
    try {
      // Get user profile for userName
      const profile = await getProfile(userId);
      const userName = profile?.fullName || profile?.name || 'Unknown User';
      
      await addCertificate({
        userId,
        userName,
        certificateType: certificate.certificateName,
        fileUrl,
        description: `${certificate.certificateName} from ${certificate.issuingOrganization}`,
        submittedAt: certificate.completionDate ? new Date(certificate.completionDate) : new Date(),
      });
      
      console.log('[addYouthCertificateWithFile] Certificate also saved to certificates collection for admin');
    } catch (adminError) {
      console.error('[addYouthCertificateWithFile] Error saving to certificates collection:', adminError);
      // Don't throw - the subcollection save succeeded, this is just for admin visibility
    }
    
    return certId;
  } catch (error) {
    console.error('Error adding youth certificate with file:', error);
    throw error;
  }
};

// Add a certificate with link
export const addYouthCertificateWithLink = async (
  userId: string,
  certificate: Omit<YouthCertificate, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'verificationStatus' | 'adminFeedback' | 'fileUrl'>
): Promise<string> => {
  try {
    const certId = uuidv4();
    
    // Save certificate metadata to Firestore subcollection (for user's own view)
    const certRef = doc(db, 'users', userId, 'certifications', certId);
    const certData = {
      userId,
      ...certificate,
      verificationStatus: 'Pending' as const,
      adminFeedback: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(certRef, certData);
    
    // ALSO save to top-level certificates collection for admin dashboard
    const { addCertificate } = await import('./services');
    const { getProfile } = await import('./services');
    
    try {
      // Get user profile for userName
      const profile = await getProfile(userId);
      const userName = profile?.fullName || profile?.name || 'Unknown User';
      
      await addCertificate({
        userId,
        userName,
        certificateType: certificate.certificateName,
        fileUrl: certificate.linkUrl, // Use linkUrl as fileUrl for link-based certificates
        description: `${certificate.certificateName} from ${certificate.issuingOrganization} - Link: ${certificate.linkUrl}`,
        submittedAt: certificate.completionDate ? new Date(certificate.completionDate) : new Date(),
      });
      
      console.log('[addYouthCertificateWithLink] Certificate also saved to certificates collection for admin');
    } catch (adminError) {
      console.error('[addYouthCertificateWithLink] Error saving to certificates collection:', adminError);
      // Don't throw - the subcollection save succeeded, this is just for admin visibility
    }
    
    return certId;
  } catch (error) {
    console.error('Error adding youth certificate with link:', error);
    throw error;
  }
};

// Update a certificate
export const updateYouthCertificate = async (
  userId: string,
  certId: string,
  updates: Partial<Omit<YouthCertificate, 'id' | 'userId' | 'createdAt'>>
): Promise<void> => {
  try {
    const certRef = doc(db, 'users', userId, 'certifications', certId);
    await updateDoc(certRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating youth certificate:', error);
    throw error;
  }
};

// Replace certificate file
export const replaceYouthCertificateFile = async (
  userId: string,
  certId: string,
  newFile: File,
  oldFileUrl?: string
): Promise<void> => {
  try {
    // Delete old file if exists
    if (oldFileUrl) {
      try {
        const oldStorageRef = ref(storage, oldFileUrl);
        await deleteObject(oldStorageRef);
      } catch (error) {
        console.warn('Error deleting old certificate file:', error);
        // Continue even if deletion fails
      }
    }
    
    // Upload new file
    const fileExt = newFile.name.split('.').pop();
    const filePath = `certificates/${userId}/${certId}/file.${fileExt}`;
    const storageRef = ref(storage, filePath);
    
    await uploadBytes(storageRef, newFile);
    const fileUrl = await getDownloadURL(storageRef);
    
    // Update certificate metadata
    const certRef = doc(db, 'users', userId, 'certifications', certId);
    await updateDoc(certRef, {
      fileUrl,
      linkUrl: null, // Remove link if file is uploaded
      verificationStatus: 'Pending', // Reset status when file is replaced
      adminFeedback: '',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error replacing youth certificate file:', error);
    throw error;
  }
};

// Delete a certificate
export const deleteYouthCertificate = async (userId: string, certId: string, fileUrl?: string): Promise<void> => {
  try {
    // Delete file from storage if exists
    if (fileUrl) {
      try {
        const storageRef = ref(storage, fileUrl);
        await deleteObject(storageRef);
      } catch (error) {
        console.warn('Error deleting certificate file:', error);
        // Continue even if deletion fails
      }
    }
    
    // Delete certificate document
    const certRef = doc(db, 'users', userId, 'certifications', certId);
    await deleteDoc(certRef);
  } catch (error) {
    console.error('Error deleting youth certificate:', error);
    throw error;
  }
};

// Real-time listener for certificates
export const subscribeToYouthCertificates = (
  userId: string,
  callback: (certificates: YouthCertificate[]) => void
): (() => void) => {
  try {
    const certsRef = collection(db, 'users', userId, 'certifications');
    const q = query(certsRef, orderBy('createdAt', 'desc'));
    
    return onSnapshot(
      q,
      (querySnapshot) => {
        const certificates = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as YouthCertificate[];
        callback(certificates);
      },
      (error) => {
        console.error('Error in certificates subscription:', error);
        callback([]);
      }
    );
  } catch (error) {
    console.error('Error setting up certificates subscription:', error);
    return () => {};
  }
};

// Get certificates filtered by status (excluding rejected by default for CV display)
export const getYouthCertificatesForCV = async (userId: string): Promise<YouthCertificate[]> => {
  try {
    const allCerts = await getYouthCertificates(userId);
    // Filter out rejected certificates for CV display
    return allCerts.filter(cert => cert.verificationStatus !== 'Rejected');
  } catch (error) {
    console.error('Error getting certificates for CV:', error);
    throw error;
  }
};
