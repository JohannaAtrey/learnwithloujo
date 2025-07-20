// This page component simply renders the main StudentDashboard component.
// Protection and layout (including sidebar) are handled by the parent layout.tsx.

'use client';

import StudentDashboard from '@/components/dashboard/StudentDashboard';
import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function StudentDashboardPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <StudentDashboard />
    </Suspense>
  );
}
