// API route for teachers to fetch completed quiz attempts they assigned, including quiz titles, student names, scores, and timestamps.
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { QuizAssignment } from '@/types'; 

const ASSIGNMENTS_COLLECTION = 'quiz_assignments';
const QUIZZES_COLLECTION = 'quizzes';
const USERS_COLLECTION = 'users';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    if (decodedToken.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden: Only teachers can view quiz attempts' }, { status: 403 });
    }
    const teacherUid = decodedToken.uid;

    // 1. Fetch completed assignments made by this teacher
    const assignmentsRef = db.collection(ASSIGNMENTS_COLLECTION);
    const assignmentsQuery = assignmentsRef
      .where('assignedByTeacherId', '==', teacherUid)
      .where('status', '==', 'completed')
      .orderBy('completedAt', 'desc'); 

    const assignmentsSnapshot = await assignmentsQuery.get();

    if (assignmentsSnapshot.empty) {
      return NextResponse.json({ attempts: [] });
    }

    // 2. For each assignment, fetch quiz title and student name
    const attemptsPromises = assignmentsSnapshot.docs.map(async (doc) => {
      const assignment = { id: doc.id, ...doc.data() } as QuizAssignment;

      let quizTitle = 'Unknown Quiz';
      try {
        const quizDoc = await db.collection(QUIZZES_COLLECTION).doc(assignment.quizId).get();
        if (quizDoc.exists) {
          quizTitle = quizDoc.data()?.title || 'Unknown Quiz';
        }
      } catch (e) { console.error(`Error fetching quiz ${assignment.quizId}`, e); }

      let studentName = 'Unknown Student';
      try {
        const studentDoc = await db.collection(USERS_COLLECTION).doc(assignment.studentId).get();
        if (studentDoc.exists) {
          studentName = studentDoc.data()?.displayName || studentDoc.data()?.name || 'Unknown Student';
        }
      } catch (e) { console.error(`Error fetching student ${assignment.studentId}`, e); }
      
      // Convert Timestamps to ISO strings
      const formatTimestamp = (timestamp: unknown): string | undefined => {
        if (timestamp && typeof (timestamp as { toDate?: () => Date }).toDate === 'function') {
          return (timestamp as { toDate: () => Date }).toDate().toISOString();
        }
        return typeof timestamp === 'string' ? timestamp : undefined;
      };

      return {
        assignmentId: assignment.id,
        quizId: assignment.quizId,
        quizTitle,
        studentId: assignment.studentId,
        studentName,
        completedAt: formatTimestamp(assignment.completedAt),
        score: assignment.score,
        totalQuestions: assignment.totalQuestions,
        submittedLate: assignment.submittedLate,
        // submittedAnswers: assignment.submittedAnswers, 
      };
    });

    const attempts = await Promise.all(attemptsPromises);

    return NextResponse.json({ attempts });

  } catch (error: unknown) {
    console.error('Error fetching teacher quiz attempts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: 'Failed to fetch quiz attempts', details: errorMessage },
      { status: 500 }
    );
  }
}
