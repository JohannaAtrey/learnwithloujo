// API endpoint to finalize user registration: verifies ID token, assigns secure custom claims, and stores user metadata in Firestore.
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth as adminAuth, db } from '@/lib/firebase-admin';

// API endpoint to handle user registration with secure role assignment
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { name, email, password, role, idToken, schoolName, position } = await request.json();
    
    // Validate required fields
    if (!name || !email || !password || !role || !idToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Verify the user's ID token to ensure they're authenticated
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    // Validate the role is one of the allowed values
    const validRoles = ['student', 'teacher', 'parent', 'school_admin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      );
    }
    
    // Additional validation for school admin
    if (role === 'school_admin') {
      if (!schoolName || !position) {
        return NextResponse.json(
          { error: 'School name and position are required for school administrators' },
          { status: 400 }
        );
      }
    }
    
    // Set custom claims with role
    await adminAuth.setCustomUserClaims(uid, { 
      role,
      ...(role === 'school_admin' ? { isSubscribed: false } : {})
    });
    
    // Prepare user data for Firestore
    const userData = {
      name,
      email,
      role,
      createdAt: new Date().toISOString(),
      ...(role === 'school_admin' ? {
        schoolName,
        position,
        isSubscribed: false
      } : {})
    };
    
    // Store additional user data in Firestore
    await db.collection('users').doc(uid).set(userData);
    
    return NextResponse.json({
      success: true,
      message: `User registered with role: ${role}`
    });
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json(
      { 
        error: 'Failed to register user', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}