// API route for assigning a quiz to multiple students; allows authenticated teachers to batch-create quiz assignments with optional availability and due dates.
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const ASSIGNMENTS_COLLECTION = 'quiz_assignments';
const QUIZZES_COLLECTION = 'quizzes';

// Database types for quiz assignment
interface QuizAssignmentData {
  quizId: string;
  studentId: string;
  assignedByTeacherId: string;
  assignedAt: FieldValue;
  status: 'assigned' | 'completed';
  totalQuestions: number;
  availableFrom?: Timestamp;
  dueBy?: Timestamp;
  completedAt?: Timestamp;
  score?: number;
  submittedAnswers?: Array<{ questionId: string; selectedOptionIndex: number }>;
  submittedLate?: boolean;
}

// POST: Assign a quiz to one or more students
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    if (decodedToken.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden: Only teachers can assign quizzes' }, { status: 403 });
    }
    const teacherUid = decodedToken.uid;

    const { quizId, studentIds, availableFrom, dueBy } = await request.json();

    // Validation
    if (!quizId || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: 'Missing required fields: quizId and studentIds array' }, { status: 400 });
    }
    // Optional: Add validation for availableFrom and dueBy if they are provided (e.g., valid ISO strings)

    // Optional: Verify the quiz exists and belongs to the teacher?
    const quizDoc = await db.collection(QUIZZES_COLLECTION).doc(quizId).get();
    if (!quizDoc.exists || quizDoc.data()?.creatorId !== teacherUid) {
       return NextResponse.json({ error: 'Quiz not found or not owned by teacher' }, { status: 404 });
    }
    const quizData = quizDoc.data();
    const totalQuestions = quizData?.questions?.length || 0; // Get total questions for scoring later

    // Create assignments in a batch write
    const batch = db.batch();
    const assignmentsRef = db.collection(ASSIGNMENTS_COLLECTION);
    const timestamp = FieldValue.serverTimestamp();

    studentIds.forEach((studentId: string) => {
      const newAssignmentRef = assignmentsRef.doc();
      const assignmentData: QuizAssignmentData = {
        quizId: quizId,
        studentId: studentId,
        assignedByTeacherId: teacherUid,
        assignedAt: timestamp,
        status: 'assigned',
        totalQuestions: totalQuestions,
      };

      if (availableFrom) {
        assignmentData.availableFrom = Timestamp.fromDate(new Date(availableFrom));
      }
      if (dueBy) {
        assignmentData.dueBy = Timestamp.fromDate(new Date(dueBy));
      }
      
      if (availableFrom && new Date(availableFrom) > new Date()) {
        // assignmentData.status = 'scheduled';
      }

      batch.set(newAssignmentRef, assignmentData);
    });

    await batch.commit();

    return NextResponse.json({ message: `Quiz assigned to ${studentIds.length} student(s).` }, { status: 201 });

  } catch (error: unknown) {
    console.error('Error assigning quiz:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to assign quiz';
    return NextResponse.json(
      { error: 'Failed to assign quiz', details: errorMessage },
      { status: 500 }
    );
  }
}
