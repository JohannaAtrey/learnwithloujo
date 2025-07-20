/**
 * LinkChildSection component
 * 
 * - Allows a parent to link their account to a child's account using a unique 6-character code.
 * - Validates input and converts code to uppercase for consistency.
 * - Handles form submission with authentication and server API call.
 * - Shows loading state and displays success or error toast notifications.
 * - Clears input field on successful linking.
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Link2 } from 'lucide-react';

export default function LinkChildSection() {
  const { refreshIdToken } = useAuth();
  const { toast } = useToast();
  const [linkingCode, setLinkingCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmitCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!linkingCode.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a linking code." });
      return;
    }
    setIsLoading(true);

    try {
      const token = await refreshIdToken();
      if (!token) throw new Error("Authentication token not available.");

      const response = await fetch('/api/parent/link-child', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ linkingCode: linkingCode.trim().toUpperCase() }), // Send trimmed, uppercase code
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to link child account');
      }

      toast({ title: "Success", description: result.message || "Child account linked successfully!" });
      setLinkingCode(''); // Clear input on success
      // TODO: Optionally trigger a refresh of parent's data if needed (e.g., to show new child)

    } catch (error: unknown) {
      console.error("Error linking child:", error);
      toast({ 
        variant: "destructive", 
        title: "Linking Failed", 
        description: error instanceof Error ? error.message : "Could not link child account." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Link to Child&apos;s Account</CardTitle>
        <CardDescription>Enter the code provided by your child to link your accounts and view their progress.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmitCode} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="linking-code" className="text-sm font-medium">Child&apos;s Linking Code</label>
            <Input
              id="linking-code"
              value={linkingCode}
              onChange={(e) => setLinkingCode(e.target.value.toUpperCase())} // Convert to uppercase as user types
              placeholder="Enter 6-character code"
              maxLength={6} // Assuming code length is 6
              className="font-mono tracking-wider"
            />
          </div>
          <Button type="submit" disabled={isLoading || !linkingCode.trim()}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
            Link Account
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
