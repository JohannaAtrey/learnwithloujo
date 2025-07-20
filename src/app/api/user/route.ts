// API endpoint to retrieve authenticated user's profile and subscription metadata from Firestore.
// Requires a valid Firebase ID token in the Authorization header.

import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Fetch user document from Firestore
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();

    // Return user data along with role from token
    return NextResponse.json({
      id: userId,
      email: decodedToken.email,
      name: userData?.name || decodedToken.name,
      role: decodedToken.role,
      createdAt: userData?.createdAt,
      updatedAt: userData?.updatedAt,
      isSchoolAdminSubscribed: userData?.isSchoolAdminSubscribed || false,
      isParentSubscribed: userData?.isParentSubscribed || false,
      parentSubscriptionId: userData?.parentSubscriptionId,
      parentCurrentPeriodEnd: userData?.parentCurrentPeriodEnd,
      customerId: userData?.customerId,
      mandateId: userData?.mandateId,
      creditorId: userData?.creditorId,
      billingRequestId: userData?.billingRequestId,
      subscriptionId: userData?.subscriptionId,
      subscriptionPlan: userData?.subscriptionPlan,
      subcriptionStartDate: userData?.subcriptionStartDate,
      subcriptionEndDate: userData?.subcriptionEndDate,
      subcriptionCancelledDate: userData?.subcriptionCancelledDate,
      subcriptionStatus: userData?.subcriptionStatus,
      paymentStatus: userData?.paymentStatus,
      paymentId: userData?.paymentId,
      amount: userData?.amount,
    });

  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    );
  }
} 