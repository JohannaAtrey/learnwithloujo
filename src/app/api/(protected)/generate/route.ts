// API route to initiate a song generation request via the Udio API, enforcing role-based quotas, validating subscriptions, and storing a pending song record in Firestore.

import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { createPendingSong } from '@/lib/services/songs';
import { UserData, SongData } from '@/types'; 

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (error) {
      console.error("Error verifying token:", error);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const userId = decodedToken.uid;
    const userEmail = decodedToken.email;
    const userRole = decodedToken.role;

    if (!userEmail) {
      return NextResponse.json({ error: 'User email not found in token' }, { status: 400 });
    }

    // 1. Fetch User Document for Quota Info
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User record not found in Firestore' }, { status: 404 });
    }
    const userData = userDoc.data() as UserData;

    // 2. Quota Check based on role
    if (userRole === 'school_admin') {
      if (!userData.isSchoolAdminSubscribed) {
        return NextResponse.json({ error: 'School admin not subscribed' }, { status: 403 });
      }
      if (userData.schoolAdminGenerationsThisMonth === undefined || userData.schoolAdminMonthlyQuota === undefined) {
        return NextResponse.json({ error: 'School admin quota information missing' }, { status: 500 });
      }
      if (userData.schoolAdminGenerationsThisMonth >= userData.schoolAdminMonthlyQuota) {
        return NextResponse.json({ error: 'Monthly song generation quota exceeded for school admin.' }, { status: 429 });
      }
    } else if (userRole === 'parent') {
      if (!userData.isParentSubscribed) {
        return NextResponse.json({ error: 'Parent not subscribed' }, { status: 403 });
      }
      if (userData.parentGenerationsThisMonth === undefined || userData.parentMonthlyQuota === undefined) {
        return NextResponse.json({ error: 'Parent quota information missing' }, { status: 500 });
      }
      if (userData.parentGenerationsThisMonth >= userData.parentMonthlyQuota) {
        return NextResponse.json({ error: 'Monthly song generation quota exceeded for parent.' }, { status: 429 });
      }
    } else if (userRole === 'teacher') {
      if (!userData.schoolId) {
        return NextResponse.json({ error: 'Teacher not associated with a school' }, { status: 403 });
      }
      console.warn(`Teacher ${userId} generation - school quota system pending`);
    } else {
      return NextResponse.json({ error: 'Forbidden: User role not authorized for song generation' }, { status: 403 });
    }

    // 3. Parse request body
    const body = await request.json();
    if (!body.gpt_description_prompt) {
      return NextResponse.json({ error: 'Missing required prompt' }, { status: 400 });
    }

    const udioApiKey = process.env.UDIO_API_KEY;
    if (!udioApiKey) {
      return NextResponse.json({ error: 'Server configuration error for song generation.' }, { status: 500 });
    }
    const udioGenerationEndpoint = `${process.env.UDIO_URL}/generate`;
    const udioResponse = await fetch(udioGenerationEndpoint, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${udioApiKey}` },
      body: JSON.stringify({
        ...body,
        callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/udio?secret=${process.env.UDIO_WEBHOOK_SECRET}`
      }),
    });

    if (!udioResponse.ok) {
      const errorData = await udioResponse.json();
      console.error('Error response from Udio API:', errorData);
      return NextResponse.json({ error: errorData.message || 'Error from Udio API' }, { status: udioResponse.status });
    }
    const udioData = await udioResponse.json();
    const workId = udioData?.work_id || udioData?.workId || udioData?.data?.work_id; 
    if (!workId) {
      console.error('Udio API did not return a workId. Response:', JSON.stringify(udioData, null, 2));
      return NextResponse.json({ error: 'Udio API did not return a workId' }, { status: 500 });
    }
    console.log(`Udio generation initiated. WorkId: ${workId}`);

    // 5. Create Pending Song Record in Firestore
    type PendingSongPayload = Pick<SongData, 
      'workId' | 
      'prompt' | 
      'status' | 
      'creatorId' | 
      'creatorEmail' | 
      'createdAt' |
      'read'
    > & Partial<Pick<SongData, 'schoolId' | 'parentId'>>;

    const songCreationData: PendingSongPayload = {
      workId: workId,
      prompt: body.gpt_description_prompt,
      status: 'processing', 
      creatorId: userId,
      creatorEmail: userEmail,
      createdAt: new Date().toISOString(),
      read: false
    };

    if (userRole === 'teacher' && userData.schoolId) {
      songCreationData.schoolId = userData.schoolId;
    }
    if (userRole === 'parent') {
      songCreationData.parentId = userId;
    }
    await createPendingSong(songCreationData);

    // 6. Increment User's Quota (Atomically)
    let quotaUpdateField = {};
    if (userRole === 'school_admin') {
      quotaUpdateField = { schoolAdminGenerationsThisMonth: FieldValue.increment(1) };
    } else if (userRole === 'parent') {
      quotaUpdateField = { parentGenerationsThisMonth: FieldValue.increment(1) };
    } else if (userRole === 'teacher') {
      console.warn(`Teacher ${userId} (school ${userData.schoolId}) - quota management pending`);
    }
    
    if (userRole === 'school_admin' || userRole === 'parent') {
      await userDocRef.update(quotaUpdateField);
    }

    return NextResponse.json({ workId });

  } catch (error: unknown) {
    console.error('Error in POST /api/generate:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate song';
    return NextResponse.json(
      { error: 'Failed to generate song', details: errorMessage },
      { status: 500 }
    );
  }
}
