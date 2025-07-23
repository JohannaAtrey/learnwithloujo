// Page for school admins to view and manage their subscription plan.
// Displays plan details, benefits, and Stripe checkout integration.
// Protected by role-based access and displays billing status dynamically.

'use client';

import { Suspense } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import ProtectedRoute from '@/components/ProtectedRoute';
import { CheckoutButton } from '@/components/CheckoutButton';
import { Check } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';

export default function SchoolAdminSubscription() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProtectedRoute requiredRole="school_admin">
        <SchoolAdminSubscriptionContent />
      </ProtectedRoute>
      </Suspense>
    );
  }

function SchoolAdminSubscriptionContent() {
  const { userData, loading } = useAuth();
  const isSubscribed = userData?.isSchoolAdminSubscribed || false;

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Subscription Plans</h1>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-[#e55283]">School Plan</h3>
                  <p className="text-gray-600">Perfect for schools and educational institutions</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">£4.99</div>
                  <div className="text-gray-600">per month</div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-[#e55283]" />
                  <span>Unlimited teachers and students</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-[#e55283]" />
                  <span>Unlimited song generation</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-[#e55283]" />
                  <span>Advanced analytics and reporting</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-[#e55283]" />
                  <span>Priority support</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-[#e55283]" />
                  <span>Custom branding options</span>
                </div>
              </div>

              {isSubscribed ? (
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>Current Subscription</CardTitle>
                    <CardDescription>Your subscription is active</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Status</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          Active
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.location.href = 'https://billing.stripe.com/p/login/test_28o5kC0Hx0Hx0Hx0Hx'}
                      >
                        Manage Billing
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <CheckoutButton
                  userPlan="Monthly"
                  userType="school"
                  className="w-full bg-[#e55283] hover:bg-[#e55283]/90"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
