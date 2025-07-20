// This component handles redirecting the user after a successful checkout or action.
// It waits for the session_id query parameter, then redirects:
// - To the school admin success page if session_id is present,
// - Or to the pricing page if missing.
// Meanwhile, it shows a simple loading message.

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PageProps {
  searchParams: Promise<{ session_id: string }>;
}

export default function SuccessPage({
  searchParams
}: PageProps) {
  const router = useRouter();

  useEffect(() => {
    const handleRedirect = async () => {
      const params = await searchParams;
      const { session_id } = params;
      
      if (session_id) {
        // Redirect to school admin success page with the session ID
        router.push(`/auth/school-admin/success?session_id=${session_id}`);
      } else {
        // No session ID, redirect to pricing page
        router.push('/pricing');
      }
    };

    handleRedirect();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Processing...</h1>
        <p className="text-gray-600">Please wait while we redirect you.</p>
      </div>
    </div>
  );
}