// API route for students to retrieve all songs assigned to them, including song details and assigning teacher's name, ordered by assignment date.

import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { getSongById } from '@/lib/services/songs'; 
import { AssignedSongWithTeacher } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authentication & Authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // Ensure user is a student
    if (decodedToken.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden: User is not a student' }, { status: 403 });
    }
    const studentUid = decodedToken.uid;

    // 2. Fetch Song Assignments for the student
    const assignmentsRef = db.collection('song_assignments');
    const assignmentsQuery = assignmentsRef
      .where('studentId', '==', studentUid)
      .orderBy('assignedAt', 'desc'); 

    const assignmentsSnapshot = await assignmentsQuery.get();

    if (assignmentsSnapshot.empty) {
      return NextResponse.json({ songs: [] }); 
    }

    // 3. Fetch Song Details for each assignment
    const assignedSongsPromises = assignmentsSnapshot.docs.map(async (doc) => {
      const assignmentData = doc.data();
      const songId = assignmentData.songId;
      const teacherId = assignmentData.assignedByTeacherId; 

      if (songId && teacherId) {
        // Fetch the full song details
        const song = await getSongById(songId);
        
        // Fetch teacher details (just name for now)
        let teacherName = 'Unknown Teacher';
        try {
          const teacherDoc = await db.collection('users').doc(teacherId).get();
          if (teacherDoc.exists) {
            teacherName = teacherDoc.data()?.displayName || teacherDoc.data()?.name || 'Unknown Teacher';
          }
        } catch (teacherError) {
          console.error(`Error fetching teacher ${teacherId} for assignment ${doc.id}:`, teacherError);
        }

        // Return combined data if song found and complete
        if (song && song.status === 'complete') {
          return { 
            ...song, 
            assignedByTeacherId: teacherId, 
            assignedByTeacherName: teacherName,
            assignedAt: assignmentData.assignedAt 
          };
        }
      }
      return null;
    });

    const assignedSongsResults = await Promise.all(assignedSongsPromises);

    // Filter out any null results (e.g., song deleted or not found)
    const assignedSongs = assignedSongsResults.filter(song => song !== null) as AssignedSongWithTeacher[];

    // 4. Return the list of assigned songs with teacher info
    return NextResponse.json({ songs: assignedSongs });

  } catch (err: unknown) {
    console.error('Error in GET /api/songs/student:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: 'Failed to fetch assigned songs', details: errorMessage },
      { status: 500 }
    );
  }
}
