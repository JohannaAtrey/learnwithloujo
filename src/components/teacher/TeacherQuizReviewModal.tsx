/**
 * TeacherQuizReviewModal component
 * 
 * - Displays a modal dialog for teachers to review a student's quiz attempt.
 * - Fetches quiz details and the student's submitted answers when opened.
 * - Shows each question with options, highlighting student's selected answer and correct answer.
 * - Handles loading, error, and missing data states with user feedback.
 * - Allows closing the modal via a button or outside click.
 * - Uses authentication token for secure API requests.
 * - Displays toast notifications on error during data fetch.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader as CardH, CardTitle as CardT } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { QuizData, QuizAssignment } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, Check, X } from 'lucide-react';
import { cn } from "@/lib/utils";

// Type for the attempt data passed to the modal
interface AttemptForReview {
  assignmentId: string;
  quizId: string;
  quizTitle: string;
  studentName: string;
  score?: number;
  totalQuestions?: number;
  submittedAnswers?: Array<{ questionId: string; selectedOptionIndex: number }>;
}

interface TeacherQuizReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  attempt: AttemptForReview | null;
}

export default function TeacherQuizReviewModal({ isOpen, onClose, attempt }: TeacherQuizReviewModalProps) {
  const { refreshIdToken } = useAuth();
  const { toast } = useToast();
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [assignmentDetails, setAssignmentDetails] = useState<QuizAssignment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && attempt?.quizId && attempt?.assignmentId) {
      const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
          const token = await refreshIdToken();
          if (!token) throw new Error("Authentication token not available.");

          const [quizResponse, assignmentResponse] = await Promise.all([
            fetch(`/api/quizzes/${attempt.quizId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
            // Use the student API to get assignment details including submitted answers
            fetch(`/api/student/quiz-attempts/${attempt.assignmentId}`, { headers: { 'Authorization': `Bearer ${token}` } })
          ]);

          if (!quizResponse.ok) {
            const errorData = await quizResponse.json();
            throw new Error(errorData.error || 'Failed to fetch quiz details.');
          }
          const quizResult = await quizResponse.json();
          setQuizData(quizResult.quiz);

          if (!assignmentResponse.ok) {
            const errorData = await assignmentResponse.json();
            throw new Error(errorData.error || 'Failed to fetch assignment details.');
          }
          const assignmentResult = await assignmentResponse.json();
          setAssignmentDetails(assignmentResult.assignment);

        } catch (err: unknown) {
          console.error("Error fetching review data for teacher:", err);
          setError(err instanceof Error ? err.message : 'Could not load review data.');
          toast({ variant: "destructive", title: "Error", description: "Could not load review data." });
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    } else {
      setQuizData(null);
      setAssignmentDetails(null);
      setError(null);
    }
  }, [isOpen, attempt, refreshIdToken, toast]);

  const getStudentAnswerIndex = (questionId: string): number | undefined => {
    return assignmentDetails?.submittedAnswers?.find(a => a.questionId === questionId)?.selectedOptionIndex;
  }

  if (!isOpen || !attempt) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Review Attempt: {attempt.quizTitle}</DialogTitle>
          <DialogDescription>
            Student: {attempt.studentName} | Score: {attempt.score ?? 'N/A'} / {attempt.totalQuestions ?? 'N/A'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 overflow-y-auto flex-grow">
          {loading ? (
            <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-[#e55283]" /></div>
          ) : error ? (
            <Card className="border-destructive"><CardH><CardT className="text-destructive flex items-center gap-2"><AlertCircle /> Error</CardT></CardH><CardContent><p>{error}</p></CardContent></Card>
          ) : !quizData || !assignmentDetails ? (
            <p>Quiz or attempt details not found.</p>
          ) : (
            <div className="space-y-6">
              {quizData.questions.map((question, qIndex) => {
                const studentAnswerIndex = getStudentAnswerIndex(question.id);
                return (
                  <div key={question.id} className="border-t pt-4 first:border-t-0">
                    <Label className="text-md font-semibold mb-3 block">
                      Question {qIndex + 1}: {question.questionText}
                    </Label>
                    <div className="space-y-2">
                      {question.options.map((option, oIndex) => {
                        const isSelectedByStudent = studentAnswerIndex === oIndex;
                        const isCorrectOption = question.correctOptionIndex === oIndex;

                        return (
                          <div
                            key={oIndex}
                            className={cn(
                              "flex items-center space-x-3 border rounded p-3 text-sm",
                              isSelectedByStudent && !isCorrectOption && "bg-red-100 border-red-300 text-red-700", // Student's incorrect answer
                              isCorrectOption && "bg-green-100 border-green-300 text-green-700" // Correct option
                            )}
                          >
                            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                              {isCorrectOption && <Check className="h-5 w-5 text-green-600" />}
                              {isSelectedByStudent && !isCorrectOption && <X className="h-5 w-5 text-red-600" />}
                            </div>
                            <span className="flex-1">
                              {option}
                              {isSelectedByStudent && <span className="text-xs italic ml-1">(Student&apos;s Answer)</span>}
                              {isCorrectOption && !isSelectedByStudent && <span className="text-xs italic ml-1">(Correct Answer)</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
