'use client';

import { Button } from '@/components/ui/button';
import { useState } from "react";
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface CancelButtonProps {
  subscriptionId: string;
  className?: string;
}

export function CancelSubscriptionButton({ 
  subscriptionId, 
  className 
}: CancelButtonProps) {
  const [loading, setLoading] = useState(false);
  const { fbUser, userData } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const isSubCancelled = userData?.subcriptionStatus === 'cancelled' ? true : false

  const handleCancel = async () => {


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
      const res = await fetch('/api/gocardless/cancel-subscription', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ subscriptionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      toast({
        title: "Success",
        description: "Subscription cancelled successfully",
        variant: "default",
      });

      router.replace('/dashboard/school-admin');
      router.refresh(); // Ensure fresh data is loaded

    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error 
          ? error.message 
          : 'Something went wrong. Please try again.',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="destructive"
      onClick={handleCancel}
      disabled={loading || isSubCancelled}
      className={`gap-2 ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Cancelling...
        </>
      ) : isSubCancelled ? (
          'Subscription Cancelled'
        ) : (
          'Cancel Subscription'
      )}
    </Button>
  );
}