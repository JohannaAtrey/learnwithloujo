/**
 * MyQuizzesList component
 * 
 * - Fetches and displays the teacher's quizzes.
 * - Shows loading, error, and empty states.
 * - Supports editing (placeholder), deleting (placeholder), and assigning quizzes.
 * - Uses the AssignQuizModal component for assigning quizzes to students.
 * - Includes toast notifications for feedback on errors and actions.
 */

'use client';

import React, { useState, useEffect, useCallback} from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { QuizData } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, FileText, Edit, Trash2, Users } from 'lucide-react';
import AssignQuizModal from './AssignQuizModal'; // Import the modal

export default function MyQuizzesList() {
  const { refreshIdToken } = useAuth();
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<QuizData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuizzes = useCallback(async () => {
  setLoading(true);
  setError(null);
  console.log('[MyQuizzesList] Fetching quizzes...');
  try {
    const token = await refreshIdToken();
    if (!token) throw new Error('Authentication token not available.');

    const response = await fetch('/api/teacher/quizzes', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to fetch quizzes: ${response.statusText}`);
    }

    const data = await response.json();
    setQuizzes(data.quizzes || []);
    console.log(`[MyQuizzesList] Fetched ${data.quizzes?.length || 0} quizzes.`);
  } catch (err: unknown) {
    console.error('[MyQuizzesList] Error fetching quizzes:', err);
    setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    toast({ variant: "destructive", title: "Error", description: "Could not load quizzes." });
  } finally {
    setLoading(false);
  }
}, [refreshIdToken, toast, setLoading, setError, setQuizzes]);

useEffect(() => {
  fetchQuizzes();
}, [fetchQuizzes]);

  const handleEdit = (quizId: string) => {
    // TODO: Implement navigation or modal for editing
    toast({ title: "Edit Feature", description: `Editing quiz ${quizId} (Not Implemented)` });
  };

  const handleDelete = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz? This cannot be undone.')) return;
    // TODO: Implement delete API call
    toast({ variant: "destructive", title: "Delete Feature", description: `Deleting quiz ${quizId} (Not Implemented)` });
    // Optimistic UI update or refetch after delete
    // setQuizzes(prev => prev.filter(q => q.id !== quizId));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-[#e55283]" />
        <span className="ml-2">Loading quizzes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
         <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
               <AlertCircle /> Error Loading Quizzes
            </CardTitle>
         </CardHeader>
         <CardContent>
            <p>{error}</p>
            <Button onClick={fetchQuizzes} variant="destructive" size="sm" className="mt-4">Try Again</Button>
         </CardContent>
      </Card>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed rounded-lg">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No Quizzes Created Yet</h3>
        <p className="text-muted-foreground">Click &ldquo;Create New Quiz&rdquo; to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {quizzes.map((quiz) => (
        <Card key={quiz.id}>
          <CardHeader>
            <CardTitle>{quiz.title}</CardTitle>
            {quiz.description && <CardDescription>{quiz.description}</CardDescription>}
            <CardDescription className="text-xs pt-1">
              Created on: {new Date(quiz.createdAt).toLocaleDateString()} | {quiz.questions.length} Questions
            </CardDescription>
          </CardHeader>
          {/* Optionally add CardContent to show first few questions or stats */}
          <CardFooter className="flex justify-end gap-2">
             <Button variant="outline" size="sm" onClick={() => handleEdit(quiz.id!)}>
               <Edit className="mr-1 h-4 w-4" /> Edit
             </Button>
             {/* Use AssignQuizModal component */}
             <AssignQuizModal
               quizId={quiz.id!}
               quizTitle={quiz.title}
               triggerButton={
                 <Button variant="secondary" size="sm">
                   <Users className="mr-1 h-4 w-4" /> Assign
                 </Button>
               }
             />
             <Button variant="destructive" size="sm" onClick={() => handleDelete(quiz.id!)}>
               <Trash2 className="mr-1 h-4 w-4" /> Delete
             </Button>
          </CardFooter>
        </Card>
      ))}
      {/* Removed placeholder, modal is now triggered directly */}
    </div>
  );
}
