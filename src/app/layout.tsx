// USED

import './globals.css'; // Import global styles
import type { Metadata } from 'next'; // Import the Metadata type from Next.js
import { Inter } from 'next/font/google'; // Import the Inter font from Next.js
import { Providers } from '@/components/Providers'; // Import the Providers component
import { Toaster } from 'sonner'; // Import the Toaster component
import SongNotificationProvider from '@/components/SongNotificationProvider';

// Load Inter font
const inter = Inter({
  subsets: ['latin'], // Specify the subsets of the font to load
  variable: '--font-inter', // Define a CSS variable for the font
});

// Metadata for the application
export const metadata: Metadata = {
  title: 'Learn with Loujo', // Set the title of the application
  description: 'A platform for music education in schools', // Set the description of the application
  keywords: 'education, dyslexia, music, ai, learning, children, songs', // Set the keywords for the application
  authors: [{ name: 'Loujo' }], // Set the author of the application
  openGraph: {
    title: 'Loujo - AI-Generated Educational Songs', // Set the title for Open Graph
    description: 'An educational platform with AI-generated songs designed to help dyslexic children learn through music using Udio AI. Aligned with the UK National Curriculum.', // Set the description for Open Graph
    type: 'website', // Set the type for Open Graph
    images: [
      {
        url: 'https://lovable.dev/opengraph-image-p98pqg.png', // Set the image URL for Open Graph
        width: 1200, // Set the width of the image
        height: 630, // Set the height of the image
        alt: 'Loujo - Educational Songs', // Set the alt text for the image
      },
    ],
  },
  twitter: {
    card: 'summary_large_image', // Set the card type for Twitter
    site: '@lovable_dev', // Set the site for Twitter
    images: ['https://lovable.dev/opengraph-image-p98pqg.png'], // Set the image URL for Twitter
  },
};

// RootLayout component
// This component is the root layout for the application
export default function RootLayout({
  children, 
}: {
  children: React.ReactNode; 
}) {
  return (
    <html lang="en" className={inter.variable}> 
      <body className="min-h-screen bg-background font-sans antialiased"> 
        <Providers> 
          <SongNotificationProvider>
            {children} 
          </SongNotificationProvider>
        </Providers>
        <Toaster /> 
      </body>
    </html>
  );
}
