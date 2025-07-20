// Teacher-facing page for managing quizzes.
// Allows viewing existing quizzes and creating new ones using QuizCreatorForm.

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import MyQuizzesList from '@/components/teacher/MyQuizzesList'; 
import QuizCreatorForm from '@/components/teacher/QuizCreatorForm';

export default function TeacherQuizzesPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); 


  // const handleQuizSaved = (quizId: string) => {
  const handleQuizSaved = () => {
    // console.log('Quiz created/updated:', quizId);
    setShowCreateForm(false);
    setRefreshKey(prev => prev + 1); 
  };

  if (showCreateForm) {
    return (
      <QuizCreatorForm
        onCancel={() => setShowCreateForm(false)}
        onSuccess={handleQuizSaved} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Quizzes</h1>
        <Button onClick={() => setShowCreateForm(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Quiz
        </Button>
      </div>
      <MyQuizzesList key={refreshKey} /> 
    </div>
  );
}
