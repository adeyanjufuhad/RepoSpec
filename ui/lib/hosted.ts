import 'server-only';
const state = globalThis as unknown as { repospecHosted?: { active: number; rates: Map<string, { count: number; reset: number }> } };
const limits = state.repospecHosted ??= { active: 0, rates: new Map() };
export async function boundedJson(request: Request, limit: number) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new Error('JSON request required.');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Request body is missing.');
  let size = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > limit) throw new Error('Request is too large.'); chunks.push(value); }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { await reader.cancel().catch(() => {}); }
}
export function enterAnalysis(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anonymous';
  const now = Date.now();
  for (const [key, value] of limits.rates) if (value.reset < now) limits.rates.delete(key);
  const rate = limits.rates.get(ip) ?? { count: 0, reset: now + 600000 };
  if (rate.count >= 8 || limits.active >= 2 || limits.rates.size > 2000) throw new Error('Analysis is busy. Wait a moment and try again.');
  rate.count++; limits.rates.set(ip, rate); limits.active++;
  return () => { limits.active--; };
}
