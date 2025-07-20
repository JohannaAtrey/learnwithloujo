// School admin dashboard page for managing teacher accounts.
// Requires authenticated, subscribed school_admin user.
// Renders teacher management UI and redirects if user is not subscribed.

'use client';

import { useAuth } from '@/hooks/use-auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import ProtectedRoute from '@/components/ProtectedRoute';
import ManageTeachers from '@/components/school-admin/ManageTeachers';
import { useRouter } from 'next/navigation';

export default function TeachersPage() {
  return (
    <ProtectedRoute requiredRole="school_admin" requiresSubscription>
      <TeachersPageContent />
    </ProtectedRoute>
  );
}

function TeachersPageContent() {
  const { userData, loading } = useAuth();
  const router = useRouter();
  const isSubscribed = userData?.isSchoolAdminSubscribed || false;

  if (loading) {
    return <LoadingSpinner />;
  }

  // Redirect if not subscribed
  if (!isSubscribed) {
    router.push('/dashboard/school-admin');
    return null;
  }

  return (
    <div className="container mx-auto py-8"> 
      <h1 className="text-3xl font-bold mb-8">Teacher Management</h1>
      <ManageTeachers />
    </div>
  );
}
