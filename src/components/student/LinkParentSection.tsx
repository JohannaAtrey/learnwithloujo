/**
 * LinkParentSection component
 * 
 * - Allows student to generate a linking code for their parent.
 * - Displays the generated code with expiry time.
 * - Provides copy-to-clipboard functionality with user feedback.
 * - Shows loading state and handles errors with toast notifications.
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Check } from 'lucide-react';

export default function LinkParentSection() {
  const { refreshIdToken } = useAuth();
  const { toast } = useToast();
  const [linkingCode, setLinkingCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateCode = async () => {
    setIsLoading(true);
    setLinkingCode(null);
    setExpiresAt(null);
    setCopied(false);

    try {
      const token = await refreshIdToken();
      if (!token) throw new Error("Authentication token not available.");

      const response = await fetch('/api/student/generate-linking-code', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate code');
      }

      const data = await response.json();
      setLinkingCode(data.code);
      setExpiresAt(data.expiresAt);
      toast({ title: "Code Generated", description: "Share this code with your parent." });

    } catch (error: unknown) {
      console.error("Error generating linking code:", error);
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error instanceof Error ? error.message : "Could not generate code." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (linkingCode) {
      navigator.clipboard.writeText(linkingCode)
        .then(() => {
          setCopied(true);
          toast({ title: "Copied!", description: "Code copied to clipboard." });
          setTimeout(() => setCopied(false), 2000); // Reset copied state after 2s
        })
        .catch(err => {
          console.error('Failed to copy code: ', err);
          toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy code." });
        });
    }
  };
  
  const getFormattedExpiry = () => {
    if (!expiresAt) return '';
    const date = new Date(expiresAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Link Parent Account</CardTitle>
        <CardDescription>Generate a code to share with your parent so they can link to your account and view your progress.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleGenerateCode} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {linkingCode ? 'Generate New Code' : 'Generate Linking Code'}
        </Button>

        {linkingCode && expiresAt && (
          <div className="p-4 border rounded-md bg-muted space-y-2">
            <p className="text-sm text-muted-foreground">Share this code with your parent:</p>
            <div className="flex items-center gap-2">
              <strong className="text-2xl font-mono tracking-wider">{linkingCode}</strong>
              <Button variant="ghost" size="icon" onClick={handleCopyCode} aria-label="Copy code">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This code will expire at approximately {getFormattedExpiry()}.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
