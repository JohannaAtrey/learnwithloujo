// API endpoint to create a Stripe checkout session for school admin or parent subscriptions, based on role and selected priceId.
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { stripe } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    // Verify the token
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { priceId } = await request.json(); 

    if (!priceId) {
      return NextResponse.json({ error: 'Missing priceId parameter' }, { status: 400 });
    }

    console.log('Decoded token for checkout:', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role,
      priceId: priceId 
    });

    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    console.log('Firestore user data:', userData);

    if (!userData) {
      return NextResponse.json(
        { error: 'User data not found in Firestore' },
        { status: 403 }
      );
    }

    // Check role from both token and Firestore
    const tokenRole = decodedToken.role;
    const firestoreRole = userData.role;
    
    console.log('Role check:', {
      tokenRole,
      firestoreRole,
      isSchoolAdmin: firestoreRole === 'school_admin' || tokenRole === 'school_admin'
    });

    // Role-based authorization based on priceId
    let successUrl = '';
    let cancelUrl = '';
    let planType = ''; 

    if (priceId === process.env.NEXT_PUBLIC_STRIPE_SCHOOL_PRICE_ID) {
      if (firestoreRole !== 'school_admin' && tokenRole !== 'school_admin') {
        return NextResponse.json(
          { error: `Unauthorized - User role must be school_admin for this plan.` },
          { status: 403 }
        );
      }
      successUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/school-admin?success=true`;
      cancelUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/school-admin?canceled=true`;
      planType = 'school';
    } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PARENT_PRICE_ID) {
      if (firestoreRole !== 'parent' && tokenRole !== 'parent') {
        return NextResponse.json(
          { error: `Unauthorized - User role must be parent for this plan.` },
          { status: 403 }
        );
      }
      successUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/parent?success=true`;
      cancelUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/parent?canceled=true`;
      planType = 'parent';
    } else {
      return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 });
    }

    // Create a new customer in Stripe if one doesn't exist
    let customerId = userData.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: decodedToken.email!,
        metadata: {
          firebaseUID: userId
        }
      });
      customerId = customer.id;
      
      // Save the customer ID to Firestore
      await db.collection('users').doc(userId).update({
        stripeCustomerId: customerId
      });
    }

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId,
        planType: planType, 
        ...(planType === 'school' && userData.schoolName && { schoolName: userData.schoolName }),
        userEmail: decodedToken.email || '', 
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('Error creating checkout session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
