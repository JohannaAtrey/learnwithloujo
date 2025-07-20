// Page for generating new educational songs using a custom form.
// Includes UI for user input and integration with the Udio import system.

'use client';

import React from 'react';
import GenerateMusicForm from '@/components/dashboard/GenerateMusicForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function GenerateSongsPage() {

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[#e55283]">Song Generation</h1>
      <p className="text-muted-foreground mb-6">
        Create new educational songs or import existing ones from Udio.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>🎵 Create Your Own Song</CardTitle>
          <CardDescription>Describe a song you would like to create!</CardDescription>
        </CardHeader>
        <CardContent>
          <GenerateMusicForm />
        </CardContent>
      </Card>
      
    </div>
  );
}
