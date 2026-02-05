export interface UserProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  bio?: string;
  phone?: string;
  location?: string;
  talentArea?: string;
  yearsOfExperience?: number;
  skills?: string[];
  profileImageUrl?: string;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    portfolio?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioItem {
  id: string;
  userId: string;
  title: string;
  description: string;
  fileUrl: string;
  fileType: 'image' | 'video' | 'pdf' | 'other';
  fileName: string;
  fileSize: number;
  createdAt: Date;
  storagePath?: string;
}

export interface Certificate {
  id: string;
  userId: string;
  title: string;
  issuingOrganization: string;
  issueDate: Date;
  expiryDate?: Date;
  credentialId?: string;
  credentialUrl?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  isVerified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
  createdAt: Date;
  storagePath?: string;
}
