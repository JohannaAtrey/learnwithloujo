/**
 * ManageTeachers component
 * 
 * - Fetches and displays the list of teachers.
 * - Allows adding existing teachers by email.
 * - Supports creating new teacher accounts with email, password, and display name.
 * - Enables removal of teachers from the list.
 * - Uses tabs to switch between add existing, create new, and view current teachers.
 * - Handles authentication tokens, API calls, loading states, and error handling with user feedback.
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';

interface Teacher {
  id: string;
  teacherId: string;
  teacherEmail: string;
  createdAt: Date;
}

export default function ManageTeachers() {
  const { toast } = useToast();
  const { refreshIdToken } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [addTeacherEmail, setAddTeacherEmail] = useState('');
  const [newTeacherData, setNewTeacherData] = useState({
    email: '',
    password: '',
    displayName: ''
  });

  const fetchTeachers = useCallback(async () => {
  console.log('[ManageTeachers] fetchTeachers: Initiating.');
  try {
    const token = await refreshIdToken();
    console.log('[ManageTeachers] fetchTeachers: Token fetched:', token ? 'Token Present' : 'Token Absent');
    if (!token) {
      console.error('[ManageTeachers] fetchTeachers: No token available.');
      toast({ variant: "destructive", title: "Error", description: "Authentication error. Please try again." });
      setLoading(false);
      return;
    }
    const response = await fetch('/api/school-admin/teachers', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('[ManageTeachers] fetchTeachers: Response status:', response.status);
    const responseData = await response.json();
    console.log('[ManageTeachers] fetchTeachers: Response data:', responseData);

    if (!response.ok) {
      throw new Error(responseData.error || 'Failed to fetch teachers');
    }

    setTeachers(responseData.teachers);
    toast({ title: "Info", description: "Teachers list updated."});
  } catch (error: unknown) {
    console.error('[ManageTeachers] fetchTeachers: Error:', error);
    toast({
      variant: "destructive",
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to load teachers"
    });
  } finally {
    setLoading(false);
    console.log('[ManageTeachers] fetchTeachers: Finished.');
  }
}, [refreshIdToken, toast, setLoading, setTeachers]);

useEffect(() => {
  fetchTeachers();
}, [fetchTeachers]);

  const handleAddExistingTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTeacherEmail) return;
    console.log('[ManageTeachers] handleAddExistingTeacher: Initiating for email:', addTeacherEmail);

    try {
      const token = await refreshIdToken();
      console.log('[ManageTeachers] handleAddExistingTeacher: Token fetched:', token ? 'Token Present' : 'Token Absent');
      if (!token) {
        console.error('[ManageTeachers] handleAddExistingTeacher: No token available.');
        toast({ variant: "destructive", title: "Error", description: "Authentication error. Please try again." });
        return;
      }
      const payload = { action: 'add', teacherEmail: addTeacherEmail };
      console.log('[ManageTeachers] handleAddExistingTeacher: Sending payload:', payload);
      const response = await fetch('/api/school-admin/teachers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      console.log('[ManageTeachers] handleAddExistingTeacher: Response status:', response.status);
      const responseData = await response.json();
      console.log('[ManageTeachers] handleAddExistingTeacher: Response data:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to add teacher');
      }

      toast({
        title: "Success",
        description: responseData.message || "Teacher added successfully"
      });
      setAddTeacherEmail('');
      fetchTeachers();
    } catch (error: unknown) {
      console.error('[ManageTeachers] handleAddExistingTeacher: Error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add teacher"
      });
    } finally {
      console.log('[ManageTeachers] handleAddExistingTeacher: Finished.');
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    const { email, password, displayName } = newTeacherData;
    if (!email || !password || !displayName) return;
    console.log('[ManageTeachers] handleCreateTeacher: Initiating for email:', email, 'displayName:', displayName);

    try {
      const token = await refreshIdToken();
      console.log('[ManageTeachers] handleCreateTeacher: Token fetched:', token ? 'Token Present' : 'Token Absent');
      if (!token) {
        console.error('[ManageTeachers] handleCreateTeacher: No token available.');
        toast({ variant: "destructive", title: "Error", description: "Authentication error. Please try again." });
        return;
      }
      const payload = { action: 'create', teacherEmail: email, password, displayName };
      console.log('[ManageTeachers] handleCreateTeacher: Sending payload:', payload);
      const response = await fetch('/api/school-admin/teachers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      console.log('[ManageTeachers] handleCreateTeacher: Response status:', response.status);
      const responseData = await response.json();
      console.log('[ManageTeachers] handleCreateTeacher: Response data:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create teacher account');
      }

      toast({
        title: "Success",
        description: responseData.message || "Teacher account created successfully"
      });
      setNewTeacherData({ email: '', password: '', displayName: '' });
      fetchTeachers();
    } catch (error: unknown) {
      console.error('[ManageTeachers] handleCreateTeacher: Error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create teacher account"
      });
    } finally {
      console.log('[ManageTeachers] handleCreateTeacher: Finished.');
    }
  };

  const handleRemoveTeacher = async (teacherEmail: string) => {
    if (!confirm('Are you sure you want to remove this teacher?')) return;
    console.log('[ManageTeachers] handleRemoveTeacher: Initiating for email:', teacherEmail);

    try {
      const token = await refreshIdToken();
      console.log('[ManageTeachers] handleRemoveTeacher: Token fetched:', token ? 'Token Present' : 'Token Absent');
      if (!token) {
        console.error('[ManageTeachers] handleRemoveTeacher: No token available.');
        toast({ variant: "destructive", title: "Error", description: "Authentication error. Please try again." });
        return;
      }
      const payload = { action: 'remove', teacherEmail };
      console.log('[ManageTeachers] handleRemoveTeacher: Sending payload:', payload);
      const response = await fetch('/api/school-admin/teachers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      console.log('[ManageTeachers] handleRemoveTeacher: Response status:', response.status);
      const responseData = await response.json();
      console.log('[ManageTeachers] handleRemoveTeacher: Response data:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to remove teacher');
      }

      toast({
        title: "Success",
        description: responseData.message || "Teacher removed successfully"
      });
      fetchTeachers();
    } catch (error: unknown) {
      console.error('[ManageTeachers] handleRemoveTeacher: Error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove teacher"
      });
    } finally {
      console.log('[ManageTeachers] handleRemoveTeacher: Finished.');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manage Teachers</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="existing">
            <TabsList>
              <TabsTrigger value="existing">Add Existing Teacher</TabsTrigger>
              <TabsTrigger value="create">Create New Teacher</TabsTrigger>
              <TabsTrigger value="list">Current Teachers</TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-4">
              <form onSubmit={handleAddExistingTeacher} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Teacher's email address"
                    value={addTeacherEmail}
                    onChange={(e) => setAddTeacherEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit">Add Teacher</Button>
              </form>
            </TabsContent>

            <TabsContent value="create" className="space-y-4">
              <form onSubmit={handleCreateTeacher} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={newTeacherData.email}
                    onChange={(e) => setNewTeacherData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={newTeacherData.password}
                    onChange={(e) => setNewTeacherData(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Input
                    type="text"
                    placeholder="Display Name"
                    value={newTeacherData.displayName}
                    onChange={(e) => setNewTeacherData(prev => ({ ...prev, displayName: e.target.value }))}
                    required
                  />
                </div>
                <Button type="submit">Create Teacher Account</Button>
              </form>
            </TabsContent>

            <TabsContent value="list" className="space-y-4">
              {loading ? (
                <p>Loading teachers...</p>
              ) : teachers.length === 0 ? (
                <p>No teachers added yet.</p>
              ) : (
                <div className="space-y-4">
                  {teachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{teacher.teacherEmail}</p>
                        <p className="text-sm text-muted-foreground">
                          Added on {new Date(teacher.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={() => handleRemoveTeacher(teacher.teacherEmail)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
