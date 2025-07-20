// Student-facing page for viewing and interacting with songs assigned by teachers.
// Fetches assigned songs from the backend, groups them by assigning teacher, 
// and displays them in a UI with expandable details (audio + lyrics).

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth'; 
import { AssignedSongWithTeacher } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, AlertCircle, Music, ChevronRight } from 'lucide-react';
import { useCallback } from 'react';

// Group songs by teacher name helper function
const groupSongsByTeacher = (songs: AssignedSongWithTeacher[]) => {
  return songs.reduce((acc, song) => {
    const teacherName = song.assignedByTeacherName || 'Unknown Teacher';
    if (!acc[teacherName]) {
      acc[teacherName] = [];
    }
    acc[teacherName].push(song);
    return acc;
  }, {} as Record<string, AssignedSongWithTeacher[]>);
};

export default function AssignedSongsPage() {
  const { refreshIdToken } = useAuth();
  const { toast } = useToast();
  const [assignedSongs, setAssignedSongs] = useState<AssignedSongWithTeacher[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(true);
  const [songsError, setSongsError] = useState<string | null>(null);
  const [selectedSong, setSelectedSong] = useState<AssignedSongWithTeacher | null>(null);

  const fetchAssignedSongs = useCallback(async () => {
  setLoadingSongs(true);
  setSongsError(null);
  try {
    const token = await refreshIdToken();
    if (!token) throw new Error('Authentication token not available.');
    const response = await fetch('/api/songs/student', { 
      headers: { 'Authorization': `Bearer ${token}` } 
    });
    if (!response.ok) { 
      const errorData = await response.json(); 
      throw new Error(errorData.error || `Failed to fetch assigned songs: ${response.statusText}`); 
    }
    const data = await response.json();
    setAssignedSongs(data.songs || []);
  } catch (err: unknown) {
    console.error('Error fetching assigned songs:', err);
    setSongsError(err instanceof Error ? err.message : 'An unknown error occurred.');
    toast({ 
      variant: "destructive", 
      title: "Error", 
      description: "Could not load assigned songs." 
    });
  } finally {
    setLoadingSongs(false);
  }
}, [refreshIdToken, toast]);

  useEffect(() => {
  fetchAssignedSongs();
}, [fetchAssignedSongs]);

  // Group songs by teacher using useMemo for performance
  const groupedSongs = useMemo(() => {
    return groupSongsByTeacher(assignedSongs);
  }, [assignedSongs]);

  return (
    <div className="space-y-6">
       <h1 className="text-3xl font-bold">My Assigned Songs</h1>
       <p className="text-muted-foreground">Songs assigned by your teachers.</p>

        {loadingSongs ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-[#e55283]" />
            <span className="ml-3 text-lg">Loading songs...</span>
          </div>
        ) : songsError ? (
          <Card className="border-destructive">
             <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                   <AlertCircle /> Error Loading Songs
                </CardTitle>
             </CardHeader>
             <CardContent>
                <p>{songsError}</p>
                <Button onClick={fetchAssignedSongs} variant="destructive" size="sm" className="mt-4">Try Again</Button>
             </CardContent>
          </Card>
        ) : Object.keys(groupedSongs).length === 0 ? (
          <Card className="text-center py-10">
             <CardContent>
                <Music className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No songs have been assigned to you yet.</p>
             </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Map over teachers (group keys) */}
            {Object.entries(groupedSongs).map(([teacherName, songs]) => (
              <Card key={teacherName}>
                 <CardHeader>
                    <CardTitle className="text-xl">From: {teacherName}</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-3">
                    {/* Map over songs for this teacher */}
                    {songs.map((song) => (
                      <div
                        key={song.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedSong(song)}
                      >
                        <div className="flex items-center gap-3">
                          <Music className="h-5 w-5 text-[#e55283]" />
                          <div>
                            <p className="font-medium">{song.title || 'Untitled Song'}</p>
                            {/* Optionally show assigned date */}
                            {/* {song.assignedAt && <p className="text-xs text-muted-foreground">Assigned: {new Date(song.assignedAt._seconds * 1000).toLocaleDateString()}</p>} */}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    ))}
                 </CardContent>
              </Card>
            ))}
          </div>
        )}

      {/* Song Detail Dialog */}
      <Dialog open={selectedSong !== null} onOpenChange={(isOpen) => !isOpen && setSelectedSong(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedSong?.title || 'Song Details'}</DialogTitle>
            {selectedSong?.assignedByTeacherName && (
               <DialogDescription>Assigned by: {selectedSong.assignedByTeacherName}</DialogDescription>
            )}
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto space-y-4">
             {selectedSong?.localPath ? (
               <div>
                 <h3 className="font-semibold mb-2 text-lg">Listen</h3>
                 <audio
                   controls
                   src={selectedSong.localPath.startsWith('/') ? selectedSong.localPath : `/${selectedSong.localPath}`}
                   className="w-full"
                   onError={(e) => {
                     console.error("Audio error:", e);
                     toast({ variant: "destructive", title: "Audio Error", description: "Could not load audio file." });
                   }}
                 >
                   Your browser does not support the audio element.
                 </audio>
               </div>
             ) : (
               <p className="text-sm text-muted-foreground">Audio not available for this song.</p>
             )}
             <div>
                <h3 className="font-semibold mb-2 text-lg">Lyrics</h3>
                <pre className="text-sm bg-muted p-3 rounded whitespace-pre-wrap font-sans max-h-[30vh] overflow-y-auto">
                  {selectedSong?.lyrics || 'No lyrics available.'}
                </pre>
             </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelectedSong(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
