// Admin-facing React component that displays a searchable song library with playback capability, using data fetched from an API and styled UI components.

"use client";

import React, { useState, useEffect } from "react";
import { getAllSongs } from "@/lib/api/udio";
import { SongData } from "@/types";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Music,
  Play,
  Search,
  Calendar,
  Clock,
  Tag,
  Loader2,
} from "lucide-react";
import Image from 'next/image';
import SongPlayer from '@/components/player/SongPlayer';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
export default function SongLibraryPage() {
  // Renamed component
  const { toast } = useToast();
  const [songs, setSongs] = useState<SongData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSong, setSelectedSong] = useState<SongData | null>(null);

  // Fetch all songs
  useEffect(() => {
    const fetchSongs = async () => {
      try {
        setIsLoading(true);
        // Note: This fetches ALL songs. Ensure this is intended for admin.
        // Might need role check here or rely on parent layout's ProtectedRoute.
        const songData = await getAllSongs();

        console.log(`Fetched ${songData.length} songs from API`);

        setSongs(Array.isArray(songData) ? songData : []);
      } catch (error: unknown) {
        console.error("Error fetching songs:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "An error occurred while fetching songs";
        toast({
          variant: "destructive",
          title: "Failed to load songs",
          description: errorMessage,
        });
        setSongs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSongs();
  }, [toast]);

  // Handle play button click
  const handlePlayClick = (song: SongData) => {
    setSelectedSong(song);
  };

  // Filter songs based on search term
  const filteredSongs = songs.filter(
    (song) =>
      (song.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (song.lyrics || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (song.tags || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    // Removed MainLayout wrapper
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#e55283]">
            Song Library (Admin)
          </h1>
          <p className="text-muted-foreground">
            Browse and manage all songs in the system
          </p>
        </div>

        <div className="w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search songs by title, lyrics, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-80"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#e55283] mr-3" />
          <span className="text-lg">Loading songs...</span>
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="text-center py-16 bg-muted/20 rounded-lg border border-dashed">
          <Music className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          {searchTerm ? (
            <>
              <h2 className="text-xl font-semibold mb-2">No songs found</h2>
              <p className="text-muted-foreground">
                Try a different search term or clear your search
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setSearchTerm("")}
              >
                Clear Search
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-2">
                The song library is empty
              </h2>
              <p className="text-muted-foreground mb-4">
                No songs have been generated or imported yet.
              </p>
              {/* Optional: Link to generate songs if admin can do that */}
              {/* <Link href="/generate-songs">
                <Button className="bg-[#e55283] hover:bg-[#e55283]/90">
                  Generate a Song
                </Button>
              </Link> */}
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSongs.map((song) => (
            <Card
              key={song.id || song.udioId}
              className="overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="bg-[#fef7f9] h-32 flex items-center justify-center relative">
                {song.imageUrl ? (
                  <Image
                    src={song.imageUrl}
                    alt={song.title || "Song image"}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover rounded"
                    unoptimized // Add this if images are from external URLs
                  />
                ) : (
                  <Music className="h-12 w-12 text-[#e55283]/40" />
                )}
                {song.localPath && (
                  <Button
                    size="icon"
                    variant="default"
                    className="absolute bottom-4 right-4 rounded-full h-10 w-10 bg-[#e55283] hover:bg-[#e55283]/90"
                    onClick={() => handlePlayClick(song)}
                  >
                    <Play size={20} />
                  </Button>
                )}
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="line-clamp-1">
                  {song.title || "Untitled Song"}
                </CardTitle>
                <CardDescription className="flex items-center gap-1 text-xs">
                  <Calendar size={12} />
                  {song.createdAt
                    ? new Date(song.createdAt).toLocaleDateString()
                    : "N/A"}
                  {song.duration && (
                    <>
                      <span className="mx-1">•</span>
                      <Clock size={12} />
                      {Math.floor(song.duration / 60)}:
                      {String(Math.floor(song.duration % 60)).padStart(2, "0")}
                    </>
                  )}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="line-clamp-3 text-sm mb-3 text-muted-foreground">
                  {song.lyrics || "No lyrics available."}
                </div>

                {song.tags && (
                  <div className="flex items-center gap-1 flex-wrap mt-2">
                    <Tag size={12} className="text-muted-foreground" />
                    {song.tags.split(",").map((tag, index) => (
                      <span
                        key={index}
                        className="text-xs bg-muted px-2 py-1 rounded-full"
                      >
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>

              <CardFooter>
                {/* Link to a potential detailed admin view if needed */}
                {/* <Link href={`/admin/songs/${song.id}`} className="w-full"> */}
                <Button variant="outline" className="w-full" disabled>
                  View Details (Admin)
                </Button>
                {/* </Link> */}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Song Player Dialog */}
      <Dialog open={selectedSong !== null} onOpenChange={(isOpen) => !isOpen && setSelectedSong(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSong?.title || 'Song Details'}</DialogTitle>
            {selectedSong && (
              <DialogDescription>
                Admin View • Generated with {selectedSong.modelName || 'AI'} • {new Date(selectedSong.createdAt).toLocaleDateString()}
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
    </div>
  );
}
