/**
 * ParentQuizReviewModal component
 * 
 * - Displays a modal to review a child's quiz results with detailed question-by-question feedback.
 * - Fetches quiz details (questions and options) on open using authenticated API call.
 * - Highlights student's selected answers and correct answers with icons and colors.
 * - Shows loading and error states with appropriate UI feedback.
 * - Uses passed-in 'insight' prop for student's quiz data including submitted answers.
 * - Provides a close button to dismiss the modal.
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
import { Card, CardContent, CardHeader as CardH, CardTitle as CardT } from '@/components/ui/card'; // Aliasing to avoid conflict
import { Label } from '@/components/ui/label';
import { QuizData } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Type for the insight data passed to the modal
interface QuizInsightForReview {
  assignmentId: string;
  quizId: string;
  quizTitle: string;
  studentName: string;
  score?: number;
  totalQuestions?: number;
  // We need submittedAnswers here, ensure it's part of the insight object or fetched separately
  submittedAnswers?: Array<{ questionId: string; selectedOptionIndex: number }>; 
}

interface ParentQuizReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  insight: QuizInsightForReview | null;
}

export default function ParentQuizReviewModal({ isOpen, onClose, insight }: ParentQuizReviewModalProps) {
  const { refreshIdToken } = useAuth();
  const { toast } = useToast();
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  // Assignment data (including submitted answers) will come from the 'insight' prop
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && insight?.quizId) {
      const fetchQuizDetails = async () => {
        setLoadingQuiz(true);
        setError(null);
        try {
          const token = await refreshIdToken();
          if (!token) throw new Error("Authentication token not available.");

          const response = await fetch(`/api/quizzes/${insight.quizId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch quiz details for review.');
          }
          const result = await response.json();
          setQuizData(result.quiz);
        } catch (err: unknown) {
          console.error("Error fetching quiz details for parent review:", err);
          setError(err instanceof Error ? err.message : 'Could not load quiz details.');
          toast({ variant: "destructive", title: "Error", description: "Could not load quiz details." });
        } finally {
          setLoadingQuiz(false);
        }
      };
      fetchQuizDetails();
    } else {
      // Reset when modal is closed or no insight
      setQuizData(null);
      setError(null);
    }
  }, [isOpen, insight, refreshIdToken, toast]);

  const getStudentAnswerIndex = (questionId: string): number | undefined => {
    return insight?.submittedAnswers?.find(a => a.questionId === questionId)?.selectedOptionIndex;
  }

  if (!isOpen || !insight) {
    return null; // Don't render if not open or no insight data
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Review Quiz: {insight.quizTitle}</DialogTitle>
          <DialogDescription>
            Viewing results for {insight.studentName}. 
            Score: {insight.score ?? 'N/A'} / {insight.totalQuestions ?? 'N/A'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 overflow-y-auto flex-grow">
          {loadingQuiz ? (
            <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-[#e55283]" /></div>
          ) : error ? (
            <Card className="border-destructive"><CardH><CardT className="text-destructive flex items-center gap-2"><AlertCircle /> Error</CardT></CardH><CardContent><p>{error}</p></CardContent></Card>
          ) : !quizData ? (
            <p>Quiz details not found.</p>
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
                              isSelectedByStudent && !isCorrectOption && "bg-red-100 border-red-300 text-red-700",
                              isCorrectOption && "bg-green-100 border-green-300 text-green-700",
                              isSelectedByStudent && isCorrectOption && "font-semibold", // Student's correct answer
                              !isSelectedByStudent && isCorrectOption && "font-semibold" // Correct answer, not selected by student
                            )}
                          >
                            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                              {isCorrectOption && <Check className="h-5 w-5 text-green-600" />}
                              {isSelectedByStudent && !isCorrectOption && <X className="h-5 w-5 text-red-600" />}
                            </div>
                            <span className="flex-1">
                              {option}
                              {isSelectedByStudent && <span className="text-xs italic ml-1">(Student Answer)</span>}
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
