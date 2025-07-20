/**
 * SongDetailsPage component
 *
 * - Fetches and displays detailed information about a single song based on the URL parameter `id`.
 * - Shows loading spinner while fetching data.
 * - Handles and displays errors if fetching fails.
 * - Displays song metadata including title, creation date, AI model, tags, and unique song ID.
 * - Includes a share button to share the current page URL using native Web Share API or fallback clipboard copy.
 * - Includes a SongPlayer component to play the song audio.
 * - For users with the 'teacher' role, displays an AssignSongModal to assign the song to students.
 * - Provides navigation back to the song library, with the destination depending on user role.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getSongById } from '@/lib/api/udio';
import { SongData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import SongPlayer from '@/components/player/SongPlayer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Share } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import AssignSongModal from '@/components/teacher/AssignSongModal';

export default function SongDetailsPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const [song, setSong] = useState<SongData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { userRole } = useAuth();

  let backHref = '/';
  if (userRole === 'teacher') backHref = '/dashboard/teacher/my-songs';
  else if (userRole === 'parent') backHref = '/dashboard/parent/my-songs';
  else if (userRole === 'admin') backHref = '/admin/songs';

  useEffect(() => {
    const fetchSong = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        const songId = Array.isArray(id) ? id[0] : id;
        const songData = await getSongById(songId);
        setSong(songData);
} catch (err: unknown) {
        const error = err as Error;
        console.error('Error fetching song:', error);
        setError(error.message || 'Failed to load song');
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || 'Could not load the song'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSong();
  }, [id, toast]);

  // Function to share song
  const handleShare = () => {
    if (navigator.share && song) {
      navigator.share({
        title: song.title || 'Educational Song',
        text: `Check out this educational song: ${song.title}`,
        url: window.location.href,
      }).catch(err => {
        console.error('Error sharing:', err);
      });
    } else {
      // Fallback: copy link to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Song link copied to clipboard",
      });
    }
  };

  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Link href={backHref}>
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft size={16} />
            Back to Song Library
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-[#e55283] border-t-transparent rounded-full"></div>
          <span className="ml-3 text-lg">Loading song...</span>
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-muted/20 rounded-lg border border-dashed">
          <h2 className="text-xl font-semibold mb-2">Error Loading Song</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Link href={backHref}>
            <Button variant="default">Return to Song Library</Button>
          </Link>
        </div>
      ) : song ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-3xl font-bold text-[#e55283]">{song.title || 'Untitled Song'}</h1>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
                onClick={handleShare}
              >
                <Share size={16} />
                Share
              </Button>
            </div>
          </div>
          
          <SongPlayer song={song} />
          
          {userRole === 'teacher' && (
            <div className="mt-4">
              <AssignSongModal
                songId={song.id!}
                songTitle={song.title || 'Untitled Song'}
                triggerButton={
                  <Button variant="default" size="sm">
                    Assign Song
                  </Button>
                }
              />
            </div>
          )}
          
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Song Information</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Generated On</dt>
                <dd className="mt-1">{new Date(song.createdAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</dd>
              </div>
              
              {song.modelName && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">AI Model</dt>
                  <dd className="mt-1">{song.modelName}</dd>
                </div>
              )}
              
              {song.tags && (
                <div className="md:col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">Tags</dt>
                  <dd className="mt-1 flex flex-wrap gap-2">
                    {song.tags.split(',').map((tag, index) => (
                      <span key={index} className="bg-muted px-3 py-1 rounded-full text-sm">
                        {tag.trim()}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
              
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">Song ID</dt>
                <dd className="mt-1 font-mono text-sm">{song.udioId}</dd>
              </div>
            </dl>
          </div>
          
          <div className="pt-6 border-t">
            <Link href="/dashboard">
              <Button variant="outline">
                Generate Another Song
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-muted/20 rounded-lg border border-dashed">
          <h2 className="text-xl font-semibold mb-2">Song Not Found</h2>
<p className="text-muted-foreground mb-4">The song you are looking for could not be found.</p>
          <Link href={backHref}>
            <Button variant="default">Return to Song Library</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
