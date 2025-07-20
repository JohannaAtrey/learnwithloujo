// Admin layout component with sidebar navigation, logout button, and role-based access control restricted to 'admin' users.

'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/shared/Sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button'; 
import { LogOut, Menu } from 'lucide-react'; 
import { useAuth } from '@/hooks/use-auth'; 
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logout } = useAuth(); 
  const role = 'admin';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <ProtectedRoute requiredRole={role}> 
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-4 h-16 bg-white border-b fixed top-0 w-full z-50">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <Sidebar role={role} />
          </SheetContent>
        </Sheet>
        <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={logout}
        >
          <LogOut className="h-5 w-5 text-gray-600" />
        </Button>
      </header>

      <div className="flex h-screen bg-gray-50">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex">
          <Sidebar role={role} />
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
           {/* Desktop Header */}
           <header className="hidden md:flex items-center justify-between p-6 border-b bg-[hsl(var(--loujo-pink))] shadow-sm h-20 flex-shrink-0">
             <div className="flex items-center gap-2">
               <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
             </div>
              <Button
                variant="outline"
                onClick={logout}
                className="gap-2 bg-white text-black border-[hsl(var(--loujo-pink))] hover:bg-[hsl(var(--loujo-pink))] hover:text-white hover:border-white transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
           </header>
           
           <main className="flex-1 overflow-auto p-8 pt-24 md:pt-8">
              {children}
           </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
