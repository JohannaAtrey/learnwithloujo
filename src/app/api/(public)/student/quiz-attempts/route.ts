// API route for students to submit answers to a quiz assignment; verifies ownership, calculates score, records submission details (including lateness), and updates Firestore.
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { QuizAssignment, QuizData, QuizQuestion } from '@/types';

const ASSIGNMENTS_COLLECTION = 'quiz_assignments';
const QUIZZES_COLLECTION = 'quizzes';

interface QuizAnswer {
  questionId: string;
  selectedOptionIndex: number;
}

interface UpdateData {
  [key: string]: FieldValue | string | number | boolean | QuizAnswer[];
  status: 'completed';
  score: number;
  completedAt: FieldValue;
  submittedAnswers: QuizAnswer[];
  submittedLate: boolean;
}

// POST: Submit quiz answers and record score
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    // Ensure user is a student
    if (decodedToken.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden: Only students can submit quiz attempts' }, { status: 403 });
    }
    const studentUid = decodedToken.uid;

    const { assignmentId, answers } = await request.json();

    // Validation
    if (!assignmentId || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Missing required fields: assignmentId and answers array' }, { status: 400 });
    }

    // 1. Fetch the assignment document
    const assignmentRef = db.collection(ASSIGNMENTS_COLLECTION).doc(assignmentId);
    const assignmentDoc = await assignmentRef.get();

    if (!assignmentDoc.exists) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }
    const assignmentData = assignmentDoc.data() as QuizAssignment;

    // 2. Verify student owns this assignment and it's not already completed
    if (assignmentData.studentId !== studentUid) {
      return NextResponse.json({ error: 'Forbidden: Assignment does not belong to this student' }, { status: 403 });
    }
    if (assignmentData.status === 'completed') {
      return NextResponse.json({ error: 'Quiz already completed' }, { status: 400 });
    }

    // 3. Fetch the original quiz to get correct answers
    const quizDoc = await db.collection(QUIZZES_COLLECTION).doc(assignmentData.quizId).get();
    if (!quizDoc.exists) {
      // This shouldn't happen if assignment exists, but handle defensively
      return NextResponse.json({ error: 'Quiz associated with assignment not found' }, { status: 500 });
    }
    const quizData = quizDoc.data() as QuizData;
    const questions = quizData.questions || [];

    // 4. Calculate score
    let correctAnswersCount = 0;
    questions.forEach((q: QuizQuestion) => {
      const studentAnswer = answers.find((a: QuizAnswer) => a.questionId === q.id);
      if (studentAnswer && studentAnswer.selectedOptionIndex === q.correctOptionIndex) {
        correctAnswersCount++;
      }
    });

    // 5. Update the assignment document, including the submitted answers
    const completedTime = FieldValue.serverTimestamp(); 
    let submittedLate = false;

    if (assignmentData.dueBy) {
      const dueDate = new Date(assignmentData.dueBy); 
      if (new Date() > dueDate) {
        submittedLate = true;
      }
    }

    const updateData: UpdateData = {
      status: 'completed',
      score: correctAnswersCount,
      completedAt: completedTime,
      submittedAnswers: answers,
      submittedLate: submittedLate, 
    };

    await assignmentRef.update(updateData);

    return NextResponse.json({ 
      message: 'Quiz submitted successfully', 
      score: correctAnswersCount, 
      totalQuestions: questions.length 
    });

  } catch (error: unknown) {
    console.error('Error submitting quiz attempt:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to submit quiz attempt';
    return NextResponse.json(
      { error: 'Failed to submit quiz attempt', details: errorMessage },
      { status: 500 }
    );
  }
}
