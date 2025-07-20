/**
 * CreateClassForm component
 * 
 * - Form to create a new class with name and optional description.
 * - Validates that class name is not empty before submission.
 * - Submits form data to backend API with authentication.
 * - Shows loading spinner while submitting.
 * - Calls onSuccess callback with new class ID on successful creation.
 * - Provides cancel button to abort creation.
 * - Displays success and error toast notifications.
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface CreateClassFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export default function CreateClassForm({ onCancel, onSuccess }: CreateClassFormProps) {
  const { refreshIdToken } = useAuth();
  const { toast } = useToast();
  const [className, setClassName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!className.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Class name cannot be empty." });
      return;
    }
    setIsSubmitting(true);

    const payload = {
      className: className.trim(),
      description: description.trim(),
    };

    try {
      const token = await refreshIdToken();
      if (!token) throw new Error("Authentication token not available.");

      const response = await fetch('/api/teacher/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create class');
      }

      await response.json();
      toast({ title: "Success", description: "Class created successfully!" });
      onSuccess();
    } catch (error: unknown) {
      console.error("Error creating class:", error);
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error instanceof Error ? error.message : "Could not create class." 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Create New Class</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="class-name">Class Name</Label>
            <Input
              id="class-name"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g., Year 3 Math, Morning Reading Group"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="class-description">Description (Optional)</Label>
            <Textarea
              id="class-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of the class"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Class
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
