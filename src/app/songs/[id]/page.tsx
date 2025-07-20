// This page component simply renders the SongDetailsPage component,
// which displays detailed information about a specific song.
// The actual logic and UI are handled inside SongDetailsPage.

'use client';

import React from 'react';
import SongDetailsPage from '@/components/SongDetailsPage';

export default function SongPage() {
  return <SongDetailsPage />;
}
