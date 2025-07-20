/**
 * SongPlayer component
 * 
 * - Plays audio for a given song with controls for play/pause, seek, volume, mute, restart, and skip forward/back.
 * - Displays album art, song title, AI model used, and tags.
 * - Shows formatted lyrics split into verses with scrollable container.
 * - Uses HTMLAudioElement and React state/effects for playback management and UI updates.
 * - Responsive UI with accessible controls and time display.
 */

'use client';

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image"; 
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { SongData } from "@/types";

interface SongPlayerProps {
  song: SongData;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export default function SongPlayer({ song }: SongPlayerProps) {
  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Format lyrics for display (split into verses)
  const formatLyrics = (lyrics: string): string[] => {
    if (!lyrics) return ['No lyrics available.'];
    return lyrics.split('\n\n').filter(verse => verse.trim().length > 0);
  };

  const verses = formatLyrics(song.lyrics || '');

  // Tags display
  const tags = song.tags ? song.tags.split(',').map(tag => tag.trim()) : [];

  // Handle play/pause toggle
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => {
          console.error('Error playing audio:', err);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle seeking
  const handleSeek = (newPosition: number[]) => {
    if (audioRef.current && duration) {
      const newTime = newPosition[0];
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Handle volume change
  const handleVolumeChange = (newVolume: number[]) => {
    const volumeValue = newVolume[0];
    setVolume(volumeValue);
    if (audioRef.current) {
      audioRef.current.volume = volumeValue;
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

  // Reset to beginning
  const restart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  // Skip forward 10 seconds
  const skipForward = () => {
    if (audioRef.current) {
      const newTime = Math.min(audioRef.current.currentTime + 10, duration);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnd = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnd);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnd);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  // Set volume on initial load
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg">
      {/* Album Art and Title */}
      <CardHeader className="pb-2">
        <div className="flex items-center space-x-4">
          <div className="min-w-20 min-h-20 w-20 h-20 rounded bg-muted flex items-center justify-center">
            {song.imageUrl ? (
              <Image 
                src={song.imageUrl} 
                alt={song.title || 'Song cover'} 
                width={80}
                height={80}
                className="w-full h-full object-cover rounded" 
                unoptimized // Add this if images are from external URLs
              />
            ) : (
              <div className="text-4xl">🎵</div>
            )}
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl md:text-2xl">{song.title || 'Untitled Song'}</CardTitle>
            <div className="text-sm text-muted-foreground">
              Generated with {song.modelName || 'Udio AI'}
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Player Controls */}
      <CardContent className="pb-2">
        <div className="space-y-4">
          {/* Audio element */}
          <audio 
            ref={audioRef}
            src={song.localPath ? (song.localPath.startsWith('/') ? song.localPath : `/${song.localPath}`) : ''}
            preload="metadata"
            className="hidden"
            onError={(e) => {
              console.error("Audio error:", e);
            }}
          />

          {/* Progress bar */}
          <div className="space-y-1">
            <Slider 
              value={[currentTime]} 
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration || 0)}</span>
            </div>
          </div>

          {/* Player controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={restart}
                className="h-8 w-8 rounded-full"
              >
                <SkipBack size={18} />
              </Button>
              <Button 
                variant="default" 
                size="icon" 
                onClick={togglePlayPause}
                className="h-10 w-10 rounded-full bg-[#e55283] hover:bg-[#e55283]/90"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={skipForward}
                className="h-8 w-8 rounded-full"
              >
                <SkipForward size={18} />
              </Button>
            </div>
            <div className="flex items-center space-x-2 w-1/3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleMute}
                className="h-8 w-8 rounded-full shrink-0"
              >
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </Button>
              <Slider 
                value={[volume]} 
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </CardContent>

      {/* Lyrics */}
      <CardContent className="pt-0">
        <div className="mt-4">
          <h3 className="font-semibold text-lg mb-2">Lyrics</h3>
          <div className="bg-muted p-4 rounded max-h-72 overflow-y-auto">
            {verses.map((verse, index) => (
              <div key={index} className="mb-4 last:mb-0">
                <p className="whitespace-pre-line">{verse}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      {/* Song Info */}
      <CardFooter className="flex justify-between text-xs text-muted-foreground border-t pt-4">
        <div>
          Song ID: {song.udioId ? song.udioId.substring(0, 8) : 'N/A'}...
        </div>
        <div>
          Created: {new Date(song.createdAt).toLocaleDateString()}
        </div>
      </CardFooter>
    </Card>
  );
}
