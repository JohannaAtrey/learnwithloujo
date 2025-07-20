import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter } from '@/lib/upstash';


export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  // apply the rate limiter to the api/(protected) routes
   if ( path.startsWith('/api/generate') ||
    path.startsWith('/api/student/quizzes') ||
    path.startsWith('/api/check-feed') ||
    path.startsWith('/api/song-status') ||
    path.startsWith('/api/udio-import')
  ) { 
    const res = await rateLimiter(req)
     if (res.status !== 200) {
      return res;
    }
    return NextResponse.next();
  }
  // Client-side authentication checking will be handled by the AuthContext
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', 
    '/api/student/quizzes',
    '/api/generate',
    '/api/check-feed',
    '/api/song-status',
    '/api/udio-import',
  ],
};
