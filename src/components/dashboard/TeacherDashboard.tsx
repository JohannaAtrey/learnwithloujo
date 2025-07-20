/**
 * Enhanced TeacherDashboard Component
 * 
 * Features:
 * - Class Overview with student counts and performance metrics
 * - Student Performance Analytics with visual charts
 * - Assignment Management for quizzes and songs
 * - Recent Activity Feed showing student submissions
 * - Quick Stats Cards with key metrics
 * - Song Management Hub
 * - Quiz Review System with detailed analytics
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StudentQuizAttemptsList from '@/components/teacher/StudentQuizAttemptsList';
import TeacherQuizReviewModal from '@/components/teacher/TeacherQuizReviewModal';
import { 
  Users, 
  BookOpen, 
  Music, 
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  GraduationCap,
  FileText
} from 'lucide-react';
import { TeacherStudent } from '@/lib/services/student-service';
import { AttemptInfo, QuizAttempted } from '@/types';

// Types for dashboard data
interface TeacherStats {
  totalStudents: number;
  totalQuizzes: number;
  totalSongs: number;
}

interface StudentData {
  id: string;
  name: string;
  email: string;
  grade?: string;
  avatar?: string;
  lastActive: string;
}

// interface QuizData {
//   id: string;
//   title: string;
//   description?: string;
//   totalQuestions: number;
//   createdAt: string;
//   assignedCount: number;
//   completedCount: number;
//   averageScore: number;
// }

interface SongData {
  id: string;
  title: string;
  subject?: string;
  createdAt: string;
  assignedCount: number;
  status: 'processing' | 'complete' | 'failed';
}

interface RecentActivity {
  type: 'quiz_submitted' | 'song_assigned' | 'quiz_created' | 'student_joined';
  title: string;
  description: string;
  timestamp: string;
  studentName?: string;
  score?: number;
}

export function TeacherDashboard() {
  const { refreshIdToken } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [stats, setStats] = useState<TeacherStats>({
    totalStudents: 0,
    totalQuizzes: 0,
    totalSongs: 0
  });
  const [students, setStudents] = useState<StudentData[]>([]);
  // const [quizzes, setQuizzes] = useState<QuizData[]>([]);
  const [songs, setSongs] = useState<SongData[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for the review modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedAttemptForReview, setSelectedAttemptForReview] = useState<AttemptInfo | null>(null);

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await refreshIdToken();
      if (!token) throw new Error('Authentication token not available.');

      // Fetch teacher's quizzes
      const quizzesResponse = await fetch('/api/teacher/quizzes', { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      const quizzesData = quizzesResponse.ok ? await quizzesResponse.json() : { quizzes: [] };

      // Fetch teacher's songs
      const songsResponse = await fetch('/api/songs/my-songs', { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      const songsData = songsResponse.ok ? await songsResponse.json() : { songs: [] };

      // Fetch teacher's students
      const studentsResponse = await fetch('/api/teacher/students', { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      const studentsData = studentsResponse.ok ? await studentsResponse.json() : { students: [] };

      // Fetch quiz attempts for activity feed
      const attemptsResponse = await fetch('/api/teacher/quiz-attempts', { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      const attemptsData = attemptsResponse.ok ? await attemptsResponse.json() : { attempts: [] };

      // setQuizzes(quizzesData.quizzes || []);
      setSongs(songsData.songs || []);

      // Transform student data to include performance metrics
      let transformedStudents: StudentData[] = []
      if (studentsData.students.length) {
        transformedStudents = (studentsData.students).map((student: TeacherStudent) => ({
          id: student.id,
          name: student.name || 'Unknown Student',
          email: student.email,
          grade: 'Grade 5',
          lastActive: new Date().toISOString()
        }));
          
        setStudents(transformedStudents);
      }

      // Calculate stats
      const totalStudents = transformedStudents.length;
      const totalQuizzes = quizzesData.quizzes?.length || 0;
      const totalSongs = songsData.songs?.length || 0;

      setStats({
        totalStudents,
        totalQuizzes,
        totalSongs
      });

      // Generate recent activity
      const activity: RecentActivity[] = [];
      
      // Add recent quiz submissions
      attemptsData.attempts?.slice(0, 3).forEach((quizAttempted: QuizAttempted) => {
        activity.push({
          type: 'quiz_submitted',
          title: quizAttempted.quizTitle,
          description: `${quizAttempted.studentName} completed quiz`,
          timestamp: quizAttempted.completedAt || new Date().toISOString(),
          studentName: quizAttempted.studentName,
          score: quizAttempted.score
        });
      });

      // Add recent song assignments
      songsData.songs?.slice(0, 2).forEach((song: SongData) => {
        activity.push({
          type: 'song_assigned',
          title: song.title,
          description: `Assigned to ${song.assignedCount || 0} students`,
          timestamp: song.createdAt,
        });
      });

      // Sort by timestamp and take most recent 5
      activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activity.slice(0, 5));

    } catch (err: unknown) {
      console.error('[TeacherDashboard] Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "Could not load dashboard data. Please try again." 
      });
    } finally {
      setLoading(false);
    }
  }, [refreshIdToken, toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleOpenReviewModal = (attemptItem: AttemptInfo) => {
    setSelectedAttemptForReview(attemptItem);
    setReviewModalOpen(true);
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'quiz_submitted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'song_assigned':
        return <Music className="h-4 w-4 text-blue-500" />;
      case 'quiz_created':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'student_joined':
        return <Users className="h-4 w-4 text-orange-500" />;
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

  // const getRecentQuizzes = () => {
  //   return quizzes
  //     .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  //     .slice(0, 3);
  // };

  if (loading) {
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
          <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your classes and track student progress</p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <Button 
            className="bg-[#e55283] hover:bg-[#e55283]/90"
            onClick={() => router.push('/dashboard/teacher/quizzes')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Quiz
          </Button>
          <Button 
            variant="outline" 
            className="border-[#e55283] text-[#e55283] hover:bg-[#e55283] hover:text-white"
            onClick={() => router.push('/dashboard/teacher/generate-songs')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Generate Song
          </Button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-2 border-[#e55283]/20 bg-gradient-to-br from-pink-50 to-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-8 w-8 text-[#e55283] mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalStudents}</div>
                <p className="text-xs text-gray-500">Active learners</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-[#e55283]/20 bg-gradient-to-br from-pink-50 to-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Quizzes Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-[#e55283] mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalQuizzes}</div>
                <p className="text-xs text-gray-500">Learning assessments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-[#e55283]/20 bg-gradient-to-br from-pink-50 to-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Songs Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Music className="h-8 w-8 text-[#e55283] mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalSongs}</div>
                <p className="text-xs text-gray-500">Learning resources</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-8">
          {/* Recent Activity */}
          <Card className="border-2 border-[#e55283]/20 bg-gradient-to-br from-pink-50 to-yellow-50 h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">Recent Activity</CardTitle>
              <CardDescription>Latest student submissions and class activities</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-white rounded-lg border">
                      <div className="mt-1">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(activity.timestamp)}</p>
                      </div>
                      {activity.score !== undefined && (
                        <Badge variant="secondary" className="ml-2">
                          {activity.score}%
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <GraduationCap className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No recent activity yet</p>
                  <p className="text-sm">Student submissions will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Song Resources */}
          <Card className="border-2 border-[#e55283]/20 bg-gradient-to-br from-pink-50 to-yellow-50">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">Song Resources</CardTitle>
              <CardDescription>Your generated learning songs</CardDescription>
            </CardHeader>
            <CardContent>
              {songs.length > 0 ? (
                <div className="space-y-3">
                  {songs.slice(0, 3).map((song) => (
                    <div key={song.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{song.title}</h4>
                        <p className="text-sm text-gray-600">Assigned to {song.assignedCount} students</p>
                      </div>
                      <Badge 
                        variant={song.status === 'complete' ? 'default' : 'secondary'}
                        className={song.status === 'complete' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {song.status}
                      </Badge>
                    </div>
                  ))}
                  {songs.length > 3 && (
                    <div className="text-center pt-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[#e55283]"
                        onClick={() => router.push('/dashboard/teacher/my-songs')}
                      >
                        View all {songs.length} songs
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Music className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No songs generated yet</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Student Roster */}
          <Card className="border-2 border-[#e55283]/20 bg-gradient-to-br from-pink-50 to-yellow-50">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">Student Roster</CardTitle>
              <CardDescription>A list of all students in your classes</CardDescription>
            </CardHeader>
            <CardContent>
              {students.length > 0 ? (
                <div className="space-y-4">
                  {students.map((student, index) => (
                    <div key={student.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-600 rounded-full font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{student.name}</h4>
                          <p className="text-sm text-gray-600">{student.email}</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-[#e55283]"
                        onClick={() => router.push('/dashboard/teacher/students')}
                      >
                        View Details
                      </Button>
                    </div>
                  ))}
                  {students.length > 3 && (
                     <div className="text-center pt-2">
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="text-[#e55283]"
                         onClick={() => router.push('/dashboard/teacher/students')}
                       >
                         View all {students.length} students
                       </Button>
                     </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No students enrolled yet</p>
                  <p className="text-sm">Students will appear here once they join a class</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quiz Attempts Section */}
      <Card className="border-2 border-[#e55283]/20 bg-gradient-to-br from-pink-50 to-yellow-50">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900">Recent Quiz Attempts</CardTitle>
          <CardDescription>Student submissions and performance review</CardDescription>
        </CardHeader>
        <CardContent>
          <StudentQuizAttemptsList onReviewAttempt={handleOpenReviewModal} />
        </CardContent>
      </Card>

      {/* Quiz Review Modal */}
      {selectedAttemptForReview && (
        <TeacherQuizReviewModal
          isOpen={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setSelectedAttemptForReview(null);
          }}
          attempt={selectedAttemptForReview}
        />
      )}
    </div>
  );
}
