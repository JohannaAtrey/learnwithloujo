/**
 * OnboardingForm component
 * 
 * - Collects initial setup data for a school onboarding process.
 * - Validates password confirmation before submitting.
 * - Sends data to backend API to complete onboarding and receive a custom auth token.
 * - Signs out any existing Firebase user, then signs in with the new custom token.
 * - Shows loading state and disables form submission during processing.
 * - Uses Sonner toast for success/error feedback.
 * - Redirects user to dashboard upon successful onboarding.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth';

interface OnboardingFormProps {
  sessionId: string;
}

export function OnboardingForm({ sessionId }: OnboardingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    schoolName: '',
    schoolEmail: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      const response = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          ...formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete onboarding');
      }

      if (!data.customToken) {
        throw new Error('No authentication token received');
      }

      // Sign out any existing user
      const auth = getAuth();
      await signOut(auth);

      // Sign in with the new custom token
      await signInWithCustomToken(auth, data.customToken);

      toast.success('Setup completed successfully!');
      router.push('/dashboard');
    } catch (error: unknown) {
      console.error('Error during onboarding:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete setup. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="schoolName">School Name</Label>
        <Input
          id="schoolName"
          name="schoolName"
          value={formData.schoolName}
          onChange={handleChange}
          required
          placeholder="Enter your school name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="schoolEmail">School Email</Label>
        <Input
          id="schoolEmail"
          name="schoolEmail"
          type="email"
          value={formData.schoolEmail}
          onChange={handleChange}
          required
          placeholder="Enter your school email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          required
          placeholder="Create a password"
          minLength={8}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          placeholder="Confirm your password"
          minLength={8}
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-[#e55283] hover:bg-[#e55283]/90"
      >
        {loading ? 'Setting up...' : 'Complete Setup'}
      </Button>
    </form>
  );
} 