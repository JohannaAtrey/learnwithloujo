// This page component simply renders the main TeacherDashboard component.
// Protection and layout (including sidebar and header) are handled by the parent layout.tsx.

'use client';

import { TeacherDashboard } from '@/components/dashboard/TeacherDashboard';
import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function TeacherDashboardPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TeacherDashboard />
    </Suspense>
  );
}
