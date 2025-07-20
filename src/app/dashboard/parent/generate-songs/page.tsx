// Protected page for parents to generate personalized educational songs.
// Requires parent role and an active subscription to access.

'use client';

import React from 'react';
import GenerateMusicForm from '@/components/dashboard/GenerateMusicForm';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function ParentGenerateSongsPage() {
  return (
    <ProtectedRoute requiredRole="parent" requiresSubscription>
      <ParentGenerateSongsContent />
    </ProtectedRoute>
  );
}

function ParentGenerateSongsContent() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
          Create a Song for Your Child
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Unleash creativity and make learning fun with custom-generated songs!
        </p>
      </div>
      <GenerateMusicForm />
    </div>
  );
}
