// API route for admins to retrieve the total number of users in Firebase Authentication.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin'; 

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // List all users. This can be resource-intensive for very large user bases.
    const listUsersResult = await auth.listUsers(1000); // Max 1000 per page
    let totalUsers = listUsersResult.users.length;
    let nextPageToken = listUsersResult.pageToken;

    while (nextPageToken) {
      const nextPageResult = await auth.listUsers(1000, nextPageToken);
      totalUsers += nextPageResult.users.length;
      nextPageToken = nextPageResult.pageToken;
    }

    return NextResponse.json({ totalUsers });

  } catch (error: unknown) {
    console.error('Error fetching total user count:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user count';
    return NextResponse.json(
      { error: 'Failed to fetch user count', details: errorMessage },
      { status: 500 }
    );
  }
}
