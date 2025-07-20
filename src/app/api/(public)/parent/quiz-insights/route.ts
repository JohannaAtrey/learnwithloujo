// API route for parents to fetch detailed insights on completed quiz assignments for their linked children, including quiz titles, scores, and teacher/student names.

import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { QuizAssignment } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';

const ASSIGNMENTS_COLLECTION = 'quiz_assignments';
const QUIZZES_COLLECTION = 'quizzes';
const USERS_COLLECTION = 'users'; 

// Define types for our data
interface QuizInsight {
  assignmentId: string;
  quizId: string;
  quizTitle: string;
  studentId: string;
  studentName: string;
  assignedByTeacherName: string;
  completedAt?: string;
  score?: number;
  totalQuestions?: number;
  submittedAnswers?: unknown;
}

// Type guard for Timestamp
function isTimestamp(value: unknown): value is Timestamp {
  return value instanceof Timestamp;
}

// GET: Fetch quiz assignment results for children linked to the logged-in parent
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    // Ensure user is a parent
    if (decodedToken.role !== 'parent') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const parentUid = decodedToken.uid;

    // Fetch parent document
    const parentDoc = await db.collection('users').doc(parentUid).get();

    if (!parentDoc.exists) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
    }

    const parentData = parentDoc.data();
    const childrenIds = parentData?.children.filter((child: string) => child === studentId) || [];

    if (childrenIds.length === 0) {
      return NextResponse.json({ insights: [] });
    }

    // Fetch completed assignments for all linked children
    const assignmentsRef = db.collection(ASSIGNMENTS_COLLECTION);
    const assignmentsQuery = assignmentsRef
      .where('studentId', 'in', childrenIds)
      .where('status', '==', 'completed') // Only fetch completed quizzes
      .orderBy('completedAt', 'desc'); // Show most recently completed first

    const assignmentsSnapshot = await assignmentsQuery.get();

    if (assignmentsSnapshot.empty) {
      return NextResponse.json({ insights: [] }); // No completed quizzes for children
    }

    // Fetch details for each assignment (quiz title, teacher name, student name)
    const insightsPromises = assignmentsSnapshot.docs.map(async (doc) => {
      const assignment = { id: doc.id, ...doc.data() } as QuizAssignment;

      // Fetch quiz title
      let quizTitle = 'Unknown Quiz';
      try {
        const quizDoc = await db.collection(QUIZZES_COLLECTION).doc(assignment.quizId).get();
        if (quizDoc.exists) {
          quizTitle = quizDoc.data()?.title || 'Unknown Quiz';
        }
      } catch { console.log("Error fetching quiz title.") }

      // Fetch teacher name
      let teacherName = 'Unknown Teacher';
      try {
        const teacherDoc = await db.collection(USERS_COLLECTION).doc(assignment.assignedByTeacherId).get();
        if (teacherDoc.exists) {
          teacherName = teacherDoc.data()?.displayName || teacherDoc.data()?.name || 'Unknown Teacher';
        }
      } catch { console.log("Error fetching teacher name.") }
      
      // Fetch student name
      let studentName = 'Unknown Student';
       try {
        const studentDoc = await db.collection(USERS_COLLECTION).doc(assignment.studentId).get();
        if (studentDoc.exists) {
          studentName = studentDoc.data()?.displayName || studentDoc.data()?.name || 'Unknown Student';
        }
      } catch { console.log("Error fetching student name.") }

      const completedAt = assignment.completedAt 
        ? (isTimestamp(assignment.completedAt)
            ? assignment.completedAt.toDate().toISOString() 
            : typeof assignment.completedAt === 'string' 
              ? assignment.completedAt 
              : undefined)
        : undefined;

      return {
        assignmentId: assignment.id,
        quizId: assignment.quizId,
        quizTitle: quizTitle,
        studentId: assignment.studentId,
        studentName: studentName, 
        assignedByTeacherName: teacherName,
        completedAt,
        score: assignment.score,
        totalQuestions: assignment.totalQuestions,
        submittedAnswers: assignment.submittedAnswers,
      } as QuizInsight;
    });

    const insights = await Promise.all(insightsPromises);

    return NextResponse.json({ insights });

  } catch (error: unknown) {
    console.error('Error fetching parent quiz insights:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch quiz insights';
    return NextResponse.json(
      { error: 'Failed to fetch quiz insights', details: errorMessage },
      { status: 500 }
    );
  }
}
