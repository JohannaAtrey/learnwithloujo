/**
 * TeacherManagement Component
 *
 * - Allows adding an existing teacher by email.
 * - Provides a form to create a new teacher with name, email, and temporary password.
 * - Manages form state for email, name, and password inputs.
 * - Handles button clicks to simulate adding or creating a teacher (currently logs and alerts).
 * - Uses UI components (Card, Input, Button) for clean, structured forms.
 * - Separates "Add Existing Teacher" and "Create New Teacher" into distinct cards for clarity.
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TeacherManagement() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const handleAddTeacher = () => {
    console.log('Add teacher clicked', { email });
    alert('Add teacher clicked: ' + email);
  };

  const handleCreateTeacher = () => {
    console.log('Create teacher clicked', { email, name, password });
    alert('Create teacher clicked: ' + email);
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Add Existing Teacher</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              type="email"
              placeholder="Teacher's email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button onClick={handleAddTeacher}>
              Add Teacher
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create New Teacher</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Teacher's name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              type="email"
              placeholder="Teacher's email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Temporary password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button onClick={handleCreateTeacher}>
              Create Teacher
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 