// Stripe webhook handler for subscription lifecycle events.
// Handles checkout completion, subscription renewals, and cancellations for school and parent plans.
// Updates Firebase Auth custom claims and Firestore user documents accordingly.

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db, auth } from '@/lib/firebase-admin';
import { stripe } from '@/lib/stripe';
import { UserData } from '@/types'; 

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = (await headers()).get('stripe-signature')!;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret!);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Webhook Error: ${errorMessage}`);
      return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 });
    }

    const session = event.data.object as unknown; // Use 'unknown' for session initially, then cast specifically

    switch (event.type) {
      case 'checkout.session.completed': {
        const checkoutSession = session as Stripe.Checkout.Session;
        const userId = checkoutSession.metadata?.userId;
        const planType = checkoutSession.metadata?.planType;

        if (!userId || !planType) {
          console.error('Webhook Error: Missing userId or planType in checkout session metadata', checkoutSession.metadata);
          throw new Error('Webhook Error: Missing userId or planType in checkout session metadata');
        }

        console.log(`[Webhook] checkout.session.completed for userId: ${userId}, planType: ${planType}`);

        if (!checkoutSession.subscription) {
            console.error('Webhook Error: No subscription ID found in checkout session.');
            throw new Error('Webhook Error: No subscription ID found in checkout session.');
        }
        const subscriptionId = checkoutSession.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price.id;
        const subscriptionData = subscription as unknown as { current_period_end: number };

        if (planType === 'school') {
          const schoolName = checkoutSession.metadata?.schoolName;
          if (!schoolName) {
            throw new Error('Webhook Error: No schoolName found in metadata for school plan');
          }
          console.log(`[Webhook] Processing school plan for ${schoolName}`);

          const schoolsRef = db.collection('schools');
          const newSchoolDocRef = await schoolsRef.add({
            name: schoolName,
            primaryAdminUid: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          const schoolId = newSchoolDocRef.id;
          console.log(`[Webhook] Created school ${schoolId} for admin ${userId}`);

          await auth.setCustomUserClaims(userId, { role: 'school_admin', schoolId: schoolId });
          console.log(`[Webhook] Set custom claims for school_admin ${userId}`);

          await db.collection('users').doc(userId).set({
            role: 'school_admin',
            schoolId: schoolId,
            isSchoolAdminSubscribed: true,
            schoolAdminSubscriptionId: subscription.id,
            schoolAdminStripePriceId: priceId,
            schoolAdminCurrentPeriodEnd: new Date(subscriptionData.current_period_end * 1000).toISOString(),
            schoolAdminMonthlyQuota: 100, 
            schoolAdminGenerationsThisMonth: 0,
            schoolAdminLastQuotaReset: new Date().toISOString(),
            stripeCustomerId: subscription.customer as string,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
          console.log(`[Webhook] Updated user document for school_admin ${userId}`);

        } else if (planType === 'parent') {
          console.log(`[Webhook] Processing parent plan for user ${userId}`);
          await db.collection('users').doc(userId).set({
            isParentSubscribed: true,
            parentSubscriptionId: subscription.id,
            parentStripePriceId: priceId,
            parentCurrentPeriodEnd: new Date(subscriptionData.current_period_end * 1000).toISOString(),
            parentMonthlyQuota: 25,
            parentGenerationsThisMonth: 0,
            parentLastQuotaReset: new Date().toISOString(),
            stripeCustomerId: subscription.customer as string,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
          console.log(`[Webhook] Updated user document for parent ${userId}`);
        } else {
          console.warn(`[Webhook] Unhandled planType: ${planType} for userId: ${userId}`);
        }
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = session as Stripe.Invoice;
        const subscriptionId = invoice.lines.data[0]?.subscription;
        const customerId = invoice.customer;

        if (!subscriptionId || !customerId || typeof subscriptionId !== 'string' || typeof customerId !== 'string') {
          console.warn('[Webhook] Missing or invalid subscriptionId/customerId in invoice.payment_succeeded');
          return NextResponse.json({ error: 'Invalid invoice data' }, { status: 400 });
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Verify customer ID on subscription matches the invoice
        if (subscription.customer !== customerId) {
          console.warn(`[Webhook] Customer ID mismatch: invoice ${customerId}, subscription ${subscription.customer}`);
          return NextResponse.json({ error: 'Customer ID mismatch' }, { status: 400 });
        }

        const userSnapshot = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();

        if (!userSnapshot.empty) {
            const userDoc = userSnapshot.docs[0];
            const userId = userDoc.id;

            // Determine planType from subscription's price ID or metadata
            const currentPriceId = subscription.items.data[0]?.price.id;
            let planType = subscription.metadata.planType;
            if (!planType) {
                if (currentPriceId === process.env.NEXT_PUBLIC_STRIPE_PARENT_PRICE_ID) planType = 'parent';
                else if (currentPriceId === process.env.NEXT_PUBLIC_STRIPE_SCHOOL_PRICE_ID) planType = 'school';
            }

            console.log(`[Webhook] invoice.payment_succeeded for userId: ${userId}, planType: ${planType}`);

            if (planType === 'school') {
                const subscriptionData = subscription as unknown as { current_period_end: number };
                await userDoc.ref.set({
                    isSchoolAdminSubscribed: true,
                    schoolAdminCurrentPeriodEnd: new Date(subscriptionData.current_period_end * 1000).toISOString(),
                    schoolAdminGenerationsThisMonth: 0,
                    schoolAdminLastQuotaReset: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                }, { merge: true });
                console.log(`[Webhook] Renewed school subscription and reset quota for user ${userId}`);
            } else if (planType === 'parent') {
                const subscriptionData = subscription as unknown as { current_period_end: number };
                await userDoc.ref.set({
                    isParentSubscribed: true,
                    parentCurrentPeriodEnd: new Date(subscriptionData.current_period_end * 1000).toISOString(),
                    parentGenerationsThisMonth: 0,
                    parentLastQuotaReset: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                }, { merge: true });
                console.log(`[Webhook] Renewed parent subscription and reset quota for user ${userId}`);
            }
        } else {
             console.warn(`[Webhook] User not found for customerId: ${customerId} during invoice.payment_succeeded`);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = session as Stripe.Subscription;
        const customerId = subscription.customer;

        if (!customerId || typeof customerId !== 'string') {
          console.warn(`[Webhook] No valid customerId found on subscription.deleted event for subscription ${subscription.id}`);
          return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
        }

        const userSnapshot = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          const userData = userDoc.data() as UserData;
          const updateData: Partial<UserData> = { updatedAt: new Date().toISOString() };

          if (userData.schoolAdminSubscriptionId === subscription.id) {
            updateData.isSchoolAdminSubscribed = false;
            updateData.schoolAdminSubscriptionId = undefined; 
            updateData.schoolAdminCurrentPeriodEnd = undefined;
            updateData.schoolAdminStripePriceId = undefined;
          }
          if (userData.parentSubscriptionId === subscription.id) {
            updateData.isParentSubscribed = false;
            updateData.parentSubscriptionId = undefined; 
            updateData.parentCurrentPeriodEnd = undefined;
            updateData.parentStripePriceId = undefined;
          }
          await userDoc.ref.set(updateData, { merge: true });
          console.log(`[Webhook] Marked subscription ${subscription.id} as canceled for user ${userDoc.id}`);
        } else {
          console.warn(`[Webhook] User not found for customerId: ${customerId} during subscription deletion: ${subscription.id}`);
        }
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Webhook handler failed', details: errorMessage }, { status: 500 });
  }
}
