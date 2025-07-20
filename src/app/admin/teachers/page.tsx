// Page component for managing teachers, accessible only to users with the 'school_admin' role; includes authentication, role-based access control, and layout integration.

'use client';

import MainLayout from '@/components/layout/MainLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/use-auth';
import TeacherManagement from '@/components/dashboard/TeacherManagement';

export default function TeacherManagementPage() {
  const { user, userRole, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <ProtectedRoute requiredRole="school_admin">
      <MainLayout>
        <div className="container mx-auto py-8">
          <h1 className="text-3xl font-bold mb-8">Teacher Management</h1>
          {user && userRole === 'school_admin' ? (
            <TeacherManagement />
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {!user ? 'Please log in to access this page.' : 
                 userRole !== 'school_admin' ? 'You need school admin privileges to access this page.' :
                 'You don\'t have permission to access this page.'}
              </p>
            </div>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
} 