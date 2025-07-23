// API route to fetch all songs created by the currently authenticated user (teacher or parent).
// It queries the 'songs' collection based on the creator's ID, returning a list of their songs.

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { auth } from 'firebase-admin';
import { SongData } from '@/types';

// GET endpoint for fetching songs created by the user
export async function GET(request: Request) {
  try {
    // 1. Verify user authentication
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authorization.split('Bearer ')[1];
    const decodedToken = await auth().verifyIdToken(token);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const creatorId = decodedToken.uid;

    // 2. Fetch songs created by this user
    const songsSnapshot = await db.collection('songs')
      .where('creatorId', '==', creatorId)
      .orderBy('createdAt', 'desc')
      .get();

    if (songsSnapshot.empty) {
      return NextResponse.json({ songs: [] });
    }

    // 3. Map documents to song data objects
    const songs = songsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as SongData));

    return NextResponse.json({ songs });

  } catch (error: unknown) {
    console.error('Error fetching my songs:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
