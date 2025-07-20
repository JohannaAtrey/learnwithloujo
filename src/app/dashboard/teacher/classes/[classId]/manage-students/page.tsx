// Page component for managing students in a specific class.
// Extracts classId from the URL, displays a back button, and renders the class roster management interface.

'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import ManageClassRoster from '@/components/teacher/classes/ManageClassRoster'; 

export default function ManageClassStudentsPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.classId as string;


  if (!classId) {
    return <div>Loading class information...</div>; 
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Classes
      </Button>
      <ManageClassRoster classId={classId} /> 
    </div>
  );
}
