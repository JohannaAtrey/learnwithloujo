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
    
    const body = await req.json();
    const { subscriptionId } = body;
    if (!subscriptionId) {
      return NextResponse.json({ error: 'Missing subscriptionId' }, { status: 400 });
    }
            // Verify the token
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;
    try {
        const cancelSub = await goCardless.subscriptions.cancel(`${subscriptionId}`)

        const cancelledAt = new Date(cancelSub.created_at);
        await db.collection('users').doc(userId).update({
           subcriptionCancelledDate: cancelledAt,
           subcriptionStatus: cancelSub.status,
           updatedAt: new Date().toISOString(),
        });
        
        return NextResponse.json(cancelSub);
    } catch (error) {
        console.error('Error completing redirect flow:', error);
        return NextResponse.json({ error: 'Failed to complete payment setup' }, { status: 500 });
    }
}

