// API route for teachers to manage their student relationships: 
// - GET retrieves a list of students managed by the teacher
// - POST adds, removes, or creates a student and links them
// - DELETE removes a student-teacher relationship by ID
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase-admin';
import {
  addStudentToTeacher,
  removeStudentFromTeacher,
  createStudentAndAddToTeacher
} from '@/lib/services/teacher-student';
import { getTeacherStudents } from '@/lib/services/student-service';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    if (decodedToken.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden: User is not a teacher' }, { status: 403 });
    }

    const teacherId = decodedToken.uid;
    const students = await getTeacherStudents(teacherId);

    return NextResponse.json({ students });

  } catch (error: unknown) {
    console.error('Error fetching students for teacher:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: 'Failed to fetch students', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    if (decodedToken.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden: User is not a teacher' }, { status: 403 });
    }

    const teacherEmail = decodedToken.email;
    const body = await request.json();
    const { action, studentEmail, password, displayName } = body;

    if (!action || !studentEmail) {
      return NextResponse.json({ error: 'Missing action or studentEmail in request body' }, { status: 400 });
    }

    if (action === 'add') {
      const result = await addStudentToTeacher(teacherEmail || '', studentEmail || '');
      return NextResponse.json({ message: result.message }, { status: 201 });
    } else if (action === 'remove') {
      const result = await removeStudentFromTeacher(teacherEmail || '', studentEmail || '');
      return NextResponse.json({ message: result.message }, { status: 200 });
    } else if (action === 'create') {
      if (!password || !displayName) {
        return NextResponse.json({ error: 'Missing password or displayName for create action' }, { status: 400 });
      }
      const result = await createStudentAndAddToTeacher(teacherEmail || '', studentEmail, password, displayName);
      return NextResponse.json({ message: result.message, email: result.email }, { status: 201 });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('Error in teacher/students POST:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process request';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    if (decodedToken.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden: User is not a teacher' }, { status: 403 });
    }

    const { relationshipId } = await request.json();
    if (!relationshipId) {
      return NextResponse.json({ error: 'Missing relationshipId in request body' }, { status: 400 });
    }

    // Fetch teacherEmail and studentEmail based on relationshipId
    // Assuming relationshipId is the studentId
    const relationshipDoc = await db.collection('teacher_students').doc(relationshipId).get();

    if (!relationshipDoc.exists) {
      return NextResponse.json({ error: 'Relationship not found' }, { status: 404 });
    }

    const relationshipData = relationshipDoc.data();
    const teacherEmail = relationshipData?.teacherEmail;
    const studentEmail = relationshipData?.studentEmail;

    await removeStudentFromTeacher(teacherEmail || '', studentEmail || '');

    return NextResponse.json({ message: 'Student removed successfully' });

  } catch (error: unknown) {
    console.error('Error removing student from teacher:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: 'Failed to remove student', details: errorMessage },
      { status: 500 }
    );
  }
}
