// API route allowing teachers or parents to assign a completed song to one or more students, with relationship checks and batch Firestore writes to prevent duplicate assignments.

import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { getSongById } from '@/lib/services/songs'; 
import { FieldValue } from 'firebase-admin/firestore';

// Helper function to check if a teacher manages a student
async function teacherManagesStudent(teacherUid: string, studentUid: string): Promise<boolean> {
  const relationshipRef = db.collection('teacher_student_relationships');
  const relationshipQuery = relationshipRef
    .where('teacherId', '==', teacherUid)
    .where('studentId', '==', studentUid)
    .limit(1);

  const snapshot = await relationshipQuery.get();
  return !snapshot.empty;
}

// Helper function to check if a parent is related to a student
async function parentIsRelatedToStudent(parentUid: string, studentUid: string): Promise<boolean> {
  const relationshipRef = db.collection('parent_student_relationships');
  const relationshipQuery = relationshipRef
    .where('parentId', '==', parentUid)
    .where('studentId', '==', studentUid)
    .limit(1);

  const snapshot = await relationshipQuery.get();
  return !snapshot.empty;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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

    // Allow both teachers and parents
    if (!['teacher', 'parent'].includes(decodedToken.role)) {
      return NextResponse.json({ error: 'Forbidden: User is not a teacher or parent' }, { status: 403 });
    }
    const userId = decodedToken.uid;

    // 2. Parse Request Body
    const body = await request.json();
    const { songId, studentUids } = body;

    if (!songId || !Array.isArray(studentUids) || studentUids.length === 0) {
      return NextResponse.json({ error: 'Missing required fields: songId or studentUids array' }, { status: 400 });
    }

    // 3. Verify Song Ownership
    const song = await getSongById(songId);
    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }
    if (song.creatorId !== userId) {
      return NextResponse.json({ error: 'Forbidden: You did not create this song' }, { status: 403 });
    }
    if (song.status !== 'complete') {
      return NextResponse.json({ error: 'Cannot assign song: Song processing not complete' }, { status: 400 });
    }

    // 4. Process Assignments (Batch Write)
    const batch = db.batch();
    const assignmentsCollection = db.collection('song_assignments');
    const successfulAssignments: string[] = [];
    const failedAssignments: { studentUid: string; reason: string }[] = [];

    for (const studentUid of studentUids) {
      if (typeof studentUid !== 'string') continue;

      // Verify relationship based on role
      let hasRelationship = false;
      if (decodedToken.role === 'teacher') {
        hasRelationship = await teacherManagesStudent(userId, studentUid);
      } else {
        hasRelationship = await parentIsRelatedToStudent(userId, studentUid);
      }

      if (!hasRelationship) {
        failedAssignments.push({ 
          studentUid, 
          reason: decodedToken.role === 'teacher' 
            ? 'Teacher does not manage this student' 
            : 'Parent is not related to this student' 
        });
        continue;
      }

      // Check if assignment already exists
      const existingAssignmentSnap = await assignmentsCollection
        .where('songId', '==', songId)
        .where('studentId', '==', studentUid)
        .limit(1)
        .get();

      if (!existingAssignmentSnap.empty) {
        failedAssignments.push({ studentUid, reason: 'Song already assigned to this student' });
        continue;
      }

      // Create new assignment document
      const newAssignmentRef = assignmentsCollection.doc();
      batch.set(newAssignmentRef, {
        songId: songId,
        studentId: studentUid,
        assignedByTeacherId: userId, // Keep field name for backward compatibility
        assignedByRole: decodedToken.role, // Add role for future use
        assignedAt: FieldValue.serverTimestamp(),
      });
      successfulAssignments.push(studentUid);
    }

    // 5. Commit Batch
    await batch.commit();

    // 6. Return Response
    type ResponsePayload = {
      message: string;
      successfulCount: number;
      failedCount: number;
      failures?: { studentUid: string; reason: string }[];
    };

    const responsePayload: ResponsePayload = {
      message: `Processed ${studentUids.length} assignment requests.`,
      successfulCount: successfulAssignments.length,
      failedCount: failedAssignments.length,
    };
    if (failedAssignments.length > 0) {
      responsePayload.failures = failedAssignments;
    }

    return NextResponse.json(responsePayload);

  } catch (error: unknown) {
    console.error('Error in POST /api/songs/assign:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: 'Failed to assign songs', details: errorMessage },
      { status: 500 }
    );
  }
}
