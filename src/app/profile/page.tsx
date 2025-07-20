// ProfilePage component:
// Displays user profile summary and account details with editable personal info.
// Provides role-based protected access and UI tabs for viewing/editing profile data.
// Includes placeholder save functionality and avatar initials generation.
// Uses Firebase timestamp conversion helper for date formatting.

'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Mail, 
  Calendar, 
  Shield,
  Save,
  Music,
  Award
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

function toDateSafe(val: unknown): Date {
  if (!val) return new Date();
  if (typeof val === 'string' || typeof val === 'number') return new Date(val);
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as Timestamp).toDate === 'function') {
    return (val as Timestamp).toDate();
  }
  return new Date();
}

export default function ProfilePage() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  // Map user role to a valid ProtectedRoute role
  const getProtectedRole = () => {
    if (userRole === 'student') return 'teacher'; // Students can access teacher routes
    if (userRole === 'admin') return 'school_admin'; // Admins can access school_admin routes
    return userRole as 'teacher' | 'school_admin' | 'parent';
  };

  // Placeholder function for saving profile
  const handleSaveProfile = () => {
    // Here you would implement the actual profile update
    setIsEditing(false);
    toast({
      title: 'Profile Updated',
      description: 'Your profile has been successfully updated!',
    });
  };

  // Format user initials for avatar
  const getUserInitials = () => {
    if (!user?.name) return 'U';
    
    const nameParts = user.name.split(' ');
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <ProtectedRoute requiredRole={getProtectedRole()}>
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-[#e55283]">My Profile</h1>
            <p className="text-muted-foreground">
              View and manage your personal information
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile Summary */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>
                  Your account information
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-2xl bg-[#e55283] text-white">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h3 className="text-xl font-semibold">{user?.name}</h3>
                  <p className="text-muted-foreground">{user?.email}</p>
                </div>
                <div className="flex items-center justify-center bg-muted/20 rounded-full px-4 py-1">
                  <Shield className="h-4 w-4 mr-2 text-[#e55283]" />
                  <span className="text-sm capitalize">{user?.role}</span>
                </div>
                <div className="flex gap-2 pt-4">
                  <div className="text-center">
                    <div className="bg-[#e55283]/10 p-2 rounded-full mb-1">
                      <Music className="h-5 w-5 text-[#e55283]" />
                    </div>
                    <div className="text-sm font-medium">24</div>
                    <div className="text-xs text-muted-foreground">Songs</div>
                  </div>
                  <div className="text-center">
                    <div className="bg-[#e55283]/10 p-2 rounded-full mb-1">
                      <Award className="h-5 w-5 text-[#e55283]" />
                    </div>
                    <div className="text-sm font-medium">8</div>
                    <div className="text-xs text-muted-foreground">Badges</div>
                  </div>
                  <div className="text-center">
                    <div className="bg-[#e55283]/10 p-2 rounded-full mb-1">
                      <Calendar className="h-5 w-5 text-[#e55283]" />
                    </div>
                    <div className="text-sm font-medium">42</div>
                    <div className="text-xs text-muted-foreground">Days</div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => setIsEditing(!isEditing)} 
                  variant="outline" 
                  className="w-full"
                >
                  {isEditing ? 'Cancel Editing' : 'Edit Profile'}
                </Button>
              </CardFooter>
            </Card>

            {/* Profile Details */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
                <CardDescription>
                  {isEditing ? 'Edit your information below' : 'Your personal information'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="personal">
                  <TabsList className="mb-4">
                    <TabsTrigger value="personal" className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Personal Info
                    </TabsTrigger>
                    <TabsTrigger value="account" className="flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      Account
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="personal" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      {isEditing ? (
                        <Input 
                          id="name" 
                          value={formData.name} 
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                      ) : (
                        <div className="flex items-center border rounded-md p-2">
                          <User className="text-muted-foreground h-4 w-4 mr-2" />
                          <span>{user?.name}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="flex items-center border rounded-md p-2">
                        <Mail className="text-muted-foreground h-4 w-4 mr-2" />
                        <span>{user?.email}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed. Please contact support for assistance.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="created">Member Since</Label>
                      <div className="flex items-center border rounded-md p-2">
                        <Calendar className="text-muted-foreground h-4 w-4 mr-2" />
                        <span>{toDateSafe(user?.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="account" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="role">Account Type</Label>
                      <div className="flex items-center border rounded-md p-2">
                        <Shield className="text-muted-foreground h-4 w-4 mr-2" />
                        <span className="capitalize">{user?.role}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Your account type determines what features you can access.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="id">User ID</Label>
                      <div className="flex items-center border rounded-md p-2 font-mono text-sm">
                        <span>{user?.id}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This is your unique identifier in our system.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
              {isEditing && (
                <CardFooter>
                  <Button 
                    className="w-full bg-[#e55283] hover:bg-[#e55283]/90"
                    onClick={handleSaveProfile}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </CardFooter>
              )}
            </Card>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
