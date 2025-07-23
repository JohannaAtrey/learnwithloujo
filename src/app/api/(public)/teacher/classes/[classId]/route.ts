// API route to manage individual classes (GET, PUT, DELETE); allows teachers to retrieve, update, or delete their own class documents with proper validation and access control.
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { ClassData } from '@/types';
import { FieldValue } from 'firebase-admin/firestore';

const CLASSES_COLLECTION = 'classes';

interface ClassUpdateData {
  [key: string]: FieldValue | string | string[] | undefined;
  updatedAt: FieldValue;
  className?: string;
  description?: string;
  studentIds?: string[];
}

// GET: Fetch a specific class by ID (might be useful for the manage students page)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ classId: string }> }
): Promise<NextResponse> {
  const params = await context.params;
  const { classId } = params;
  
  try {
    if (!classId) {
      return NextResponse.json({ error: 'Missing classId parameter' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const teacherUid = decodedToken.uid;

    const classRef = db.collection(CLASSES_COLLECTION).doc(classId);
    const classDoc = await classRef.get();

    if (!classDoc.exists) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const classData = { id: classDoc.id, ...classDoc.data() } as ClassData;

    // Ensure the teacher owns this class
    if (classData.teacherId !== teacherUid) {
      return NextResponse.json({ error: 'Forbidden: You do not own this class' }, { status: 403 });
    }

    return NextResponse.json({ class: classData });

  } catch (error: unknown) {
    console.error(`Error fetching class ${classId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: 'Failed to fetch class details', details: errorMessage },
      { status: 500 }
    );
  }
}


// PUT: Update a class (e.g., name, description, or studentIds)
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ classId: string }> }
): Promise<NextResponse> {
  const params = await context.params;
  const { classId } = params;
  
  try {
    if (!classId) {
      return NextResponse.json({ error: 'Missing classId parameter' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const teacherUid = decodedToken.uid;

    const classRef = db.collection(CLASSES_COLLECTION).doc(classId);
    const classDoc = await classRef.get();

    if (!classDoc.exists) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    if (classDoc.data()?.teacherId !== teacherUid) {
      return NextResponse.json({ error: 'Forbidden: You do not own this class' }, { status: 403 });
    }

    const { className, description, studentIds } = await request.json() as Partial<ClassData>;
    
    const updateData: ClassUpdateData = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (className !== undefined && typeof className === 'string') {
        if(className.trim() === '') return NextResponse.json({ error: 'Class name cannot be empty' }, { status: 400 });
        updateData.className = className.trim();
    }
    if (description !== undefined && typeof description === 'string') {
        updateData.description = description.trim();
    }
    if (studentIds !== undefined && Array.isArray(studentIds)) {
        // Ensure all studentIds are strings (basic validation)
        if (!studentIds.every(id => typeof id === 'string')) {
            return NextResponse.json({ error: 'Invalid studentIds array' }, { status: 400 });
        }
        updateData.studentIds = studentIds;
    }
    
    if (Object.keys(updateData).length === 1 && updateData.updatedAt) { // Only updatedAt means no actual data sent
        return NextResponse.json({ error: 'No update data provided' }, { status: 400 });
    }

    await classRef.update(updateData);
    const updatedDoc = await classRef.get(); // Get updated document

    return NextResponse.json({ class: { id: updatedDoc.id, ...updatedDoc.data() } });

  } catch (error: unknown) {
    console.error(`Error updating class ${classId}:`, error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: 'Failed to update class', details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE: Delete a class
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ classId: string }> }
): Promise<NextResponse> {
  const params = await context.params;
  const { classId } = params;
  
  try {
    if (!classId) {
      return NextResponse.json({ error: 'Missing classId parameter' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const teacherUid = decodedToken.uid;

    const classRef = db.collection(CLASSES_COLLECTION).doc(classId);
    const classDoc = await classRef.get();

    if (!classDoc.exists) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    if (classDoc.data()?.teacherId !== teacherUid) {
      return NextResponse.json({ error: 'Forbidden: You do not own this class' }, { status: 403 });
    }

    await classRef.delete();

    // TODO: Consider if deleting a class should also remove it from any student's 'classIds' array if such a field exists on user docs,
    // or remove related assignments. For now, it just deletes the class document.

    return NextResponse.json({ message: 'Class deleted successfully' });
  } catch (error: unknown) {
    console.error(`Error deleting class ${classId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: 'Failed to delete class', details: errorMessage },
      { status: 500 }
    );
  }
}