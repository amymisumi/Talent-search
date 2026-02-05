import { useState, useEffect, useContext, createContext, ReactNode, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  User
} from 'firebase/auth';
import { auth } from '../integrations/firebase/client';
import { useNavigate } from 'react-router-dom';
import { getUserRole, setUserRole, getUserData } from '../integrations/firebase/services';
import type { UserRole } from '../integrations/firebase/types';

interface AppUser extends User {
  role?: string;
}

interface UserData {
  displayName?: string;
  email?: string;
  photoURL?: string;
  role?: string;
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

interface AuthContextType {
  user: AppUser | null;
  currentUser: AppUser | null; // Alias for user for backward compatibility
  userData: UserData | null;   // Additional user data from Firestore
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (updates: { displayName?: string; photoURL?: string; role?: string }) => Promise<void>;
  refreshUser: () => Promise<void>;
  // Add any additional methods or properties needed by your components
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Alias user as currentUser for backward compatibility
  const currentUser = user;

  const fetchUserRole = useCallback(async (user: User): Promise<AppUser> => {
    try {
      const role = await getUserRole(user.uid);
      return { ...user, role } as AppUser;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return { ...user, role: undefined } as AppUser;
    }
  }, []);

  const loadUserData = useCallback(async (userId: string) => {
    try {
      const userData = await getUserData(userId);
      setUserData(prev => ({
        ...prev,
        ...userData
      }));
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (auth.currentUser) {
      const userWithRole = await fetchUserRole(auth.currentUser);
      setUser(userWithRole);
    }
  }, [fetchUserRole]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userWithRole = await fetchUserRole(firebaseUser);
        setUser(userWithRole);
        
        // Set basic user data
        const basicUserData = {
          displayName: userWithRole.displayName || '',
          email: userWithRole.email || '',
          photoURL: userWithRole.photoURL || '',
          role: userWithRole.role,
        };
        
        setUserData(basicUserData);
        
        // Load additional user data from Firestore
        if (firebaseUser.uid) {
          await loadUserData(firebaseUser.uid);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchUserRole, loadUserData]);

  const signIn = async (email: string, password: string) => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const userWithRole = await fetchUserRole(user);
      setUser(userWithRole);
      
      // Load user data from Firestore
      if (user.uid) {
        await loadUserData(user.uid);
      }
      
      // Navigate based on role
      if (userWithRole.role === 'youth') {
        navigate('/youth-dashboard');
      } else if (userWithRole.role === 'recruiter') {
        navigate('/recruiter-dashboard');
      } else {
        navigate('/onboarding');
      }
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName: string, role: UserRole) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user's profile with display name
      await updateProfile(user, { displayName });
      
      // Set the user role in your database
      await setUserRole(user.uid, role);
      
      // Refresh the user to get the updated profile
      const userWithRole = await fetchUserRole(user);
      setUser(userWithRole);
      
      // Set userData when signing up
      setUserData({
        displayName: userWithRole.displayName || '',
        email: userWithRole.email || '',
        photoURL: userWithRole.photoURL || '',
        role: userWithRole.role,
        // Initialize other fields as needed
      });
      
      // Navigate based on role
      if (role === 'youth') {
        navigate('/youth-dashboard');
      } else if (role === 'recruiter') {
        navigate('/recruiter-dashboard');
      } else {
        navigate('/onboarding');
      }
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      // Don't navigate here - let the onAuthStateChanged handler handle the navigation
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const updateUserProfile = async (updates: { displayName?: string; photoURL?: string; role?: string }) => {
    if (!auth.currentUser) return;

    try {
      // Only update Firebase profile for displayName and photoURL
      const { role, ...profileUpdates } = updates;
      if (Object.keys(profileUpdates).length > 0) {
        await updateProfile(auth.currentUser, profileUpdates);
      }
      
      // Update the user object with all updates (including role)
      setUser(prev => ({
        ...prev,
        ...auth.currentUser,
        ...updates
      } as AppUser));
      
      // Here you would typically also update the role in your database
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const handleUpdateProfile = async (updates: { displayName?: string; photoURL?: string; role?: string }) => {
    try {
      await updateUserProfile(updates);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    currentUser,
    userData,
    loading,
    signIn,
    signUp,
    signOut: handleSignOut,
    updateUserProfile: handleUpdateProfile,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;
