/**
 * RoleManager Component
 *
 * This component provides an administrative interface to assign or change user roles within the application.
 * 
 * Features:
 * - Only accessible to users with 'admin' privileges (verified via Firebase ID token claims).
 * - Allows admins to input a user's email and assign them a role from predefined options:
 *    'student', 'teacher', 'parent', 'school_admin', 'admin'.
 * - If promoting a user to 'school_admin', requires entering the associated school name.
 * - Sends authenticated POST requests to the appropriate backend API endpoints:
 *    - '/api/auth/set-role' for general role changes
 *    - '/api/admin/school-admins' for promoting users to school administrators
 * - Displays success and error messages via toast notifications.
 * - Includes loading and permission-check UI states.
 *
 * Important details:
 * - Uses Firebase authentication token for authorization of role management API calls.
 * - React hooks manage local input state, loading states, and async effects for admin verification.
 * - Designed to be secure by restricting role management only to verified admins.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/types';

export default function RoleManager() {
  const { fbUser, refreshIdToken } = useAuth();
  const { toast } = useToast();
  
  const [targetUserEmail, setTargetUserEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [schoolName, setSchoolName] = useState(''); // State for school name input
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  const roles: UserRole[] = ['student', 'teacher', 'parent', 'school_admin', 'admin'];

  useEffect(() => {
    const checkAdminStatus = async () => {
      setIsCheckingAdmin(true);
      if (fbUser) {
        try {
          const idTokenResult = await fbUser.getIdTokenResult();
          setIsAdmin(idTokenResult.claims.role === 'admin');
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not verify admin privileges.',
          });
        }
      } else {
        setIsAdmin(false);
      }
      setIsCheckingAdmin(false);
    };
    checkAdminStatus();
  }, [fbUser, toast]);

  // Clear school name when role changes away from school_admin
  useEffect(() => {
    if (selectedRole !== 'school_admin') {
      setSchoolName('');
    }
  }, [selectedRole]);

  const handleAssignAction = async () => {
    if (!targetUserEmail) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a user email.' });
      return;
    }
    // Check for school name only if promoting to school_admin
    if (selectedRole === 'school_admin' && !schoolName) {
       toast({ variant: 'destructive', title: 'Error', description: 'Please enter a school name when promoting to School Admin.' });
       return;
    }
    if (!fbUser) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }

    setIsLoading(true);
    let endpoint = '/api/auth/set-role'; // Default endpoint
    let payload: Record<string, unknown> = {
      targetUserEmail: targetUserEmail,
      role: selectedRole,
    };
    let successMessage = `Role ${selectedRole} assigned to ${targetUserEmail}.`;

    // Adjust endpoint and payload if promoting to school_admin
    if (selectedRole === 'school_admin') {
      endpoint = '/api/admin/school-admins';
      payload = {
        action: 'promote',
        targetEmail: targetUserEmail,
        schoolName: schoolName,
      };
      successMessage = `User ${targetUserEmail} promoted to School Admin for school &apos;${schoolName}&apos;.`;
    }
    // Add similar logic here if demoting/deleting school admins should use the other endpoint too

    try {
      const idToken = await refreshIdToken ? await refreshIdToken() : await fbUser.getIdToken();
      if (!idToken) {
        throw new Error('Failed to get authentication token. Please try logging in again.');
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to perform action.');
      }

      toast({
        title: 'Success!',
        description: data.message || successMessage,
      });
      setTargetUserEmail(''); // Clear inputs on success
      setSchoolName('');
    } catch (err: unknown) {
      console.error('Error performing action:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Role Management</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="ml-2">Verifying admin privileges...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Permission Required</AlertTitle>
            <AlertDescription>
              You don&apos;t have permission to manage user roles. This feature is for administrators only.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>User Role Management</CardTitle>
        <CardDescription>
          Assign or change a user role by entering their email address.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            User Email Address
          </label>
          <Input
            id="email"
            type="email"
            placeholder="Enter user's email"
            value={targetUserEmail}
            onChange={(e) => setTargetUserEmail(e.target.value)}
            className="mt-1"
          />
        </div>
        {/* Conditionally show School Name input */}
        {selectedRole === 'school_admin' && (
          <div className="space-y-2">
            <label htmlFor="schoolName" className="text-sm font-medium">
              School Name (Required for School Admin)
            </label>
            <Input
              id="schoolName"
              type="text"
              placeholder="Enter the name of the school"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="mt-1"
            />
          </div>
        )}
        <div className="space-y-2">
          <label htmlFor="role" className="text-sm font-medium">
            Select Role
          </label>
          <Select
            value={selectedRole}
            onValueChange={(value) => setSelectedRole(value as UserRole)}
          >
            <SelectTrigger id="role" className="mt-1">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r} value={r}>
                  <span className="capitalize">{r.replace('_', ' ')}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={handleAssignAction} 
          disabled={isLoading || !targetUserEmail || (selectedRole === 'school_admin' && !schoolName)}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            selectedRole === 'school_admin' ? 'Promote to School Admin' : 'Assign Role'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
