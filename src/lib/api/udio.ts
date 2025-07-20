'use client';

import { GenerateMusicApiResponse, SongCreationPayload, SongStatusApiResponse, UdioFeedApiResponse } from '@/types';

// Generate a song using the Udio API - DIRECT approach only (no callbacks)
// Update function signature to accept optional token
export const generateMusic = async ( payload: SongCreationPayload, token?: string | null ): Promise<GenerateMusicApiResponse> => {
  try {
    // Prepare headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`; // Add Authorization header if token provided
    }

    // Call our backend API which will use the direct Udio API
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: headers, // Use prepared headers
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Validate the response has the expected structure
    if (!data.workId) {
      throw new Error("API response successful but missing workId.");
    }

    return data;
  } catch (error) {
    console.error("Error calling generateMusic API:", error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error("An unknown error occurred during music generation.");
    }
  }
};

// Check the status of a song generation request
export const getSongStatus = async (workId: string): Promise<SongStatusApiResponse> => {
  try {
    const response = await fetch(`/api/song-status/${workId}`);
    
    // Check for 404 specifically to indicate processing
    if (response.status === 404) {
      return { status: 'processing' };
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Validate the response structure
    if (data.status === 'complete' && data.song) {
      return data;
    } else if (data.status === 'processing') {
      return { status: 'processing' };
    } else if (data.status === 'error') {
      return { status: 'error', error: data.error || 'Unknown error' };
    } else {
      console.warn("Unexpected response format from song status API:", data);
      throw new Error("Unexpected response format from song status API.");
    }
  } catch (error) {
    console.error(`Error fetching song status for workId ${workId}:`, error);
    
    // Don't throw for 404, as that's handled above
    if (error instanceof Error && !error.message.includes("404")) {
      throw error;
    }
    
    // If it was a 404 caught by fetch itself (less likely), return processing
    return { status: 'processing' };
  }
};

// Check the Udio feed status directly
export const checkUdioFeedStatus = async (workId: string): Promise<UdioFeedApiResponse> => {
  try {
    // This is the direct polling approach to check song status
    const response = await fetch(`/api/check-feed/${workId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return { code: 202, message: 'processing' };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error checking Udio feed status for workId ${workId}:`, error);
    throw error;
  }
};

// Fetch all songs
export const getAllSongs = async () => {
  try {
    const response = await fetch('/api/songs');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching songs:', error);
    throw error;
  }
};

// Fetch a single song by ID
export const getSongById = async (id: string) => {
  try {
    const response = await fetch(`/api/songs/${id}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching song with ID ${id}:`, error);
    throw error;
  }
};
