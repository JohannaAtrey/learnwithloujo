import { downloadAndSaveSong, getSongByWorkId, updateSong } from '@/lib/services/songs';
import { SongData } from '@/types';
import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    console.log("Udio webhook starting.........")
    const { searchParams } = new URL(req.url);

    const secret = searchParams.get('secret');
    const workId = searchParams.get('workId');

    if (secret !== process.env.UDIO_WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (!workId) {
      return new Response("Bad Request", { status: 400 });
    }
    
    const body = await req.json();
    if (body.status === 'SUCCESS') {
      const { data } = body;
      const completedSongs = data.filter((s: { status: string; audio_url: string; })  => s.status === 'complete' && s.audio_url);
      const song = completedSongs[0].duration > completedSongs[1].duration ? completedSongs[0] : completedSongs[1]
 
      if (song && song.status === 'complete' && song.audio_url) {
        const songRecord = await getSongByWorkId(workId);
        if (!songRecord) {
          return NextResponse.json({ status: 'error', error: 'Song record not found.' }, { status: 404 });
        }

        if (songRecord && songRecord.status !== 'complete') {
          const filenameBase = songRecord.id || workId;
          const localPath = await downloadAndSaveSong(song.audio_url, filenameBase);
            
          const updates: Partial<SongData> = {
            status: 'complete',
            udioId: song.id, 
            title: song.title || songRecord.title, 
            lyrics: song.prompt || songRecord.prompt, 
            tags: song.tags,
            imageUrl: song.image_url,
            audioUrl: song.audio_url,
            localPath: localPath,
            duration: song.duration,
            modelName: song.model_name,
            udioCreateTime: song.created_at ? new Date(song.created_at).toISOString() : undefined,
            errorMessage: undefined 
          };
        
          // Remove undefined properties before updating Firestore
          Object.keys(updates).forEach(key => (updates as Record<string, unknown>)[key] === undefined && delete (updates as Record<string, unknown>)[key]);
            
          // Update the song record in Firestore
          await updateSong(songRecord.id!, updates);
          
          return NextResponse.json({ status: 200, received: true, processed: true });
        }
      }

      return NextResponse.json({ status: 200, received: true, processed: false });
    } else if (body.fail_reason) {
      const errorMessage = body.fail_reason || 'Error processing song generation';
      console.error(`Udio feed indicates error for workId ${workId}: ${errorMessage}`);
      const songRecord = await getSongByWorkId(workId);
      if (songRecord) {
        await updateSong(songRecord.id!, { status: 'failed', errorMessage: errorMessage });
      }
    
      return NextResponse.json({ status: 400, error: errorMessage });
    }
    console.log(`Unhandled status type: ${body.status}`);
    return NextResponse.json({ status: 200, received: true, processed: false });
  } catch (error) {
    console.error('Webhook validation failed:', error);
    return NextResponse.json({ error: 'Invalid signature', status: 400 });
  }
}
