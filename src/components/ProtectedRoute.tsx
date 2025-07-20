/**
 * ProtectedRoute component
 * 
 * - Wraps child components to enforce authentication and role-based access control.
 * - Redirects to login page if user is not authenticated.
 * - Redirects to dashboard if user role does not match the required role.
 * - Optionally checks if user has an active subscription when requiresSubscription is true.
 * - Shows a loading spinner while auth state is loading.
 * - Renders children only if all conditions pass.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

import { UserRole } from '@/types'; 

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: UserRole; 
  requiresSubscription?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requiredRole,
  requiresSubscription = false 
}: ProtectedRouteProps) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (userData?.role !== requiredRole) {
        router.push('/dashboard');
      } else if (requiresSubscription) {
        const isSubscribed = userData?.role === 'parent' 
          ? userData?.isParentSubscribed 
          : userData?.isSchoolAdminSubscribed;
        
        if (!isSubscribed) {
          router.push('/dashboard');
        }
      }
    }
  }, [user, userData, loading, router, requiredRole, requiresSubscription]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#e55283]" />
      </div>
    );
  }

  if (!user || userData?.role !== requiredRole) {
    return null;
  }

  if (requiresSubscription) {
    const isSubscribed = userData?.role === 'parent' 
      ? userData?.isParentSubscribed 
      : userData?.isSchoolAdminSubscribed;
    
    if (!isSubscribed) {
      return null;
    }
  }

  return <>{children}</>;
}
