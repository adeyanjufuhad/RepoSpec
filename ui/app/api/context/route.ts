import { z } from 'zod';
import { requireSameOrigin } from '@/lib/auth';
import { boundedJson } from '@/lib/hosted';
export const runtime = 'nodejs';
async function loadEngine() {
  try { return await import('../../../../src/snapshot'); }
  catch (error) { console.error('RepoSpec extraction engine failed to load', error); return null; }
}
export async function POST(request: Request) {
  try { requireSameOrigin(request); } catch { return Response.json({ error: 'Cross-site request rejected.' }, { status: 403 }); }
  const engine = await loadEngine();
  if (!engine) return Response.json({ error: 'The analysis engine could not start. Try again shortly.' }, { status: 503 });
  try {
    const { compileSnapshot, contextOptionsSchema, snapshotSchema } = engine;
    const { snapshot, options } = z.object({ snapshot: snapshotSchema, options: contextOptionsSchema }).parse(await boundedJson(request, 2 * 1024 * 1024));
    return Response.json(compileSnapshot(snapshot, options), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return Response.json({ error: 'Context could not be updated. Reanalyze the repository and try again.' }, { status: 400 }); }
}
