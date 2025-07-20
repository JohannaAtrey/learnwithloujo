// API route for parents to link a child account using a one-time linking code; validates the code, updates the parent's record, and marks the code as used.

import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { ParentLinkingCode } from '@/types';

const LINKING_CODES_COLLECTION = 'parent_linking_codes';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    if (decodedToken.role !== 'parent') {
      return NextResponse.json({ error: 'Forbidden: Only parents can link children' }, { status: 403 });
    }
    const parentUid = decodedToken.uid;

    const { linkingCode } = await request.json();

    if (!linkingCode || typeof linkingCode !== 'string') {
      return NextResponse.json({ error: 'Invalid linking code provided' }, { status: 400 });
    }

    // 1. Fetch and validate the linking code
    const codeRef = db.collection(LINKING_CODES_COLLECTION).doc(linkingCode);
    const codeDoc = await codeRef.get();

    if (!codeDoc.exists) {
      return NextResponse.json({ error: 'Invalid or expired linking code.' }, { status: 404 });
    }

    const codeData = codeDoc.data() as ParentLinkingCode;

    if (codeData.status !== 'active') {
      return NextResponse.json({ error: 'Linking code has already been used or is inactive.' }, { status: 400 });
    }

    // Check expiry (Firestore Timestamp vs current Timestamp)
    if (codeData.expiresAt && (codeData.expiresAt as Timestamp) < Timestamp.now()) {
      // Optionally update status to 'expired'
      await codeRef.update({ status: 'expired' });
      return NextResponse.json({ error: 'Linking code has expired.' }, { status: 400 });
    }

    const studentUid = codeData.studentUid;

    // 2. Update the parent document to add the child ID to the children array
    const parentRef = db.collection('users').doc(parentUid);
    await parentRef.update({
      children: FieldValue.arrayUnion(studentUid)
    });

    // 3. Mark the code as used
    await codeRef.update({ status: 'used' });

    return NextResponse.json({ message: 'Child account linked successfully!' }, { status: 201 });

  } catch (error: unknown) {
    console.error('Error linking child account:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to link child account';
    return NextResponse.json(
      { error: 'Failed to link child account', details: errorMessage },
      { status: 500 }
    );
  }
}
