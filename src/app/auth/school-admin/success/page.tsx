// Client-side page that handles post-checkout logic for school admin signups.
// It verifies the Stripe session, signs in the user if needed, and redirects to the dashboard or onboarding flow.
// Could be improved.

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface PageProps {
  searchParams: Promise<{ session_id: string }>;
}

export default function SchoolAdminSuccessPage({
  searchParams
}: PageProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const handleSuccess = async () => {
      try {
        const params = await searchParams;
        const { session_id } = params;
        
        if (!session_id) {
          throw new Error('No session ID provided');
        }

        // Verify the session
        const response = await fetch(`/api/verify-session?session_id=${session_id}`);
        
        if (!response.ok) {
          throw new Error('Failed to verify session');
        }

        const data = await response.json();
        
        if (data.user) {
          // User already exists, try to sign them in
          if (data.customToken) {
            await signInWithCustomToken(auth, data.customToken);
          }
          router.push('/dashboard/school-admin');
        } else {
          // User doesn't exist yet, redirect to onboarding
          router.push(`/onboarding?session_id=${session_id}`);
        }
      } catch (err) {
        console.error('Error handling success:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    handleSuccess();
  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => router.push('/pricing')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Pricing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-green-600 mb-4">Success!</h1>
        <p className="text-gray-600">Redirecting you to your dashboard...</p>
      </div>
    </div>
  );
}