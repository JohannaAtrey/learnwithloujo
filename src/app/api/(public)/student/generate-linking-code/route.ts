// API route that allows authenticated students to generate a unique, time-limited parent linking code for account association; includes optional school ID support.

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { ParentLinkingCode } from '@/types';

const LINKING_CODES_COLLECTION = 'parent_linking_codes';
const CODE_LENGTH = 6; // Length of the generated code
const CODE_EXPIRY_MINUTES = 15; // Code expires in 15 minutes

// Helper to generate a random alphanumeric code
function generateRandomCode(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    if (decodedToken.role !== 'student') {
      return NextResponse.json({ error: 'Forbidden: Only students can generate linking codes' }, { status: 403 });
    }
    const studentUid = decodedToken.uid;
    const schoolId = decodedToken.schoolId || undefined; // Get schoolId if available

    // Generate a unique code
    let newCode = '';
    let codeExists = true;
    let attempts = 0;
    const maxAttempts = 10; // Prevent infinite loop

    while (codeExists && attempts < maxAttempts) {
      newCode = generateRandomCode(CODE_LENGTH);
      const codeDoc = await db.collection(LINKING_CODES_COLLECTION).doc(newCode).get();
      codeExists = codeDoc.exists;
      attempts++;
    }

    if (codeExists) {
      // Should be very rare
      return NextResponse.json({ error: 'Failed to generate a unique code, please try again.' }, { status: 500 });
    }

    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(now.toMillis() + CODE_EXPIRY_MINUTES * 60 * 1000);

    const linkingCodeData: Omit<ParentLinkingCode, 'schoolId'> & { schoolId?: string } = { // Adjust type for conditional property
      studentUid,
      expiresAt,
      status: 'active',
      createdAt: now,
    };

    if (schoolId) {
      linkingCodeData.schoolId = schoolId;
    }

    await db.collection(LINKING_CODES_COLLECTION).doc(newCode).set(linkingCodeData);

    return NextResponse.json({
      code: newCode,
      expiresAt: expiresAt.toDate().toISOString(), // Return expiry as ISO string
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Error generating linking code:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: 'Failed to generate linking code', details: errorMessage },
      { status: 500 }
    );
  }
}
