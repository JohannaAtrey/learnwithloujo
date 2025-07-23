// API route for managing individual songs by ID: supports fetching (GET), updating (PATCH), and deleting (DELETE) with role-based access and creator checks.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSongById, getSongByUdioId, updateSong, deleteSong } from '@/lib/services/songs';
import { auth } from '@/lib/firebase-admin';

// GET endpoint to fetch a specific song by ID
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const params = await context.params;
  const { id } = params;
  
  try {
    if (!id) {
      return NextResponse.json(
        { error: "Song ID is required" },
        { status: 400 }
      );
    }
    
    // Try to find by Firestore ID first
    let song = await getSongById(id);
    
    // If not found, try to find by udioId
    if (!song) {
      song = await getSongByUdioId(id);
    }
    
    if (!song) {
      return NextResponse.json(
        { error: "Song not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(song);
  } catch (error) {
    console.error(`Error fetching song with ID ${id}:`, error);
    
    return NextResponse.json(
      { 
        error: "Failed to fetch song", 
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

// PATCH endpoint to update a song
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const params = await context.params;
  const { id } = params;
  
  try {
    const updateData = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: "Song ID is required" },
        { status: 400 }
      );
    }
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    // Verify the token and get user info
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    // Get the song to check permissions
    const song = await getSongById(id);
    if (!song) {
      return NextResponse.json(
        { error: "Song not found" },
        { status: 404 }
      );
    }
    
    // Check if user has permission to update
    const userRole = decodedToken.role;
    const isCreator = song.creatorId === decodedToken.uid;
    const canUpdate = isCreator || ['teacher', 'admin', 'school_admin'].includes(userRole);
    
    if (!canUpdate) {
      return NextResponse.json(
        { error: "Unauthorized to update this song" },
        { status: 403 }
      );
    }
    
    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.udioId;
    delete updateData.createdAt;
    delete updateData.creatorId;
    
    // Update the song
    await updateSong(id, updateData);
    
    return NextResponse.json({ 
      success: true,
      message: "Song updated successfully"
    });
  } catch (error) {
    console.error(`Error updating song with ID ${id}:`, error);
    
    return NextResponse.json(
      { 
        error: "Failed to update song", 
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove a song
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const params = await context.params;
  const { id } = params;
  
  try {
    if (!id) {
      return NextResponse.json(
        { error: "Song ID is required" },
        { status: 400 }
      );
    }
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    // Verify the token and get user info
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    // Get the song to check permissions
    const song = await getSongById(id);
    if (!song) {
      return NextResponse.json(
        { error: "Song not found" },
        { status: 404 }
      );
    }
    
    // Check if user has permission to delete
    const userRole = decodedToken.role;
    const isCreator = song.creatorId === decodedToken.uid;
    const canDelete = isCreator || ['teacher', 'admin', 'school_admin'].includes(userRole);
    
    if (!canDelete) {
      return NextResponse.json(
        { error: "Unauthorized to delete this song" },
        { status: 403 }
      );
    }
    
    // Delete the song
    await deleteSong(id);
    
    return NextResponse.json({ 
      success: true,
      message: "Song deleted successfully"
    });
  } catch (error) {
    console.error(`Error deleting song with ID ${id}:`, error);
    
    return NextResponse.json(
      { 
        error: "Failed to delete song", 
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
