// DashboardRedirector:
// Automatically redirects authenticated users to the appropriate dashboard
// based on their role (parent, teacher, school admin, student, admin).
// Redirects unauthenticated users to the login page.

'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth'; 
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

export default function DashboardRedirector() { 
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (userData?.role === 'parent') {
        router.push('/dashboard/parent');
      } else if (userData?.role === 'teacher') {
        router.push('/dashboard/teacher');
      } else if (userData?.role === 'admin') { 
        router.push('/admin');
      } else if (userData?.role === 'school_admin') {
        router.push('/dashboard/school-admin');
      } else if (userData?.role === 'student') {
        router.push('/dashboard/student');
      } else {
        console.warn('User logged in but role is unknown or missing, redirecting to /profile');
        router.push('/profile'); 
      }
    }
  }, [loading, user, userData, router]); 

  // Show loading state while checking auth or redirecting
  if (loading || user) { 
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#e55283]" />
      </div>
    );
  }

  return null;
}
