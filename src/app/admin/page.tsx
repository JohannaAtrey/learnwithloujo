// Page component for the admin dashboard with metadata; renders the AdminDashboard inside a Suspense wrapper with a loading fallback.

import { Metadata } from 'next';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';


export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Manage your application settings and users',
};

// Renamed function for clarity
export default function AdminDashboardPage() {
  // This page component simply renders the main AdminDashboard component.
  // Protection and layout (including sidebar and header) are handled by the parent layout.tsx.
  return (
    <Suspense fallback={<LoadingSpinner />}>
       <AdminDashboard />
    </Suspense>
  );
}
