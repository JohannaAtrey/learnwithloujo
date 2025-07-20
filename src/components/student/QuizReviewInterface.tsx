/**
 * QuizReviewInterface component
 * 
 * - Fetches quiz details and student's assignment answers.
 * - Displays questions with options, highlighting correct and selected answers.
 * - Shows score and provides a back button to return to the quiz list.
 * - Handles loading and error states gracefully with toasts and messages.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { QuizData, QuizAssignment } from '@/types'; 
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, Check, X, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils'; 

interface QuizReviewInterfaceProps {
  quizId: string;
  assignmentId: string;
  onBack: () => void; 
}

// Extend QuizAssignment to potentially include submittedAnswers if not already in the base type
interface QuizAssignmentWithAnswers extends QuizAssignment {
   submittedAnswers?: Array<{ questionId: string; selectedOptionIndex: number }>;
}

export default function QuizReviewInterface({ quizId, assignmentId, onBack }: QuizReviewInterfaceProps) {
  const { refreshIdToken } = useAuth();
  const { toast } = useToast();
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [assignmentData, setAssignmentData] = useState<QuizAssignmentWithAnswers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await refreshIdToken();
        if (!token) throw new Error("Authentication token not available.");

        // Fetch both quiz details and assignment details (with answers)
        const [quizResponse, assignmentResponse] = await Promise.all([
          fetch(`/api/quizzes/${quizId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`/api/student/quiz-attempts/${assignmentId}`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (!quizResponse.ok) {
           const errorData = await quizResponse.json();
           throw new Error(errorData.error || 'Failed to fetch quiz details');
        }
        if (!assignmentResponse.ok) {
           const errorData = await assignmentResponse.json();
           throw new Error(errorData.error || 'Failed to fetch assignment details');
        }

        const quizResult = await quizResponse.json();
        const assignmentResult = await assignmentResponse.json();

        setQuizData(quizResult.quiz);
        setAssignmentData(assignmentResult.assignment);

      } catch (err: unknown) {
        console.error("Error fetching review data:", err);
        setError(err instanceof Error ? err.message : 'Could not load quiz review.');
        toast({ variant: "destructive", title: "Error", description: "Could not load quiz review data." });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [quizId, assignmentId, refreshIdToken, toast]);

  const getStudentAnswerIndex = (questionId: string): number | undefined => {
     return assignmentData?.submittedAnswers?.find(a => a.questionId === questionId)?.selectedOptionIndex;
  }

  if (loading) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-[#e55283]" /></div>;
  }

  if (error) {
    return (
       <Card className="border-destructive">
          <CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertCircle /> Error</CardTitle></CardHeader>
          <CardContent>
             <p>{error}</p>
             <Button onClick={onBack} variant="outline" size="sm" className="mt-4">Back to Quizzes</Button>
          </CardContent>
       </Card>
    );
  }

  if (!quizData || !assignmentData) {
    return (
       <Card>
          <CardHeader><CardTitle>Error</CardTitle></CardHeader>
          <CardContent>
             <p>Could not load quiz or assignment data.</p>
             <Button onClick={onBack} variant="outline" size="sm" className="mt-4">Back to Quizzes</Button>
          </CardContent>
       </Card>
    );
  }

  return (
    <div className="space-y-6">
       <Button onClick={onBack} variant="outline" size="sm" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Quizzes
       </Button>
       <Card>
          <CardHeader>
             <CardTitle>Review: {quizData.title}</CardTitle>
             {assignmentData.score !== undefined && assignmentData.totalQuestions !== undefined && (
                <CardDescription>
                   Your Score: {assignmentData.score} / {assignmentData.totalQuestions}
                </CardDescription>
             )}
          </CardHeader>
          <CardContent className="space-y-6">
             {quizData.questions.map((question, qIndex) => {
                const studentAnswerIndex = getStudentAnswerIndex(question.id);

                return (
                   <div key={question.id} className="border-t pt-4">
                      <Label className="text-md font-semibold mb-3 block">
                         Question {qIndex + 1}: {question.questionText}
                      </Label>
                      <div className="space-y-2">
                         {question.options.map((option, oIndex) => {
                            const isSelected = studentAnswerIndex === oIndex;
                            const isCorrectOption = question.correctOptionIndex === oIndex;

                            return (
                               <div
                                  key={oIndex}
                                  className={cn(
                                     "flex items-center space-x-3 border rounded p-3",
                                     isSelected && !isCorrectOption && "bg-red-100 border-red-300", 
                                     isCorrectOption && "bg-green-100 border-green-300" 
                                  )}
                               >
                                  {/* Indicator: Correct/Incorrect */}
                                  <div className="w-5 h-5 flex items-center justify-center">
                                     {isCorrectOption && <Check className="h-5 w-5 text-green-600" />}
                                     {isSelected && !isCorrectOption && <X className="h-5 w-5 text-red-600" />}
                                  </div>
                                  <Label htmlFor={`review-q${question.id}-opt${oIndex}`} className="flex-1 cursor-default">
                                     {option} {isSelected && !isCorrectOption && "(Your Answer)"} {isCorrectOption && !isSelected && "(Correct Answer)"} {isCorrectOption && isSelected && "(Correct)"}
                                  </Label>
                               </div>
                            );
                         })}
                      </div>
                   </div>
                );
             })}
          </CardContent>
       </Card>
    </div>
  );
}
