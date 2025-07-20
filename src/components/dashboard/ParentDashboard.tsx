/**
 * Enhanced ParentDashboard Component
 * 
 * Features:
 * - Enhanced Subscription Management with visual indicators
 * - Child Progress Tracking with performance analytics
 * - Visual Progress Charts and Performance Metrics
 * - Recent Activity Feed showing children's achievements
 * - Quick Stats Cards with key metrics
 * - Enhanced Quiz Results with detailed analytics
 * - Song Management Hub with better organization
 * - Communication Center for teacher interactions
 * - Financial Management Dashboard
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { SongData, UserData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { CheckoutButton } from '@/components/CheckoutButton';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle
} from '@/components/ui/card';
import { 
  Button,
} from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2, 
  AlertCircle,
  Eye,
  Users,
  Award,
  Calendar,
  Clock,
  CheckCircle,
  Music,
  BookOpen,
  CreditCard,
  PlayCircle,
  Plus,
  Check
} from 'lucide-react';
import LinkChildSection from '@/components/parent/LinkChildSection';
import ParentQuizReviewModal from '@/components/parent/ParentQuizReviewModal';
import ChildAssignedSongsList from '../parent/ChildAssignedSongsList';
import { Timestamp } from 'firebase-admin/firestore';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Define type for quiz insights
interface QuizInsight {
  assignmentId: string;
  quizId: string;
  quizTitle: string;
  studentName: string;
  assignedByTeacherName: string;
  completedAt: string | Timestamp;
  score?: number;
  totalQuestions?: number;
  submittedAnswers?: Array<{ questionId: string; selectedOptionIndex: number }>;
}

interface LinkedChild {
  studentUid: string;
  studentName: string;
  grade?: string;
  avatar?: string;
}

interface ParentStats {
  totalChildren: number;
  totalQuizzesCompleted: number;
  totalSongsAssigned: number;
}

interface ChildProgress {
  childId: string;
  childName: string;
  grade: string;
  songsAssigned: number;
  lastActive: string;
}

interface RecentActivity {
  type: 'quiz_completed' | 'song_assigned' | 'achievement_earned' | 'subscription_renewed';
  title: string;
  description: string;
  timestamp: string;
  childName?: string;
  score?: number;
}

// Helper function to format timestamp
const formatTimestamp = (timestamp: string | Timestamp): string => {
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  return timestamp.toDate().toISOString();
};

export default function ParentDashboard() {
  const { refreshIdToken } = useAuth();
  const { toast } = useToast();
  const [quizInsights, setQuizInsights] = useState<QuizInsight[]>([]);
  const [assignedSongs, setAssignedSongs] = useState<{ [childId: string]: SongData[] }>({});
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  // const [isSubscriptionActive, setIsSubscriptionActive] = useState(false);
  // const [subscriptionEndDate, setSubscriptionEndDate] = useState<Date | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [selectedInsightForReview, setSelectedInsightForReview] = useState<QuizInsight | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [linkedChildren, setLinkedChildren] = useState<LinkedChild[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [childrenError, setChildrenError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ParentStats>({
    totalChildren: 0,
    totalQuizzesCompleted: 0,
    totalSongsAssigned: 0,
  });
  const [childProgress, setChildProgress] = useState<ChildProgress[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const router = useRouter();

  // const subscriptionId = userData?.subscriptionId as string;
  const subscriptionPlan = userData?.subscriptionPlan as string;

  // Define fetchAssignedSongs as a useCallback to prevent infinite re-renders
  const fetchAssignedSongs = useCallback(async () => {
    if (!linkedChildren.length) return;

    try {
      const token = await refreshIdToken();
      const songsByChild: { [childId: string]: SongData[] } = {};

      for (const child of linkedChildren) {
        const response = await fetch(`/api/parent/assigned-songs?studentId=${child.studentUid}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch assigned songs for ${child.studentName}`);
        }

        const data = await response.json();
        songsByChild[child.studentUid] = data.songs || [];
      }

      setAssignedSongs(songsByChild);
    } catch (error) {
      console.error('Error fetching assigned songs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load assigned songs. Please try again.',
        variant: 'destructive',
      });
    }
  }, [linkedChildren, refreshIdToken, toast]);

  // Fetch user data and subscription status
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = await refreshIdToken();
        const response = await fetch('/api/user', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }

        const data = await response.json();
        setUserData(data);
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load user data. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [refreshIdToken, toast]);

  // Update subscription status when userData changes
  useEffect(() => {
    if (userData) {
      setIsSubscribed(userData?.isParentSubscribed || false);
      // const endDate = userData?.subcriptionEndDate ? new Date(userData.subcriptionEndDate) : null;
      // const isActive = userData?.isParentSubscribed && endDate && endDate > new Date();
      // setIsSubscriptionActive(isActive ?? false);
      // setSubscriptionEndDate(endDate);
    } else {
      setIsSubscribed(false);
      // setSubscriptionEndDate(null);
      // setIsSubscriptionActive(false);
    }
  }, [userData]);

  // Update the quiz insights fetch to handle the response correctly
  useEffect(() => {
    const fetchQuizInsights = async () => {
      if (!linkedChildren.length) {
        setLoadingInsights(false);
        return;
      }

      setLoadingInsights(true);
      setInsightsError(null);

      try {
        const token = await refreshIdToken();
        const insights: QuizInsight[] = [];

        for (const child of linkedChildren) {
          const response = await fetch(`/api/parent/quiz-insights?studentId=${child.studentUid}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            insights.push(...(data.insights || []));
          }
        }

        setQuizInsights(insights);

        // Calculate stats and generate activity
        const totalQuizzesCompleted = insights.length;
        const totalSongsAssigned = Object.values(assignedSongs).flat().length;
        
        setStats({
          totalChildren: linkedChildren.length,
          totalQuizzesCompleted,
          totalSongsAssigned,
        });

        // Generate child progress data
        const progress: ChildProgress[] = linkedChildren.map(child => {
          const childSongs = assignedSongs[child.studentUid] || [];

          return {
            childId: child.studentUid,
            childName: child.studentName,
            grade: child.grade || 'Grade 5',
            songsAssigned: childSongs.length,
            lastActive: new Date().toISOString(),
          };
        });

        setChildProgress(progress);

        // Generate recent activity
        const activity: RecentActivity[] = [];
        
        // Add recent quiz completions
        insights.slice(0, 3).forEach(insight => {
          activity.push({
            type: 'quiz_completed',
            title: insight.quizTitle,
            description: `${insight.studentName} completed quiz`,
            timestamp: formatTimestamp(insight.completedAt),
            childName: insight.studentName,
            score: insight.score
          });
        });

        // Add recent song assignments
        Object.entries(assignedSongs).forEach(([childId, songs]) => {
          const child = linkedChildren.find(c => c.studentUid === childId);
          if (child && songs.length > 0) {
            activity.push({
              type: 'song_assigned',
              title: songs[0].title || 'New Song',
              description: `Assigned to ${child.studentName}`,
              timestamp: songs[0].createdAt,
              childName: child.studentName
            });
          }
        });

        // Sort by timestamp and take most recent 5
        activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setRecentActivity(activity.slice(0, 5));

      } catch (error) {
        console.error('Error fetching quiz insights:', error);
        setInsightsError('Failed to load quiz insights');
      } finally {
        setLoadingInsights(false);
      }
    };

    fetchQuizInsights();
  }, [linkedChildren, assignedSongs, refreshIdToken, isSubscribed]);

  // Fetch linked children
  useEffect(() => {
    const fetchLinkedChildren = async () => {
      setLoadingChildren(true);
      setChildrenError(null);

      try {
        const token = await refreshIdToken();
        const response = await fetch('/api/parent/linked-children', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setLinkedChildren(data.children || []);
        } else {
          throw new Error('Failed to fetch linked children');
        }
      } catch (error) {
        console.error('Error fetching linked children:', error);
        setChildrenError('Failed to load linked children');
      } finally {
        setLoadingChildren(false);
      }
    };

    fetchLinkedChildren();
  }, [refreshIdToken]);

  // Fetch assigned songs when linked children change
  useEffect(() => {
    fetchAssignedSongs();
  }, [fetchAssignedSongs]);

  const handleOpenReviewModal = (insight: QuizInsight) => {
    setSelectedInsightForReview(insight);
    setIsReviewModalOpen(true);
  };

  const handleCloseReviewModal = () => {
    setIsReviewModalOpen(false);
    setSelectedInsightForReview(null);
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'quiz_completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'song_assigned':
        return <Music className="h-4 w-4 text-blue-500" />;
      case 'achievement_earned':
        return <Award className="h-4 w-4 text-yellow-500" />;
      case 'subscription_renewed':
        return <CreditCard className="h-4 w-4 text-purple-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#e55283]" />
        <span className="ml-2 text-lg">Loading your dashboard...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Parent Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor your children&apos;s learning progress and manage your subscription</p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-[#e55283] hover:bg-[#e55283]/90">
                <Plus className="h-4 w-4 mr-2" />
                Link Child
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Link to Child&apos;s Account</DialogTitle>
                <DialogDescription>
                  Enter the 6-character code from your child&apos;s account to link them.
                </DialogDescription>
              </DialogHeader>
              <LinkChildSection />
            </DialogContent>
          </Dialog>
          {isSubscribed && (
            <Button 
              variant="outline" 
              className="border-[#e55283] text-[#e55283] hover:bg-[#e55283] hover:text-white"
              onClick={() => router.push('/dashboard/parent/generate-songs')}
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Generate Song
            </Button>
          )}
        </div>
      </div>

      {/* Payment Cards Row */}
      <div className="flex flex-col md:flex-row gap-6 justify-center items-stretch">
        {/* Monthly Plan Card */}
        <Card className="flex-1 border-2 border-[#e55283]/20 bg-gradient-to-br from-pink-50 to-yellow-50">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">Monthly Plan</CardTitle>
            <CardDescription>£6.99 per month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#e55283]" />
                <span className="text-sm">Generate custom songs for your child</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#e55283]" />
                <span className="text-sm">Access learning analytics</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#e55283]" />
                <span className="text-sm">Priority support</span>
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
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.location.href = 'https://billing.stripe.com/p/login/test_28o5kC0Hx0Hx0Hx0Hx'}
                >
                  Manage Billing
                </Button>
              </div>
            ) : (
              <CheckoutButton
                userPlan="Monthly"
                userType="Parent"
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
            <CardDescription>£69.99 per year (Save 17%)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#e55283]" />
                <span className="text-sm">Generate custom songs for your child</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#e55283]" />
                <span className="text-sm">Access learning analytics</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#e55283]" />
                <span className="text-sm">Priority support</span>
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
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.location.href = 'https://billing.stripe.com/p/login/test_28o5kC0Hx0Hx0Hx0Hx'}
                >
                  Manage Billing
                </Button>
              </div>
            ) : (
              <CheckoutButton
                userPlan="Yearly"
                userType="Parent"
                checkPlan={(subscriptionPlan && subscriptionPlan.toLowerCase() === 'monthly') ? true : false}
                className="w-full bg-[#e55283] hover:bg-[#e55283]/90"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-2 border-[#e55283]/20 bg-gradient-to-br from-pink-50 to-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Linked Children</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-8 w-8 text-[#e55283] mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalChildren}</div>
                <p className="text-xs text-gray-500">Accounts managed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-[#e55283]/20 bg-gradient-to-br from-pink-50 to-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Quizzes Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-[#e55283] mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalQuizzesCompleted}</div>
                <p className="text-xs text-gray-500">Across all children</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-[#e55283]/20 bg-gradient-to-br from-pink-50 to-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Songs Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Music className="h-8 w-8 text-[#e55283] mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalSongsAssigned}</div>
                <p className="text-xs text-gray-500">Learning resources</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content: Child Progress */}
        <div className="lg:col-span-2">
          <Card className="h-full border-2 border-[#e55283]/20 bg-gradient-to-br from-pink-50 to-yellow-50">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">Child Progress Overview</CardTitle>
              <CardDescription>Track learning milestones and recent achievements</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={childProgress.length > 0 ? childProgress[0].childId : 'no-children'}>
                <TabsList>
                  {childProgress.map((child) => (
                    <TabsTrigger key={child.childId} value={child.childId}>
                      {child.childName}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {childProgress.map((child) => (
                  <TabsContent key={child.childId} value={child.childId} className="space-y-4">
                    <div className="p-4 bg-white rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-lg font-semibold text-gray-900">{child.childName}</div>
                          <Badge variant="secondary">{child.grade}</Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-[#e55283]">{child.songsAssigned}</div>
                          <div className="text-xs text-gray-500">Songs Assigned</div>
                        </div>
                      </div>
                      <div className="space-y-2 mt-4">
                        <div className="flex justify-between text-sm text-gray-600">
                           <span>Last Active: {formatDate(child.lastActive)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Assigned Songs</h4>
                      <ChildAssignedSongsList songs={assignedSongs[child.childId] || []} />
                    </div>
                  </TabsContent>
                ))}
                 {childProgress.length === 0 && (
                  <TabsContent value="no-children">
                    <div className="text-center py-12 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No children linked yet</p>
                      <p className="text-sm">Use the section above to link a child&apos;s account</p>
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Recent Activity & Financials */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="border-2 border-[#e55283]/20 bg-gradient-to-br from-pink-50 to-yellow-50 h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">Recent Activity</CardTitle>
              <CardDescription>Latest quiz completions</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-white rounded-lg border">
                      <div className="mt-1">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{activity.title}</p>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(activity.timestamp)}</p>
                      </div>
                      {activity.score !== undefined && (
                        <Badge variant="secondary">{activity.score}%</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  <Calendar className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p>No recent activity to display</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Enhanced Quiz Results Section */}
      <Card className="border-2 border-[#e55283]/20 bg-gradient-to-br from-pink-50 to-yellow-50">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900">Recent Quiz Results</CardTitle>
          <CardDescription>Detailed performance analysis for your children</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingInsights ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#e55283]" />
              <span className="ml-2">Loading results...</span>
            </div>
          ) : insightsError ? (
            <div className="text-red-600 flex items-center gap-2 justify-center py-8">
              <AlertCircle className="h-5 w-5" />
              Error: {insightsError}
            </div>
          ) : quizInsights.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No completed quiz results found yet</p>
              <p className="text-sm">Your children&apos;s quiz results will appear here</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {quizInsights.map((insight) => (
                <div key={insight.assignmentId} className="flex justify-between items-start gap-4 p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{insight.quizTitle}</p>
                    <p className="text-sm text-gray-600">
                      Student: {insight.studentName} | Teacher: {insight.assignedByTeacherName}
                    </p>
                    <p className="text-xs text-gray-500">
                      Completed: {formatTimestamp(insight.completedAt)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-2">
                    {insight.score !== undefined && insight.totalQuestions !== undefined && (
                      <div>
                        <p className="text-lg font-bold text-[#e55283]">
                          {insight.score}/{insight.totalQuestions}
                        </p>
                        <p className="text-xs text-gray-500">
                          {Math.round((insight.score / insight.totalQuestions) * 100)}% Score
                        </p>
                      </div>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleOpenReviewModal(insight)}
                      className="border-[#e55283] text-[#e55283] hover:bg-[#e55283] hover:text-white"
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Assigned Songs Section */}
      <Card className="border-2 border-[#e55283]/20 bg-gradient-to-br from-pink-50 to-yellow-50">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900">Assigned Songs</CardTitle>
          <CardDescription>Learning resources assigned to your children</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingChildren ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#e55283]" />
              <span className="ml-2">Loading children...</span>
            </div>
          ) : childrenError ? (
            <div className="text-red-600 flex items-center gap-2 justify-center py-8">
              <AlertCircle className="h-5 w-5" />
              Error: {childrenError}
            </div>
          ) : linkedChildren.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No children linked to this account yet</p>
              <p className="text-sm">Link your children to see their assigned songs</p>
            </div>
          ) : (
            <div className="space-y-6">
              {linkedChildren.map((child) => (
                <div key={child.studentUid} className="p-4 bg-white rounded-lg border">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{child.studentName}</h3>
                      <p className="text-sm text-gray-600">{child.grade}</p>
                    </div>
                    <Badge variant="outline" className="border-[#e55283] text-[#e55283]">
                      {assignedSongs[child.studentUid]?.length || 0} songs
                    </Badge>
                  </div>
                  <ChildAssignedSongsList songs={assignedSongs[child.studentUid] || []} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quiz Review Modal */}
      {selectedInsightForReview && (
        <ParentQuizReviewModal
          isOpen={isReviewModalOpen}
          onClose={handleCloseReviewModal}
          insight={selectedInsightForReview}
        />
      )}
    </div>
  );
}