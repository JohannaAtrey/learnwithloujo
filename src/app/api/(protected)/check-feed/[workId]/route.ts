// API route that checks the status of a Udio work item by workId using Udio's feed API, with error handling and no caching. Possibly unused.

import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ workId: string }> }
): Promise<NextResponse> {
  const params = await context.params;
  const { workId } = params;
  
  if (!workId) {
    return NextResponse.json(
      { error: 'Missing workId parameter' }, 
      { status: 400 }
    );
  }
  
  const apiKey = process.env.UDIO_API_KEY;
  if (!apiKey) {
    console.error("UDIO_API_KEY is not set in environment variables.");
    return NextResponse.json(
      { error: 'Server configuration error: Missing API Key' }, 
      { status: 500 }
    );
  }
  
  try {
    // Call Udio's feed API directly
    const feedUrl = `${process.env.UDIO_URL}/v2/feed?workId=${workId}`;
    
    const feedResponse = await fetch(feedUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      next: { revalidate: 0 } // Disable caching
    });
    
    if (!feedResponse.ok) {
      if (feedResponse.status === 404) {
        return NextResponse.json({ code: 202, message: 'processing', data: null });
      }
      
      const errorData = await feedResponse.json().catch(() => null);
      return NextResponse.json(
        { error: errorData || 'Error from Udio API' }, 
        { status: feedResponse.status }
      );
    }
    
    const data = await feedResponse.json();
    
    // Forward the response to the client
    return NextResponse.json(data);
    
  } catch (error) {
    console.error(`Error checking Udio feed for workId ${workId}:`, error);
    
    return NextResponse.json(
      { error: 'Error communicating with Udio API' }, 
      { status: 500 }
    );
  }
}