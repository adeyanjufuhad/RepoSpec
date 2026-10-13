import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { appUrl, authConfigured, cookieOptions, stateCookie } from '@/lib/auth';
import { sealSession } from '../../../../../src/session';
export const runtime = 'nodejs';
export async function GET() {
  if (!authConfigured()) return Response.redirect(`${appUrl()}/app?auth=setup-required`, 303);
  const state = randomBytes(32).toString('base64url');
  const jar = await cookies();
  jar.set(stateCookie, sealSession({ state, expires: Date.now() + 600000 }, process.env.SESSION_SECRET!), cookieOptions(600));
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', process.env.GITHUB_CLIENT_ID!);
  url.searchParams.set('redirect_uri', `${appUrl()}/api/auth/github/callback`);
  url.searchParams.set('state', state);
  return Response.redirect(url, 303);
}
