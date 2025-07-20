/**
 * Providers component
 *
 * - Initializes Firebase app once on client side using environment config variables.
 * - Sets up a Firebase Authentication state listener (onAuthStateChanged) to log user sign-in status.
 * - Manages internal state `isInitialized` to prevent rendering children until Firebase is initialized.
 * - Wraps children with custom AuthProvider context to provide auth state to app.
 * - Includes global Toaster component for notifications.
 */

'use client';

import { useEffect, useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'sonner';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize Firebase if it hasn't been initialized yet
    if (!getApps().length) {
      initializeApp(firebaseConfig);
    }

    // Set up auth state listener
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in
        console.log('User is signed in');
      } else {
        // User is signed out
        console.log('User is signed out');
      }
    });

    setIsInitialized(true);

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  if (!isInitialized) {
    return null;
  }

  return (
    <AuthProvider>
      {children}
      <Toaster />
    </AuthProvider>
  );
} 