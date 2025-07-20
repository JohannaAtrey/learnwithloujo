/**
 * AdminDashboard Component
 * 
 * - Displays total users and total songs counts by fetching data from protected API endpoints.
 * - Retrieves and displays a paginated list of users (up to 50) from Firestore, 
 *   sorted by creation date descending.
 * - Implements a search filter for users by name, email, or role.
 * - Displays user information including name, email, role (with color-coded badges), and user ID.
 * - Provides a copy-to-clipboard button for each user ID, with toast notifications.
 * - Contains a tabbed interface allowing admins to switch between user list and role management views.
 * - Role management is handled via a separate <RoleManager /> component integrated into the dashboard.
 * - Shows loading states and error alerts during data fetching.
 *
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from '@/components/ui/card';
import { 
  Button,
} from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RoleManager from '@/components/admin/RoleManager';
import { 
  Loader2, 
  Shield, 
  Users, 
  Search, 
  UserCircle,
  Database,
  ClipboardCopy
} from 'lucide-react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useCallback } from 'react';

// Removed Sidebar import

// User type for display
type UserListItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export default function AdminDashboard() {
  const { refreshIdToken } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true); // Default to true
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [totalUserCount, setTotalUserCount] = useState<number | null>(null);
  const [totalSongCount, setTotalSongCount] = useState<number | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Fetch users from Firestore
  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    setError(null);
    
    try {
      const usersCollection = collection(firestore, 'users');
      const usersQuery = query(
        usersCollection,
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      
      const querySnapshot = await getDocs(usersQuery);
      const usersList: UserListItem[] = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        usersList.push({
          id: doc.id,
          name: userData.name || 'Unnamed User',
          email: userData.email || 'No email',
          role: userData.role || 'No role',
          createdAt: userData.createdAt || new Date().toISOString(),
        });
      });
      
      setUsers(usersList);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchDashboardStats = useCallback(async () => {
  setIsLoadingStats(true);
  try {
    const token = await refreshIdToken();
    if (!token) throw new Error("Authentication token not available for stats.");

    const [userCountRes, songCountRes] = await Promise.all([
      fetch('/api/admin/stats/user-count', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/admin/stats/song-count', { headers: { 'Authorization': `Bearer ${token}` } })
    ]);

    if (userCountRes.ok) {
      const userData = await userCountRes.json();
      setTotalUserCount(userData.totalUsers);
    } else {
      console.error("Failed to fetch user count");
    }

    if (songCountRes.ok) {
      const songData = await songCountRes.json();
      setTotalSongCount(songData.totalSongs);
    } else {
      console.error("Failed to fetch song count");
    }

  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
  } finally {
    setIsLoadingStats(false);
  }
}, [refreshIdToken]);

// Update the useEffect:
useEffect(() => {
  fetchUsers();
  fetchDashboardStats();
}, [fetchDashboardStats]);

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  });

  // Generate role badge style based on role
  const getRoleBadgeClass = (role: string) => {
    switch(role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'school_admin':
        return 'bg-purple-100 text-purple-800';
      case 'teacher':
        return 'bg-blue-100 text-blue-800';
      case 'parent':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // This component should ONLY render the main content for the admin dashboard page.
  // The sidebar and overall page structure (flex container) are handled by the layout file.
  return (
    // Removed outer flex container and Sidebar component call
    <div className="p-6"> {/* Keep padding or adjust as needed */}
      {/* Ensure header with title and logout is REMOVED - should be in layout */}

          {/* System Overview */}
          <div className="grid gap-6 md:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Users className="h-6 w-6 text-[#e55283] mr-2" />
                  {isLoadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : <span className="text-2xl font-bold">{totalUserCount ?? 'N/A'}</span>}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Songs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Database className="h-6 w-6 text-[#e55283] mr-2" />
                  {isLoadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : <span className="text-2xl font-bold">{totalSongCount ?? 'N/A'}</span>}
                </div>
              </CardContent>
            </Card>
            
            {/* "Storage Used" Card REMOVED */}
            {/* "API Calls (24h)" Card REMOVED */}
          </div>

          {/* User Management and Role Management Tabs */}
          <Card>
            <CardHeader>
              <Tabs defaultValue="users" className="w-full">
                <TabsList className="grid grid-cols-2 w-full max-w-md">
                  <TabsTrigger value="users" className="flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Users
                  </TabsTrigger>
                  <TabsTrigger value="roles" className="flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    Role Management
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="space-y-4">
                  <CardContent className="space-y-4">
                    {/* Search bar */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search users by name, email, or role..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    {/* Error message */}
                    {error && (
                      <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    
                    {/* Loading indicator */}
                    {isLoadingUsers ? (
                      <div className="flex justify-center items-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-[#e55283]" />
                        <span className="ml-2">Loading users...</span>
                      </div>
                    ) : (
                      /* Users list */
                      <div className="border rounded-md">
                        <div className="grid grid-cols-12 gap-2 p-3 font-medium bg-gray-50 border-b">
                          <div className="col-span-4">User</div>
                          <div className="col-span-4">Email</div>
                          <div className="col-span-2">Role</div>
                          <div className="col-span-2">ID</div>
                        </div>
                        
                        <div className="max-h-96 overflow-y-auto">
                          {filteredUsers.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                              {searchQuery ? 'No users match your search.' : 'No users found.'}
                            </div>
                          ) : (
                            filteredUsers.map(user => (
                              <div key={user.id} className="grid grid-cols-12 gap-2 p-3 border-b hover:bg-gray-50">
                                <div className="col-span-4 flex items-center">
                                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                                    <UserCircle className="h-6 w-6 text-gray-500" />
                                  </div>
                                  <span className="truncate">{user.name}</span>
                                </div>
                                <div className="col-span-4 flex items-center">
                                  <span className="truncate">{user.email}</span>
                                </div>
                                <div className="col-span-2 flex items-center">
                                  <span className={`px-2 py-1 rounded-full text-xs ${getRoleBadgeClass(user.role)}`}>
                                    {user.role.replace('_', ' ')}
                                  </span>
                                </div>
                                <div className="col-span-2 flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground truncate font-mono">
                                    {user.id}
                                  </span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                      navigator.clipboard.writeText(user.id);
                                      toast({ title: 'Copied!', description: 'User ID copied to clipboard.' });
                                    }}
                                    aria-label="Copy User ID"
                                  >
                                    <ClipboardCopy className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full" onClick={fetchUsers} disabled={isLoadingUsers}>
                      {isLoadingUsers ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Refreshing...
                        </>
                      ) : (
                        'Refresh Users'
                      )}
                    </Button>
                  </CardFooter>
                </TabsContent>

                <TabsContent value="roles" className="space-y-4">
                  <CardContent>
                    <RoleManager />
                  </CardContent>
                </TabsContent>
              </Tabs>
            </CardHeader>
          </Card>

          {/* "Admin Tools" Card REMOVED */}
          
       </div> 
  );
}
