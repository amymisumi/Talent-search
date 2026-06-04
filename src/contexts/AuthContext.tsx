import { createContext, useContext, useEffect, useRef, useState } from 'react';
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

const AUTH_ROLE_CACHE_KEY = 'authRole';

type UserData = {
  role?: string;
  email?: string;
  uid: string;
  [key: string]: unknown;
};

type AuthContextType = {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UserData>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (data: Record<string, unknown>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const initialCheckDone = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const loadUserData = async (user: User | null) => {
      if (!user) {
        if (!isMounted) return;
        setCurrentUser(null);
        setUserData(null);
        setLoading(false);
        initialCheckDone.current = true;
        try {
          sessionStorage.removeItem(AUTH_ROLE_CACHE_KEY);
        } catch {
          // ignore
        }
        return;
      }

      if (!isMounted) return;
      setCurrentUser(user);

      const cachedRole = (() => {
        try {
          return sessionStorage.getItem(AUTH_ROLE_CACHE_KEY);
        } catch {
          return null;
        }
      })();

      // Use role from login flow so protected routes can render immediately
      if (cachedRole) {
        setUserData({
          uid: user.uid,
          email: user.email ?? undefined,
          role: cachedRole,
        });
        setLoading(false);
      } else if (!initialCheckDone.current) {
        setLoading(true);
      }

      // Presence updates should not block navigation
      void setUserOnline(user.uid).catch((presenceError) => {
        console.error('[AuthContext] Error setting user online:', presenceError);
      });

      try {
        const [roleDoc, profileDoc, userDoc] = await Promise.all([
          getDoc(doc(db, 'userRoles', user.uid)),
          getDoc(doc(db, 'profiles', user.uid)),
          getDoc(doc(db, 'users', user.uid)),
        ]);

        if (!isMounted) return;

        const role = roleDoc.exists()
          ? roleDoc.data().role
          : cachedRole || 'user';

        const combined: UserData = {
          ...(userDoc.exists() ? userDoc.data() : {}),
          ...(profileDoc.exists() ? profileDoc.data() : {}),
          role: role || 'user',
          uid: user.uid,
          email: user.email ?? undefined,
        };

        setUserData(combined);
        try {
          sessionStorage.removeItem(AUTH_ROLE_CACHE_KEY);
        } catch {
          // ignore
        }
      } catch (error) {
        console.error('[AuthContext] Error loading user data:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
          initialCheckDone.current = true;
        }
      }
    };

    const unsubscribe = onAuthStateChanged(auth, loadUserData);
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    const user = userCredential.user;

    if (!user) {
      throw new Error('Failed to sign in');
    }

    const [roleDoc, userDoc, profileDoc] = await Promise.all([
      getDoc(doc(db, 'userRoles', user.uid)),
      getDoc(doc(db, 'users', user.uid)),
      getDoc(doc(db, 'profiles', user.uid)),
    ]);

    const role = roleDoc.exists() ? roleDoc.data().role : null;
    const data: UserData = {
      ...(userDoc.exists() ? userDoc.data() : {}),
      ...(profileDoc.exists() ? profileDoc.data() : {}),
      role: role || 'user',
      email: user.email ?? undefined,
      uid: user.uid,
    };

    setUserData(data);
    setCurrentUser(user);
    setLoading(false);
    return data;
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);

    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName });
    }

    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email,
      displayName,
      createdAt: new Date().toISOString(),
      profileComplete: false,
    });
  };

  const signOut = async () => {
    if (currentUser) {
      void setUserOffline(currentUser.uid).catch((presenceError) => {
        console.error('[AuthContext] Error setting user offline:', presenceError);
      });
    }
    try {
      sessionStorage.removeItem(AUTH_ROLE_CACHE_KEY);
    } catch {
      // ignore
    }
    await firebaseSignOut(auth);
  };

  const updateUserProfile = async (data: Record<string, unknown>) => {
    if (!currentUser) return;

    const userRef = doc(db, 'users', currentUser.uid);
    await setDoc(userRef, { ...data }, { merge: true });
    setUserData((prev) => (prev ? { ...prev, ...data } : prev));
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
      {children}
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

export { AUTH_ROLE_CACHE_KEY };
