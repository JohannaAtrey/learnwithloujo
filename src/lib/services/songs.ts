import { db } from '@/lib/firebase-admin';
import { SongData } from '@/types';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises'; 

const SONGS_COLLECTION = 'songs';

// Get a single song by ID
export async function getSongById(id: string): Promise<SongData | null> {
  try {
    const songRef = db.collection(SONGS_COLLECTION).doc(id);
    const songDoc = await songRef.get();
    
    if (!songDoc.exists) {
      return null;
    }
    
    return {
      id: songDoc.id,
      ...songDoc.data()
    } as SongData;
  } catch (error) {
    console.error('Error getting song:', error);
    throw error;
  }
}

// Get a song by Udio ID
export async function getSongByUdioId(udioId: string): Promise<SongData | null> {
  try {
    const songsRef = db.collection(SONGS_COLLECTION);
    const q = songsRef.where('udioId', '==', udioId).limit(1);
    const querySnapshot = await q.get();
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as SongData;
  } catch (error) {
    console.error('Error getting song by udioId:', error);
    throw error;
  }
}

// Get a song by Work ID (for checking status of pending songs)
export async function getSongByWorkId(workId: string): Promise<SongData | null> {
  try {
    const songsRef = db.collection(SONGS_COLLECTION);
    const q = songsRef.where('workId', '==', workId).limit(1);
    const querySnapshot = await q.get();

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as SongData;
  } catch (error) {
    console.error('Error getting song by workId:', error);
    throw error;
  }
}

// Create a new song record for a pending generation
// Takes minimal data required initially
export async function createPendingSong(
  pendingSongData: Pick<SongData, 'workId' | 'prompt' | 'status' | 'creatorId' | 'creatorEmail' | 'schoolId' | 'createdAt'>
): Promise<SongData> {
  try {
    // We might want to check if a song with this workId already exists in 'processing' state?
    // For now, assume we create a new one each time generate is called.
    const songsRef = db.collection(SONGS_COLLECTION);
    const docRef = await songsRef.add({
      ...pendingSongData,
      // Ensure required fields from SongData that are optional in Pick are handled if needed
      // e.g., title could default to "Processing..." or be derived from prompt
      title: `Processing: ${pendingSongData.prompt?.substring(0, 30) ?? 'New Song'}...`,
      // Set other fields to null or default values as appropriate for 'processing' state
      udioId: null,
      lyrics: null,
      tags: null,
      imageUrl: null,
      audioUrl: null, // No URLs yet
      localPath: null, // No local path yet
      duration: null,
      modelName: null,
      updatedAt: pendingSongData.createdAt, // Initially same as createdAt
      udioCreateTime: null,
      errorMessage: null,
      imported: false,
    });

    // Return the full structure, including the generated ID and defaults
    return {
      id: docRef.id,
      ...pendingSongData,
      title: `Processing: ${pendingSongData.prompt?.substring(0, 30) ?? 'New Song'}...`,
      udioId: undefined, // Explicitly undefined as it's optional and not set yet
      lyrics: undefined,
      tags: undefined,
      imageUrl: undefined,
      audioUrl: undefined,
      localPath: undefined,
      duration: undefined,
      modelName: undefined,
      updatedAt: pendingSongData.createdAt,
      udioCreateTime: undefined,
      errorMessage: undefined,
      imported: false,
    } as SongData; // Cast needed because we are building the full object

  } catch (error) {
    console.error('Error creating pending song:', error);
    throw error;
  }
}


// Create a new song (likely used by import or when song is fully processed by status check)
export async function createSong(songData: Omit<SongData, 'id' | 'status'>): Promise<SongData> {
  try {
    // Check if song with this udioId already exists
    if (songData.udioId) {
      const existingSong = await getSongByUdioId(songData.udioId);
      if (existingSong) {
        throw new Error('Song with this udioId already exists');
      }
    }
    
    const songsRef = db.collection(SONGS_COLLECTION);
    // Ensure status is set correctly, default to 'complete' if not provided?
    // Or should createSong only be called when status is known (e.g. 'complete' from polling)?
    // Let's assume createSong is for already completed/imported songs.
    const dataToSave = {
      ...songData,
      status: 'complete', // Assume complete if using createSong directly
      createdAt: songData.createdAt || new Date().toISOString(), // Use provided or set new
      updatedAt: new Date().toISOString(),
    };

    const docRef = await songsRef.add(dataToSave);

    return {
      id: docRef.id,
      ...dataToSave // Return the data that was actually saved
    } as SongData;
  } catch (error) {
    console.error('Error creating song:', error);
    throw error;
  }
}

// Update a song
export async function updateSong(id: string, updates: Partial<SongData>): Promise<void> {
  try {
    const songRef = db.collection(SONGS_COLLECTION).doc(id);
    await songRef.update({
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating song:', error);
    throw error;
  }
}

// Delete a song
export async function deleteSong(id: string): Promise<void> {
  try {
    const songRef = db.collection(SONGS_COLLECTION).doc(id);
    await songRef.delete();
  } catch (error) {
    console.error('Error deleting song:', error);
    throw error;
  }
}

// Get songs by creator ID
export async function getSongsByCreator(creatorId: string): Promise<SongData[]> {
  try {
    const songsRef = db.collection(SONGS_COLLECTION);
    const q = songsRef
      .where('creatorId', '==', creatorId)
      .orderBy('createdAt', 'desc');
    const querySnapshot = await q.get();
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SongData[];
  } catch (error) {
    console.error('Error getting songs by creator:', error);
    throw error;
  }
}

const ensureSongsDirectory = async (): Promise<string> => {
  const songsDir = path.join(process.cwd(), 'public', 'songs');
  try {
    await mkdir(songsDir, { recursive: true });
    return songsDir;
  } catch (error) {
    console.error(`Error creating songs directory:`, error);
    throw new Error('Failed to ensure songs directory exists.');
  }
};

export const downloadAndSaveSong = async (audioUrl: string, filenameBase: string): Promise<string> => {
  if (!audioUrl) {
    throw new Error('Audio URL is missing');
  }

  const songsDir = await ensureSongsDirectory();
  const filename = `${filenameBase}.mp3`; 
  const filePath = path.join(songsDir, filename);
  const webPath = `/songs/${filename}`; 

  try {
    const response = await fetch(audioUrl);
    if (!response.ok || !response.body) {
      throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
    }

    const audioData = await response.arrayBuffer();
    await writeFile(filePath, Buffer.from(audioData));
    return webPath;
  } catch (error) {
    console.error(`Error downloading/saving audio:`, error);
    throw new Error('Failed to download or save song audio.');
  }
};