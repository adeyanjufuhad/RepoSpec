import { Suspense } from 'react';
import Dashboard from '@/components/dashboard';
import { sessionToken } from '@/lib/server';
export const dynamic = 'force-dynamic';
export default function Page() {
  return <Suspense fallback={<div className="p-10">Loading workspace…</div>}><Dashboard token={sessionToken()} /></Suspense>;
}
