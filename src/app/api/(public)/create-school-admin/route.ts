// API route to finalize school admin signup after Stripe checkout: verifies session, creates a Firebase Auth user, and stores initial user info in Firestore.

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/firebase-admin';
import { auth } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, schoolName, fullName, email, password } = body;

    if (!sessionId || !schoolName || !fullName || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 404 }
      );
    }

    const customerId = session.customer as string;
    if (!customerId) {
      return NextResponse.json(
        { error: 'No customer ID found in session' },
        { status: 400 }
      );
    }

    // Create Firebase auth user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: fullName,
    });

    // Update the user document in Firestore
    // NOTE: This original code used customerId as doc ID and didn't set role/schoolId.
    // We will add the correct logic in the Stripe webhook instead.
    // For now, let's just ensure the user doc exists with basic info using UID.
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      schoolName: schoolName,
      fullName: fullName,
      email: email,
      stripeCustomerId: customerId, // Store stripe customer ID
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Role and schoolId will be set by the webhook
    }, { merge: true });


    return NextResponse.json({
      success: true,
      user: {
        id: userRecord.uid,
        email: userRecord.email,
        schoolName,
        fullName,
      },
    });
  } catch (error: unknown) {
    console.error('Error creating school admin:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create school admin account';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
