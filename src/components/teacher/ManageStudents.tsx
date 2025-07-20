/**
 * ManageStudents component
 * 
 * - Fetches and displays a list of students linked to the teacher.
 * - Supports adding existing students by email.
 * - Supports creating new student accounts with email, password, and display name.
 * - Allows removing students with confirmation.
 * - Uses tabs to switch between adding existing, creating new, and listing current students.
 * - Handles loading, error states, and displays toast notifications for success/error.
 * - Converts Firestore Timestamps to Date for display.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { Timestamp } from 'firebase/firestore';

// Type guard for Timestamp
function isTimestamp(value: unknown): value is Timestamp {
  return value instanceof Timestamp;
}

// Helper function to convert createdAt to Date
const convertToDate = (createdAt: Timestamp | Date | string): Date => {
  if (isTimestamp(createdAt)) {
    return createdAt.toDate();
  }
  if (createdAt instanceof Date) {
    return createdAt;
  }
  return new Date(createdAt);
};

interface Student {
  id: string; // Firestore document ID of the relationship
  studentId?: string;
  studentEmail: string;
  name?: string;
  createdAt: string;
}

export default function ManageStudents() {
  const { toast } = useToast();
  const { refreshIdToken } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [addStudentEmail, setAddStudentEmail] = useState('');
  const [newStudentData, setNewStudentData] = useState({
    email: '',
    password: '',
    displayName: ''
  });

  const fetchStudents = useCallback(async () => {
  setLoading(true);
  try {
    const token = await refreshIdToken();
    if (!token) {
      toast({ variant: "destructive", title: "Error", description: "Authentication error. Please try again." });
      setLoading(false);
      return;
    }
    const response = await fetch('/api/teacher/students', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error || 'Failed to fetch students');
    }

    setStudents(responseData.students.map((s: Student) => ({
      ...s,
      createdAt: convertToDate(s.createdAt).toLocaleDateString()
    })));
    toast({ title: "Info", description: "Students list updated."});
  } catch (error: unknown) {
    console.error('[ManageStudents] fetchStudents: Error:', error);
    toast({
      variant: "destructive",
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to load students"
    });
  } finally {
    setLoading(false);
  }
}, [refreshIdToken, toast, setLoading, setStudents]);

useEffect(() => {
  fetchStudents();
}, [fetchStudents]);

  const handleAddExistingStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addStudentEmail) return;

    try {
      const token = await refreshIdToken();
      if (!token) {
        toast({ variant: "destructive", title: "Error", description: "Authentication error. Please try again." });
        return;
      }
      const payload = { action: 'add', studentEmail: addStudentEmail };
      const response = await fetch('/api/teacher/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to add student');
      }

      toast({
        title: "Success",
        description: responseData.message || "Student added successfully"
      });
      setAddStudentEmail('');
      fetchStudents();
    } catch (error: unknown) {
      console.error('[ManageStudents] handleAddExistingStudent: Error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add student"
      });
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const { email, password, displayName } = newStudentData;
    if (!email || !password || !displayName) return;

    try {
      const token = await refreshIdToken();
      if (!token) {
        toast({ variant: "destructive", title: "Error", description: "Authentication error. Please try again." });
        return;
      }
      const payload = { action: 'create', studentEmail: email, password, displayName };
      const response = await fetch('/api/teacher/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create student account');
      }

      toast({
        title: "Success",
        description: responseData.message || "Student account created successfully"
      });
      setNewStudentData({ email: '', password: '', displayName: '' });
      fetchStudents();
    } catch (error: unknown) {
      console.error('[ManageStudents] handleCreateStudent: Error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create student account"
      });
    }
  };

  const handleRemoveStudent = async (studentEmail: string) => {
    if (!confirm('Are you sure you want to remove this student?')) return;

    try {
      const token = await refreshIdToken();
      if (!token) {
        toast({ variant: "destructive", title: "Error", description: "Authentication error. Please try again." });
        return;
      }
      const payload = { action: 'remove', studentEmail };
      const response = await fetch('/api/teacher/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to remove student');
      }

      toast({
        title: "Success",
        description: responseData.message || "Student removed successfully"
      });
      fetchStudents();
    } catch (error: unknown) {
      console.error('[ManageStudents] handleRemoveStudent: Error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove student"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manage Students</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="existing">
            <TabsList>
              <TabsTrigger value="existing">Add Existing Student</TabsTrigger>
              <TabsTrigger value="create">Create New Student</TabsTrigger>
              <TabsTrigger value="list">Current Students</TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-4 pt-4">
              <form onSubmit={handleAddExistingStudent} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Student's email address"
                    value={addStudentEmail}
                    onChange={(e) => setAddStudentEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit">Add Student</Button>
              </form>
            </TabsContent>

            <TabsContent value="create" className="space-y-4 pt-4">
              <form onSubmit={handleCreateStudent} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={newStudentData.email}
                    onChange={(e) => setNewStudentData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={newStudentData.password}
                    onChange={(e) => setNewStudentData(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Input
                    type="text"
                    placeholder="Display Name"
                    value={newStudentData.displayName}
                    onChange={(e) => setNewStudentData(prev => ({ ...prev, displayName: e.target.value }))}
                    required
                  />
                </div>
                <Button type="submit">Create Student Account</Button>
              </form>
            </TabsContent>

            <TabsContent value="list" className="space-y-4 pt-4">
              {loading ? (
                <p>Loading students...</p>
              ) : students.length === 0 ? (
                <p>No students added yet.</p>
              ) : (
                <div className="space-y-4">
                  {students.map((student) => {
                    const displayName = student.name || student.studentEmail || 'N/A';
                    const addedDate = student.createdAt;
                    return (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{displayName}</p>
                          <p className="text-sm text-muted-foreground">
                            Added on {addedDate}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          onClick={() => handleRemoveStudent(student.studentEmail)}
                        >
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
