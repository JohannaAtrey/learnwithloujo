/**
 * Sidebar component
 * 
 * - Displays navigation items based on user role.
 * - Highlights the active route.
 * - Shows subscription-gated items disabled if user lacks subscription.
 * - Logs internal state for debugging user data, role, and subscription.
 * - Combines base navigation with role-specific links.
 * - Handles admin-specific "Song Library" link insertion.
 * - Provides visual cues for disabled items with "Subscribe" badge.
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Music, Plus, LayoutDashboard, Users, FileText } from 'lucide-react'; 
import { useAuth } from '@/hooks/use-auth'; 
import { LucideIcon } from 'lucide-react';

interface SidebarItem {
  href: string;
  icon: LucideIcon;
  label: string;
  requiresSubscription?: boolean;
}

interface SidebarProps {
  role: 'school_admin' | 'teacher' | 'student' | 'parent' | 'admin';
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const { userData, userRole: authContextRole } = useAuth(); 

  // Log the userData received by the Sidebar
  console.log('[Sidebar] userData from useAuth():', JSON.stringify(userData, null, 2));
  console.log(`[Sidebar] role prop: ${role}, authContextRole: ${authContextRole}`);

  const isSubscribed = role === 'parent' 
    ? userData?.isParentSubscribed 
    : role === 'school_admin' 
      ? userData?.isSchoolAdminSubscribed 
      : false;
  
  console.log(`[Sidebar] Calculated isSubscribed for role ${role}: ${isSubscribed}`);

  // Define base items and role-specific items
  const baseItems: SidebarItem[] = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    // Removed general /songs link here, will add conditionally for admin
  ];

  const roleSpecificItems: Record<string, SidebarItem[]> = {
    admin: [
      // Only Dashboard and Song Library for Admin
    ],
    school_admin: [
      { href: '/dashboard/school-admin/teachers', icon: Users, label: 'Teacher Management' },
    ],
    teacher: [
      { href: '/dashboard/teacher/generate-songs', icon: Plus, label: 'Generate Songs' }, 
      { href: '/dashboard/teacher/my-songs', icon: Music, label: 'My Generated Songs' },
      { href: '/dashboard/teacher/students', icon: Users, label: 'Student Management' },
      { href: '/dashboard/teacher/quizzes', icon: FileText, label: 'Quizzes' },
      { href: '/dashboard/teacher/classes', icon: Users, label: 'Manage Classes' }, 
    ],
    student: [
      // Add link to the new assigned songs page
      { href: '/dashboard/student/assigned-songs', icon: Music, label: 'Assigned Songs' },
      { href: '/dashboard/student/quizzes', icon: FileText, label: 'Quizzes' }, 
    ],
    parent: [
      {
        href: '/dashboard/parent/generate-songs',
        icon: Plus,
        label: 'Generate Songs',
        requiresSubscription: true
      },
      {
        href: '/dashboard/parent/my-songs',
        icon: Music,
        label: 'My Generated Songs',
        requiresSubscription: true
      }
    ],
  };

  // Combine base items with role-specific items
  const specificItems = roleSpecificItems[role] || [];
  console.log(`[Sidebar] Role specific items for ${role}:`, JSON.stringify(specificItems)); 

  const itemsToRender = [
    ...baseItems,
    ...specificItems
  ];
  console.log(`[Sidebar] Combined items before admin check for ${role}:`, JSON.stringify(itemsToRender)); 

  // Special case for admin Song Library link
  if (role === 'admin') {
     // Ensure it's not duplicated if already added above
     if (!itemsToRender.some(item => item.href === '/admin/songs')) {
        // Add it after Dashboard for admins
        itemsToRender.splice(1, 0, { href: '/admin/songs', icon: Music, label: 'Song Library' });
     }
  }

  console.log(`[Sidebar] Final itemsToRender for ${role}:`, JSON.stringify(itemsToRender)); 

  return (
    <div className="w-64 bg-white shadow-sm">
      <div className="p-4">
        <Link href="/" className="flex items-center justify-start">
          <Image 
            src="/Loujo_Yellow.png" 
            alt="Loujo Logo" 
            width={100} 
            height={33} 
            priority
          />
        </Link>
      </div>
      <nav className="space-y-2 p-4">
        {itemsToRender.map((item) => {
          const isSubscriptionRequired = 'requiresSubscription' in item && item.requiresSubscription;
          const isDisabled = isSubscriptionRequired && !isSubscribed;
          
          return (
            <Link
              key={item.label}
              href={isDisabled ? '#' : item.href}
              onClick={(e) => {
                if (isDisabled) {
                  e.preventDefault();
                }
              }}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg transition-colors duration-200",
                pathname === item.href
                  ? "bg-[hsl(var(--loujo-pink))] text-white shadow-sm"
                  : isDisabled
                  ? "text-gray-400 cursor-not-allowed opacity-50"
                  : "text-gray-700 hover:bg-gray-50 hover:text-[hsl(var(--loujo-pink))]"
              )}
            >
              <item.icon className={cn("h-5 w-5", pathname === item.href ? "text-white" : "text-[hsl(var(--loujo-pink))]")} />
              <span className="flex-1">{item.label}</span>
              {isDisabled && (
                <span className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded-full border border-gray-200">
                  Subscribe
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
