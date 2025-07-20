/**
 * ClassList component
 * 
 * - Fetches and displays classes for the logged-in teacher.
 * - Shows loading state, error messages, and empty state.
 * - Lists class details: name, description, student count, creation date.
 * - Provides buttons to edit, manage students, and delete classes.
 * - Edit and delete features are placeholders (not implemented).
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ClassData } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, Users, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link'; 

export default function ClassList() {
  const { refreshIdToken } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    const token = await refreshIdToken();
    if (!token) throw new Error('Authentication token not available.');

    const response = await fetch('/api/teacher/classes', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch classes');
    }
    const data = await response.json();
    setClasses(data.classes || []);
  } catch (err: unknown) {
    console.error('Error fetching classes:', err);
    setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    toast({ variant: "destructive", title: "Error", description: "Could not load classes." });
  } finally {
    setLoading(false);
  }
}, [refreshIdToken, toast, setLoading, setError, setClasses]);

useEffect(() => {
  fetchClasses();
}, [fetchClasses]);
  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class? This action cannot be undone.')) return;
    
    // TODO: Implement DELETE API call to /api/teacher/classes/{classId}
    toast({ variant: "destructive", title: "Delete Feature", description: `Deleting class ${classId} (Not Implemented)` });
    // After successful delete, refetch or filter locally:
    // setClasses(prev => prev.filter(c => c.id !== classId));
  };

  const handleEditClass = (classData: ClassData) => {
    // setSelectedClassForEdit(classData);
    // setIsEditModalOpen(true);
    toast({ title: "Edit Feature", description: `Editing class ${classData.className} (Not Implemented)` });
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-[#e55283]" />
        <span className="ml-2">Loading classes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
         <CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertCircle /> Error Loading Classes</CardTitle></CardHeader>
         <CardContent><p>{error}</p><Button onClick={fetchClasses} variant="destructive" size="sm" className="mt-4">Try Again</Button></CardContent>
      </Card>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed rounded-lg">
        <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No Classes Created Yet</h3>
        <p className="text-muted-foreground">Click &ldquo;Create New Class&rdquo; to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {classes.map((cls) => (
        <Card key={cls.id}>
          <CardHeader>
            <CardTitle>{cls.className}</CardTitle>
            {cls.description && <CardDescription>{cls.description}</CardDescription>}
            <CardDescription className="text-xs pt-1">
              Students: {cls.studentIds?.length || 0} | Created: {new Date(cls.createdAt.seconds * 1000).toLocaleDateString()} {/* Adjust if createdAt is already ISO string */}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-end gap-2">
             <Button variant="outline" size="sm" onClick={() => handleEditClass(cls)}>
               <Edit className="mr-1 h-4 w-4" /> Edit Details
             </Button>
             {/* Link to a future page for managing students in this class */}
             <Link href={`/dashboard/teacher/classes/${cls.id}/manage-students`}>
                <Button variant="secondary" size="sm">
                   <Users className="mr-1 h-4 w-4" /> Manage Students
                </Button>
             </Link>
             <Button variant="destructive" size="sm" onClick={() => handleDeleteClass(cls.id!)}>
               <Trash2 className="mr-1 h-4 w-4" /> Delete Class
             </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
