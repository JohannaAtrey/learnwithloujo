// API route for parents to retrieve songs assigned to their children; supports optional filtering by childId and returns song details with assignment info.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';

interface Song {
  id: string;
  assignedTo: string[];
  [key: string]: unknown; 
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decoded = await auth.verifyIdToken(token);

    if (decoded.role !== 'parent') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch parent document
    const parentDoc = await db.collection('users').doc(decoded.uid).get();

    if (!parentDoc.exists) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
    }

    const parentData = parentDoc.data();
    const childrenIds = parentData?.children || [];

    // Support optional childId query param
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');

    let targetIds: string[] = [];
    if (childId) {
      // Only fetch for this child
      if (!childrenIds.map(String).includes(String(childId))) {
        return NextResponse.json({ songs: [] });
      }
      targetIds = [childId];
    } else {
      // Fetch for all children
      targetIds = childrenIds;
    }

    if (!Array.isArray(targetIds) || targetIds.length === 0) {
      return NextResponse.json({ songs: [] });
    }

    // 2. Get all song assignments for these children
    const assignmentsSnap = await db.collection('song_assignments')
      .where('studentId', 'in', targetIds)
      .get();

    const assignments = assignmentsSnap.docs.map(doc => doc.data());
    if (assignmentsSnap.empty) {
      return NextResponse.json({ songs: [] });
    }

    // 3. Group assignments by songId
    const songMap = new Map();
    for (const a of assignments) {
      if (!songMap.has(a.songId)) {
        songMap.set(a.songId, { assignedTo: [a.studentId] });
      } else {
        songMap.get(a.songId).assignedTo.push(a.studentId);
      }
    }

   // 4. Fetch song details and build result
    const songs: Song[] = [];
    for (const songId of songMap.keys()) {
      const { assignedTo } = songMap.get(songId);
      const songDoc = await db.collection('songs').doc(songId).get();
      if (songDoc.exists) {
        songs.push({
          id: songId,
          ...songDoc.data(),
          assignedTo
        });
      }
    }
    return NextResponse.json({ songs });
  } catch (error: unknown) {
    console.error('Error fetching assigned songs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
