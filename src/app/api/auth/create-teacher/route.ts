// API endpoint to create a new teacher account, assign a custom role, and store user info in Firestore.
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    // Create the user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // Set custom claims for teacher role
    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'teacher',
    });

    // Create user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email,
      name,
      role: 'teacher',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error creating teacher:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create teacher account';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 