// ForgotPassword page component:
// Allows users to request a password reset via email using Firebase Authentication.
// Displays success or error messages and redirects to login upon completion.

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Music, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    
    // Simple validation
    if (!email) {
      setError('Please enter your email address');
      setIsLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
      toast({
        title: 'Password reset email sent',
        description: 'Check your inbox for instructions to reset your password',
      });
    } catch (err: unknown) {
      console.error('Password reset error:', err);
      let userFriendlyError = 'Could not send password reset email';
      if (err && typeof err === 'object') {
        const errorObj = err as { message?: string; code?: string };
        // Handle specific Firebase errors
        if (errorObj.code === 'auth/user-not-found') {
          userFriendlyError = 'No account found with this email';
        } else if (errorObj.code === 'auth/invalid-email') {
          userFriendlyError = 'Please enter a valid email address';
        } else if (errorObj.code === 'auth/too-many-requests') {
          userFriendlyError = 'Too many requests. Please try again later';
        }
      }
      setError(userFriendlyError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-[#e55283] p-3">
            <Music className="h-6 w-6 text-white" />
          </div>
        </div>
        
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">Reset Your Password</CardTitle>
            <CardDescription>
              Enter your email and we will send you a link to reset your password
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success ? (
              <div className="text-center space-y-4">
                <Alert variant="default" className="mb-4 bg-green-50 border-green-200">
                  <AlertDescription className="text-green-700">
                    Check your email for a link to reset your password. If it does not appear within a few minutes, check your spam folder.
                  </AlertDescription>
                </Alert>
                
                <Button asChild className="w-full mt-2" variant="outline">
                  <Link href="/login">Return to Login</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-[#e55283] hover:bg-[#d32d4d]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Reset Link...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-center">
            <p className="text-center text-sm text-gray-600">
              Remembered your password?{" "}
              <Link href="/login" className="text-[#e55283] hover:underline">
                Back to Login
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 