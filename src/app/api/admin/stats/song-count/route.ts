// API route for admins to retrieve the total count of songs in the database.
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';

const SONGS_COLLECTION = 'songs';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const songsCountSnapshot = await db.collection(SONGS_COLLECTION).count().get();
    const totalSongs = songsCountSnapshot.data().count;

    return NextResponse.json({ totalSongs });

  } catch (error: unknown) {
    console.error('Error fetching total song count:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch song count';
    return NextResponse.json(
      { error: 'Failed to fetch song count', details: errorMessage },
      { status: 500 }
    );
  }
}
