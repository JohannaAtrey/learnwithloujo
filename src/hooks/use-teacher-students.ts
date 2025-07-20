
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { TeacherStudent } from '@/lib/services/student-service';
import { useToast } from '@/hooks/use-toast';

interface UseTeacherStudentsResult {
  students: TeacherStudent[];
  loading: boolean;
  error: string | null;
  refreshStudents: () => Promise<void>;
}

export function useTeacherStudents(): UseTeacherStudentsResult {
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { refreshIdToken, user } = useAuth();
  const { toast } = useToast();

  const fetchStudents = useCallback(async () => {
    if (!user?.id) {
      setError('No authenticated user found');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const token = await refreshIdToken();
      if (!token) throw new Error('Authentication token not available');

      const response = await fetch('/api/teacher/students', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch students');
      }

      const data = await response.json();
      setStudents(data.students);
    } catch (err: unknown) {
      console.error('Error fetching students:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch students';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [refreshIdToken, toast, user]); // Include full user object to track changes

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return {
    students,
    loading,
    error,
    refreshStudents: fetchStudents
  };
}