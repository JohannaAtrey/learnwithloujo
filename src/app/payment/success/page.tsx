'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export default function SuccessPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const hasRun = useRef(false);
    const [completed, setCompleted] = useState(false);
    const { fbUser } = useAuth();

    useEffect(() => {
        if (!fbUser) return;

        const redirectFlowId = searchParams.get('redirect_flow_id');
        if (!redirectFlowId) {
            router.replace('/error');
            return;
        }

        if (hasRun.current) {
            if (completed) {
                router.replace('/dashboard/school-admin');
            }
            return;
        }
        hasRun.current = true
        const completeFlow = async () => {
            try {
                const idToken = await fbUser.getIdToken();
                const res = await fetch('/api/gocardless/complete-flow', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({ redirectFlowId }),
                });
  
                if (!res.ok) {
                    const error = await res.json();
                    throw new Error(error);
                }

                setCompleted(true);
                router.replace('/dashboard/school-admin');
            } catch (err) {
                console.error('Error completing flow:', err);
            }
        };

        completeFlow();
    }, [searchParams, router, fbUser, completed]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Processing...</h1>
                <p className="text-gray-600">Please wait while we redirect you.</p>
            </div>
        </div>
    );
}