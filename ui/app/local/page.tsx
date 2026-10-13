import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Dashboard from '@/components/dashboard';
import { sessionToken } from '@/lib/server';
export const dynamic = 'force-dynamic';
export default function LocalPage() {
  if (process.env.REPOSPEC_LOCAL_ENABLED !== 'true') notFound();
  return <Suspense fallback={<div className="p-10">Loading workspace…</div>}><Dashboard token={sessionToken()}/></Suspense>;
}
