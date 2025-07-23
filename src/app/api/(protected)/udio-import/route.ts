// API route to import completed songs from the Udio feed, download their audio files, save them locally, and create song records in Firestore if they don't already exist.

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSongByUdioId, createSong } from '@/lib/services/songs';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

// Make sure the songs directory exists
const ensureSongsDirectory = async () => {
  const songsDir = path.join(process.cwd(), 'public', 'songs');
  try {
    await mkdir(songsDir, { recursive: true });
    return songsDir;
  } catch (error) {
    console.error(`Error creating songs directory:`, error);
    throw error;
  }
};

// Function to download and save a song
const processSongFromUdio = async (songData: Record<string, unknown>) => {
  try {
    if (!songData.audio_url || typeof songData.audio_url !== 'string') {
      throw new Error('Song data missing audio URL');
    }
    
    const songsDir = await ensureSongsDirectory();
    const filename = `${songData.id as string}.mp3`;
    const filePath = path.join(songsDir, filename);
    const webPath = `/songs/${filename}`;
    
    if (!existsSync(filePath)) {
      const response = await fetch(songData.audio_url as string);
      
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
      }
      
      const audioData = await response.arrayBuffer();
      await writeFile(filePath, Buffer.from(audioData));
    }
    
    const songDocument = {
      udioId: songData.id as string,
      workId: songData.id as string,
      title: (songData.title as string) || 'Untitled Song',
      lyrics: (songData.prompt as string) || '',
      tags: (songData.tags as string) || '',
      imageUrl: (songData.image_url as string) || '',
      audioUrl: songData.audio_url as string,
      localPath: webPath,
      duration: (songData.duration as number) || 0,
      modelName: (songData.model_name as string) || 'Udio AI',
      createdAt: new Date().toISOString(),
      udioCreateTime: songData.created_at ? new Date(songData.created_at as string).toISOString() : new Date().toISOString(),
      imported: true,
      creatorId: null
    };
    
    const existingSong = await getSongByUdioId(songDocument.udioId);
    if (existingSong) {
      return { ...existingSong, alreadyExists: true };
    }
    
    const song = await createSong(songDocument);
    return { ...song, newlyImported: true };
  } catch (error) {
    console.error(`Error processing song:`, error);
    throw error;
  }
};

export async function GET(): Promise<NextResponse> {
  try {
    const apiKey = process.env.UDIO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing API key configuration' },
        { status: 500 }
      );
    }
    
    const feedUrl = 'https://udioapi.pro/api/v2/feed';
    const feedResponse = await fetch(feedUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      next: { revalidate: 0 }
    });
    
    if (!feedResponse.ok) {
      throw new Error(`Udio API returned status ${feedResponse.status}`);
    }
    
    const feedData = await feedResponse.json();
    if (feedData.code !== 200 || !feedData.data?.response_data) {
      return NextResponse.json(
        { error: 'Invalid response from Udio API' }, 
        { status: 500 }
      );
    }
    
    const completedSongs = feedData.data.response_data.filter(
      (s: unknown) => typeof s === 'object' && s !== null && (s as { status?: string; audio_url?: string }).status === 'complete' && (s as { audio_url?: string }).audio_url
    );
    
    if (completedSongs.length === 0) {
      return NextResponse.json({ message: 'No completed songs found in Udio' });
    }
    
    const songsToProcess = completedSongs.slice(0, 3);
    const results = [];
    
    for (const song of songsToProcess) {
      try {
        const result = await processSongFromUdio(song);
        results.push(result);
      } catch (error: unknown) {
        results.push({
          id: (song as { id?: string }).id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      processed: results.length,
      results
    });
  } catch (error: unknown) {
    console.error('Error in Udio import:', error);
    return NextResponse.json(
      { 
        error: 'Failed to import songs', 
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
