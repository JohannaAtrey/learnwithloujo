/**
 * AssignQuizModal component
 * 
 * - Displays a modal to assign a quiz to selected students.
 * - Allows selecting students individually or all students (class selection to be implemented).
 * - Supports scheduling quiz availability and due dates with date and time pickers.
 * - Fetches teacher's students and allows toggling selection.
 * - Submits assignment via API with quizId, student IDs, availability and due timestamps.
 * - Handles loading states, errors, and success notifications with toasts.
 * - Includes basic modal open/close logic and disables submission when no students selected or during assignment.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useTeacherStudents } from '@/hooks/use-teacher-students';
import { Loader2, UserPlus, UserMinus, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { ClassData } from '@/types';

interface AssignQuizModalProps {
  quizId: string;
  quizTitle: string;
  triggerButton: React.ReactNode;
  onSuccess?: () => void;
}

export default function AssignQuizModal({ quizId, quizTitle, triggerButton, onSuccess }: AssignQuizModalProps) {
  const { refreshIdToken } = useAuth();
  const { toast } = useToast();
  const { students, loading: loadingStudents, error: studentsError, refreshStudents } = useTeacherStudents();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(undefined);
  
  const [availableFromDate, setAvailableFromDate] = useState<Date | undefined>(undefined);
  const [availableFromTime, setAvailableFromTime] = useState<string>(""); // HH:mm format
  const [dueByDate, setDueByDate] = useState<Date | undefined>(undefined);
  const [dueByTime, setDueByTime] = useState<string>(""); // HH:mm format
  const [classes, setClasses] = useState<ClassData[]>([]);

  useEffect(() => {
    if (isOpen) {
      refreshStudents();
    } else {
      // Reset state when modal closes
      setSelectedStudentIds([]);
      setSelectedClassId(undefined);
      setAvailableFromDate(undefined);
      setAvailableFromTime("");
      setDueByDate(undefined);
      setDueByTime("");
    }

    const fetchData = async () => {
      try {
        const token = await refreshIdToken();

        // Fetch classes
        const classesRes = await fetch('/api/teacher/classes', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const classesData = await classesRes.json();
        setClasses(classesData.classes || []);
      } catch (err: Error | unknown) {
        console.error("Error fetching data:", err);
        if (err instanceof Error) {
          toast({ variant: "destructive", title: "Error", description: err.message });
        } else {
          toast({ variant: "destructive", title: "Error", description: "An unknown error occurred while fetching data" });
        }
      }
    };

    fetchData();
  }, [isOpen, refreshStudents, refreshIdToken, toast]);
  
  const handleClassSelect = (classId: string) => {
    setSelectedClassId(classId);
    if (classId === "all") {
      setSelectedStudentIds(students.map(s => s.studentId));
      return;
    }
    if (classId === "none") {
      setSelectedStudentIds([]);
      return;
    }
    // TODO: Implement class-based selection when class management is added
    const selectedClass = classes.find(c => c.id === classId);
    setSelectedStudentIds(selectedClass?.studentIds || []);
  };

  const handleAssignQuiz = async () => {
    if (selectedStudentIds.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select at least one student"
      });
      return;
    }

    setIsAssigning(true);
    try {
      const token = await refreshIdToken();
      if (!token) throw new Error("Authentication token not available");

      // Build payload with studentId (UID)
      const payload = {
        quizId,
        studentIds: selectedStudentIds, // these should be UIDs
        availableAt: availableFromDate ? new Date(availableFromDate).toISOString() : null,
        dueAt: dueByDate ? new Date(dueByDate).toISOString() : null,
        classId: selectedClassId || null
      };

      const res = await fetch('/api/teacher/quiz-assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to assign quiz');
      }

      toast({
        title: "Quiz Assigned",
        description: "Quiz successfully assigned to selected students."
      });
      setIsOpen(false);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to assign quiz'
      });
      console.error('[AssignQuizModal] Error assigning quiz:', err);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <>
      <div onClick={() => setIsOpen(true)}>{triggerButton}</div>
      
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              {/* <Button className="absolute p-1 rounded hover:bg-gray-100 text-red-800 transition-colors"
              ><X className="h-4 w-4" /></Button> */}
              {/* <button
                // onClick={() => setIsOpen(false)}
                // className="absolute top-4 right-4 p-1 rounded hover:bg-gray-100 text-red-800 transition-colors"
              //   className="top-4 right-4 p-1 rounded hover:bg-gray-100 text-red-800 transition-colors"
              //   aria-label="Close modal"
              >
                {<X className="h-4 w-4" /> }
              { </button> } */}
              {/* <button onclick="document.getElementById('errorAlert').style.display='none'" class="text-red-800 hover:text-red-600 ml-4 font-bold text-lg">
                            &times;
                        </button> */}
              <CardTitle>Assign Quiz: {quizTitle}</CardTitle>
              <CardDescription>
                Select students to assign this quiz to. You can also schedule when the quiz becomes available and when it&apos;s due.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Student Selection */}
              <div>
                <Label htmlFor="class-select">Assign to Students / Class</Label>
                <Select onValueChange={handleClassSelect} value={selectedClassId}>
                  <SelectTrigger id="class-select">
                    <SelectValue placeholder="Select a class or assign individually" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select individually / Clear selection</SelectItem>
                    <SelectItem value="all">All My Students</SelectItem>
                    {/* <SelectItem value="none">Select individually / Clear selection</SelectItem> */}
                    {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id!}>{cls.className}</SelectItem>
                    ))}
                    {/* TODO: Add class options when class management is implemented */}
                  </SelectContent>
                </Select>
              </div>

              {/* Student List */}
              <div className="border rounded-md p-4">
                <h3 className="font-semibold mb-2">Selected Students {selectedStudentIds.length  === 0 ? '' : (selectedStudentIds.length)}</h3>
                {loadingStudents ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : studentsError ? (
                  <div className="text-destructive text-sm">{studentsError}</div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {students.map(student => (
                      <div key={student.studentId} className="flex items-center justify-between p-2 border rounded hover:bg-muted/50">
                        <span>{student.name} ({student.email})</span>
                        <Button
                          size="sm"
                          variant={selectedStudentIds.includes(student.studentId) ? "destructive" : "outline"}
                          onClick={() => {
                            setSelectedStudentIds(prev => 
                              prev.includes(student.studentId)
                                ? prev.filter(id => id !== student.studentId)
                                : [...prev, student.studentId]
                            );
                          }}
                        >
                          {selectedStudentIds.includes(student.studentId) ? (
                            <UserMinus className="mr-1 h-4 w-4" />
                          ) : (
                            <UserPlus className="mr-1 h-4 w-4" />
                          )}
                          {selectedStudentIds.includes(student.studentId) ? 'Remove' : 'Add'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Scheduling Options */}
              <div className="grid grid-cols-2 gap-4">
            <div>
                  <Label>Available From</Label>
                  <div className="flex gap-2">
                <Calendar
                  mode="single"
                  selected={availableFromDate}
                      onSelect={setAvailableFromDate}
                      className="rounded-md border"
                />
                    <input
                  type="time"
                  value={availableFromTime}
                  onChange={(e) => setAvailableFromTime(e.target.value)}
                      className="border rounded-md p-2"
                />
              </div>
            </div>
            <div>
                  <Label>Due By</Label>
                  <div className="flex gap-2">
                <Calendar
                  mode="single"
                  selected={dueByDate}
                      onSelect={setDueByDate}
                      className="rounded-md border"
                />
                    <input
                  type="time"
                  value={dueByTime}
                  onChange={(e) => setDueByTime(e.target.value)}
                      className="border rounded-md p-2"
                />
              </div>
            </div>
          </div>
            </CardContent>

            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAssignQuiz} 
                disabled={isAssigning || selectedStudentIds.length === 0}
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assigning...
                  </>
            ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Assign Quiz
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
}
