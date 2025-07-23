// API route to retrieve details of a specific quiz assignment by ID; accessible to the assigned student or the assigning teacher, with authentication and authorization checks.
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { QuizAssignment } from '@/types'; // Only need assignment type here

const ASSIGNMENTS_COLLECTION = 'quiz_assignments';

interface FirebaseError extends Error {
  code?: string;
}

// GET: Fetch details of a specific quiz assignment (including submitted answers)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ assignmentId: string }> }
): Promise<NextResponse> {
  const params = await context.params;
  const { assignmentId } = params;
  
  try {
    if (!assignmentId) {
      return NextResponse.json({ error: 'Missing assignmentId parameter' }, { status: 400 });
    }

    // Authentication: Ensure user is logged in
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid; 

    // Fetch assignment document
    const assignmentRef = db.collection(ASSIGNMENTS_COLLECTION).doc(assignmentId);
    const assignmentDoc = await assignmentRef.get();

    if (!assignmentDoc.exists) {
      return NextResponse.json({ error: 'Quiz assignment not found' }, { status: 404 });
    }

    const assignmentData = { id: assignmentDoc.id, ...assignmentDoc.data() } as QuizAssignment;

    // Authorization: 
    // Allow student who owns the assignment OR the teacher who assigned it.
    // Parent access could be added here too if needed, by checking parent-child relationships.
    const isOwnerStudent = assignmentData.studentId === userId;
    const isAssigningTeacher = assignmentData.assignedByTeacherId === userId && decodedToken.role === 'teacher';

    if (!isOwnerStudent && !isAssigningTeacher) {
       return NextResponse.json({ error: 'Forbidden: Not authorized to view this assignment' }, { status: 403 });
    }

    // Return the full assignment data (including submittedAnswers if present)
    return NextResponse.json({ assignment: assignmentData });

  } catch (error: unknown) {
    console.error(`Error fetching assignment ${assignmentId}:`, error);
    if (error instanceof Error && (error as FirebaseError).code === 'auth/id-token-expired' || 
        (error as FirebaseError).code === 'auth/argument-error') {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch assignment details';
    return NextResponse.json(
      { error: 'Failed to fetch assignment details', details: errorMessage },
      { status: 500 }
    );
  }
}