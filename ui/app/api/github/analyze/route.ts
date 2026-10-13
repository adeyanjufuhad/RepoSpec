import { z } from 'zod';
import { requireSameOrigin, userSession } from '@/lib/auth';
import { boundedJson, enterAnalysis } from '@/lib/hosted';
import { fetchGitHubSnapshot, GitHubError } from '../../../../../src/github';
import { compileSnapshot, contextOptionsSchema, extractSnapshot } from '../../../../../src/snapshot';
export const runtime = 'nodejs';
export const maxDuration = 60;
const schema = z.object({ repository: z.string().min(1).max(300), ref: z.string().max(200).optional() });
export async function POST(request: Request) {
  try { requireSameOrigin(request); } catch { return Response.json({ error: 'Cross-site request rejected.' }, { status: 403 }); }
  let release: (() => void) | undefined;
  try {
    const { repository, ref } = schema.parse(await boundedJson(request, 4096));
    release = enterAnalysis(request);
    const session = await userSession();
    const started = performance.now();
    const imported = await fetchGitHubSnapshot(repository, ref, session?.token);
    const snapshot = extractSnapshot(imported.sources);
    const result = compileSnapshot(snapshot, contextOptionsSchema.parse({}));
    const body = JSON.stringify({ snapshot, result, repository: imported.repository, importWarnings: imported.warnings, durationMs: Math.round(performance.now() - started) });
    if (Buffer.byteLength(body) > 2 * 1024 * 1024) throw new GitHubError('Extracted contracts exceed the 2 MB response limit. Choose a smaller repository.');
    return new Response(body, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' } });
  } catch (error) { return Response.json({ error: error instanceof GitHubError || error instanceof z.ZodError ? error.message : 'Analysis could not finish. Check the repository and try again.' }, { status: error instanceof GitHubError ? error.status : 400 }); }
  finally { release?.(); }
}
