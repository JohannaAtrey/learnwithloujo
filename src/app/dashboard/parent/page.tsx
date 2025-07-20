// This page component simply renders the main ParentDashboard component.
// Protection and layout (including sidebar and header) are handled by the parent layout.tsx.

'use client';

import ParentDashboard from '@/components/dashboard/ParentDashboard';
import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function ParentDashboardPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ParentDashboard />
    </Suspense>
  );
}
