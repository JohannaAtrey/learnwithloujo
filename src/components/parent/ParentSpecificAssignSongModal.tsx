/**
 * ParentSpecificAssignSongModal component
 * 
 * - Modal dialog to assign a specific song to one or more linked children.
 * - Fetches linked children on modal open via authenticated API call.
 * - Allows selecting children via checkboxes for assignment.
 * - Handles assignment request with feedback on success or failure.
 * - Provides loading, error, and empty states for better UX.
 * - Accepts songId, songTitle, and a triggerButton React node as props.
 */

'use client';

console.log("<<<<< PARENT ParentSpecificAssignSongModal LOADED >>>>>"); // Updated distinct log

import { useState, useEffect, useCallback } from 'react';
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
  DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from 'lucide-react';

interface ChildForAssignment {
  id: string; 
  studentEmail: string;
  studentUid: string;
  studentName: string;
}

interface ParentSpecificAssignSongModalProps { // Renamed props interface
  songId: string;
  songTitle: string;
  triggerButton: React.ReactNode;
}

// Renamed component export
export default function ParentSpecificAssignSongModal({ songId, songTitle, triggerButton }: ParentSpecificAssignSongModalProps) {
  const { refreshIdToken } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<ChildForAssignment[]>([]);
  const [selectedChildUids, setSelectedChildUids] = useState<Set<string>>(new Set());
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wrap fetchChildren in useCallback with proper dependencies
  const fetchChildren = useCallback(async () => {
    if (!isOpen) return;
    setLoadingChildren(true);
    setError(null);
    console.log('[ParentSpecificAssignSongModal] Fetching children from /api/parent/linked-children...');
    try {
      const token = await refreshIdToken();
      if (!token) throw new Error('Authentication token not available.');

      const response = await fetch('/api/parent/linked-children', { 
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[ParentSpecificAssignSongModal] API Error Data:', errorData);
        throw new Error(errorData.error || `Failed to fetch children: ${response.statusText}`);
      }

      const data = await response.json();
      setChildren(data.children || []);
      console.log(`[ParentSpecificAssignSongModal] Fetched ${data.children?.length || 0} children.`);

    } catch (err: unknown) {
      console.error('[ParentSpecificAssignSongModal] Error fetching children:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching children.');
      toast({ variant: "destructive", title: "Error fetching children", description: err instanceof Error ? err.message : 'An unknown error occurred.' });
    } finally {
      setLoadingChildren(false);
    }
  }, [isOpen, refreshIdToken, toast]);

  useEffect(() => {
    if (isOpen) {
      fetchChildren();
      setSelectedChildUids(new Set());
    }
  }, [isOpen, fetchChildren]); // Include fetchChildren in dependency array

  const handleCheckboxChange = (childUid: string, checked: boolean | 'indeterminate') => {
    setSelectedChildUids(prev => {
      const next = new Set(prev);
      if (checked === true) {
        next.add(childUid);
      } else {
        next.delete(childUid);
      }
      return next;
    });
  };

  const handleAssignSubmit = async () => {
    if (selectedChildUids.size === 0) {
      toast({ variant: "default", title: "No Selection", description: "Please select at least one child." });
      return;
    }
    setLoadingAssign(true);
    setError(null);
    try {
      const token = await refreshIdToken();
      if (!token) throw new Error('Authentication token not available.');
      const response = await fetch('/api/songs/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({ songId: songId, studentUids: Array.from(selectedChildUids)})
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Failed to assign song: ${response.statusText}`);
      toast({ title: "Success", description: result.message || `Successfully assigned song to ${result.successfulCount} child(ren).`});
      if (result.failedCount > 0) {
        toast({ variant: "default", title: "Assignment Issues", description: `Could not assign song to ${result.failedCount} child(ren).`});
        console.warn("Assignment failures:", result.failures);
      }
      setIsOpen(false);
    } catch (err: unknown) {
      console.error('[ParentSpecificAssignSongModal] Error assigning song:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during assignment.');
      toast({ variant: "destructive", title: "Assignment Error", description: err instanceof Error ? err.message : 'An unknown error occurred.' });
    } finally {
      setLoadingAssign(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Song: {songTitle}</DialogTitle>
          <DialogDescription>Select the children you want to assign this song to.</DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[40vh] overflow-y-auto">
          {loadingChildren ? (
            <div className="flex justify-center items-center py-5"><Loader2 className="h-6 w-6 animate-spin text-[#e55283]" /><span className="ml-2">Loading children...</span></div>
          ) : error ? (
            <div className="text-center py-5 text-red-600"><AlertCircle className="mx-auto h-8 w-8 mb-2" /><p>Error: {error}</p><Button onClick={fetchChildren} variant="outline" size="sm" className="mt-3">Try Again</Button></div>
          ) : children.length === 0 ? (
            <p className="text-center text-muted-foreground py-5">No children linked to your account found.</p>
          ) : (
            <div className="space-y-2">
              {children.map((child) => (
                <div key={child.studentUid} className="flex items-center space-x-2">
                  <Checkbox id={`child-${child.studentUid}`} checked={selectedChildUids.has(child.studentUid)} onCheckedChange={(checked) => handleCheckboxChange(child.studentUid, checked)} disabled={!child.studentUid}/>
                  <Label htmlFor={`child-${child.studentUid}`} className="cursor-pointer">{child.studentName} ({child.studentEmail})</Label>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline" disabled={loadingAssign}>Cancel</Button></DialogClose>
          <Button type="button" onClick={handleAssignSubmit} disabled={loadingChildren || loadingAssign || selectedChildUids.size === 0} className="bg-[#e55283] hover:bg-[#e55283]/90">
            {loadingAssign && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign Song ({selectedChildUids.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}