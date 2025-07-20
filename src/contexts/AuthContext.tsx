/**
 * AuthProvider component and context
 *
 * - Manages Firebase authentication state and Firestore user data.
 * - Provides methods for login, logout, register, resetPassword, refresh token/session.
 * - Maintains user info (basic and extended), user role, loading and error states.
 * - Implements session timeout auto-logout after 30 minutes inactivity.
 * - Syncs auth state across tabs using localStorage events.
 * - Listens for realtime Firestore user document updates to keep user data fresh.
 * - Parses custom claims from Firebase ID token to extract user role (handles school_admin as teacher).
 * - Persists user info in localStorage for fallback/loading.
 * - Handles registration with optional school admin data.
 *
 * Usage:
 * Wrap app in <AuthProvider> to provide auth context.
 * Use `useAuth()` hook to access auth state and methods in components.
 */


'use client';

import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import { User, UserRole, UserData } from '@/types';
import { useRouter } from 'next/navigation';
import { 
  User as FirebaseUser,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { auth, firestore } from '@/lib/firebase';

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

// Define the shape of our auth context
/* eslint-disable no-unused-vars */
interface AuthContextType {
  user: User | null; // Basic auth user info
  fbUser: FirebaseUser | null; // Firebase auth user
  userRole: UserRole | null; // Role from token claims (includes school_admin)
  userData: UserData | null; // Comprehensive data from Firestore, including subscription
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string, role: UserRole, schoolAdminData?: { schoolName: string; position: string }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUserSession: () => void;
  refreshIdToken: () => Promise<string | null>;
  isLoading: boolean;
  error: string | null;
  loading: boolean;
}
/* eslint-enable no-unused-vars */

// Create the auth context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // State management for user data and auth status
  const [user, setUser] = useState<User | null>(null); // Basic auth user
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null); // Firebase auth user
  const [userRole, setUserRole] = useState<UserRole | null>(null); // Role from token
  const [userData, setUserData] = useState<UserData | null>(null); // Full data from Firestore
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // Refs for session management
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Firebase logout - defined as useCallback to prevent dependency issues
  const logout = useCallback(async () => {
    try {
      // Clean up session timeout
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }
      
      await signOut(auth);
      setUser(null);
      setFbUser(null);
      setUserRole(null);
      
      // Clear localStorage
      localStorage.removeItem('user');
      
      // Broadcast auth change to other tabs
      broadcastAuthChange('signedOut');
      
      router.push('/login');
    } catch (error: unknown) {
      console.error('Logout error:', error);
      setError(error instanceof Error ? error.message : 'Logout failed');
      throw error;
    }
  }, [router]);

  // Function to refresh user session and manage timeout
  const refreshUserSession = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // Clear existing timeout
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }
    
    // Only set timeout if user is logged in
    if (user) {
      sessionTimeoutRef.current = setTimeout(() => {
        const currentTime = Date.now();
        const timeSinceLastActivity = currentTime - lastActivityRef.current;
        
        // If inactive for longer than timeout period, log out
        if (timeSinceLastActivity >= SESSION_TIMEOUT) {
          logout();
        } else {
          // Otherwise, set a new timeout for the remaining time
          const remainingTime = SESSION_TIMEOUT - timeSinceLastActivity;
          sessionTimeoutRef.current = setTimeout(() => {
            logout();
          }, remainingTime);
        }
      }, SESSION_TIMEOUT);
    }
  }, [user, logout]);

  // Function to refresh the ID token and update user role
  const refreshIdToken = async (): Promise<string | null> => {
    if (!fbUser) return null;
    try {
      // Force token refresh to get the latest custom claims
      const idToken = await fbUser.getIdToken(true);
      
      // Get the token claims
      const idTokenResult = await fbUser.getIdTokenResult();
      const role = idTokenResult.claims.role as UserRole;
      
      // Update the user role if it has changed
      if (role && role !== userRole) {
        setUserRole(role);
        // Update the user object with the new role, ensuring it's a valid User role
        setUser(prev => {
          if (!prev) return null;
          // Convert school_admin to teacher for User type
          const userRole = role === 'school_admin' ? 'teacher' : role;
          return { ...prev, role: userRole as 'student' | 'teacher' | 'parent' };
        });
      }
      
      return idToken;
    } catch (error) {
      console.error('Error refreshing ID token:', error);
      return null;
    }
  };

  // Function to parse user custom claims from ID token
  const parseUserClaims = useCallback(async (user: FirebaseUser) => {
    try {
      const idTokenResult = await user.getIdTokenResult();
      const role = idTokenResult.claims.role as UserRole;
      return { role };
    } catch (error) {
      console.error('Error parsing user claims:', error);
      return { role: null };
    }
  }, []);

  // Broadcast auth changes to other tabs
  const broadcastAuthChange = (state: 'signedIn' | 'signedOut') => {
    localStorage.setItem('authState', state);
    localStorage.removeItem('authState'); // This ensures the event fires even if the value hasn't changed
  };

  // Setup activity listeners for session management
  useEffect(() => {
    const events = ['mousedown', 'keypress', 'scroll', 'touchstart', 'mousemove'];
    const handleUserActivity = () => refreshUserSession();
    
    events.forEach(event => window.addEventListener(event, handleUserActivity));
    refreshUserSession();
    
    return () => {
      events.forEach(event => window.removeEventListener(event, handleUserActivity));
      if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
    };
  }, [refreshUserSession]);

  // Handle cross-tab authentication
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'authState') {
        if (event.newValue === 'signedOut' && user) {
          setUser(null);
          setFbUser(null);
          setUserRole(null);
          router.push('/login');
        } else if (event.newValue === 'signedIn' && !user) {
          window.location.reload();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user, router]);

  // Check for Firebase auth state on initial load
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFbUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Parse custom claims from ID token
          const { role } = await parseUserClaims(firebaseUser);
          
          // Get user data from Firestore
          const userDoc = await getDoc(doc(firestore, 'users', firebaseUser.uid));
          
          // Create user object with proper types
          const userObj: User = {
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || (userDoc.exists() ? userDoc.data()?.name : '') || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email || (userDoc.exists() ? userDoc.data()?.email : '') || 'No email',
            role: (role === 'school_admin' ? 'teacher' : role) as 'student' | 'teacher' | 'parent',
            createdAt: userDoc.exists() ? userDoc.data()?.createdAt : Timestamp.now(),
            updatedAt: Timestamp.now().toDate().toISOString()
          };
          
          setUser(userObj);
          setUserRole(role);
          
          localStorage.setItem('user', JSON.stringify(userObj));
          
          // If role is from Firestore but not in token, refresh token
          if (!role && userDoc.exists() && userDoc.data().role) {
            firebaseUser.getIdToken(true);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          
          // Fallback to localStorage if available
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser) as User;
            setUser(parsedUser);
            setUserRole(parsedUser.role as UserRole);
          }
        }
      } else {
        setUser(null);
        setUserRole(null);
        localStorage.removeItem('user');
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [parseUserClaims]);

  // Listen for Firestore user data changes
  useEffect(() => {
    if (!fbUser) {
      setUserData(null);
      return;
    }

    const unsubscribe = onSnapshot(doc(firestore, 'users', fbUser.uid), (firestoreDoc) => {
      if (firestoreDoc.exists()) {
        const dataFromFirestore = firestoreDoc.data();
        const completeUserData: UserData = {
          id: firestoreDoc.id,
          email: dataFromFirestore.email || '',
          name: dataFromFirestore.name || '',
          role: dataFromFirestore.role || 'student',
          createdAt: typeof dataFromFirestore.createdAt?.toDate === 'function' 
            ? dataFromFirestore.createdAt.toDate().toISOString()
            : typeof dataFromFirestore.createdAt === 'string'
              ? dataFromFirestore.createdAt
              : new Date().toISOString(),
          updatedAt: typeof dataFromFirestore.updatedAt?.toDate === 'function'
            ? dataFromFirestore.updatedAt.toDate().toISOString()
            : typeof dataFromFirestore.updatedAt === 'string'
              ? dataFromFirestore.updatedAt
              : undefined,
          stripeCustomerId: dataFromFirestore.stripeCustomerId,
          isSchoolAdminSubscribed: dataFromFirestore.isSchoolAdminSubscribed ?? dataFromFirestore.isSubscribed ?? false,
          schoolAdminSubscriptionId: dataFromFirestore.schoolAdminSubscriptionId,
          schoolAdminStripePriceId: dataFromFirestore.schoolAdminStripePriceId,
          schoolAdminCurrentPeriodEnd: dataFromFirestore.schoolAdminCurrentPeriodEnd,
          schoolAdminMonthlyQuota: dataFromFirestore.schoolAdminMonthlyQuota,
          schoolAdminGenerationsThisMonth: dataFromFirestore.schoolAdminGenerationsThisMonth,
          schoolAdminLastQuotaReset: dataFromFirestore.schoolAdminLastQuotaReset,
          isParentSubscribed: dataFromFirestore.isParentSubscribed ?? dataFromFirestore.isSubscribed ?? false,
          parentSubscriptionId: dataFromFirestore.parentSubscriptionId,
          parentStripePriceId: dataFromFirestore.parentStripePriceId,
          parentCurrentPeriodEnd: dataFromFirestore.parentCurrentPeriodEnd,
          parentMonthlyQuota: dataFromFirestore.parentMonthlyQuota,
          parentGenerationsThisMonth: dataFromFirestore.parentGenerationsThisMonth,
          parentLastQuotaReset: dataFromFirestore.parentLastQuotaReset,
          schoolName: dataFromFirestore.schoolName,
          position: dataFromFirestore.position,
          avatar: dataFromFirestore.avatar,
          customerId: dataFromFirestore.customerId,
          mandateId: dataFromFirestore.mandateId,
          creditorId: dataFromFirestore.creditorId,
          billingRequestId: dataFromFirestore.billingRequestId,
          subscriptionId: dataFromFirestore.subscriptionId,
          subscriptionPlan: dataFromFirestore.subscriptionPlan,
          subcriptionStartDate: dataFromFirestore.subcriptionStartDate,
          subcriptionEndDate: dataFromFirestore.subcriptionEndDate,
          subcriptionCancelledDate: dataFromFirestore.subcriptionCancelledDate,
          subcriptionStatus: dataFromFirestore.subcriptionStatus,
          paymentStatus: dataFromFirestore.paymentStatus,
          paymentId: dataFromFirestore.paymentId,
          amount: dataFromFirestore.amount,
        };
        setUserData(completeUserData);
      } else {
        setUserData(null);
      }
    });

    return () => unsubscribe();
  }, [fbUser]);

  // Firebase login implementation
  const login = async (email: string, password: string, rememberMe = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (rememberMe) {
        await setPersistence(auth, browserLocalPersistence);
      }
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      try {
        const { role } = await parseUserClaims(firebaseUser);
        const userDoc = await getDoc(doc(firestore, 'users', firebaseUser.uid));
        
        const userObj: User = {
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || (userDoc.exists() ? userDoc.data()?.name : email.split('@')[0]) || 'User',
          email: firebaseUser.email || email,
          role: (role === 'school_admin' ? 'teacher' : role) as 'student' | 'teacher' | 'parent',
          createdAt: userDoc.exists() ? userDoc.data()?.createdAt : Timestamp.now(),
          updatedAt: Timestamp.now().toDate().toISOString()
        };
        
        setUser(userObj);
        setUserRole(role);
        localStorage.setItem('user', JSON.stringify(userObj));
        broadcastAuthChange('signedIn');
        refreshUserSession();
        router.push(`/dashboard`);
      } catch (error) {
        console.error('Error processing login:', error);
        
        // Basic fallback user object
        const userObj: User = {
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || email.split('@')[0] || 'User',
          email: firebaseUser.email || email,
          role: 'student',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now().toDate().toISOString()
        };
        
        setUser(userObj);
        setUserRole('student');
        localStorage.setItem('user', JSON.stringify(userObj));
        broadcastAuthChange('signedIn');
        refreshUserSession();
        router.push('/dashboard');
      }
    } catch (error: unknown) {
      console.error('Login error:', error);
      let errorMessage = 'Invalid email or password';
      
      if (error instanceof Error && 'code' in error) {
        const firebaseError = error as { code: string };
        if (firebaseError.code === 'auth/user-not-found') {
          errorMessage = 'No account found with this email';
        } else if (firebaseError.code === 'auth/wrong-password') {
          errorMessage = 'Incorrect password';
        } else if (firebaseError.code === 'auth/too-many-requests') {
          errorMessage = 'Too many failed attempts. Please try again later';
        } else if (firebaseError.code === 'auth/invalid-credential') {
          errorMessage = 'Invalid email or password';
        }
      }
      
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Firebase registration implementation
  const register = async (
    name: string, 
    email: string, 
    password: string, 
    role: UserRole,
    schoolAdminData?: { schoolName: string; position: string }
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      await updateProfile(firebaseUser, { displayName: name });
      
      const userData = {
        name,
        email,
        role,
        createdAt: Timestamp.now(),
        ...(role === 'school_admin' && schoolAdminData ? {
          schoolName: schoolAdminData.schoolName,
          position: schoolAdminData.position,
          isSubscribed: false
        } : {})
      };
      
      await setDoc(doc(firestore, 'users', firebaseUser.uid), userData);
      
      const idToken = await firebaseUser.getIdToken();
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          idToken,
          ...(role === 'school_admin' && schoolAdminData ? {
            schoolName: schoolAdminData.schoolName,
            position: schoolAdminData.position
          } : {})
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Registration failed');
      }
      
      await firebaseUser.getIdToken(true);
      
      const userObj: User = {
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        name,
        email,
        role: (role === 'school_admin' ? 'teacher' : role) as 'student' | 'teacher' | 'parent',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now().toDate().toISOString()
      };
      
      setUser(userObj);
      setUserRole(role);
      localStorage.setItem('user', JSON.stringify(userObj));
      broadcastAuthChange('signedIn');
      refreshUserSession();
      router.push(`/dashboard`);
    } catch (err: unknown) {
      console.error('Registration error:', err);
      setIsLoading(false);
      
      if (err instanceof Error && 'code' in err) {
        const firebaseError = err as { code: string };
        if (firebaseError.code === 'auth/email-already-in-use') {
          setError('This email is already registered. Please use a different email or try logging in.');
        } else {
          setError(err.message || 'Registration failed. Please try again.');
        }
      } else {
        setError('Registration failed. Please try again.');
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Password reset implementation
  const resetPassword = async (email: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await sendPasswordResetEmail(auth, email);
      return Promise.resolve();
    } catch (error: unknown) {
      console.error('Password reset error:', error);
      let errorMessage = 'Failed to send password reset email';
      
      if (error instanceof Error && 'code' in error) {
        const firebaseError = error as { code: string };
        if (firebaseError.code === 'auth/user-not-found') {
          errorMessage = 'No account found with this email';
        } else if (firebaseError.code === 'auth/invalid-email') {
          errorMessage = 'Please enter a valid email address';
        }
      }
      
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Provide auth context value
  const value = {
    user,
    fbUser,
    userRole,
    userData,
    login,
    logout,
    register,
    resetPassword,
    refreshUserSession,
    refreshIdToken,
    isLoading,
    error,
    loading: isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook for using auth context is now defined in @/hooks/use-auth.ts
// All components should import { useAuth } from '@/hooks/use-auth';