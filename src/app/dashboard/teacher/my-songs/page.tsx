// Teacher-facing page that displays a list of songs the user has generated.
// Uses the MySongsList component to fetch and render song data.

'use client';

import MySongsList from '@/components/teacher/MySongsList'; 

export default function MySongsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">My Generated Songs</h1>
      <MySongsList />
    </div>
  );
}
