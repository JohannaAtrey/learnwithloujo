// Page displayed when a user cancels the Stripe checkout process.
// Informs the user that no payment was made and offers navigation back to the homepage.

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CancelPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-4">Payment Cancelled</h1>
          <p className="text-gray-600 mb-8">
            Your payment was cancelled. No charges were made to your account.
          </p>
        </div>
        
        <div className="space-y-4">
          <Link href="/">
            <Button className="w-full">
              Return to Home
            </Button>
          </Link>
          <p className="text-sm text-gray-500">
            If you have any questions, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
} 