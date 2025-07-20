// Protected page for parents to view a list of songs they’ve generated.
// Accessible only to users with the 'parent' role and an active subscription.

'use client';

import ParentSongsList from '@/components/school-admin/ParentSongsList';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function ParentMySongsPage() {
  return (
    <ProtectedRoute requiredRole="parent" requiresSubscription>
      <ParentMySongsContent />
    </ProtectedRoute>
  );
}

function ParentMySongsContent() {

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">My Songs</h1>
      <ParentSongsList />
    </div>
  );
}
