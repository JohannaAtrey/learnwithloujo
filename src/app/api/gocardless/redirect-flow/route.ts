export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { goCardless } from '@/lib/gocardless';


export async function POST(request: Request) {
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

    const { userPlan, userType } = await request.json();
    const redirectFlow = await goCardless.redirectFlows.create({
      description: 'Set up a Direct Debit with Octananna Ltd',
      session_token: `user-session-id-${userId}`,
      success_redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success`,
      metadata: {
        plan: userPlan,
        userType,
        userId,
      }
    });
  return NextResponse.json({ redirectUrl: redirectFlow.redirect_url });
}
