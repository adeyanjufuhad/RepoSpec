import 'server-only';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';
import { configSchema, loadConfig, safePath, type Config } from '../../src/config';
import { atomicWrite, readOptional, ScanEngine, syncOutputs } from '../../src/engine';

const globalServer = globalThis as unknown as { repospecServer?: { token: string; engine: ScanEngine; queue: Promise<unknown> } };
const server = globalServer.repospecServer ??= { token: randomBytes(32).toString('hex'), engine: new ScanEngine(), queue: Promise.resolve() };
export const sessionToken = () => server.token;
export const workspaceRoot = () => path.resolve(/* turbopackIgnore: true */ process.env.REPOSPEC_CWD ?? path.join(process.cwd(), '..'));
export const requestSchema = z.object({
  budget: z.number().int().min(0).max(1000000).optional(),
  disabledFiles: z.array(z.string().max(1024)).max(20000).optional(),
  disabledSections: configSchema.shape.disabledSections.optional(),
  output: z.array(z.string().min(1).max(1024)).min(1).max(10).optional(),
}).strict();
export type DashboardOptions = z.infer<typeof requestSchema>;
export function authorize(request: Request) {
  const host = request.headers.get('host');
  if (!host || !/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)) throw new Error('Localhost access is required.');
  const origin = request.headers.get('origin');
  if (origin && origin !== `http://${host}` && origin !== `https://${host}`) throw new Error('Cross-origin requests are not allowed.');
  const token = Buffer.from(request.headers.get('x-repospec-token') ?? '');
  const expected = Buffer.from(server.token);
  if (token.length !== expected.length || !timingSafeEqual(token, expected)) throw new Error('Session expired. Reload this local dashboard.');
}
export async function parseRequest(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new Error('JSON request required.');
  const body = await request.text();
  if (body.length > 256000) throw new Error('Request is too large.');
  return requestSchema.parse(JSON.parse(body));
}
export function serialized<T>(work: () => Promise<T>): Promise<T> {
  const result = server.queue.then(work, work);
  server.queue = result.catch(() => {});
  return result;
}
async function configuration(options: DashboardOptions) {
  const { root, config, notice } = await loadConfig(workspaceRoot());
  const next: Config = { ...config,
    ...(options.budget !== undefined ? { tokenBudget: options.budget } : {}),
    ...(options.disabledFiles ? { disabledFiles: options.disabledFiles } : {}),
    ...(options.disabledSections ? { disabledSections: options.disabledSections } : {}),
    ...(options.output ? { output: options.output } : {}),
  };
  for (const output of next.output) {
    await safePath(root, output);
    if (/\.(ts|tsx|js|jsx|json|prisma)$/i.test(output) || output === next.rulesFile || output.startsWith('.repospec/')) throw new Error('Choose a Markdown or rules output file, not source or configuration.');
  }
  return { root, config: next, notice };
}
export async function dashboardScan(options: DashboardOptions = {}) {
  const { root, config, notice } = await configuration(options);
  const result = await server.engine.scan(root, config);
  const previous = await readOptional(await safePath(root, config.output[0]));
  const state = await readOptional(await safePath(root, '.repospec/state.json'));
  let lastSync: string | null = null;
  try { lastSync = state ? JSON.parse(state).updated ?? null : null; } catch { /* interrupted or manually edited state */ }
  return { ...result, previous, lastSync, config, notice };
}
export type DashboardData = Awaited<ReturnType<typeof dashboardScan>>;
export async function dashboardSync(options: DashboardOptions) {
  const data = await dashboardScan(options);
  const { written } = await syncOutputs(data.root, data.config, data);
  await atomicWrite(data.root, '.repospec.json', JSON.stringify(data.config, null, 2) + '\n');
  return { ...data, previous: data.markdown, lastSync: data.updated, written };
}
