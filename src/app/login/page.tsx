// Login page component:
// Provides user authentication via email and password using Firebase Auth.
// Includes "Remember me", password visibility toggle, error handling, and redirects on successful login.

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

export default function Login() {
  const { toast } = useToast();
  const router = useRouter();
  const { login, user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Simple validation
    if (!email || !password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      await login(email, password, rememberMe);
      toast({
        title: 'Login successful',
        description: 'Redirecting to dashboard...',
      });
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error('Login error:', err);
      let userFriendlyError = 'Invalid email or password';
      let errorMessage = 'Failed to login';
      if (err && typeof err === 'object') {
        const errorObj = err as { message?: string };
        errorMessage = errorObj.message || errorMessage;
      }
      // Handle specific Firebase errors
      if (errorMessage.includes('user-not-found')) {
        userFriendlyError = 'No account found with this email';
      } else if (errorMessage.includes('wrong-password')) {
        userFriendlyError = 'Incorrect password';
      } else if (errorMessage.includes('too-many-requests')) {
        userFriendlyError = 'Too many failed attempts. Please try again later';
      }
      setError(userFriendlyError);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#e55283]" />
      </div>
    );
  }

  // Don't render login form if already authenticated
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center login-bg p-4">
      <div className="w-full max-w-xl">
        <div className="flex justify-center mb-6 pt-8">
            <Image src="/Loujo_Black.png" alt="Loujo Logo" width={96} height={96} />
        </div>
      
        <Card className="shadow-lg border-4 border-[hsl(var(--loujo-yellow))]/30">
          <CardHeader className="text-center p-10">
            <CardTitle className="text-4xl font-bold text-gray-900">Welcome back</CardTitle>
            <CardDescription className="text-xl">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-10 text-lg">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleLogin} className="space-y-4">
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
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-[#e55283] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                <Input
                  id="password"
                    type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="rememberMe" 
                  checked={rememberMe} 
                  onCheckedChange={(checked: boolean | 'indeterminate') => setRememberMe(checked === true)}
                />
                <Label htmlFor="rememberMe" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Remember me
                </Label>
              </div>
              
              <Button
                type="submit"
                className="w-full bg-[#e55283] hover:bg-[#d32d4d]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
          </CardContent>
          
          <CardFooter className="flex justify-center p-10">
            <p className="text-center text-sm text-gray-600">
              Do not have an account?{" "}
              <Link href="/register" className="text-[#e55283] hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}