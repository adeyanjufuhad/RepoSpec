import { cookies } from 'next/headers';
import { requireSameOrigin, sessionCookie } from '@/lib/auth';
export async function POST(request: Request) {
  try { requireSameOrigin(request); } catch { return Response.json({ error: 'Cross-site request rejected.' }, { status: 403 }); }
  (await cookies()).delete(sessionCookie);
  return Response.json({ ok: true });
}
