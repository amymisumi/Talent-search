import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../integrations/firebase/client';
import { setUserOnline, setUserOffline } from '../integrations/firebase/presenceService';

type UserData = {
  role?: string;
  email?: string;
  uid: string;
  [key: string]: any; // Allow any additional user properties
};

type AuthContextType = {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UserData>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (data: any) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async (user: any) => {
      setCurrentUser(user);
      if (user) {
        try {
          setLoading(true);
          
          // Set user online status
          try {
            await setUserOnline(user.uid);
          } catch (presenceError) {
            console.error('[AuthContext] Error setting user online:', presenceError);
          }
          
          // Get user role first
          const roleDoc = await getDoc(doc(db, 'userRoles', user.uid));
          const role = roleDoc.exists() ? roleDoc.data().role : null;
          
          // Then get profile data
          const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
          const userDoc = await getDoc(doc(db, 'users', user.uid));

          console.log('[AuthContext] User document exists:', userDoc.exists());
          console.log('[AuthContext] Profile document exists:', profileDoc.exists());
          console.log('[AuthContext] User role:', role);
          
          // Combine all user data
          const userData = {
            ...(userDoc.exists() ? userDoc.data() : {}),
            ...(profileDoc.exists() ? profileDoc.data() : {}),
            role: role || 'user' // Default to 'user' if no role is set
          };
          
          console.log('[AuthContext] Combined user data:', userData);
          setUserData(userData);
        } catch (error) {
          console.error('[AuthContext] Error loading user data:', error);
          // Don't set userData to null on error - keep previous value to prevent redirects
          // Only set to null if we're sure the user is logged out
          console.warn('[AuthContext] Error loading user data, keeping previous userData to prevent redirect loops');
        } finally {
          setLoading(false);
        }
      } else {
        setUserData(null);
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, loadUserData);
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('[AuthContext] Attempting to sign in with:', email);
      
      // Basic validation
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      // Trim and normalize email
      const normalizedEmail = email.trim().toLowerCase();
      
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      console.log('[AuthContext] Firebase Auth successful, UID:', userCredential.user?.uid);
      
      // Force refresh of user data
      const user = userCredential.user;
      if (user) {
        console.log('[AuthContext] Fetching additional user data...');
        try {
          const [roleDoc, userDoc, profileDoc] = await Promise.all([
            getDoc(doc(db, 'userRoles', user.uid)),
            getDoc(doc(db, 'users', user.uid)),
            getDoc(doc(db, 'profiles', user.uid))
          ]);
          
          const role = roleDoc.exists() ? roleDoc.data().role : null;
          
          console.log('[AuthContext] Fetched documents:', {
            roleExists: roleDoc.exists(),
            userDocExists: userDoc.exists(),
            profileDocExists: profileDoc.exists()
          });
          
          const userData = {
            ...(userDoc.exists() ? userDoc.data() : {}),
            ...(profileDoc.exists() ? profileDoc.data() : {}),
            role: role || 'user',
            email: user.email,
            uid: user.uid
          };
          
          console.log('[AuthContext] Setting user data:', userData);
          setUserData(userData);
          return userData;
        } catch (dbError) {
          console.error('[AuthContext] Error fetching user data:', dbError);
          // Still return the user even if we couldn't fetch additional data
          return user;
        }
      }
      
      return user;
    } catch (error: any) {
      let errorMessage = 'Failed to sign in';
      
      // Handle specific Firebase Auth errors
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
            errorMessage = 'No user found with this email';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Incorrect password';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many attempts. Please try again later.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address';
            break;
          default:
            errorMessage = error.message || 'An error occurred during sign in';
        }
      }
      
      console.error('[AuthContext] Sign in error:', {
        code: error.code,
        message: error.message,
        email: email,
        error: error
      });
      
      throw new Error(errorMessage);
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Set display name in auth
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName });
    }

    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email,
      displayName,
      createdAt: new Date().toISOString(),
      profileComplete: false
    });
  };

  const signOut = async () => {
    // Set user offline before signing out
    if (currentUser) {
      try {
        await setUserOffline(currentUser.uid);
      } catch (presenceError) {
        console.error('[AuthContext] Error setting user offline:', presenceError);
      }
    }
    await firebaseSignOut(auth);
  };

  const updateUserProfile = async (data: any) => {
    if (!currentUser) return;
    
    const userRef = doc(db, 'users', currentUser.uid);
    await setDoc(userRef, { ...data }, { merge: true });
    
    // Update local state with proper typing
    setUserData((prev: any) => ({ ...prev, ...data }));
  };

  const value = {
    currentUser,
    userData,
    loading,
    signIn,
    signUp,
    signOut,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
