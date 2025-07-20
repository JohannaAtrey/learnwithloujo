// School Admin Dashboard component displaying core features and subscription status.
// Includes gated access to teacher management based on subscription.

'use client';

import { Suspense } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { CheckoutButton } from '@/components/CheckoutButton';
import { CancelSubscriptionButton } from '@/components/CancelSubscriptionButton';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { 
  Users, 
  AlertCircle,
  Loader2,
  Plus,
  Check,
  MessageCircle
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

// Types for dashboard data
interface SchoolStats {
  totalTeachers: number;
  activeSubscriptions: number;
}

interface TeacherData {
  id: string;
  name: string;
  email: string;
  department?: string;
  avatar?: string;
  lastActive: string;
  status: 'active' | 'inactive';
  uid?: string;
  displayName?: string;
}

export default function SchoolAdminDashboard() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SchoolAdminDashboardContent />
    </Suspense>
  );
}

function SchoolAdminDashboardContent() {
  const { userData, loading, refreshIdToken } = useAuth();
  const router = useRouter();
  const isSubscribed = userData?.isSchoolAdminSubscribed || false;
  const subscriptionId = userData?.subscriptionId as string;
  const subscriptionPlan = userData?.subscriptionPlan as string;

  const [stats, setStats] = useState<SchoolStats>({
    totalTeachers: 0,
    activeSubscriptions: 0
  });
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setDashboardLoading(true);
      setError(null);
      const token = await refreshIdToken();
      if (!token) throw new Error('Authentication token not available.');

      // Fetch school teachers
      const teachersResponse = await fetch('/api/school-admin/teachers', { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      const teachersData = teachersResponse.ok ? await teachersResponse.json() : { teachers: [] };

      // Transform teacher data
      const transformedTeachers: TeacherData[] = (teachersData.teachers || []).map((teacher: TeacherData) => ({
        id: teacher.id || teacher.uid,
        name: teacher.displayName || teacher.name || 'Unknown Teacher',
        email: teacher.email,
        department: teacher.department || 'General',
        lastActive: teacher.lastActive || new Date().toISOString(),
        status: teacher.status || 'active'
      }));

      setTeachers(transformedTeachers);

      // Calculate stats
      const totalTeachers = transformedTeachers.length;

      setStats({
        totalTeachers,
        activeSubscriptions: isSubscribed ? 1 : 0,
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setDashboardLoading(false);
    }
  }, [refreshIdToken, isSubscribed]);

  useEffect(() => {
    if (!loading) {
      fetchDashboardData();
    }
  }, [loading, fetchDashboardData]);

  if (loading || dashboardLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#e55283]" />
        <span className="ml-2 text-lg">Loading your dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center py-20">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <span className="ml-2 text-lg text-red-600">{error}</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">School Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your school, teachers, and educational resources</p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <Button 
            className="bg-[#e55283] hover:bg-[#e55283]/90"
            onClick={() => router.push('/dashboard/school-admin/teachers')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Manage Teachers
          </Button>
        </div>
      </div>

      {/* Payment Cards Row */}
      <div className="flex flex-col md:flex-row gap-6 justify-center items-stretch">
        {/* Monthly Plan Card */}
        <Card className="flex-1 border-2 border-[#e55283]/20 bg-gradient-to-br from-pink-50 to-yellow-50">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">Monthly Plan</CardTitle>
            <CardDescription>£249.99 per month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#e55283]" />
                <span className="text-sm">Unlimited teachers and students</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#e55283]" />
                <span className="text-sm">Unlimited song generation</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#e55283]" />
                <span className="text-sm">Advanced analytics and reporting</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#e55283]" />
                <span className="text-sm">Priority support</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#e55283]" />
                <span className="text-sm">Custom branding options</span>
              </div>
            </div>
            {(isSubscribed && subscriptionPlan?.toLowerCase() === 'monthly') ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    Active
                  </span>
                </div>
                <CancelSubscriptionButton
                  subscriptionId={subscriptionId}
                  className="w-full bg-[#e55283]"
                />
              </div>
            ) : (
              <CheckoutButton
                userPlan="Monthly"
                userType="School"
                checkPlan={(subscriptionPlan && subscriptionPlan.toLowerCase() === 'yearly') ? true : false}
                className="w-full bg-[#e55283] hover:bg-[#e55283]/90"
              />
            )}
          </CardContent>
        </Card>
        {/* Yearly Plan Card */}
        <Card className="flex-1 border-2 border-[#e55283]/20 bg-gradient-to-br from-pink-50 to-yellow-50">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">Yearly Plan</CardTitle>
            <CardDescription>£2499.99 per year (Save 17%)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#e55283]" />
                <span className="text-sm">Unlimited teachers and students</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#e55283]" />
                <span className="text-sm">Unlimited song generation</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#e55283]" />
                <span className="text-sm">Advanced analytics and reporting</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#e55283]" />
                <span className="text-sm">Priority support</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#e55283]" />
                <span className="text-sm">Custom branding options</span>
              </div>
            </div>
            {(isSubscribed && subscriptionPlan?.toLowerCase() === 'yearly') ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    Active
                  </span>
                </div>
                <CancelSubscriptionButton
                  subscriptionId={subscriptionId}
                  className="w-full bg-[#e55283]"
                />
              </div>
            ) : (
              <CheckoutButton
                userPlan="Yearly"
                userType="School"
                checkPlan={(subscriptionPlan && subscriptionPlan.toLowerCase() === 'monthly') ? true : false}
                className="w-full bg-[#e55283] hover:bg-[#e55283]/90"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
            <Card className="border-2 border-[#e55283]/20 bg-gradient-to-br from-pink-50 to-yellow-50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Teachers</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center">
                        <Users className="h-8 w-8 text-[#e55283] mr-3" />
                        <div>
                            <div className="text-2xl font-bold text-gray-900">{stats.totalTeachers}</div>
                            <p className="text-xs text-gray-500">Active educators</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

          {/* Teacher Performance Overview */}
          <Card className="border-2 border-[#e55283]/20 bg-gradient-to-br from-pink-50 to-yellow-50">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">Teacher Performance</CardTitle>
              <CardDescription>Top performing teachers and department analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="top-teachers" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="top-teachers">Top Teachers</TabsTrigger>
                  <TabsTrigger value="department-analytics">Department Analytics</TabsTrigger>
                </TabsList>
                
                <TabsContent value="top-teachers" className="space-y-4">
                  {teachers.length > 0 ? (
                    teachers.map((teacher, index) => (
                      <div key={teacher.id} className="flex items-center justify-between p-4 bg-white rounded-lg border">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-[#e55283] text-white rounded-full text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{teacher.name}</h4>
                            <p className="text-sm text-gray-600">{teacher.department}</p>
                          </div>
                        </div>
                        <div className="text-right">
                           <Badge variant={teacher.status === 'active' ? 'default' : 'secondary'}
                              className={teacher.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                            >
                              {teacher.status}
                            </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No teacher data available yet.</p>
                      <p className="text-sm">Teacher performance will appear here once teachers are added and have activity.</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="department-analytics" className="space-y-4">
                  <div className="p-4 bg-white rounded-lg border">
                      <div className="text-2xl font-bold text-[#e55283]">{stats.totalTeachers}</div>
                      <div className="text-sm text-gray-600">Active Teachers</div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Quick Actions & Subscription */}
        <div className="space-y-8">
          {/* Quick Actions */}
          <Card className="border-2 border-[#e55283]/20 bg-gradient-to-br from-pink-50 to-yellow-50">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => setIsContactModalOpen(true)}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </CardContent>
          </Card>

          {/* Subscription Management */}
          {/* (Removed from sidebar) */}
        </div>
      </div>
      <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Support</DialogTitle>
            <DialogDescription>
              For any help or inquiries, please contact us at the email address below.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center font-semibold text-lg text-[#e55283]">
              support@loujo.com
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsContactModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
