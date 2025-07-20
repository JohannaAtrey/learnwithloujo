// API route for teachers to fetch quizzes they've created and to create new quizzes, including metadata and questions.

import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { QuizData } from '@/types';
import { FieldValue } from 'firebase-admin/firestore';

const QUIZZES_COLLECTION = 'quizzes';

// GET: Fetch quizzes created by the logged-in teacher
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    if (decodedToken.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const teacherUid = decodedToken.uid;

    const quizzesRef = db.collection(QUIZZES_COLLECTION);
    const q = quizzesRef
      .where('creatorId', '==', teacherUid)
      .orderBy('createdAt', 'desc');

    const querySnapshot = await q.get();
    const quizzes = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Timestamps to ISO strings
        createdAt: (data.createdAt && typeof (data.createdAt as { toDate?: () => Date }).toDate === 'function')
          ? (data.createdAt as { toDate: () => Date }).toDate().toISOString()
          : new Date().toISOString(),
        updatedAt: (data.updatedAt && typeof (data.updatedAt as { toDate?: () => Date }).toDate === 'function')
          ? (data.updatedAt as { toDate: () => Date }).toDate().toISOString()
          : undefined,
      };
    }) as QuizData[];

    return NextResponse.json({ quizzes });

  } catch (error: unknown) {
    console.error('Error fetching teacher quizzes:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: 'Failed to fetch quizzes', details: errorMessage },
      { status: 500 }
    );
  }
}

// POST: Create a new quiz
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    if (decodedToken.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const teacherUid = decodedToken.uid;
    const schoolId = decodedToken.schoolId || null; 

    // Destructure potentially including timeLimitMinutes
    const { title, description, questions, timeLimitMinutes } = await request.json() as Omit<QuizData, 'id' | 'creatorId' | 'createdAt'>;

    // Basic validation
    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'Missing required fields: title and questions array' }, { status: 400 });
    }

    // Use Partial<QuizData> for Firestore write
    const newQuizData = {
      title,
      description: description || '',
      questions, 
      creatorId: teacherUid,
      schoolId: schoolId, 
      ...(timeLimitMinutes && timeLimitMinutes > 0 && { timeLimitMinutes }), 
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const quizzesRef = db.collection(QUIZZES_COLLECTION);
    const docRef = await quizzesRef.add(newQuizData);

    // Fetch the created document to get the Firestore Timestamps
    const createdQuizSnap = await docRef.get();
    const createdQuizData = createdQuizSnap.data();

    if (!createdQuizData) {
      return NextResponse.json({ error: 'Failed to fetch created quiz' }, { status: 500 });
    }

    const createdAt = createdQuizData.createdAt && typeof createdQuizData.createdAt.toDate === 'function'
      ? createdQuizData.createdAt.toDate().toISOString()
      : new Date().toISOString();
    const updatedAt = createdQuizData.updatedAt && typeof createdQuizData.updatedAt.toDate === 'function'
      ? createdQuizData.updatedAt.toDate().toISOString()
      : new Date().toISOString();

    const createdQuiz: QuizData = {
      id: docRef.id,
      title: createdQuizData.title,
      description: createdQuizData.description,
      questions: createdQuizData.questions,
      creatorId: createdQuizData.creatorId,
      schoolId: createdQuizData.schoolId,
      timeLimitMinutes: createdQuizData.timeLimitMinutes,
      createdAt,
      updatedAt,
    };

    return NextResponse.json({ quiz: createdQuiz }, { status: 201 });

  } catch (error: unknown) {
    console.error('Error creating quiz:', error);
    if (error instanceof SyntaxError) { // Handle JSON parsing errors
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: 'Failed to create quiz', details: errorMessage },
      { status: 500 }
    );
  }
}

