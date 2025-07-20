/**
 * CheckoutButton component
 * 
 * - Initiates a subscription checkout process using a provided Stripe price ID.
 * - Checks for required props and authenticated user before proceeding.
 * - Calls backend API to create a checkout session and redirects user to Stripe checkout.
 * - Displays loading state during the async operation.
 * - Handles and displays errors via toast notifications.
 * - Accepts optional className for styling flexibility.
 */

'use client';

import React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

type PlanType = 'Monthly' | 'Yearly';
interface CheckoutButtonProps {
  userPlan: PlanType;
  userType: string;
  className?: string;
  checkPlan?: boolean;
}

export function CheckoutButton({ userPlan, userType, className, checkPlan }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const { fbUser } = useAuth();
  const { toast } = useToast();

  const handleCheckout = async () => {
    if (!fbUser) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to subscribe.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const idToken = await fbUser.getIdToken();

      const res = await fetch('/api/gocardless/redirect-flow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ userPlan, userType }),
      });
      const {redirectUrl} = await res.json();
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: unknown) {
      console.error('Error during checkout:', error);
      toast({
        title: "Checkout Error",
        description: error instanceof Error ? error.message : 'Failed to start checkout. Please try again.',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={loading || checkPlan}
      className={className}
    >
      {loading ? 'Loading...' : 'Subscribe Now'}
    </Button>
  );
}
