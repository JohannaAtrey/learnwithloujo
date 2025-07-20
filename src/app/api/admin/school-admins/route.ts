// API route for managing school admin users; allows platform admins to list, promote, demote, or delete school admins.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin'; 
import {
  promoteToSchoolAdmin,
  demoteFromSchoolAdmin,
  deleteSchoolAdmin,
  getAllSchoolAdmins
} from '@/lib/services/admin-management';

export async function GET(request: NextRequest) {
  try {
    // Get the authorization token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token); 

    // Check if user is an admin
    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all school admins
    const schoolAdmins = await getAllSchoolAdmins();
    return NextResponse.json({ schoolAdmins });
  } catch (error: unknown) {
    console.error('Error in GET /api/admin/school-admins:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
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

    // Check if user is an admin
    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Ensure we have an email
    if (!decodedToken.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    const body = await request.json();
    const { action, targetEmail, schoolName } = body; 

    if (!action || !targetEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: action or targetEmail' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    let result;
    switch (action) {
      case 'promote':
        if (!schoolName) {
          return NextResponse.json(
            { error: 'Missing required field for promotion: schoolName' },
            { status: 400 }
          );
        }
        result = await promoteToSchoolAdmin(targetEmail, schoolName);
        break;

      case 'demote':
        result = await demoteFromSchoolAdmin(targetEmail);
        break;

      case 'delete':
        result = await deleteSchoolAdmin(targetEmail);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error in POST /api/admin/school-admins:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
