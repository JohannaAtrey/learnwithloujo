// Onboarding Page:
// Verifies a Stripe session after checkout and renders the onboarding form for school setup completion.
// Handles session validation, error states, and redirects if the session is invalid or missing.

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { OnboardingForm } from '@/components/OnboardingForm';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      setError('No session ID found. Please complete the checkout process first.');
      setLoading(false);
      return;
    }

    // Verify the session is valid
    const verifySession = async () => {
      try {
        const response = await fetch('/api/stripe/verify-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) {
          throw new Error('Invalid session');
        }

        setLoading(false);
      } catch (error) {
        console.error('Error verifying session:', error);
        setError('Invalid session. Please try the checkout process again.');
        setLoading(false);
      }
    };

    verifySession();
  }, [searchParams]);

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
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/pricing')}
            className="bg-[#e55283] text-white px-6 py-2 rounded-md hover:bg-[#e55283]/90"
          >
            Return to Pricing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Complete Your Setup</h1>
            <p className="text-gray-600">
              Please fill out the form below to complete your school setup
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <OnboardingForm sessionId={searchParams.get('session_id')!} />
          </div>
        </div>
      </div>
    </div>
  );
} 