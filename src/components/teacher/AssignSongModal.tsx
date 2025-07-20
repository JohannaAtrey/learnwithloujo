/**
 * AssignSongModal component
 * 
 * - Provides a modal UI to assign a song to individual students or entire classes.
 * - Fetches teacher's students, classes, and currently assigned students on open.
 * - Allows selecting a class to auto-select all its unassigned students.
 * - Allows individually selecting/deselecting students (disabled if already assigned or class selected).
 * - Submits assignment via API with selected students and optionally selected class.
 * - Handles loading, errors, and disables inputs accordingly.
 * - Shows assigned students as disabled with indication.
 * - Trigger button is customizable and passed as prop.
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ClassData } from '@/types'; // Assuming SongData might be passed or fetched
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Updated interface to match the actual API response
interface StudentForAssignment {
  id: string;           // Relationship document ID
  studentId: string;    // Student's UID
  name: string;         // Student's name
  email: string;        // Student's email
  relationshipId: string; // Relationship document ID
}

interface AssignSongModalProps {
  songId: string;
  songTitle: string;
  triggerButton: React.ReactNode; // Allow custom trigger button
}

export default function AssignSongModal({ songId, songTitle, triggerButton }: AssignSongModalProps) {
  const { refreshIdToken } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [students, setStudents] = useState<StudentForAssignment[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedStudentUids, setSelectedStudentUids] = useState<Set<string>>(new Set());
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(undefined);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [assignedStudentUids, setAssignedStudentUids] = useState<Set<string>>(new Set());

  // Fetch students, classes, and assigned students when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setLoadingStudents(true);

    const fetchData = async () => {
      try {
        const token = await refreshIdToken();

        // Fetch students
        const studentsRes = await fetch('/api/teacher/students', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const studentsData = await studentsRes.json();
        setStudents(studentsData.students || []);

        // Fetch classes
        const classesRes = await fetch('/api/teacher/classes', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const classesData = await classesRes.json();
        setClasses(classesData.classes || []);

        // Fetch already assigned students for this song
        const assignedRes = await fetch(`/api/songs/assigned-students?songId=${songId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const assignedData = await assignedRes.json();
        const assignedSet = new Set<string>((assignedData.studentUids || []) as string[]);
        setAssignedStudentUids(assignedSet);
        setSelectedStudentUids(new Set()); // Start with none selected
      } catch (err: Error | unknown) {
        console.error("Error fetching data:", err);
        if (err instanceof Error) {
          toast({ variant: "destructive", title: "Error", description: err.message });
        } else {
          toast({ variant: "destructive", title: "Error", description: "An unknown error occurred while fetching data" });
        }
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchData();
  }, [isOpen, refreshIdToken, songId, toast]);

  // When a class is selected, auto-select all its students (excluding already assigned)
  useEffect(() => {
    if (!selectedClassId) return;
    if (selectedClassId === 'none') {
      setSelectedStudentUids(new Set());
      return;
    }
    const selectedClass = classes.find(c => c.id === selectedClassId);
    if (selectedClass) {
      // Only select students who are not already assigned
      const assignable = selectedClass.studentIds.filter(uid => !assignedStudentUids.has(uid));
      setSelectedStudentUids(new Set(assignable));
    }
  }, [selectedClassId, classes, assignedStudentUids]);

  const handleStudentCheckbox = (uid: string, checked: boolean) => {
    setSelectedStudentUids(prev => {
      const next = new Set(prev);
      if (checked) next.add(uid);
      else next.delete(uid);
      return next;
    });
  };

  const handleAssignSubmit = async () => {
    if (selectedStudentUids.size === 0 && (!selectedClassId || selectedClassId === 'none')) {
      toast({ variant: "default", title: "No Selection", description: "Please select at least one student or class." });
      return;
    }
    setLoadingAssign(true);
    try {
      const token = await refreshIdToken();
      const response = await fetch('/api/songs/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          songId,
          studentUids: Array.from(selectedStudentUids),
          classroomIds: selectedClassId && selectedClassId !== 'none' ? [selectedClassId] : []
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Failed to assign song: ${response.statusText}`);
      toast({ title: "Success", description: result.message || `Successfully assigned song.` });
      setIsOpen(false);
    } catch (err: Error | unknown) {
      console.error("Error assigning song:", err);
      toast({ 
        variant: "destructive", 
        title: "Assignment Error", 
        description: err instanceof Error ? err.message : 'An unknown error occurred during assignment.' 
      });
    } finally {
      setLoadingAssign(false);
    }
  };

  // Filter out already assigned students
  const assignableStudents = students.filter(student => !assignedStudentUids.has(student.studentId));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Song: {songTitle}</DialogTitle>
          <DialogDescription>
            Select a class or individual students to assign this song.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Label htmlFor="class-select">Assign to Class</Label>
          <Select onValueChange={setSelectedClassId} value={selectedClassId}>
            <SelectTrigger id="class-select">
              <SelectValue placeholder="Select a class or assign individually" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select individually / Clear selection</SelectItem>
              {classes.map(cls => (
                <SelectItem key={cls.id} value={cls.id!}>{cls.className}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div>
            <Label>Students</Label>
            {loadingStudents ? (
              <div>Loading students...</div>
            ) : assignableStudents.length === 0 ? (
              <div className="text-muted-foreground text-sm">All students have already been assigned this song.</div>
            ) : (
              <div className="max-h-48 overflow-y-auto">
                {students.map(student => {
                  const isAssigned = assignedStudentUids.has(student.studentId);
                  return (
                    <div key={student.studentId} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isAssigned || selectedStudentUids.has(student.studentId)}
                        disabled={isAssigned || (!!selectedClassId && selectedClassId !== 'none')}
                        onChange={e => handleStudentCheckbox(student.studentId, e.target.checked)}
                      />
                      <span>
                        {student.name} ({student.email})
                        {isAssigned && (
                          <span className="text-xs text-muted-foreground ml-2">(Already assigned)</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={loadingAssign}>Cancel</Button>
          <Button type="button" onClick={handleAssignSubmit} disabled={loadingAssign || (selectedStudentUids.size === 0 && (!selectedClassId || selectedClassId === 'none'))}>
            {loadingAssign ? "Assigning..." : `Assign Song`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
