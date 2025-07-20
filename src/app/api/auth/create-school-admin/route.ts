// API endpoint to set up initial school admin role and user document after signup form submission.
// NOTE: Final role/school linking should be completed by the Stripe webhook after successful payment.

import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';


export async function POST(request: Request) {
  try {
    const { userId, email, displayName, schoolName } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, email' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const auth = getAuth();

    await auth.setCustomUserClaims(userId, {
      role: 'school_admin',
    });
    console.log(`[auth/create-school-admin] Set role claim for user ${userId}`);

    await db.collection('users').doc(userId).set({
      email: email,
      displayName: displayName || schoolName || email, 
      role: 'school_admin',
      schoolName: schoolName || null, 
      createdAt: new Date().toISOString(), 
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`[auth/create-school-admin] Updated user document ${userId} with role`);

    return NextResponse.json({
      success: true,
      message: 'School admin role assigned. Final setup pending payment confirmation.',
    });
  } catch (error: unknown) {
    console.error('Error in auth/create-school-admin:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to set initial school admin role';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
