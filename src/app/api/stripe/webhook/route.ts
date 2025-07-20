// Stripe webhook endpoint for handling subscription lifecycle events such as checkout completion, subscription updates, cancellations, and failed payments.
// Updates user records in Firestore based on Stripe events.

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/firebase-admin';

// This is your Stripe webhook secret for testing your endpoint locally.
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = await (await headers()).get('stripe-signature');

    if (!signature || !webhookSecret) {
      console.error('Missing stripe signature or webhook secret');
      return NextResponse.json(
        { error: 'Missing stripe signature or webhook secret' },
        { status: 400 }
      );
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Webhook signature verification failed';
      console.error('Webhook signature verification failed:', errorMessage);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    console.log('Processing webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout session completed:', session);

        // Get the customer ID from the session
        const customerId = session.customer as string;
        if (!customerId) {
          console.error('No customer ID found in session');
          return NextResponse.json(
            { error: 'No customer ID found' },
            { status: 400 }
          );
        }

        // Create or update the user document
        const userRef = db.collection('users').doc(customerId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          // Create new user document
          await userRef.set({
            stripeCustomerId: customerId,
            subscriptionId: session.subscription,
            role: 'school_admin',
            status: 'pending',
            createdAt: new Date().toISOString(),
            email: session.customer_details?.email,
            name: session.customer_details?.name,
          });
          console.log('Created new user document:', customerId);
        } else {
          // Update existing user document
          await userRef.update({
            subscriptionId: session.subscription,
            status: 'pending',
            updatedAt: new Date().toISOString(),
            email: session.customer_details?.email,
            name: session.customer_details?.name,
          });
          console.log('Updated existing user document:', customerId);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log('Subscription event:', subscription);

        // Find user by subscription ID
        const usersRef = db.collection('users');
        const q = usersRef.where('subscriptionId', '==', subscription.id);
        const querySnapshot = await q.get();

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const userRef = db.collection('users').doc(userDoc.id);

          await userRef.update({
            subscriptionStatus: subscription.status,
            subscriptionId: subscription.id,
            status: subscription.status === 'active' ? 'active' : 'pending',
            updatedAt: new Date().toISOString(),
          });

          console.log('Updated user subscription:', userDoc.id);
        } else {
          console.error('No user found for subscription:', subscription.id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('Subscription deleted:', subscription);

        // Find user by subscription ID
        const usersRef = db.collection('users');
        const q = usersRef.where('subscriptionId', '==', subscription.id);
        const querySnapshot = await q.get();

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const userRef = db.collection('users').doc(userDoc.id);

          await userRef.update({
            subscriptionStatus: 'canceled',
            status: 'inactive',
            updatedAt: new Date().toISOString(),
          });

          console.log('Updated user subscription status to canceled:', userDoc.id);
        } else {
          console.error('No user found for subscription:', subscription.id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        
        try {
          // Find the user by customer ID
          const userQuery = await db.collection('users')
            .where('customerId', '==', invoice.customer)
            .get();

          if (!userQuery.empty) {
            await userQuery.docs[0].ref.update({
              subscriptionStatus: 'payment_failed',
              updatedAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error handling failed payment:', error);
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process webhook';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
