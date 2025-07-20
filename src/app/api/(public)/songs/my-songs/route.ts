// API route for teachers and parents to fetch all songs they have created, using their authenticated user ID.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin'; 
import { getSongsByCreator } from '@/lib/services/songs'; 

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (error) {
      console.error("Error verifying token:", error);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // 2. Authorization (Allow both teachers and parents)
    if (!['teacher', 'parent'].includes(decodedToken.role)) {
      return NextResponse.json({ error: 'Forbidden: User is not a teacher or parent' }, { status: 403 });
    }
    const userId = decodedToken.uid;

    // 3. Fetch Songs using the service function
    const songs = await getSongsByCreator(userId);

    // 4. Return the songs
    return NextResponse.json({ songs });

  } catch (error: unknown) {
    console.error('Error in GET /api/songs/my-songs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: 'Failed to fetch songs', details: errorMessage },
      { status: 500 }
    );
  }
}
