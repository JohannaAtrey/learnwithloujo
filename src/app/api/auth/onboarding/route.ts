// API endpoint to finalize school admin onboarding after Stripe payment: creates user, sets role, stores metadata, and returns a custom Firebase token.
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

export async function POST(req: Request) {
  try {
    const { sessionId, schoolName, schoolEmail, password } = await req.json();

    if (!sessionId || !schoolName || !schoolEmail || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the session is valid and paid
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session || session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Invalid or incomplete session' },
        { status: 400 }
      );
    }

    // Get the customer ID from the session
    const customerId = session.customer as string;
    if (!customerId) {
      return NextResponse.json(
        { error: 'No customer ID found in session' },
        { status: 400 }
      );
    }

    // Create the Firebase auth user
    const userRecord = await getAuth().createUser({
      email: schoolEmail,
      password: password,
      displayName: schoolName,
    });

    // Set custom claims for the user
    await getAuth().setCustomUserClaims(userRecord.uid, {
      role: 'school_admin',
    });

    // Create or update the user document using Firebase UID
    const userRef = db.collection('users').doc(userRecord.uid);
    const userDoc = await userRef.get();

    const userData = {
      schoolName,
      schoolEmail,
      role: 'school_admin',
      status: 'active',
      stripeCustomerId: customerId,
      subscriptionId: session.subscription,
      updatedAt: new Date().toISOString(),
    };

    if (!userDoc.exists) {
      // Create new user document
      await userRef.set({
        ...userData,
        createdAt: new Date().toISOString(),
      });
    } else {
      // Update existing user document
      await userRef.update(userData);
    }

    // Create a custom token for the user with the role claim
    const customToken = await getAuth().createCustomToken(userRecord.uid, {
      role: 'school_admin',
    });

    return NextResponse.json({
      success: true,
      customToken,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        role: 'school_admin',
      },
    });
  } catch (error: unknown) {
    console.error('Error during onboarding:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to complete onboarding';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 