export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { goCardless } from '@/lib/gocardless';

export async function POST(req: Request) {
  const authHeader = req.headers.get('Authorization');
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

  const { redirectFlowId } = await req.json();

  try {
    const completedFlow = await goCardless.redirectFlows.complete(redirectFlowId, {
      session_token: `user-session-id-${userId}`,
    });
    
    const mandateId = completedFlow.links.mandate;
    const customerId = completedFlow.links.customer;
    const userPlan = completedFlow.metadata.plan;
    const userType = completedFlow.metadata.userType;

    const envVarName = `${userType.toUpperCase()}_${userPlan.toUpperCase()}_PLAN`;
    const amount = process.env[envVarName];

    const createSub = await goCardless.subscriptions.create({
      amount,
      currency: 'GBP',
      interval_unit: userPlan.toLowerCase(),
      name: `${userPlan} Plan`,
      links: { mandate: mandateId },
      metadata: {
        plan: userPlan,
        userType,
        userId,
      }
    });

    const obj: { [key: string]: string } = {}
    if (userType.toLowerCase() === 'school') {
      const userData = (await db.collection('users').doc(userId).get()).data()
      
      const newSchool = await db.collection('schools').add({
        name: userData?.schoolName,
        primaryAdminUid: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      obj['schoolId'] = newSchool.id
    }

    await db.collection('users').doc(userId).update({
      customerId,
      mandateId,
      amount: createSub.amount / 100, // To convert pence to pounds
      creditorId: completedFlow.links.creditor,
      billingRequestId: completedFlow.links.billing_request,
      subscriptionId: createSub.id,
      subscriptionPlan: userPlan,
      subcriptionStartDate: new Date(createSub.start_date).toISOString(),
      subcriptionStatus: createSub.status,
      isSchoolAdminSubscribed: userType.toLowerCase() === 'school' ? true : false,
      isParentSubscribed: userType.toLowerCase() === 'parent' ? true : false,
      updatedAt: new Date().toISOString(),
      ...obj
    });

    return NextResponse.json({ customerId, mandateId });
  } catch (error) {
    console.error('Error completing redirect flow:', error);
    return NextResponse.json({ error: 'Failed to complete payment setup' }, { status: 500 });
  }
}
