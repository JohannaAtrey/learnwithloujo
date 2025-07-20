/**
 * Registration Page Component
 * 
 * Handles new user account creation with fields for name, email, password,
 * role selection (student, teacher, parent, school admin), and school admin
 * specific inputs (school name, position).
 * 
 * Includes client-side validation for required fields, password confirmation,
 * and role-specific requirements.
 * 
 * Provides user feedback for errors and loading state.
 * Password visibility toggles available for password fields.
 * 
 * Displays an informational sidebar for marketing benefits on large screens.
 * 
 * Integrates with Firebase Auth via `register` method from useAuth hook.
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserRole } from '@/types';
import { Loader2, Eye, EyeOff, FileText, Shield, Cookie, Accessibility } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Register() {
  const { toast } = useToast();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as UserRole,
    schoolName: '',
    position: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle role selection
  const handleRoleChange = (value: string) => {
    setFormData(prev => ({ ...prev, role: value as UserRole }));
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Toggle confirm password visibility
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Firebase registration function
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Simple validation
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }
    
    if (!termsAccepted) {
      setError('Please accept the terms and conditions');
      setIsLoading(false);
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    // Additional validation for school admin
    if (formData.role === 'school_admin') {
      if (!formData.schoolName) {
        setError('Please enter your school name');
        setIsLoading(false);
        return;
      }
      if (!formData.position) {
        setError('Please enter your position at the school');
        setIsLoading(false);
        return;
      }
    }

    try {
      // Register user with Firebase
      await register(
        formData.name,
        formData.email,
        formData.password,
        formData.role,
        formData.role === 'school_admin' ? {
          schoolName: formData.schoolName,
          position: formData.position,
        } : undefined
      );
      
      toast({
        title: 'Registration successful',
        description: 'Redirecting to dashboard...',
      });
    } catch (error: unknown) {
      console.error('Registration error:', error);
      setIsLoading(false);
      
      const errorMessage = error instanceof Error ? error.message : 'Registration failed. Please try again.';
      
      // Check if the error message contains email-already-in-use
      if (errorMessage.includes('email-already-in-use') || errorMessage.includes('already registered')) {
        setError('This email is already registered. Please use a different email or try logging in.');
        // Focus the email field for better UX
        document.getElementById('email')?.focus();
      } else {
        setError(errorMessage);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center register-bg p-4">
      <div className="w-full max-w-xl">
        <div className="flex justify-center mb-6 pt-8">
          <Image src="/Loujo_Black.png" alt="Loujo Logo" width={96} height={96} />
        </div>
      
        <Card className="w-full max-w-xl border-4 border-[hsl(var(--loujo-yellow))]/30 shadow-lg">
          <CardHeader className="space-y-1 p-10">
            <CardTitle className="text-4xl font-bold text-center">Create an Account</CardTitle>
            <CardDescription className="text-xl text-center">
              Get started with your educational journey
            </CardDescription>
          </CardHeader>
          <CardContent className="p-10 text-lg">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a secure password"
                    value={formData.password}
                    onChange={handleChange}
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
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={toggleConfirmPasswordVisibility}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">I am a...</Label>
                <Select onValueChange={handleRoleChange} defaultValue={formData.role}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="school_admin">School Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* School Admin specific fields */}
              {formData.role === 'school_admin' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="schoolName">School Name</Label>
                    <Input
                      id="schoolName"
                      name="schoolName"
                      placeholder="Enter your school's name"
                      value={formData.schoolName}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="position">Position at School</Label>
                    <Input
                      id="position"
                      name="position"
                      placeholder="e.g., Principal, Administrator, etc."
                      value={formData.position}
                      onChange={handleChange}
                    />
                  </div>
                </>
              )}
              
              <Button
                type="submit"
                className="w-full bg-[#e55283] hover:bg-[#e55283]/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Sign Up'
                )}
              </Button>
              
              <div className="space-y-4 mt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="terms" 
                    checked={termsAccepted} 
                    onCheckedChange={(checked: boolean | 'indeterminate') => setTermsAccepted(checked === true)}
                  />
                  <Label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    I accept the{' '}
                    <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          className="text-[#e55283] hover:underline focus:outline-none"
                          onClick={(e) => {
                            e.preventDefault();
                            setShowTermsDialog(true);
                          }}
                        >
                          Terms and Conditions
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
                        <DialogHeader>
                          <DialogTitle>Loujo Policies and Terms</DialogTitle>
                          <DialogDescription>
                            These policies apply to all Loujo accounts, including those created through school admin and teacher dashboards.
                          </DialogDescription>
                        </DialogHeader>
                        <Tabs defaultValue="terms" className="flex-1 overflow-hidden flex flex-col">
                          <TabsList className="grid grid-cols-4 mb-4">
                            <TabsTrigger value="terms" className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Terms
                            </TabsTrigger>
                            <TabsTrigger value="privacy" className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Privacy
                            </TabsTrigger>
                            <TabsTrigger value="cookies" className="flex items-center gap-2">
                              <Cookie className="h-4 w-4" />
                              Cookies
                            </TabsTrigger>
                            <TabsTrigger value="accessibility" className="flex items-center gap-2">
                              <Accessibility className="h-4 w-4" />
                              Accessibility
                            </TabsTrigger>
                          </TabsList>
                          <div className="flex-1 overflow-y-auto pr-4">
                            <TabsContent value="terms" className="space-y-4">
                              <div className="prose prose-sm max-w-none">
                                <h2>Terms and Conditions</h2>
                                <p className="text-sm text-muted-foreground">Effective Date: 25/05/2025</p>
                                <p>These Terms and Conditions (“Terms”) govern your use of Loujo, a digital educational platform designed to support dyslexic children through AI-generated songs and videos. By accessing or using Loujo, you agree to be bound by these Terms.</p>
                                <h3>Loujo is owned and operated by:</h3>
                                <ul>
                                  <li>Octananna Ltd</li>
                                  <li>Company Registration Number: 15943119</li>
                                  <li>VAT Number: 480 9086 67</li>
                                  <li>Registered Address: 124 City Road, London, EC1V 2NX, United Kingdom</li>
                                  <li>Email: <a href="mailto:alex@learnwithyuno.com">alex@learnwithyuno.com</a></li>
                                </ul>
                                <h3>1. Definitions</h3>
                                <ul>
                                  <li>“Loujo”, “we”, “us”, “our” refers to Octananna Ltd.</li>
                                  <li>“User” refers to anyone accessing or using the platform, including school staff, parents, or students.</li>
                                  <li>“Platform” refers to the Loujo website, dashboard, and related digital services.</li>
                                </ul>
                                <h3>2. Eligibility</h3>
                                <ul>
                                  <li>You are at least 18 years old or using the platform under the supervision of an adult (if under 18).</li>
                                  <li>You have authority to agree to these Terms if registering on behalf of a school or organisation.</li>
                                </ul>
                                <h3>3. Subscription and Pricing</h3>
                                <strong>School Licensing</strong>
                                <ul>
                                  <li>Monthly: £249.99 per school</li>
                                  <li>Annual: £2,499 per school (save 17%)</li>
                                </ul>
                                <p>School licences include:</p>
                                <ul>
                                  <li>Unlimited teacher accounts</li>
                                  <li>Student access with analytics</li>
                                  <li>Curriculum-aligned song and video generation</li>
                                  <li>Safeguarding and progress tracking features</li>
                                </ul>
                                <strong>Parent Subscriptions</strong>
                                <ul>
                                  <li>Monthly: £6.99</li>
                                  <li>Annual: £69.99 (save 17%)</li>
                                </ul>
                                <p>Parent subscriptions include:</p>
                                <ul>
                                  <li>Personalised song access</li>
                                  <li>Limited quiz and progress features</li>
                                  <li>Home-based learning insights</li>
                                </ul>
                                <p>All prices include VAT unless stated otherwise. Payments are processed securely through third-party payment providers.</p>
                                <h3>4. Free Trials and Promotions</h3>
                                <p>We may offer time-limited free trials or discounts. Unless cancelled before the trial ends, the subscription will auto-renew at the regular rate.</p>
                                <h3>5. Cancellations and Refunds</h3>
                                <p>Subscriptions can be cancelled at any time via your Loujo dashboard. No refunds are issued for unused time on monthly subscriptions. Refunds for annual subscriptions are provided on a pro-rata basis only if requested within 30 days of payment.</p>
                                <h3>6. Acceptable Use</h3>
                                <p>You agree not to:</p>
                                <ul>
                                  <li>Share login details with unauthorised users</li>
                                  <li>Copy, modify, or distribute Loujo content without written permission</li>
                                  <li>Use the platform for unlawful or abusive purposes</li>
                                  <li>Upload offensive or inappropriate content</li>
                                </ul>
                                <p>Violations may result in account suspension or termination.</p>
                                <h3>7. Intellectual Property</h3>
                                <p>All content on Loujo — including generated songs, quizzes, platform design, and original code — is the intellectual property of Octananna Ltd or licensed third parties. You may not reproduce or republish any part of the platform without permission.</p>
                                <h3>8. Limitation of Liability</h3>
                                <p>Loujo is provided “as is” without any warranties. While we aim for educational accuracy, we do not guarantee outcomes or results. Octananna Ltd is not liable for:</p>
                                <ul>
                                  <li>Loss of data, revenue, or access due to technical issues</li>
                                  <li>Errors in AI-generated content</li>
                                  <li>Disruptions caused by third-party services or APIs</li>
                                </ul>
                                <p>Our liability is limited to the amount paid for services in the 12 months prior to the claim.</p>
                                <h3>9. Privacy and Data Protection</h3>
                                <p>Your personal information is collected, stored, and used according to our Privacy Policy. We are fully compliant with the UK General Data Protection Regulation (UK GDPR). For questions, contact: <a href="mailto:alex@learnwithyuno.com">alex@learnwithyuno.com</a>.</p>
                                <h3>10. Termination</h3>
                                <p>We reserve the right to suspend or terminate any account at our discretion if the Terms are breached or misuse is detected.</p>
                                <h3>11. Changes to Terms</h3>
                                <p>We may update these Terms at any time. You will be notified of significant changes via email or platform notice. Continued use of the platform indicates acceptance of the updated Terms.</p>
                                <h3>12. Governing Law</h3>
                                <p>These Terms are governed by the laws of England and Wales. Any disputes will be resolved under the exclusive jurisdiction of the courts of England and Wales.</p>
                                <h3>13. Contact</h3>
                                <p>For any questions or concerns regarding these Terms, please contact:</p>
                                <ul>
                                  <li>Alex Molokwu</li>
                                  <li>Founder, Loujo / Octananna Ltd</li>
                                  <li>📧 <a href="mailto:alex@learnwithyuno.com">alex@learnwithyuno.com</a></li>
                                </ul>
                              </div>
                            </TabsContent>

                            <TabsContent value="privacy" className="space-y-4">
                              <div className="prose prose-sm max-w-none">
                                <h2>Loujo Privacy Policy</h2>
                                <p className="text-sm text-muted-foreground">Effective Date: 25/05/2025</p>
                                <p>This Privacy Policy explains how Octananna Ltd (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, and protects personal information when you use the Loujo platform — our educational web app designed to support dyslexic children with personalised, AI-generated learning tools.</p>
                                <p>We are committed to protecting your privacy and complying with the UK General Data Protection Regulation (UK GDPR) and Data Protection Act 2018.</p>
                                <h3>1. Who We Are</h3>
                                <ul>
                                  <li>Octananna Ltd</li>
                                  <li>Company Registration Number: 15943119</li>
                                  <li>VAT Number: 480 9086 67</li>
                                  <li>Registered Address: 124 City Road, London, EC1V 2NX, United Kingdom</li>
                                  <li>Email: <a href="mailto:alex@learnwithyuno.com">alex@learnwithyuno.com</a></li>
                                </ul>
                                <h3>2. What Information We Collect</h3>
                                <p>We collect the following types of data depending on how you interact with Loujo:</p>
                                <strong>a. Account Information</strong>
                                <ul>
                                  <li>Name, email address, and password (encrypted)</li>
                                  <li>Role (e.g. parent, teacher, school admin, student)</li>
                                </ul>
                                <strong>b. Platform Usage</strong>
                                <ul>
                                  <li>Songs generated, quiz performance, progress tracking</li>
                                  <li>Preferences (e.g. song genre, vocal type, key stage)</li>
                                  <li>IP address and device/browser details</li>
                                </ul>
                                <strong>c. Child Data (If applicable)</strong>
                                <ul>
                                  <li>For children using Loujo, we collect minimal data needed for educational outcomes, such as:</li>
                                  <ul>
                                    <li>First name or alias (optional)</li>
                                    <li>Learning progress (e.g. quiz scores, content played)</li>
                                    <li>No biometric or unnecessary personal data is collected</li>
                                  </ul>
                                </ul>
                                <h3>3. How We Use Your Information</h3>
                                <ul>
                                  <li>Create and manage user accounts</li>
                                  <li>Personalise learning content</li>
                                  <li>Monitor progress and improve educational outcomes</li>
                                  <li>Provide technical support and communicate with users</li>
                                  <li>Improve platform performance and accessibility</li>
                                  <li>Ensure safeguarding and compliance with school requirements</li>
                                </ul>
                                <h3>4. Legal Basis for Processing</h3>
                                <ul>
                                  <li>Consent: for parents registering children directly.</li>
                                  <li>Contractual obligation: to provide our services to schools and educators.</li>
                                  <li>Legitimate interest: for analytics, improvements, and safeguarding.</li>
                                  <li>Legal compliance: in accordance with data protection laws.</li>
                                </ul>
                                <h3>5. How We Store and Share Information</h3>
                                <ul>
                                  <li>Data is stored securely using Supabase and encrypted servers.</li>
                                  <li>We do not sell or rent personal data.</li>
                                  <li>We may share data with authorised education staff (e.g. teachers, school admins) to support students&apos; learning.</li>
                                  <li>We use secure third-party services (e.g. for song generation, analytics) under strict data processing agreements.</li>
                                </ul>
                                <h3>6. Children&apos;s Data and Safeguarding</h3>
                                <ul>
                                  <li>Loujo is designed for children under supervision from a teacher, school, or parent. We:</li>
                                  <ul>
                                    <li>Do not collect unnecessary personal data from children.</li>
                                    <li>Require adult registration for any child accounts.</li>
                                    <li>Allow data deletion requests by schools or parents at any time.</li>
                                  </ul>
                                </ul>
                                <h3>7. Data Retention</h3>
                                <ul>
                                  <li>Data is retained only as long as necessary to provide our services.</li>
                                  <li>Users can request deletion or export of their data at any time by contacting us at [insert contact email].</li>
                                </ul>
                                <h3>8. Your Rights</h3>
                                <p>Under the UK GDPR, you have the right to:</p>
                                <ul>
                                  <li>Access your personal data</li>
                                  <li>Correct inaccurate data</li>
                                  <li>Request deletion of your data</li>
                                  <li>Object to processing or withdraw consent</li>
                                </ul>
                                <p>Please email [insert contact email] for any requests regarding your rights.</p>
                                <h3>9. Cookies and Analytics</h3>
                                <ul>
                                  <li>We use cookies and tracking tools (e.g. Mixpanel, Amplitude) to:</li>
                                  <ul>
                                    <li>Improve site experience</li>
                                    <li>Monitor performance</li>
                                    <li>Analyse how the platform is used</li>
                                  </ul>
                                </ul>
                                <p>You can adjust cookie preferences through your browser settings.</p>
                                <h3>10. Data Security</h3>
                                <ul>
                                  <li>We implement:</li>
                                  <ul>
                                    <li>Encrypted storage</li>
                                    <li>Access controls for educators and parents</li>
                                    <li>Moderation and audit logs for safeguarding</li>
                                    <li>GDPR-compliant practices across all services</li>
                                  </ul>
                                </ul>
                                <h3>11. Changes to This Policy</h3>
                                <p>We may update this Privacy Policy from time to time. Changes will be posted on this page and, where appropriate, notified by email.</p>
                                <h3>12. Contact Us</h3>
                                <p>For questions about this Privacy Policy or how we handle your data, contact:</p>
                                <ul>
                                  <li>Data Protection Officer</li>
                                  <li>Octananna Ltd</li>
                                  <li>124 City Road, London, EC1V 2NX</li>
                                  <li>Email: <a href="mailto:alex@learnwithyuno.com">alex@learnwithyuno.com</a></li>
                                </ul>
                              </div>
                            </TabsContent>

                            <TabsContent value="cookies" className="space-y-4">
                              <div className="prose prose-sm max-w-none">
                                <h2>Loujo Cookie Policy</h2>
                                <p className="text-sm text-muted-foreground">Effective Date: 25/5/2025</p>
                                <p>This Cookie Policy explains how Loujo, owned and operated by Octananna Ltd, uses cookies and similar technologies to improve your experience on our platform.</p>
                                <p>By using our website or app, you agree to the use of cookies as outlined below.</p>
                                <h3>1. Who We Are</h3>
                                <ul>
                                  <li>Octananna Ltd</li>
                                  <li>Company Registration Number: 15943119</li>
                                  <li>VAT Number: 480 9086 67</li>
                                  <li>Registered Address: 124 City Road, London, EC1V 2NX, United Kingdom</li>
                                  <li>Email: <a href="mailto:alex@learnwithyuno.com">alex@learnwithyuno.com</a></li>
                                </ul>
                                <h3>2. What Are Cookies?</h3>
                                <p>Cookies are small text files that are placed on your device when you visit a website. They help us remember your preferences, understand how you use our site, and enhance your user experience.</p>
                                <h3>3. Types of Cookies We Use</h3>
                                <strong>a. Essential Cookies</strong>
                                <p>These are necessary for the operation of the Loujo platform. They include:</p>
                                <ul>
                                  <li>User authentication and login management</li>
                                  <li>Session handling and security</li>
                                  <li>Load balancing</li>
                                </ul>
                                <p>Without these, core platform functionality would not work.</p>
                                <strong>b. Performance and Analytics Cookies</strong>
                                <p>These help us understand how users interact with Loujo so we can improve our service. We may use:</p>
                                <ul>
                                  <li>Google Analytics</li>
                                  <li>Mixpanel</li>
                                  <li>Amplitude</li>
                                </ul>
                                <p>We collect anonymised data such as:</p>
                                <ul>
                                  <li>Page views</li>
                                  <li>Click activity</li>
                                  <li>Device type and browser</li>
                                </ul>
                                <strong>c. Functionality Cookies</strong>
                                <p>These remember user preferences to provide personalised features, such as:</p>
                                <ul>
                                  <li>Remembering login sessions</li>
                                  <li>Saving quiz progress</li>
                                  <li>Preferred music genres and learning stages</li>
                                </ul>
                                <strong>d. Third-Party Cookies</strong>
                                <p>Our platform may embed tools or APIs (e.g. OpenAI, Udio, Synthesia) that set their own cookies. We do not control these and recommend checking their privacy policies.</p>
                                <h3>4. How You Can Control Cookies</h3>
                                <p>You can control or delete cookies through your browser settings. Here&apos;s how to manage them:</p>
                                <ul>
                                  <li>Google Chrome: Settings &gt; Privacy &amp; Security &gt; Cookies and other site data</li>
                                  <li>Safari: Preferences &gt; Privacy</li>
                                  <li>Firefox: Settings &gt; Privacy &amp; Security &gt; Cookies</li>
                                  <li>Edge: Settings &gt; Site permissions &gt; Cookies and site data</li>
                                </ul>
                                <p><strong>Please note:</strong> Disabling essential cookies may affect the functionality of the Loujo platform.</p>
                                <h3>5. Consent to Use Cookies</h3>
                                <p>When you first visit Loujo, you will be presented with a cookie consent banner. You can accept or customise your cookie settings. You can update your preferences at any time via your account settings.</p>
                                <h3>6. Changes to This Policy</h3>
                                <p>We may update this Cookie Policy from time to time. Any changes will be posted on this page with the updated date.</p>
                                <h3>7. Contact Us</h3>
                                <p>If you have any questions about this Cookie Policy or how we use cookies, contact:</p>
                                <ul>
                                  <li>Alex Molokwu</li>
                                  <li>Founder, Loujo / Octananna Ltd</li>
                                  <li>📧 <a href="mailto:alex@learnwithyuno.com">alex@learnwithyuno.com</a></li>
                                </ul>
                              </div>
                            </TabsContent>

                            <TabsContent value="accessibility" className="space-y-4">
                              <div className="prose prose-sm max-w-none">
                                <h2>Accessibility Statement</h2>
                                <p>This accessibility statement applies to the Loujo platform, developed and operated by Octananna Ltd. Loujo is a web-based application that helps dyslexic children learn through personalised, AI-generated songs and videos aligned with the UK national curriculum.</p>
                                <p>We are committed to making our platform accessible, in accordance with the Public Sector Bodies (Websites and Mobile Applications) (No. 2) Accessibility Regulations 2018, and the Equality Act 2010, which require that reasonable adjustments are made to avoid discrimination.</p>
                                <h3>Our Commitment to Accessibility</h3>
                                <p>Loujo is designed for children with learning differences, particularly dyslexia. We recognise the importance of making our platform usable for all users, including those with additional sensory, motor or cognitive needs. Our goal is to ensure the platform is compliant with WCAG 2.2 AA standards.</p>
                                <h3>What We&apos;re Doing Well</h3>
                                <p>We have implemented several accessibility features:</p>
                                <ul>
                                  <li>Use of dyslexia-friendly fonts and adjustable text sizes</li>
                                  <li>Keyboard navigation across the platform</li>
                                  <li>Alt text on all images and meaningful button labels</li>
                                  <li>High-contrast interface options</li>
                                  <li>Clearly structured HTML with semantic tags</li>
                                  <li>Focus indicators for all interactive elements</li>
                                </ul>
                                <h3>What We&apos;re Improving</h3>
                                <p>We are actively working to improve the following:</p>
                                <ul>
                                  <li>Enhancing compatibility with screen readers (e.g. NVDA, VoiceOver)</li>
                                  <li>Ensuring all quiz and audio/video content has clear transcripts or visual alternatives</li>
                                  <li>Reducing reliance on colour alone to communicate quiz outcomes or scores</li>
                                  <li>Making our AI-generated content more accessible through consistent layout and tagging</li>
                                </ul>
                                <p>We aim to address these areas by Q4 2025.</p>
                                <h3>Non-Accessible Content</h3>
                                <p>Some AI-generated content (e.g. custom songs or visuals) may not always meet accessibility standards due to limitations in third-party APIs. We are working to improve how these assets are reviewed, labelled, and integrated.</p>
                                <h3>Feedback and Contact Information</h3>
                                <p>If you find any part of the Loujo platform difficult to use or inaccessible, please let us know:</p>
                                <ul>
                                  <li>Contact: Alex Molokwu</li>
                                  <li>Email: <a href="mailto:alex@learnwithyuno.com">alex@learnwithyuno.com</a></li>
                                  <li>Company: Octananna Ltd, 124 City Road, London, EC1V 2NX</li>
                                </ul>
                                <p>We aim to respond within 5 working days.</p>
                                <h3>Enforcement Procedure</h3>
                                <p>If you are not satisfied with our response to your accessibility feedback, you can contact the Equality Advisory and Support Service (EASS):</p>
                                <ul>
                                  <li>Website: <a href="https://www.equalityadvisoryservice.com" target="_blank" rel="noopener noreferrer">https://www.equalityadvisoryservice.com</a></li>
                                  <li>Phone: 0808 800 0082</li>
                                  <li>Textphone: 0808 800 0084</li>
                                </ul>
                                <h3>Accessibility Testing</h3>
                                <p>This platform is currently being tested against WCAG 2.2 AA standards using:</p>
                                <ul>
                                  <li>WAVE Accessibility Tool (WebAIM)</li>
                                  <li>Axe DevTools by Deque</li>
                                  <li>Manual testing with keyboard and screen readers</li>
                                </ul>
                                <h3>Date of Statement</h3>
                                <p>This statement was prepared on 25/5/25 and will be reviewed every 6 months.</p>
                              </div>
                            </TabsContent>
                          </div>
                        </Tabs>
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm text-muted-foreground">
                            By accepting these terms, you acknowledge that you have read and agree to all policies above, and understand that these terms apply to all Loujo accounts, including those created through school admin and teacher dashboards.
                          </p>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </Label>
                </div>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 p-10">
            <div className="text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-[#e55283] hover:underline">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
