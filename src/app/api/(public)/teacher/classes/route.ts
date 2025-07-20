// API route to handle class creation and retrieval for teachers; allows authenticated teachers to create new classes or fetch their own classes from Firestore.

import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { ClassData } from '@/types';
import { FieldValue } from 'firebase-admin/firestore';

const CLASSES_COLLECTION = 'classes';

// GET: Fetch classes created by the logged-in teacher
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    if (decodedToken.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden: Only teachers can view their classes' }, { status: 403 });
    }
    const teacherUid = decodedToken.uid;

    const classesRef = db.collection(CLASSES_COLLECTION);
    const q = classesRef
      .where('teacherId', '==', teacherUid)
      .orderBy('createdAt', 'desc');

    const querySnapshot = await q.get();
    const classes = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as ClassData[];

    return NextResponse.json({ classes });

  } catch (error: unknown) {
    console.error('Error fetching teacher classes:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch classes';
    return NextResponse.json(
      { error: 'Failed to fetch classes', details: errorMessage },
      { status: 500 }
    );
  }
}

// POST: Create a new class
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    if (decodedToken.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden: Only teachers can create classes' }, { status: 403 });
    }
    const teacherUid = decodedToken.uid;
    const schoolId = decodedToken.schoolId || undefined; // Get schoolId if available

    const { className, description } = await request.json() as Partial<Pick<ClassData, 'className' | 'description'>>;

    if (!className || typeof className !== 'string' || className.trim() === '') {
      return NextResponse.json({ error: 'Missing or invalid className' }, { status: 400 });
    }

    const serverTimestamp = FieldValue.serverTimestamp();
    const newClassData: Omit<ClassData, 'id'> = {
      teacherId: teacherUid,
      className: className.trim(),
      description: description?.trim() || '',
      studentIds: [], // Initially empty
      createdAt: serverTimestamp,
      updatedAt: serverTimestamp,
      ...(schoolId && { schoolId }), // Conditionally add schoolId
    };

    const classesRef = db.collection(CLASSES_COLLECTION);
    const docRef = await classesRef.add(newClassData);

    // Fetch the created document to get the Firestore Timestamps
    const createdClassSnap = await docRef.get();
    const createdClass = {
      id: docRef.id,
      ...createdClassSnap.data(),
    } as ClassData;

    return NextResponse.json({ class: createdClass }, { status: 201 });

  } catch (error: unknown) {
    console.error('Error creating class:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to create class';
    return NextResponse.json(
      { error: 'Failed to create class', details: errorMessage },
      { status: 500 }
    );
  }
}
