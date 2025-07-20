'use client';

import { useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase'
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

export default function SongNotificationProvider({ children }: { children: React.ReactNode }) {
  const { fbUser } = useAuth();

  useEffect(() => {
    if (!fbUser?.uid) return;

    const q = query(
      collection(firestore, 'songs'),
      where('creatorId', '==', fbUser.uid),
      where('read', '==', false),
      where('status', 'in', ['complete', 'failed'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const song = change.doc.data();
          const songId = change.doc.id;
          const status = song.status;

          if (status === 'complete') {
            toast.custom((t) => (
              <div
                className="bg-green-300 text-green-800 p-4 rounded shadow-md flex items-center gap-2"
                onClick={() => toast.dismiss(t)}
              >
                Your generated song is now available!.
              </div>
            ),{
                position: 'top-right'
            });
          } else if (status === 'failed') {
            toast.custom((t) => (
              <div
                className="bg-red-300 text-red-800 p-4 rounded shadow-md flex items-center gap-2"
                onClick={() => toast.dismiss(t)}
              >
                Failed to Generate song. Please try again!.
              </div>
            ),{
                position: 'top-right'
            });
          } 
          await updateDoc(doc(firestore, 'songs', songId), { read: true });
        }
      });
    });

    return () => unsubscribe();
  }, [fbUser]);

  return <>{children}</>;
}
