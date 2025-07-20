/**
 * ParentSongsList component
 * 
 * - Fetches and displays the parent's generated songs.
 * - Shows loading and error states with retry option.
 * - Plays/pauses audio previews for songs with available audio files.
 * - Displays song status badges and optional subject tags.
 * - Provides a modal to assign songs to children.
 * - Handles authentication, fetch, playback, and user notifications.
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
import ParentSpecificAssignSongModal from '@/components/parent/ParentSpecificAssignSongModal';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SongPlayer from '@/components/player/SongPlayer';

// Extend SongData to include subject if it's used in the UI
interface ExtendedSongData extends SongData {
  subject?: string;
}

export default function ParentSongsList() {
  const { refreshIdToken, user } = useAuth();
  const { toast } = useToast();
  const [songs, setSongs] = useState<ExtendedSongData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  // const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [selectedSong, setSelectedSong] = useState<SongData | null>(null);

  const fetchSongs = useCallback(async () => {
  setLoading(true);
  setError(null);
  console.log('[ParentSongsList] Fetching songs...');
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
    console.log(`[ParentSongsList] Fetched ${data.songs?.length || 0} songs.`);

  } catch (err: unknown) {
    console.error('[ParentSongsList] Error fetching songs:', err);
    setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    toast({ variant: "destructive", title: "Error", description: "Could not load songs." });
  } finally {
    setLoading(false);
  }
}, [refreshIdToken, toast, setLoading, setError, setSongs]);

useEffect(() => {
  fetchSongs();
}, [fetchSongs]);

  // const handlePlayPause = (song: ExtendedSongData) => {
  //   if (!song.localPath) {
  //     toast({ variant: "destructive", title: "Error", description: "Song file not available." });
  //     return;
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
  //       setPlayingSongId(song.id ?? null);
  //       setCurrentAudio(audio);
  //     }).catch(err => {
  //       console.error("Audio play() failed:", err);
  //       toast({ variant: "destructive", title: "Playback Error", description: "Could not start audio playback." });
  //     });
  //   }
  // };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-[#e55283]" />
        <span className="ml-3 text-lg">Loading songs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertCircle /> Error Loading Songs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
          <Button onClick={fetchSongs} variant="destructive" size="sm" className="mt-4">Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  if (songs.length === 0) {
    return (
      <Card className="text-center py-10">
        <CardContent>
          <Music className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">You haven&apos;t generated any songs yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {songs.map((song) => (
        <Card key={song.id} className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">{song.title || 'Untitled Song'}</CardTitle>
            <div className="flex gap-2 mt-2">
              <Badge variant={song.status === 'complete' ? 'default' : 'secondary'}>
                {song.status === 'complete' ? 'Ready' : 'Processing'}
              </Badge>
              {song.subject && (
                <Badge variant="outline">{song.subject}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground line-clamp-3">
              {song.lyrics || 'No lyrics available.'}
            </p>
          </CardContent>
          <CardFooter className="flex justify-between gap-2">
            {/* <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handlePlayPause(song)}
              disabled={song.status !== 'complete'}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-1" /> {playingSongId === song.id ? 'Pause' : 'Play'}
            </Button> */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSelectedSong(song)}
              disabled={song.status !== 'complete'}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-1" /> {selectedSong !== null ? '' : 'Play'}
            </Button>
            {song.id && (
              <ParentSpecificAssignSongModal
                songId={song.id}
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
            )}
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