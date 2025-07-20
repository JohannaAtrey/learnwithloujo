// Student-facing page for viewing and interacting with assigned quizzes.
// Allows students to start scheduled quizzes, review completed ones, and see due dates, scores, and quiz status.

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, FileText, PlayCircle, CheckCircle, Eye, Clock } from 'lucide-react';
import QuizTakingInterface from '@/components/student/QuizTakingInterface';
import QuizReviewInterface from '@/components/student/QuizReviewInterface';
import { format, isPast, isFuture, parseISO } from 'date-fns'; 
import { useCallback } from 'react';

// Update AssignedQuizInfo to include scheduling dates
interface AssignedQuizInfo {
  assignmentId: string;
  quizId: string;
  quizTitle: string;
  quizDescription?: string;
  totalQuestions: number;
  assignedAt: string; 
  status: 'assigned' | 'completed';
  availableFrom?: string; 
  dueBy?: string; 
  completedAt?: string; 
  score?: number;
  assignedByTeacherName: string;
  submittedLate?: boolean; 
}

export default function StudentQuizzesPage() {
  const { refreshIdToken } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<AssignedQuizInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuizForTaking, setSelectedQuizForTaking] = useState<{ quizId: string; assignmentId: string; title: string } | null>(null);
  const [selectedQuizForReview, setSelectedQuizForReview] = useState<{ quizId: string; assignmentId: string; title: string } | null>(null);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await refreshIdToken();
      if (!token) throw new Error('Authentication token not available.');
      const response = await fetch('/api/student/quizzes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch quiz assignments');
      }
      const data = await response.json();
      setAssignments(data.assignments || []);
    } catch (err: unknown) {
      console.error('Error fetching quiz assignments:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      toast({ variant: "destructive", title: "Error", description: "Could not load quiz assignments." });
    } finally {
      setLoading(false);
    }
  }, [refreshIdToken, toast]);

// Update the useEffect:
useEffect(() => {
  fetchAssignments();
}, [fetchAssignments]);
  const handleStartQuiz = (assignment: AssignedQuizInfo) => {
    if (assignment.availableFrom && isFuture(parseISO(assignment.availableFrom))) {
        toast({ variant: "default", title: "Not Yet Available", description: `This quiz will be available from ${format(parseISO(assignment.availableFrom), "PPP p")}.` });
        return;
    }

    setSelectedQuizForTaking({ quizId: assignment.quizId, assignmentId: assignment.assignmentId, title: assignment.quizTitle });
    setSelectedQuizForReview(null);
  };

  const handleReviewQuiz = (assignment: AssignedQuizInfo) => {
     setSelectedQuizForReview({ quizId: assignment.quizId, assignmentId: assignment.assignmentId, title: assignment.quizTitle });
     setSelectedQuizForTaking(null);
  };

  if (selectedQuizForTaking) {
    return <QuizTakingInterface
              quizId={selectedQuizForTaking.quizId}
              assignmentId={selectedQuizForTaking.assignmentId}
              onComplete={() => {
                 setSelectedQuizForTaking(null);
                 fetchAssignments(); 
              }}
           />;
  }

  if (selectedQuizForReview) {
     return <QuizReviewInterface
               quizId={selectedQuizForReview.quizId}
               assignmentId={selectedQuizForReview.assignmentId}
               onBack={() => setSelectedQuizForReview(null)}
            />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Quizzes</h1>
      <p className="text-muted-foreground">Quizzes assigned to you by your teachers.</p>

      {loading ? (
        <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-[#e55283]" /> <span className="ml-2">Loading quizzes...</span></div>
      ) : error ? (
        <Card className="border-destructive"><CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertCircle /> Error Loading Quizzes</CardTitle></CardHeader><CardContent><p>{error}</p><Button onClick={fetchAssignments} variant="destructive" size="sm" className="mt-4">Try Again</Button></CardContent></Card>
      ) : assignments.length === 0 ? (
        <Card className="text-center py-10"><CardContent><FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" /><p className="text-muted-foreground">You have no quizzes assigned right now.</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => {
            const isScheduled = assignment.availableFrom && isFuture(parseISO(assignment.availableFrom));
            const isPastDue = assignment.dueBy && isPast(parseISO(assignment.dueBy));
            const canStart = assignment.status === 'assigned' && !isScheduled; 
            
            return (
              <Card key={assignment.assignmentId}>
                <CardHeader>
                  <CardTitle>{assignment.quizTitle}</CardTitle>
                  <CardDescription>
                    Assigned by: {assignment.assignedByTeacherName} on {format(parseISO(assignment.assignedAt), "PPP")}
                  </CardDescription>
                  {assignment.quizDescription && <CardDescription className="pt-1 italic">{assignment.quizDescription}</CardDescription>}
                  {isScheduled && assignment.availableFrom && (
                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1"><Clock className="h-3 w-3" /> Available from: {format(parseISO(assignment.availableFrom), "PPP p")}</p>
                  )}
                  {assignment.dueBy && (
                    <p className={`text-xs mt-1 flex items-center gap-1 ${isPastDue && assignment.status !== 'completed' ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                      <Clock className="h-3 w-3" /> Due by: {format(parseISO(assignment.dueBy), "PPP p")} {isPastDue && assignment.status !== 'completed' ? "(Past Due)" : ""}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                   <p className="text-sm">Questions: {assignment.totalQuestions}</p>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                   {assignment.status === 'completed' ? (
                      <div className="flex items-center gap-2 text-green-600">
                         <CheckCircle className="h-5 w-5" />
                       <span>Completed on {assignment.completedAt ? format(parseISO(assignment.completedAt), "PPP") : 'N/A'}</span>
                       {assignment.score !== undefined && (
                          <span className="font-semibold ml-2">Score: {assignment.score}/{assignment.totalQuestions}</span>
                       )}
                       {assignment.submittedLate && <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">LATE</span>}
                    </div>
                   ) : isScheduled ? (
                      <span className="text-sm text-blue-600">Status: Scheduled</span>
                   ) : isPastDue ? (
                      <span className="text-sm text-red-600 font-semibold">Status: Past Due</span>
                   ) : (
                      <span className="text-sm text-muted-foreground">Status: Assigned</span>
                   )}

                   {canStart && (
                      <Button 
                        size="sm" 
                        onClick={() => handleStartQuiz(assignment)} 
                        disabled={isScheduled || (assignment.dueBy ? isPast(parseISO(assignment.dueBy)) : false)} // Use isScheduled directly
                      >
                         <PlayCircle className="mr-2 h-4 w-4" /> Start Quiz
                      </Button>
                   )}
                   {assignment.status === 'completed' && (
                      <Button size="sm" variant="outline" onClick={() => handleReviewQuiz(assignment)}>
                         <Eye className="mr-2 h-4 w-4" /> Review
                      </Button>
                   )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
