// API route to check the status of a generated song by workId. If completed, it downloads the audio, saves it locally, updates Firestore with full song metadata, and returns the result.
import { NextRequest, NextResponse } from 'next/server';
import { getSongByWorkId, updateSong, getSongById, downloadAndSaveSong } from '@/lib/services/songs'; 
import { SongData } from '@/types'; 

interface UdioSongData {
  id: string;
  status: 'complete' | 'error' | 'processing';
  audio_url?: string;
  title?: string;
  prompt?: string;
  tags?: string[];
  image_url?: string;
  duration?: number;
  model_name?: string;
  created_at?: string;
  fail_message?: string;
  error_message?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { workId: string } }  
): Promise<NextResponse> {
  const { workId } = params;
  if (!workId) {
    return NextResponse.json({ error: 'Missing workId parameter' }, { status: 400 });
  }

  try {
    // 1. Check Firestore first using workId
    const songRecord = await getSongByWorkId(workId);

    if (!songRecord) {
      console.warn(`No song record found in Firestore for workId ${workId}.`);
      return NextResponse.json({ status: 'error', error: 'Song record not found.' }, { status: 404 });
    }

    // 2. If already complete, return it
    if (songRecord.status === 'complete') {
      return NextResponse.json({ status: 'complete', song: songRecord });
    }

    // 3. If previously failed, return error
    if (songRecord.status === 'failed') {
      return NextResponse.json({ status: 'error', error: songRecord.errorMessage || 'Processing previously failed.' });
    }

    // 4. If still processing, check Udio feed API
    if (songRecord.status === 'processing') {
      // console.log(`Checking Udio feed for workId ${workId}...`);
      try {
        const apiKey = process.env.UDIO_API_KEY;
        if (!apiKey) {
          throw new Error('Missing API key configuration');
        }

        const feedResponse = await fetch(`${process.env.UDIO_URL}/v2/feed?workId=${workId}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
          next: { revalidate: 0 } 
        });

        if (!feedResponse.ok) {
          if (feedResponse.status === 404) {
            return NextResponse.json({ status: 'processing' }, { status: 200 }); 
          }
          throw new Error(`Udio API returned status ${feedResponse.status}`);
        }

        const feedData = await feedResponse.json();
      
        const udioSongData = feedData?.data?.response_data?.find(
          (s: UdioSongData) => s.status === 'complete' && s.audio_url 
        );


        if (udioSongData && udioSongData.status === 'complete' && udioSongData.audio_url) {
          const filenameBase = songRecord.id || workId;
          const localPath = await downloadAndSaveSong(udioSongData.audio_url, filenameBase);

          const updates: Partial<SongData> = {
            status: 'complete',
            udioId: udioSongData.id, 
            title: udioSongData.title || songRecord.title, 
            lyrics: udioSongData.prompt || songRecord.prompt, 
            tags: udioSongData.tags,
            imageUrl: udioSongData.image_url,
            audioUrl: udioSongData.audio_url,
            localPath: localPath,
            duration: udioSongData.duration,
            modelName: udioSongData.model_name,
            udioCreateTime: udioSongData.created_at ? new Date(udioSongData.created_at).toISOString() : undefined,
            errorMessage: undefined 
          };

          // Remove undefined properties before updating Firestore
          Object.keys(updates).forEach(key => (updates as Record<string, unknown>)[key] === undefined && delete (updates as Record<string, unknown>)[key]);

          // Update the song record in Firestore
          await updateSong(songRecord.id!, updates); // Use non-null assertion for id as we found the record

          // Fetch the fully updated record to return
          const updatedSong = await getSongById(songRecord.id!);
          return NextResponse.json({ status: 'complete', song: updatedSong });

        } else if (udioSongData && (udioSongData.status === 'error' || udioSongData.fail_message)) {
           // Handle Udio processing error
           const errorMessage = udioSongData.fail_message || udioSongData.error_message || 'Udio processing failed';
           console.error(`Udio feed indicates error for workId ${workId}: ${errorMessage}`);
           await updateSong(songRecord.id!, { status: 'failed', errorMessage: errorMessage });
           return NextResponse.json({ status: 'error', error: errorMessage });
        } else {
          return NextResponse.json({ status: 'processing' });
        }

      } catch (feedError: unknown) {
        console.error(`Error checking Udio feed or processing result for workId ${workId}:`, feedError);
        const errorMessage = feedError instanceof Error ? feedError.message : 'Unknown error';
        return NextResponse.json(
          {
            status: 'error',
            error: 'Error communicating with Udio API',
            details: errorMessage
          },
          { status: 500 }
        );
      }
    } else {
       // Should not happen if status is only processing, complete, or failed
       console.error(`Unexpected song status found for workId ${workId}: ${songRecord.status}`);
       return NextResponse.json({ status: 'error', error: 'Unexpected song status.' }, { status: 500 });
    }
  } catch (error: unknown) {
    console.error(`Error checking song status for workId ${workId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Error checking song status',
        details: errorMessage
      }, 
      { status: 500 }
    );
  }
}
