// API endpoint for admins to assign roles to users via custom claims and update Firestore metadata. Requires Bearer token authorization.

import { NextRequest, NextResponse } from 'next/server';
import { auth as adminAuth, db as adminFirestore } from '@/lib/firebase-admin'; 

// Custom type for Firebase errors
interface FirebaseError extends Error {
  code?: string;
}

// API endpoint to set user roles via custom claims
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get token from Authorization header
    const authorization = request.headers.get('Authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization token' }, { status: 401 });
    }
    const adminToken = authorization.split('Bearer ')[1];

    // Get target email and role from request body
    const { targetUserEmail, role } = await request.json();
    
    // Validate required fields
    if (!targetUserEmail || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: targetUserEmail and role are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetUserEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format for targetUserEmail' },
        { status: 400 }
      );
    }
    
    // Verify the admin's ID token
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(adminToken);
    } catch (tokenError) {
      console.error('Error verifying admin token:', tokenError);
      return NextResponse.json({ error: 'Invalid or expired admin token' }, { status: 401 });
    }
    
    // Check if the user has admin privileges
    if (decodedToken.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can set roles.' },
        { status: 403 }
      );
    }
    
    // Validate the role is one of the allowed values
    const validRoles = ['student', 'teacher', 'parent', 'admin', 'school_admin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      );
    }

    try {
      // Get the user by email
      const userRecord = await adminAuth.getUserByEmail(targetUserEmail);
      
      // Set custom claims for the target user
      await adminAuth.setCustomUserClaims(userRecord.uid, { role });
      
      // Update the user's document in Firestore
      await adminFirestore.collection('users').doc(userRecord.uid).set({
        email: userRecord.email, 
        role,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      return NextResponse.json({
        success: true,
        message: `Role ${role} successfully assigned to user ${targetUserEmail}`
      });
    } catch (error: unknown) {
      if (error instanceof Error && (error as FirebaseError).code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: 'User not found with the provided email' },
          { status: 404 }
        );
      }
      throw error;
    }
  } catch (error: unknown) {
    console.error('Error setting user role:', error);
    const errorMessage = error instanceof Error 
      ? ((error as FirebaseError).code ? `Firebase error: ${(error as FirebaseError).code}` : error.message)
      : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to set user role', 
        message: errorMessage
      },
      { status: 500 }
    );
  }
}
