// API endpoint to verify if a Stripe checkout session was successfully completed and paid.

import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Check if the session is valid and completed
    if (!session || session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Invalid or incomplete session' },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch (error: unknown) {
    console.error('Error verifying session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to verify session';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 