/**
 * ChildAssignedSongsList component
 * 
 * - Displays a list of songs assigned to a child.
 * - Shows song titles with play buttons that open a full-featured player.
 * - Uses the same SongPlayer component as students for consistent experience.
 * - Displays songs in a clean list format with easy access to full player.
 */

import React, { useState } from 'react';
import { SongData } from '@/types';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import SongPlayer from '@/components/player/SongPlayer';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ChildAssignedSongsListProps {
  songs: SongData[];
}

const ChildAssignedSongsList: React.FC<ChildAssignedSongsListProps> = ({ songs }) => {
  const [selectedSong, setSelectedSong] = useState<SongData | null>(null);

  if (!songs || songs.length === 0) {
    return <div className="text-muted-foreground">No songs assigned yet.</div>;
  }

  return (
    <>
      <ul className="space-y-3">
        {songs.map((song) => (
          <li key={song.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <span className="text-2xl">🎵</span>
              </div>
              <div>
                <h3 className="font-medium text-lg">{song.title || 'Untitled Song'}</h3>
                <p className="text-sm text-muted-foreground">
                  {song.modelName || 'AI Generated'} • {new Date(song.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedSong(song)}
              disabled={song.status !== 'complete'}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Play
            </Button>
          </li>
        ))}
      </ul>

      {/* Song Player Dialog */}
      <Dialog open={selectedSong !== null} onOpenChange={(isOpen) => !isOpen && setSelectedSong(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSong?.title || 'Song Details'}</DialogTitle>
            {selectedSong && (
              <DialogDescription>
                Assigned song for your child • Generated with {selectedSong.modelName || 'AI'}
              </DialogDescription>
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
    </>
  );
};

export default ChildAssignedSongsList;
