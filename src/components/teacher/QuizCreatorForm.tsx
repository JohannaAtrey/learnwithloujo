/**
 * QuizCreatorForm component
 * 
 * - Allows creating and editing quizzes with dynamic questions and options.
 * - Supports adding/removing questions and options with validation.
 * - Marks one option per question as the correct answer using radio buttons.
 * - Includes fields for quiz title, description, and optional time limit.
 * - Performs client-side validation for required fields before submission.
 * - Submits quiz data to backend API for saving or updating.
 * - Provides loading and error feedback with toast notifications.
 * - Uses unique IDs for questions/options via UUID to manage React keys.
 * - Supports cancel and success callbacks to integrate with parent components.
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; 
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PlusCircle, Trash2, X, Loader2 } from 'lucide-react'; 
import { QuizData, QuizQuestion } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid'; 

interface QuizCreatorFormProps {
  initialQuizData?: QuizData; // For editing existing quizzes later
  onCancel: () => void;
  onSuccess: () => void;
}

export default function QuizCreatorForm({ initialQuizData, onCancel, onSuccess }: QuizCreatorFormProps) {
  const { refreshIdToken } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState(initialQuizData?.title || '');
  const [description, setDescription] = useState(initialQuizData?.description || '');
  const [timeLimit, setTimeLimit] = useState<string>(initialQuizData?.timeLimitMinutes?.toString() || ''); 
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuizData?.questions || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: uuidv4(), 
        questionText: '',
        options: ['', ''], 
        correctOptionIndex: -1, 
      },
    ]);
  };

  const removeQuestion = (questionId: string) => {
    setQuestions(questions.filter((q) => q.id !== questionId));
  };

  const handleQuestionTextChange = (questionId: string, text: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId ? { ...q, questionText: text } : q
      )
    );
  };

  const addOption = (questionId: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId ? { ...q, options: [...q.options, ''] } : q
      )
    );
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const newOptions = q.options.filter((_, i) => i !== optionIndex);
          // Adjust correctOptionIndex if the removed option was correct or before the correct one
          let newCorrectIndex = q.correctOptionIndex;
          if (optionIndex === q.correctOptionIndex) {
            newCorrectIndex = -1; // Reset if correct option is removed
          } else if (optionIndex < q.correctOptionIndex) {
            newCorrectIndex--; // Adjust index if an option before the correct one is removed
          }
          return { ...q, options: newOptions, correctOptionIndex: newCorrectIndex };
        }
        return q;
      })
    );
  };

  const handleOptionTextChange = (questionId: string, optionIndex: number, text: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((opt, i) =>
                i === optionIndex ? text : opt
              ),
            }
          : q
      )
    );
  };

  const handleCorrectOptionChange = (questionId: string, optionIndex: number) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId ? { ...q, correctOptionIndex: optionIndex } : q
      )
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    // Validation
    if (!title.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Quiz title cannot be empty." });
      setIsSubmitting(false);
      return;
    }
    if (questions.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Quiz must have at least one question." });
      setIsSubmitting(false);
      return;
    }
    for (const q of questions) {
      if (!q.questionText.trim()) {
        toast({ variant: "destructive", title: "Error", description: `Question text cannot be empty (Question ID: ${q.id}).` });
        setIsSubmitting(false);
        return;
      }
      if (q.options.length < 2) {
         toast({ variant: "destructive", title: "Error", description: `Question must have at least two options (Question ID: ${q.id}).` });
         setIsSubmitting(false);
         return;
      }
      if (q.options.some(opt => !opt.trim())) {
         toast({ variant: "destructive", title: "Error", description: `All options must have text (Question ID: ${q.id}).` });
         setIsSubmitting(false);
         return;
      }
      if (q.correctOptionIndex < 0 || q.correctOptionIndex >= q.options.length) {
        toast({ variant: "destructive", title: "Error", description: `Please select a correct answer for each question (Question ID: ${q.id}).` });
        setIsSubmitting(false);
        return;
      }
    }

    // Validate time limit (must be a positive integer or empty/zero)
    let timeLimitNum: number | undefined = undefined;
    const trimmedTimeLimit = timeLimit.trim();
    if (trimmedTimeLimit !== '') {
       const parsedNum = parseInt(trimmedTimeLimit, 10);
       if (isNaN(parsedNum) || parsedNum < 0) { 
          toast({ variant: "destructive", title: "Error", description: "Time limit must be a non-negative number of minutes." });
          setIsSubmitting(false);
          return;
       }
       if (parsedNum > 0) {
          timeLimitNum = parsedNum;
       }
    }

    const quizPayload = {
      title,
      description,
      questions,
      timeLimitMinutes: timeLimitNum, 
    };

    try {
      const token = await refreshIdToken();
      if (!token) {
        console.error("QuizCreatorForm: Failed to get token");
        throw new Error("Authentication token not available.");
      }

      // TODO: Add PUT logic if initialQuizData.id exists (for editing)
      const response = await fetch('/api/teacher/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(quizPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save quiz');
      }

      await response.json();
      toast({ title: "Success", description: "Quiz saved successfully!" });
      onSuccess(); 

    } catch (err: unknown) {
      console.error("QuizCreatorForm: Error saving quiz:", err);
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: err instanceof Error ? err.message : "Could not save quiz." 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{initialQuizData ? 'Edit Quiz' : 'Create New Quiz'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quiz Title and Description */}
          <div className="space-y-2">
            <Label htmlFor="quiz-title">Quiz Title</Label>
            <Input
              id="quiz-title"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} // Added type
              placeholder="Enter quiz title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quiz-description">Description (Optional)</Label>
            <Textarea
              id="quiz-description"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} // Added type
              placeholder="Enter a short description for the quiz"
            />
          </div>
          <div className="space-y-2">
             <Label htmlFor="quiz-time-limit">Time Limit (Minutes - Optional)</Label>
             <Input
               id="quiz-time-limit"
               type="number"
               value={timeLimit}
               onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTimeLimit(e.target.value)}
               placeholder="e.g., 30"
               min="1" // Basic HTML5 validation
             />
             <p className="text-xs text-muted-foreground">Leave blank for no time limit.</p>
          </div>


          {/* Questions Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-t pt-4">Questions</h3>
            {questions.map((q, qIndex) => (
              <Card key={q.id} className="p-4 bg-muted/50">
                <div className="flex justify-between items-start mb-2">
                   <Label htmlFor={`question-${q.id}`}>Question {qIndex + 1}</Label>
                   <Button
                     type="button"
                     variant="ghost"
                     size="icon"
                     className="h-6 w-6 text-destructive hover:bg-destructive/10"
                     onClick={() => removeQuestion(q.id)}
                     aria-label="Remove question"
                   >
                     <Trash2 className="h-4 w-4" />
                   </Button>
                </div>
                <Textarea
                  id={`question-${q.id}`}
                  value={q.questionText}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleQuestionTextChange(q.id, e.target.value)} // Added type
                  placeholder={`Enter question ${qIndex + 1} text`}
                  required
                  className="mb-3"
                />

                <Label className="mb-2 block text-sm font-medium">Options (Mark correct answer)</Label>
                <RadioGroup
                   value={q.correctOptionIndex.toString()} // Value must be string for RadioGroup
                   onValueChange={(value) => handleCorrectOptionChange(q.id, parseInt(value))}
                   className="space-y-2"
                 >
                   {q.options.map((opt, oIndex) => (
                     <div key={oIndex} className="flex items-center gap-2">
                       <RadioGroupItem value={oIndex.toString()} id={`q${q.id}-opt${oIndex}`} />
                       <Label htmlFor={`q${q.id}-opt${oIndex}`} className="flex-1">
                         <Input
                           value={opt}
                           onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOptionTextChange(q.id, oIndex, e.target.value)} // Added type
                           placeholder={`Option ${oIndex + 1}`}
                           required
                           className="h-8"
                         />
                       </Label>
                       {q.options.length > 2 && ( // Only allow removing if more than 2 options
                         <Button
                           type="button"
                           variant="ghost"
                           size="icon"
                           className="h-6 w-6 text-muted-foreground hover:bg-muted/50"
                           onClick={() => removeOption(q.id, oIndex)}
                           aria-label="Remove option"
                         >
                           <X className="h-4 w-4" />
                         </Button>
                       )}
                     </div>
                   ))}
                 </RadioGroup>
                 <Button
                   type="button"
                   variant="outline"
                   size="sm"
                   className="mt-2"
                   onClick={() => addOption(q.id)}
                 >
                   <PlusCircle className="mr-1 h-4 w-4" /> Add Option
                 </Button>
              </Card>
            ))}
            <Button type="button" variant="secondary" onClick={addQuestion}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Question
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {initialQuizData ? 'Update Quiz' : 'Save Quiz'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
