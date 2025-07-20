/**
 * StudentQuizAttemptsList component
 * 
 * - Fetches and displays a list of student quiz attempts for a teacher.
 * - Shows quiz title, student name, completion date, score, and late submission badge.
 * - Handles loading, error, and empty states with appropriate UI feedback.
 * - Provides a button to trigger review of each attempt via a callback prop.
 * - Uses date-fns to format completion dates.
 * - Utilizes authentication token to authorize API requests.
 * - Displays toast notifications for error handling.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, Eye, ListChecks, User, CalendarDays } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { AttemptInfo } from '@/types';

 /* eslint-disable no-unused-vars */
interface StudentQuizAttemptsListProps {
  onReviewAttempt: (attemptItem: AttemptInfo) => void; // Callback to open review modal
}
/* eslint-enable no-unused-vars */

export default function StudentQuizAttemptsList({ onReviewAttempt }: StudentQuizAttemptsListProps) {
  const { refreshIdToken } = useAuth();
  const { toast } = useToast();
  const [attempts, setAttempts] = useState<AttemptInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttempts = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    const token = await refreshIdToken();
    if (!token) throw new Error('Authentication token not available.');

    const response = await fetch('/api/teacher/quiz-attempts', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch quiz attempts');
    }
    const data = await response.json();
    setAttempts(data.attempts || []);
  } catch (err: unknown) {
    console.error('Error fetching quiz attempts:', err);
    setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    toast({ variant: "destructive", title: "Error", description: "Could not load quiz attempts." });
  } finally {
    setLoading(false);
  }
}, [refreshIdToken, toast, setLoading, setError, setAttempts]);

useEffect(() => {
  fetchAttempts();
}, [fetchAttempts]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-[#e55283]" />
        <span className="ml-2">Loading attempts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
         <CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertCircle /> Error Loading Attempts</CardTitle></CardHeader>
         <CardContent><p>{error}</p><Button onClick={fetchAttempts} variant="destructive" size="sm" className="mt-4">Try Again</Button></CardContent>
      </Card>
    );
  }

  if (attempts.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed rounded-lg">
        <ListChecks className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No Quiz Attempts Yet</h3>
        <p className="text-muted-foreground">Once students complete assigned quizzes, their attempts will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {attempts.map((attemptItem) => (
        <Card key={attemptItem.assignmentId}>
          <CardHeader>
            <CardTitle>{attemptItem.quizTitle}</CardTitle>
            <div className="text-sm text-muted-foreground space-y-1 mt-1">
                <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4" /> Student: {attemptItem.studentName}
                </div>
                {attemptItem.completedAt && (
                    <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4" /> Completed: {format(parseISO(attemptItem.completedAt), "PPP p")}
                    </div>
                )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
                <div>
                    {attemptItem.score !== undefined && attemptItem.totalQuestions !== undefined ? (
                        <p>Score: <span className="font-semibold">{attemptItem.score} / {attemptItem.totalQuestions}</span></p>
                    ) : (
                        <p>Score: N/A</p>
                    )}
                    {attemptItem.submittedLate && <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full ml-2">LATE</span>}
                </div>
                <Button variant="outline" size="sm" onClick={() => onReviewAttempt(attemptItem)}>
                    <Eye className="mr-1 h-4 w-4" /> Review Attempt
                </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
