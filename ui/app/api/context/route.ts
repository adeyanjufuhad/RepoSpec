import { z } from 'zod';
import { requireSameOrigin } from '@/lib/auth';
import { boundedJson } from '@/lib/hosted';
import { compileSnapshot, contextOptionsSchema, snapshotSchema } from '../../../../src/snapshot';
export const runtime = 'nodejs';
const schema = z.object({ snapshot: snapshotSchema, options: contextOptionsSchema });
export async function POST(request: Request) {
  try { requireSameOrigin(request); } catch { return Response.json({ error: 'Cross-site request rejected.' }, { status: 403 }); }
  try {
    const { snapshot, options } = schema.parse(await boundedJson(request, 2 * 1024 * 1024));
    return Response.json(compileSnapshot(snapshot, options), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return Response.json({ error: 'Context could not be updated. Reanalyze the repository and try again.' }, { status: 400 }); }
}
