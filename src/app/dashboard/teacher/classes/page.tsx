// Teacher dashboard page for managing classes.
// Allows toggling between viewing existing classes and creating a new one.
// Uses a refresh key to reload the class list after creating/updating a class.

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import CreateClassForm from '@/components/teacher/classes/CreateClassForm'; 
import ClassList from '@/components/teacher/classes/ClassList'; 

export default function ManageClassesPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); 


  const handleClassSaved = () => {
    console.log('Class created/updated');
    setShowCreateForm(false);
    setRefreshKey(prev => prev + 1); 
  };

  if (showCreateForm) {
    return (
      <CreateClassForm
        onCancel={() => setShowCreateForm(false)}
        onSuccess={handleClassSaved}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Classes</h1>
        <Button onClick={() => setShowCreateForm(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Class
        </Button>
      </div>
      <ClassList key={refreshKey} />
    </div>
  );
}
