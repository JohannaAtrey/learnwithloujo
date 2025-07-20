// API route to fetch all songs from the Firestore database; intended for administrative or internal use.

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

// GET endpoint to fetch all songs
export async function GET() {
  try {
    const songsSnapshot = await db.collection('songs').get();
    const songs = songsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return NextResponse.json(songs);
  } catch (error: Error | unknown) {
    console.error('Error fetching songs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to load songs';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
