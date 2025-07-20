// API route to verify a Stripe Checkout session using a session ID; returns session details and associated user info from Firestore (if available).

import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log('Retrieved session:', session);

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 404 }
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

    // Check if the user exists in Firestore
    const userDoc = await db.collection('users').doc(customerId).get();

    // If user doesn't exist yet, return session data only
    if (!userDoc.exists) {
      return NextResponse.json({
        session: {
          id: session.id,
          customer: session.customer,
          subscription: session.subscription,
          status: session.status,
        },
        user: null
      });
    }

    const userData = userDoc.data();

    return NextResponse.json({
      session: {
        id: session.id,
        customer: session.customer,
        subscription: session.subscription,
        status: session.status,
      },
      user: {
        id: userDoc.id,
        ...userData,
      },
    });
  } catch (error: unknown) {
    console.error('Error verifying session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to verify session';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 