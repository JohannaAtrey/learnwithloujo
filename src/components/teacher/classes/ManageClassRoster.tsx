/**
 * ManageClassRoster component
 *
 * - Fetches class details and the list of all teacher's students.
 * - Displays two panels: available students and students currently in the class.
 * - Allows adding/removing students from the class roster.
 * - Saves changes by updating the class roster via API.
 * - Handles loading states, errors, and shows toast notifications.
 * - Provides user feedback during save operations.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ClassData } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useTeacherStudents } from '@/hooks/use-teacher-students';
import { Loader2, AlertCircle, UserPlus, UserMinus, Save } from 'lucide-react';

interface ManageClassRosterProps {
  classId: string;
  onSuccess?: () => void;
}

export default function ManageClassRoster({ classId, onSuccess }: ManageClassRosterProps) {
  const { refreshIdToken } = useAuth();
  const { toast } = useToast();
  const { students, loading: loadingStudents, error: studentsError} = useTeacherStudents();

  const [classData, setClassData] = useState<ClassData | null>(null);
  const [studentsInClass, setStudentsInClass] = useState<string[]>([]); // Array of student UIDs
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchClassData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await refreshIdToken();
        console.log('ManageClassRoster: fetched token:', token);
        if (!token) throw new Error("Authentication token not available.");

        // Fetch class details
        const classRes = await fetch(`/api/teacher/classes/${classId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!classRes.ok) {
          const errorData = await classRes.json();
          throw new Error(errorData.error || 'Failed to fetch class details.');
        }
        
        const classResult = await classRes.json();
        setClassData(classResult.class);
        setStudentsInClass(classResult.class?.studentIds || []);
      } catch (err: unknown) {
        console.error("Error fetching class data:", err);
        setError(err instanceof Error ? err.message : "Could not load class data.");
        toast({ 
          variant: "destructive", 
          title: "Error", 
          description: "Could not load class data." 
        });
      } finally {
        setLoading(false);
      }
    };

    if (classId) {
      fetchClassData();
    }
  }, [classId, refreshIdToken, toast]);

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const token = await refreshIdToken();
      if (!token) throw new Error("Authentication token not available.");

      const response = await fetch(`/api/teacher/classes/${classId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ studentIds: studentsInClass }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update class roster');
      }

      toast({ 
        title: "Success", 
        description: "Class roster updated successfully!" 
      });
      
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      console.error("Error saving class roster:", err);
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: err instanceof Error ? err.message : "Could not save changes." 
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Filter students based on class membership
  const availableStudents = students.filter(s => !studentsInClass.includes(s.studentId));
  const currentClassMembers = students.filter(s => studentsInClass.includes(s.studentId));

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-[#e55283]" />
        <span className="ml-2">Loading class data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertCircle /> Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!classData) {
    return <p>Class not found.</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Roster: {classData.className}</CardTitle>
        <CardDescription>
          Add or remove students from this class. Current members: {studentsInClass.length}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="grid md:grid-cols-2 gap-6">
        {/* Panel 1: Available Students */}
        <div className="border p-4 rounded-md">
          <h3 className="text-lg font-semibold mb-3">
            Available Students ({availableStudents.length})
          </h3>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {loadingStudents ? (
              <div className="flex justify-center items-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : studentsError ? (
              <div className="text-destructive text-sm">{studentsError}</div>
            ) : availableStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No other students available or all are in this class.
              </p>
            ) : (
              availableStudents.map(student => (
                <div 
                  key={student.studentId} 
                  className="flex items-center justify-between p-2 border rounded hover:bg-muted/50"
                >
                  <span>{student.name} ({student.email})</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStudentsInClass(prev => [...prev, student.studentId])}
                  >
                    <UserPlus className="mr-1 h-4 w-4" /> Add
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 2: Students in Class */}
        <div className="border p-4 rounded-md">
          <h3 className="text-lg font-semibold mb-3">
            Students in Class ({currentClassMembers.length})
          </h3>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {loadingStudents ? (
              <div className="flex justify-center items-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : studentsError ? (
              <div className="text-destructive text-sm">{studentsError}</div>
            ) : currentClassMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No students in this class yet.
              </p>
            ) : (
              currentClassMembers.map(student => (
                <div 
                  key={student.studentId} 
                  className="flex items-center justify-between p-2 border rounded hover:bg-muted/50"
                >
                  <span>{student.name} ({student.email})</span>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setStudentsInClass(prev => 
                      prev.filter(id => id !== student.studentId)
                    )}
                  >
                    <UserMinus className="mr-1 h-4 w-4" /> Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button 
          onClick={handleSaveChanges} 
          disabled={isSaving || loadingStudents}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
