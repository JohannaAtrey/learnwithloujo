// API route for school admins to manage teacher accounts: fetch all linked teachers (GET), or add, remove, or create teacher accounts (POST) based on specified actions.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin'; 
import {
  addTeacherToSchoolAdmin,
  removeTeacherFromSchoolAdmin,
  getTeachersUnderSchoolAdmin,
  createTeacherAndAddToSchoolAdmin
} from '@/lib/services/school-teacher';

export async function GET(request: NextRequest) { 
  try {
    // Get the authorization token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    // Check if user is a school admin
    if (decodedToken.role !== 'school_admin') {
      return NextResponse.json({ error: 'Forbidden: User is not a school admin' }, { status: 403 });
    }

    // Ensure we have an email from the token
    if (!decodedToken.email) {
      return NextResponse.json({ error: 'User email not found in token' }, { status: 400 });
    }

    // Get all teachers under this school admin using their email
    const teachers = await getTeachersUnderSchoolAdmin(decodedToken.email);
    return NextResponse.json({ teachers }); 
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teachers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the authorization token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token); 

    // Check if user is a school admin
    if (decodedToken.role !== 'school_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Ensure we have an email
    if (!decodedToken.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    const body = await request.json();
    const { action, teacherEmail, password, displayName } = body;

    if (!action || !teacherEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let result;
    switch (action) {
      case 'add':
        // Add existing teacher
        result = await addTeacherToSchoolAdmin(decodedToken.email, teacherEmail);
        break;

      case 'remove':
        // Remove teacher
        result = await removeTeacherFromSchoolAdmin(decodedToken.email, teacherEmail);
        break;

      case 'create':
        // Create new teacher account
        if (!password || !displayName) {
          return NextResponse.json(
            { error: 'Missing required fields for teacher creation' },
            { status: 400 }
          );
        }
        result = await createTeacherAndAddToSchoolAdmin(
          decodedToken.email,
          teacherEmail,
          password,
          displayName
        );
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error in POST /api/school-admin/teachers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
