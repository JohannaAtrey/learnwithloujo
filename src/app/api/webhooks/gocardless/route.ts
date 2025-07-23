import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import crypto from 'crypto';
import { goCardless } from '@/lib/gocardless';
export const dynamic = 'force-dynamic';

const webhookSecret = process.env.GOCARDLESS_WEBHOOK_SECRET!;

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  console.log('Gocardless webhook starting.........')
  if (!webhookSecret) {
    return NextResponse.json({ message: 'GoCardless webhook secret not configured' }, { status: 400 });
  }
  const body = await req.text();
  const signature = req.headers.get('Webhook-Signature');
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    return NextResponse.json({ message: 'Invalid signature' }, { status: 400 });
  }

  try {
    const { events } = JSON.parse(body);

    for (const event of events) {
      let userId = event.resource_metadata.userId ?? event.metadata.userId;
      let userPlan = event.resource_metadata.plan ?? event.metadata.plan;
      let userType = event.resource_metadata.userType ?? event.metadata.userType;
      if ( (!userId || !userPlan || !userType) && ['subscriptions', 'payments'].includes(event.resource_type) ) {
        let resource 
        if (event.resource_type === 'subscription') {
          const resourceId = event.links.subscription;
          resource = await goCardless.subscriptions.find(resourceId);
        } else if (event.resource_type === 'payment') {
          const resourceId = event.links.payment; 
          resource = await goCardless.payments.find(resourceId);
        }
         
        if ( resource?.metadata ) {
          userId = resource?.metadata?.userId
          userPlan = resource?.metadata?.userPlan
          userType = resource?.metadata?.userType
        }
      }

      const eventType = `${event.resource_type}.${event.action}`;
      console.log(`Webhook received: ${event.resource_type} ${event.action}`);

      switch (eventType) {
        case 'payments.created':
          const oneMonthOrYearFromToday = new Date(event.created_at);
          if (userPlan.toLowerCase() === 'monthly') {
            oneMonthOrYearFromToday.setMonth(oneMonthOrYearFromToday.getMonth() + 1);
          } else if (userPlan.toLowerCase() === 'yearly') {
            oneMonthOrYearFromToday.setFullYear(oneMonthOrYearFromToday.getFullYear() + 1);
          }

          await db.collection('users').doc(userId).update({
            subcriptionStartDate: new Date().toISOString(),
            subcriptionEndDate: oneMonthOrYearFromToday.toISOString(),
            paymentStatus: event.action,
            paymentId: event.links.payment,
            updatedAt: new Date().toISOString(),
          });
        break;
        case 'payments.failed':
        case 'payments.confirmed':
        case 'payments.submitted':
          const obj: { [key: string]: string | boolean } = {}
          if (event.action === 'failed') {
            obj['subcriptionEndDate'] = new Date().toISOString()
            if ( userType.toLowerCase() === 'school') {
              obj['isSchoolAdminSubscribed'] = false
            } else if ( userType.toLowerCase() === 'parent' ) {
              obj['isParentSubscribed'] = false
            }
          }

          await db.collection('users').doc(userId).update({
            paymentStatus: event.action,
            paymentId: event.links.payment,
            updatedAt: new Date().toISOString(),
            ...obj
          });
          break;
        case 'subscriptions.cancelled':
          const cancelledAt = new Date(event.created_at);
          await db.collection('users').doc(userId).update({
            subcriptionCancelledDate: cancelledAt,
            subcriptionStatus: event.action,
            updatedAt: new Date().toISOString(),
          });
          break;
        default:
          console.log(`Unhandled event type: ${eventType}`);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error('Webhook validation failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
}
