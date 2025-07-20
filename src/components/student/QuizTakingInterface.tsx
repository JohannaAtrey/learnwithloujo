/**
 * QuizTakingInterface component
 * 
 * - Loads quiz data and handles a timed quiz session.
 * - Allows navigation between questions with radio options.
 * - Tracks answers and submits results to backend.
 * - Displays a countdown timer and auto-submits when time expires.
 * - Shows a completion screen with score and back button.
 * - Handles loading, errors, and submission state.
 */

'use client';

import React, { useState, useEffect, useRef, useCallback} from 'react'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { QuizData } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, CheckCircle, TimerIcon } from 'lucide-react'; 


interface QuizTakingInterfaceProps {
  quizId: string;
  assignmentId: string; 
  onComplete: () => void; 
}

type Answer = {
  questionId: string;
  selectedOptionIndex: number;
};

export default function QuizTakingInterface({ quizId, assignmentId, onComplete }: QuizTakingInterfaceProps) {
  const { refreshIdToken } = useAuth();
  const { toast } = useToast();
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null); 
  const timerRef = useRef<NodeJS.Timeout | null>(null); 

  // Helper to format time
  const formatTimeLeft = (seconds: number | null): string => {
    if (seconds === null) return '';
    if (seconds < 0) return '00:00'; 
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Fetch quiz data
  useEffect(() => {
    const fetchQuiz = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await refreshIdToken();
        if (!token) throw new Error("Authentication token not available.");

        const response = await fetch(`/api/quizzes/${quizId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch quiz details');
        }
        const data = await response.json();
        setQuizData(data.quiz);

        // Initialize timer if time limit exists
        if (data.quiz?.timeLimitMinutes && data.quiz.timeLimitMinutes > 0) {
           setTimeLeft(data.quiz.timeLimitMinutes * 60);
        }

      } catch (err: unknown) {
        console.error("Error fetching quiz:", err);
        setError(err instanceof Error ? err.message : 'Could not load quiz.');
        toast({ variant: "destructive", title: "Error", description: "Could not load quiz details." });
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();

    // Cleanup timer on unmount
    return () => {
       if (timerRef.current) {
          clearInterval(timerRef.current);
       }
    };
  }, [quizId, refreshIdToken, toast]);

  


  const handleAnswerSelect = (questionId: string, selectedOptionIndex: number) => {
    setAnswers((prevAnswers) => {
      const existingAnswerIndex = prevAnswers.findIndex(a => a.questionId === questionId);
      if (existingAnswerIndex > -1) {
        // Update existing answer
        const updatedAnswers = [...prevAnswers];
        updatedAnswers[existingAnswerIndex] = { questionId, selectedOptionIndex };
        return updatedAnswers;
      } else {
        // Add new answer
        return [...prevAnswers, { questionId, selectedOptionIndex }];
      }
    });
  };

  const goToNextQuestion = () => {
    if (quizData && currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Added optional parameter for auto-submit case
  const handleSubmitQuiz = useCallback(async (isAutoSubmit = false) => { 
    // Allow auto-submit even if not all questions are answered
    if (!isAutoSubmit && answers.length !== quizData?.questions.length) {
       toast({ variant: "destructive", title: "Incomplete", description: "Please answer all questions before submitting." });
       return;
    }

     // Clear timer immediately on submit
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(null); // Stop timer display

    setIsSubmitting(true);
    setError(null);

    try {
       // Calculate score
       let correctAnswers = 0;
       quizData?.questions.forEach(q => {
          const studentAnswer = answers.find(a => a.questionId === q.id);
          if (studentAnswer && studentAnswer.selectedOptionIndex === q.correctOptionIndex) {
             correctAnswers++;
          }
       });
       const calculatedScore = correctAnswers;
       setScore(calculatedScore); // Set score locally for immediate feedback

       // Call the API to submit results
       const token = await refreshIdToken();
       if (!token) throw new Error("Authentication token not available.");

       const response = await fetch('/api/student/quiz-attempts', {
          method: 'POST',
          headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ assignmentId, answers }), // Send assignmentId and the student's answers
       });

       if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to submit quiz results');
       }

       const result = await response.json();
       console.log('Quiz submission result:', result); // Log API response

       toast({ title: "Quiz Submitted!", description: `Your score: ${result.score}/${result.totalQuestions}` });
       setQuizFinished(true); // Mark quiz as finished locally

    } catch (err: unknown) {
       console.error("Error submitting quiz:", err);
       setError(err instanceof Error ? err.message : 'Could not submit quiz results.');
       toast({ variant: "destructive", title: "Error", description: "Could not submit quiz results." });
    } finally {
       setIsSubmitting(false);
    }
  }, [answers, quizData?.questions, assignmentId, refreshIdToken, toast, setTimeLeft, setIsSubmitting, setError, setScore, setQuizFinished]);

  // Timer countdown effect
  useEffect(() => {
     if (timeLeft === null || quizFinished || isSubmitting) {
        if (timerRef.current) clearInterval(timerRef.current); // Clear if no time left or finished/submitting
        return;
     }

     if (timeLeft <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        toast({ variant: "destructive", title: "Time's Up!", description: "Auto-submitting your quiz." });
        handleSubmitQuiz(true); // Pass flag to indicate auto-submit
        return;
     }

     // Start or continue the timer
     if (!timerRef.current) {
        timerRef.current = setInterval(() => {
           setTimeLeft((prevTime) => (prevTime !== null ? prevTime - 1 : null));
        }, 1000);
     }

     // Cleanup function for this effect instance
     return () => {
        if (timerRef.current) {
           clearInterval(timerRef.current);
           timerRef.current = null; // Reset ref when effect re-runs or component unmounts
        }
     };
  }, [timeLeft, quizFinished, isSubmitting, handleSubmitQuiz, toast]);

  if (loading) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-[#e55283]" /></div>;
  }

  if (error) {
    return <Card className="border-destructive"><CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertCircle /> Error</CardTitle></CardHeader><CardContent><p>{error}</p></CardContent></Card>;
  }

  if (!quizData) {
    return <p>Quiz not found.</p>;
  }

  const currentQuestion = quizData.questions[currentQuestionIndex];
  const currentAnswer = answers.find(a => a.questionId === currentQuestion.id)?.selectedOptionIndex;
  const progressValue = ((currentQuestionIndex + 1) / quizData.questions.length) * 100;

  // Quiz Finished View
  if (quizFinished) {
     return (
        <Card className="w-full max-w-2xl mx-auto">
           <CardHeader className="text-center">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
              <CardTitle className="text-2xl">Quiz Complete!</CardTitle>
              <CardDescription>You have successfully submitted the quiz.</CardDescription>
           </CardHeader>
           <CardContent className="text-center space-y-4">
              <p className="text-lg">Quiz: <span className="font-semibold">{quizData.title}</span></p>
              {score !== null && (
                 <p className="text-xl font-bold">Your Score: {score} / {quizData.questions.length}</p>
              )}
              {/* Add more insights later if needed */}
           </CardContent>
           <CardFooter className="justify-center">
              <Button onClick={onComplete}>Back to Quizzes</Button>
           </CardFooter>
        </Card>
     );
  }

  // Quiz Taking View
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{quizData.title}</CardTitle>
        {quizData.description && <CardDescription>{quizData.description}</CardDescription>}
        {/* Timer Display */}
        {timeLeft !== null && (
           <div className="flex items-center justify-center gap-2 text-lg font-semibold mt-2 text-destructive">
              <TimerIcon className="h-5 w-5" />
              <span>Time Left: {formatTimeLeft(timeLeft)}</span>
           </div>
        )}
        <Progress value={progressValue} className="mt-4" />
        <p className="text-sm text-muted-foreground text-center mt-1">Question {currentQuestionIndex + 1} of {quizData.questions.length}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-lg font-semibold mb-4 block">{currentQuestion.questionText}</Label>
          <RadioGroup
            value={currentAnswer?.toString() || ""}
            onValueChange={(value) => handleAnswerSelect(currentQuestion.id, parseInt(value))}
            className="space-y-3"
          >
            {currentQuestion.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-3 border rounded p-3 hover:bg-muted/50">
                <RadioGroupItem value={index.toString()} id={`q${currentQuestion.id}-opt${index}`} />
                <Label htmlFor={`q${currentQuestion.id}-opt${index}`} className="flex-1 cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={goToPreviousQuestion}
          disabled={currentQuestionIndex === 0 || isSubmitting}
        >
          Previous
        </Button>
        {currentQuestionIndex < quizData.questions.length - 1 ? (
          <Button
            onClick={goToNextQuestion}
            disabled={currentAnswer === undefined || isSubmitting} // Disable if current question not answered
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={() => handleSubmitQuiz(false)} // Wrap in arrow function for correct type
            disabled={answers.length !== quizData.questions.length || isSubmitting} // Disable if not all answered
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit Quiz
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
