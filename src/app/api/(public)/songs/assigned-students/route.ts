// API route to retrieve a list of student UIDs assigned to a specific song, based on the songId query parameter.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const songId = searchParams.get('songId');
    if (!songId) {
      return NextResponse.json({ error: 'Missing songId' }, { status: 400 });
    }

    // Query song_assignments for this songId
    const assignmentsSnap = await db
      .collection('song_assignments')
      .where('songId', '==', songId)
      .get();

    const studentUids: string[] = [];
    assignmentsSnap.forEach(doc => {
      const data = doc.data();
      if (data.studentId) studentUids.push(data.studentId);
    });

    return NextResponse.json({ studentUids });
  } catch (error) {
    console.error('Error in GET /api/songs/assigned-students:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
