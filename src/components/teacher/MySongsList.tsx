/**
 * MySongsList component
 * 
 * - Fetches and displays the list of songs created by the user.
 * - Supports playing and pausing individual songs with audio playback management.
 * - Shows loading, error, and empty states with appropriate UI and feedback.
 * - Displays song metadata including title, creation date, and status badge.
 * - Provides an Assign button that opens a modal to assign songs to students or classes.
 * - Handles audio cleanup on component unmount.
 * - Uses toast notifications for error and status feedback.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { SongData } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Users, Loader2, AlertCircle, Music } from 'lucide-react';
import Link from 'next/link';
import AssignSongModal from './AssignSongModal'; 
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SongPlayer from '@/components/player/SongPlayer';

export default function MySongsList() {
  const { refreshIdToken, user } = useAuth();
  const { toast } = useToast();
  const [songs, setSongs] = useState<SongData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  // const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [selectedSong, setSelectedSong] = useState<SongData | null>(null);

  const fetchMySongs = useCallback(async () => {
  setLoading(true);
  setError(null);
  console.log('[MySongsList] Fetching songs...');
  try {
    const token = await refreshIdToken();
    if (!token) throw new Error('Authentication token not available.');

    const response = await fetch('/api/songs/my-songs', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to fetch songs: ${response.statusText}`);
    }

    const data = await response.json();
    setSongs(data.songs || []);
    console.log(`[MySongsList] Fetched ${data.songs?.length || 0} songs.`);
  } catch (err: unknown) {
    console.error('[MySongsList] Error fetching songs:', err);
    setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : 'An unknown error occurred.' });
  } finally {
    setLoading(false);
  }
}, [refreshIdToken, toast, setLoading, setError, setSongs]);

useEffect(() => {
  fetchMySongs();
}, [fetchMySongs]);

  // Stop audio when component unmounts
  // useEffect(() => {
  //   return () => {
  //     currentAudio?.pause();
  //   };
  // }, [currentAudio]);

  // const handlePlayPause = (song: SongData) => {
  //   if (!song.localPath) {
  //       toast({ variant: "destructive", title: "Error", description: "Song file not available." });
  //       return;
  //   }

  //   if (currentAudio && playingSongId === song.id) {
  //     // Pause current song
  //     currentAudio.pause();
  //     setCurrentAudio(null);
  //     setPlayingSongId(null);
  //   } else {
  //     // Stop previous song if any
  //     currentAudio?.pause();

  //     // Play new song
  //     const audio = new Audio(song.localPath);
  //     audio.onended = () => {
  //       setPlayingSongId(null);
  //       setCurrentAudio(null);
  //     };
  //     audio.onerror = (e) => {
  //       console.error("Audio playback error:", e);
  //       toast({ variant: "destructive", title: "Playback Error", description: "Could not play audio file." });
  //       setPlayingSongId(null);
  //       setCurrentAudio(null);
  //     };
      
  //     audio.play().then(() => {
  //       setPlayingSongId(song.id ?? null); // Use song's Firestore ID
  //       setCurrentAudio(audio);
  //     }).catch(err => {
  //        console.error("Audio play() failed:", err);
  //        toast({ variant: "destructive", title: "Playback Error", description: "Could not start audio playback." });
  //     });
  //   }
  // };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-[#e55283]" />
        <span className="ml-2">Loading your songs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-600">
        <AlertCircle className="mx-auto h-10 w-10 mb-2" />
        <p>Error loading songs: {error}</p>
        <Button onClick={fetchMySongs} variant="outline" className="mt-4">Try Again</Button>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed rounded-lg">
        <Music className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No Songs Generated Yet</h3>
        <p className="text-muted-foreground mb-4">Generate your first song to see it here.</p>
        <Link href="/generate-songs">
           <Button className="bg-[#e55283] hover:bg-[#e55283]/90">Generate New Song</Button>
        </Link>
      </div>
     );
   }

   // Add log here to check state before rendering map
   console.log(`[MySongsList] Rendering component with ${songs.length} songs in state.`);

   const getStatusBadge = (status: SongData['status']) => {
     switch (status) {
      case 'complete': return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Complete</Badge>;
      case 'processing': return <Badge variant="secondary">Processing</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {songs.map((song) => (
        <Card key={song.id} className="flex flex-col">
          <CardHeader>
            <CardTitle className="truncate text-lg">{song.title || 'Untitled Song'}</CardTitle>
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>{new Date(song.createdAt).toLocaleDateString()}</span>
              {getStatusBadge(song.status)}
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
            {/* Optionally display prompt or lyrics snippet */}
            <p className="text-sm text-muted-foreground line-clamp-3">
              {song.prompt || song.lyrics || 'No description available.'}
            </p>
             {song.status === 'failed' && song.errorMessage && (
                <p className="text-xs text-red-500 mt-2">Error: {song.errorMessage}</p>
             )}
          </CardContent>
          <CardFooter className="flex justify-between gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSelectedSong(song)}
              disabled={song.status !== 'complete'}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-1" /> {selectedSong !== null ? '' : 'Play'}
            </Button>
            {/* Assign Button triggers the Modal */}
            <AssignSongModal
                key={`assign-modal-${song.id}`}
                songId={song.id!}
                songTitle={song.title || 'Untitled Song'}
                triggerButton={
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={song.status !== 'complete'}
                    className="flex-1"
                  >
                    <Users className="h-4 w-4 mr-1" /> Assign
                  </Button>
                }
            />
          </CardFooter>
        </Card>
      ))}
      
      {/* Song Detail Dialog */}
      <Dialog open={selectedSong !== null} onOpenChange={(isOpen) => !isOpen && setSelectedSong(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSong?.title || 'Song Details'}</DialogTitle>
            {selectedSong && (
               <DialogDescription>Generated by: {(user && user.name) ? user.name : 'Me'}</DialogDescription>
            )}
          </DialogHeader>
          <div className="py-4">
            {selectedSong ? (
              <SongPlayer song={selectedSong} />
            ) : (
              <p className="text-sm text-muted-foreground">No song selected.</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelectedSong(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
