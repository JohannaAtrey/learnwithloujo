// API route to fetch songs assigned to the currently authenticated student.
// It retrieves song assignments, fetches detailed song and teacher information,
// and returns a consolidated list, gracefully handling cases where a song or teacher might be missing.

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { auth } from 'firebase-admin';
import { AssignedSongWithTeacher, UserData, SongData } from '@/types';

// GET endpoint for fetching assigned songs for a student
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
    const studentId = decodedToken.uid;

    // 2. Fetch song assignments for the student
    const assignmentsSnapshot = await db.collection('songAssignments')
      .where('studentId', '==', studentId)
      .get();

    if (assignmentsSnapshot.empty) {
      return NextResponse.json({ songs: [] });
    }

    // 3. Fetch song and teacher details for each assignment
    const assignedSongsPromises = assignmentsSnapshot.docs.map(async (doc) => {
      const assignment = doc.data() as Omit<AssignedSongWithTeacher, 'id'>;
      
      // Fetch the full song details
      const songDoc = await db.collection('songs').doc(doc.id).get();
      // If the song doesn't exist, skip it to prevent errors
      if (!songDoc.exists) {
        console.warn(`Song with ID ${doc.id} not found, skipping.`);
        return null; 
      }
      const songData = songDoc.data() as Omit<SongData, 'id'>;

      // Fetch the teacher's name for better UI display
      const teacherDoc = await db.collection('users').doc(assignment.assignedByTeacherId).get();
      const teacherName = teacherDoc.exists ? (teacherDoc.data() as UserData)?.name ?? 'Unknown Teacher' : 'Unknown Teacher';

      // Combine data into a single object
      return {
        ...assignment,
        id: doc.id,
        ...songData,
        assignedByTeacherName: teacherName,
        localPath: songData.localPath, // Ensure the path is mapped correctly
      };
    });

    const resolvedSongs = await Promise.all(assignedSongsPromises);
    // Filter out any null results from missing songs
    const assignedSongs = resolvedSongs.filter(song => song !== null);

    return NextResponse.json({ songs: assignedSongs });

  } catch (error: unknown) {
    console.error('Error fetching assigned songs:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
