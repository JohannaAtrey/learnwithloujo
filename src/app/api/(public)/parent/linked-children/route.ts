// API route for parents to retrieve detailed information about their linked children, including names and emails, by verifying their token and querying Firestore.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { User } from '@/types'; 

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const parentId = decodedToken.uid;

    if (decodedToken.role !== 'parent') {
      return NextResponse.json({ error: 'Forbidden: User is not a parent' }, { status: 403 });
    }

    // Fetch parent document
    const parentDoc = await db.collection('users').doc(parentId).get();

    if (!parentDoc.exists) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
    }

    const parentData = parentDoc.data();
    const childrenIds = parentData?.children || [];

    const childrenPromises = childrenIds.map((studentUid: string) => {
      if (!studentUid) {
        console.warn(`Parent document ${parentId} missing studentUid`);
        return Promise.resolve(null);
      }

      return db.collection('users').doc(studentUid).get()
        .then(childUserSnap => {
          if (childUserSnap.exists) {
            const childUserData = childUserSnap.data() as User;
            return {
              id: studentUid,
              studentUid: studentUid,
              studentName: childUserData.name ||  childUserData.displayName || 'N/A',
              studentEmail: childUserData.email || 'N/A',
            };
          } else {
            console.warn(`Child user document not found for studentUid: ${studentUid} (parent: ${parentId})`);
            return null;
          }
        })
        .catch(error => {
          console.error(`Error fetching child user data for studentUid ${studentUid}:`, error);
          return null;
        });
    });

    type ChildDetail = { id: string; studentUid: string; studentName: string; studentEmail: string; } | null;
    const resolvedChildren: ChildDetail[] = await Promise.all(childrenPromises);
    
    // Manual loop for filtering to avoid any issues with .filter() type inference
    const childrenDetails: { id: string; studentUid: string; studentName: string; studentEmail: string; }[] = [];
    for (const child of resolvedChildren) {
      if (child) { // Check for truthiness (will skip null/undefined)
        childrenDetails.push(child);
      }
    }

    return NextResponse.json({ children: childrenDetails });

  } catch (error: unknown) {
    console.error('Error fetching linked children for parent:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch linked children';
    return NextResponse.json(
      { error: 'Failed to fetch linked children', details: errorMessage },
      { status: 500 }
    );
  }
}
