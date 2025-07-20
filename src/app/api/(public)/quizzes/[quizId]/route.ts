// API route to retrieve full details of a specific quiz by ID, including its questions; requires authentication but allows any user role to access.

import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { QuizData } from '@/types';

// Custom type for Firebase errors
interface FirebaseError extends Error {
  code?: string;
}

const QUIZZES_COLLECTION = 'quizzes';

// GET: Fetch details of a specific quiz by its ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ quizId: string }> }
): Promise<NextResponse> {
  const params = await context.params;
  const { quizId } = params;
  
  try {
    if (!quizId) {
      return NextResponse.json({ error: 'Missing quizId parameter' }, { status: 400 });
    }

    // Authentication: Ensure user is logged in (any role can view quiz details for now)
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    // Verify token just to ensure user is logged in
    await auth.verifyIdToken(token); 

    // Fetch quiz document
    const quizDoc = await db.collection(QUIZZES_COLLECTION).doc(quizId).get();

    if (!quizDoc.exists) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const quizData = { id: quizDoc.id, ...quizDoc.data() } as QuizData;

    // Return the full quiz data (including questions)
    return NextResponse.json({ quiz: quizData });

  } catch (error: unknown) {
    console.error(`Error fetching quiz ${quizId}:`, error);
    if (error instanceof Error && (error as FirebaseError).code === 'auth/id-token-expired' || 
        (error as FirebaseError).code === 'auth/argument-error') {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch quiz details';
    return NextResponse.json(
      { error: 'Failed to fetch quiz details', details: errorMessage },
      { status: 500 }
    );
  }
}