import { cookies } from 'next/headers';
import { appUrl, authConfigured, setUserSession, stateCookie } from '@/lib/auth';
import { openSession, sameSecret } from '../../../../../../src/session';
import { githubJson } from '../../../../../../src/github';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  const jar = await cookies();
  const encoded = jar.get(stateCookie)?.value;
  jar.delete(stateCookie);
  if (!authConfigured()) return Response.redirect(`${appUrl()}/app?auth=setup-required`, 303);
  const state = encoded ? openSession<{ state: string; expires: number }>(encoded, process.env.SESSION_SECRET!) : null;
  const query = new URL(request.url).searchParams;
  if (!state || !query.get('state') || !sameSecret(state.state, query.get('state')!) || !query.get('code') || query.has('error')) return Response.redirect(`${appUrl()}/app?auth=cancelled`, 303);
  try {
    const response = await fetch('https://github.com/login/oauth/access_token', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code: query.get('code'), redirect_uri: `${appUrl()}/api/auth/github/callback` }), cache: 'no-store', signal: AbortSignal.timeout(15000) });
    const data = await response.json() as { access_token?: string; expires_in?: number; error?: string };
    if (!response.ok || !data.access_token || data.error) throw new Error('GitHub authorization failed.');
    const user = await githubJson<{ id: number; login: string }>('/user', data.access_token);
    if (!Number.isSafeInteger(user.id) || !/^[A-Za-z0-9-]{1,39}$/.test(user.login)) throw new Error('Invalid account response.');
    await setUserSession({ token: data.access_token, login: user.login, id: user.id, expires: Date.now() + Math.min(data.expires_in ?? 28800, 28800) * 1000 });
    return Response.redirect(`${appUrl()}/app`, 303);
  } catch { return Response.redirect(`${appUrl()}/app?auth=failed`, 303); }
}
