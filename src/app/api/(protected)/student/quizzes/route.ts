// API route for students to retrieve their assigned quizzes, including quiz details, assignment metadata, and the assigning teacher's name, with support for date formatting.

import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { QuizAssignment, QuizData } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';

const ASSIGNMENTS_COLLECTION = 'quiz_assignments';
const QUIZZES_COLLECTION = 'quizzes';
const USERS_COLLECTION = 'users'; 

interface AssignmentWithDetails {
  assignmentId: string;  // Required - always exists
  quizId: string;       // Required - always exists
  quizTitle?: string;
  quizDescription?: string;
  totalQuestions?: number;
  assignedAt?: string;
  status?: string;
  availableFrom?: string;
  dueBy?: string;
  completedAt?: string;
  score?: number;
  assignedByTeacherName?: string;
}

// Helper function to convert Firestore Timestamp or string to ISO string
const toISODateString = (date: Timestamp | string | undefined): string | undefined => {
  if (!date) return undefined;
  if (date instanceof Timestamp) {
    return date.toDate().toISOString();
  }
  if (typeof date === 'string') {
    return date;
  }
  return undefined;
};

// Helper function to get a default ISO string for required dates
const getDefaultISODateString = (date: Timestamp | string | undefined): string => {
  return toISODateString(date) || new Date().toISOString();
};

// GET: Fetch quizzes assigned to the logged-in student
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    // Ensure user is a student
    if (decodedToken.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const studentUid = decodedToken.uid;

    // 1. Fetch assignments for the student
    const assignmentsRef = db.collection(ASSIGNMENTS_COLLECTION);
    // Initial query for student's assignments
    const assignmentsQuery = assignmentsRef
      .where('studentId', '==', studentUid)
      .orderBy('assignedAt', 'desc');

    const assignmentsSnapshot = await assignmentsQuery.get();

    if (assignmentsSnapshot.empty) {
      return NextResponse.json({ assignments: [] }); // No quizzes assigned
    }

    // 2. Fetch details for each assigned quiz and the assigning teacher
    const assignmentsDataPromises = assignmentsSnapshot.docs.map(async (doc) => {
      const assignment = { id: doc.id, ...doc.data() } as QuizAssignment;

      // Fetch quiz details
      let quiz: QuizData | null = null;
      try {
        const quizDoc = await db.collection(QUIZZES_COLLECTION).doc(assignment.quizId).get();
        if (quizDoc.exists) {
          quiz = { id: quizDoc.id, ...quizDoc.data() } as QuizData;
        }
      } catch (quizError) {
        console.error(`Error fetching quiz ${assignment.quizId} for assignment ${assignment.id}:`, quizError);
      }

      // Fetch teacher details (name)
      let teacherName = 'Unknown Teacher';
      try {
        const teacherDoc = await db.collection(USERS_COLLECTION).doc(assignment.assignedByTeacherId).get();
        if (teacherDoc.exists) {
          const teacherData = teacherDoc.data();
          teacherName = teacherData?.displayName || teacherData?.name || 'Unknown Teacher';
        }
      } catch (teacherError) {
        console.error(`Error fetching teacher ${assignment.assignedByTeacherId} for assignment ${assignment.id}:`, teacherError);
      }

      // Combine assignment, quiz (if found), and teacher name
      if (quiz) {
        const assignmentWithDetails: AssignmentWithDetails = {
          assignmentId: assignment.id || '',
          quizId: quiz.id || '',
          quizTitle: quiz.title || 'Untitled Quiz',
          quizDescription: quiz.description || '',
          totalQuestions: quiz.questions?.length || 0,
          assignedAt: getDefaultISODateString(assignment.assignedAt as Timestamp | string),
          status: assignment.status || 'pending',
          availableFrom: toISODateString(assignment.availableFrom as Timestamp | string),
          dueBy: toISODateString(assignment.dueBy as Timestamp | string),
          completedAt: toISODateString(assignment.completedAt as Timestamp | string),
          score: assignment.score,
          assignedByTeacherName: teacherName,
        };
        return assignmentWithDetails;
      } else {
        console.warn(`Quiz ${assignment.quizId} not found for assignment ${assignment.id}`);
        return null;
      }
    });

    const results = await Promise.all(assignmentsDataPromises);
    const validAssignments = results.filter((result): result is AssignmentWithDetails => result !== null);

    // Return all valid assignments; frontend will handle display based on availableFrom
    return NextResponse.json({ assignments: validAssignments });

  } catch (error: unknown) {
    console.error('Error fetching student quiz assignments:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch assigned quizzes';
    return NextResponse.json(
      { error: 'Failed to fetch assigned quizzes', details: errorMessage },
      { status: 500 }
    );
  }
}
