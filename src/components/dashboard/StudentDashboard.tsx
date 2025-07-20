/**
 * Enhanced StudentDashboard Component
 * 
 * Features:
 * - Academic Progress Overview with visual indicators
 * - Recent Activity Feed showing quiz attempts and song assignments
 * - Quick Stats Cards with key metrics
 * - Upcoming Assignments with due dates
 * - Study Resources Hub with assigned songs
 * - Parent Account Linking
 * - Song Details Modal with audio playback
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { AssignedSongWithTeacher } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import LinkParentSection from '@/components/student/LinkParentSection';
import { 
  BookOpen, 
  Music, 
  Trophy, 
  Calendar, 
  Clock, 
  CheckCircle, 
  PlayCircle,
  Target,
  Loader2,
  AlertCircle,
  Eye
} from 'lucide-react';

// Types for dashboard data
interface QuizAssignment {
  assignmentId: string;
  quizId: string;
  quizTitle: string;
  assignedByTeacherName: string;
  assignedAt: string;
  status: 'assigned' | 'completed';
  availableFrom?: string;
  dueBy?: string;
  completedAt?: string;
  score?: number;
  totalQuestions?: number;
  submittedLate?: boolean;
}

interface StudentStats {
  totalSongsAssigned: number;
  totalQuizzesAssigned: number;
  completedQuizzes: number;
  averageScore: number;
}

interface RecentActivity {
  type: 'quiz_completed' | 'song_assigned' | 'quiz_assigned';
  title: string;
  description: string;
  timestamp: string;
  score?: number;
  teacherName?: string;
}

export default function StudentDashboard() {
  const { refreshIdToken } = useAuth();
  const { toast } = useToast();
  const [selectedSong, setSelectedSong] = useState<AssignedSongWithTeacher | null>(null);
  const [assignedSongs, setAssignedSongs] = useState<AssignedSongWithTeacher[]>([]);
  const [quizAssignments, setQuizAssignments] = useState<QuizAssignment[]>([]);
  const [stats, setStats] = useState<StudentStats>({
    totalSongsAssigned: 0,
    totalQuizzesAssigned: 0,
    completedQuizzes: 0,
    averageScore: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await refreshIdToken();
      if (!token) throw new Error('Authentication token not available.');

      // Fetch assigned songs
      const songsResponse = await fetch('/api/songs/student', { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      const songsData = songsResponse.ok ? await songsResponse.json() : { songs: [] };

      // Fetch quiz assignments
      const quizzesResponse = await fetch('/api/student/quizzes', { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      const quizzesData = quizzesResponse.ok ? await quizzesResponse.json() : { assignments: [] };

      setAssignedSongs(songsData.songs || []);
      setQuizAssignments(quizzesData.assignments || []);

      // Calculate stats
      const completedQuizzes = quizzesData.assignments?.filter((q: QuizAssignment) => q.status === 'completed') || [];
      const totalScore = completedQuizzes.reduce((sum: number, quiz: QuizAssignment) => sum + (quiz.score || 0), 0);
      const averageScore = completedQuizzes.length > 0 ? Math.round((totalScore / completedQuizzes.length) * 100) / 100 : 0;

      setStats({
        totalSongsAssigned: songsData.songs?.length || 0,
        totalQuizzesAssigned: quizzesData.assignments?.length || 0,
        completedQuizzes: completedQuizzes.length,
        averageScore,
      });

      // Generate recent activity
      const activity: RecentActivity[] = [];
      
      // Add recent quiz completions
      completedQuizzes.slice(0, 3).forEach((quiz: QuizAssignment) => {
        activity.push({
          type: 'quiz_completed',
          title: quiz.quizTitle,
          description: `Completed quiz with ${quiz.score}/${quiz.totalQuestions} correct`,
          timestamp: quiz.completedAt || quiz.assignedAt,
          score: quiz.score,
          teacherName: quiz.assignedByTeacherName
        });
      });

      // Add recent song assignments
      songsData.songs?.slice(0, 2).forEach((song: AssignedSongWithTeacher) => {
        activity.push({
          type: 'song_assigned',
          title: song.title || 'New Song',
          description: `Assigned by ${song.assignedByTeacherName}`,
          timestamp: song.assignedAt as string,
          teacherName: song.assignedByTeacherName
        });
      });

      // Sort by timestamp and take most recent 5
      activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activity.slice(0, 5));

    } catch (err: unknown) {
      console.error('[StudentDashboard] Error fetching dashboard data:', err);
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

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'quiz_completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'song_assigned':
        return <Music className="h-4 w-4 text-blue-500" />;
      case 'quiz_assigned':
        return <BookOpen className="h-4 w-4 text-purple-500" />;
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

  const getUpcomingAssignments = () => {
    return quizAssignments
      .filter(quiz => quiz.status === 'assigned' && quiz.dueBy)
      .sort((a, b) => new Date(a.dueBy!).getTime() - new Date(b.dueBy!).getTime())
      .slice(0, 3);
  };

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
      <div className="flex flex-col md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="text-gray-600 mt-1">Your learning hub for songs and quizzes</p>
        </div>
        <div className="mt-4 md:mt-0 md:ml-auto">
          <LinkParentSection />
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2 border-[#e55283]/20 bg-gradient-to-br from-pink-50 to-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Assigned Songs</CardTitle>
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

        <Card className="border-2 border-[#e55283]/20 bg-gradient-to-br from-pink-50 to-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg. Quiz Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Trophy className="h-8 w-8 text-[#e55283] mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.averageScore}%</div>
                <p className="text-xs text-gray-500">Overall performance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column - Recent Activity & Upcoming Assignments */}
        <div className="lg:col-span-2 space-y-8">
          {/* Recent Activity */}
          <Card className="border-2 border-[#e55283]/20 bg-gradient-to-br from-pink-50 to-yellow-50">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">Recent Activity</CardTitle>
              <CardDescription>Your latest learning activities and achievements</CardDescription>
            </CardHeader>
            <CardContent>
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
                  <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No recent activity yet</p>
                  <p className="text-sm">Complete quizzes and listen to songs to see your activity here</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Assignments */}
          <Card className="border-2 border-[#e55283]/20 bg-gradient-to-br from-pink-50 to-yellow-50">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">Upcoming Assignments</CardTitle>
              <CardDescription>Quizzes and tasks with upcoming due dates</CardDescription>
            </CardHeader>
            <CardContent>
              {getUpcomingAssignments().length > 0 ? (
                <div className="space-y-4">
                  {getUpcomingAssignments().map((assignment) => (
                    <div key={assignment.assignmentId} className="flex items-center justify-between p-4 bg-white rounded-lg border">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{assignment.quizTitle}</h4>
                        <p className="text-sm text-gray-600">Assigned by {assignment.assignedByTeacherName}</p>
                        <p className="text-xs text-gray-500">Due: {formatDate(assignment.dueBy!)}</p>
                      </div>
                      <Badge variant="outline" className="border-[#e55283] text-[#e55283]">
                        Pending
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No upcoming assignments</p>
                  <p className="text-sm">You&apos;re all caught up!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Study Resources */}
        <div className="space-y-8">
          {/* Study Resources Hub */}
          <Card className="border-2 border-[#e55283]/20 bg-gradient-to-br from-pink-50 to-yellow-50">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">Study Resources</CardTitle>
              <CardDescription>Your assigned songs and learning materials</CardDescription>
            </CardHeader>
            <CardContent>
              {assignedSongs.length > 0 ? (
                <div className="space-y-3">
                  {assignedSongs.slice(0, 5).map((song) => (
                    <div key={song.id} className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-md transition-shadow">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{song.title}</h4>
                        <p className="text-sm text-gray-600">By {song.assignedByTeacherName}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedSong(song)}
                        className="ml-2 border-[#e55283] text-[#e55283] hover:bg-[#e55283] hover:text-white"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {assignedSongs.length > 5 && (
                    <div className="text-center pt-2">
                      <Button variant="ghost" size="sm" className="text-[#e55283]">
                        View all {assignedSongs.length} songs
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Music className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No songs assigned yet</p>
                  <p className="text-sm">Your teachers will assign songs here</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress Overview */}
          <Card className="border-2 border-[#e55283]/20 bg-gradient-to-br from-pink-50 to-yellow-50">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">Progress Overview</CardTitle>
              <CardDescription>Your learning journey progress</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Quiz Completion</span>
                  <span>{stats.completedQuizzes}/{stats.totalQuizzesAssigned}</span>
                </div>
                <Progress 
                  value={stats.totalQuizzesAssigned > 0 ? (stats.completedQuizzes / stats.totalQuizzesAssigned) * 100 : 0} 
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Average Performance</span>
                  <span>{stats.averageScore}%</span>
                </div>
                <Progress 
                  value={stats.averageScore} 
                  className="h-2"
                />
              </div>
              <div className="pt-2">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                  <Target className="h-4 w-4" />
                  <span>Keep up the great work!</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Song Details Modal */}
      <Dialog open={selectedSong !== null} onOpenChange={(isOpen) => !isOpen && setSelectedSong(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{selectedSong?.title || 'Song Details'}</DialogTitle>
            {selectedSong?.assignedByTeacherName && (
              <DialogDescription className="text-sm text-gray-600">
                Assigned by: {selectedSong.assignedByTeacherName}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto space-y-6">
            {selectedSong?.localPath ? (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center">
                  <PlayCircle className="h-5 w-5 mr-2 text-[#e55283]" />
                  Listen to Song
                </h3>
                <audio
                  controls
                  src={selectedSong.localPath.startsWith('/') ? selectedSong.localPath : `/${selectedSong.localPath}`}
                  className="w-full"
                  onError={(e) => { 
                    console.error("Audio error:", e); 
                    toast({ 
                      variant: "destructive", 
                      title: "Audio Error", 
                      description: "Could not load audio file." 
                    }); 
                  }}
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            ) : (
              <div className="text-center py-4">
                <Music className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-500">Audio not available for this song.</p>
              </div>
            )}
            
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-[#e55283]" />
                Lyrics
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <pre className="text-sm whitespace-pre-wrap font-sans max-h-[30vh] overflow-y-auto text-gray-700">
                  {selectedSong?.lyrics || 'No lyrics available.'}
                </pre>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setSelectedSong(null)}
              className="border-[#e55283] text-[#e55283] hover:bg-[#e55283] hover:text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}