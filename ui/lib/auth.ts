import 'server-only';
import { cookies } from 'next/headers';
import { openSession, sealSession } from '../../src/session';

export interface UserSession { token: string; login: string; id: number; expires: number }
export const sessionCookie = 'repospec_session';
export const stateCookie = 'repospec_oauth';
export const authConfigured = () => !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET && (process.env.SESSION_SECRET?.length ?? 0) >= 32 && process.env.APP_URL);
export function appUrl() {
  const value = new URL(process.env.APP_URL ?? 'http://127.0.0.1:3000');
  if (!['http:', 'https:'].includes(value.protocol) || value.pathname !== '/') throw new Error('APP_URL must be the website origin.');
  return value.origin;
}
export function cookieOptions(maxAge: number) { return { httpOnly: true, secure: appUrl().startsWith('https:'), sameSite: 'lax' as const, path: '/', maxAge }; }
export async function userSession() {
  const jar = await cookies(), value = jar.get(sessionCookie)?.value, secret = process.env.SESSION_SECRET;
  return value && secret ? openSession<UserSession>(value, secret) : null;
}
export async function setUserSession(session: UserSession) {
  const jar = await cookies();
  jar.set(sessionCookie, sealSession(session, process.env.SESSION_SECRET!), cookieOptions(Math.floor((session.expires - Date.now()) / 1000)));
}
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const expected = process.env.APP_URL ? appUrl() : new URL(request.url).origin;
  if (!origin || origin !== expected) throw new Error('Open RepoSpec in this browser and try again. Cross-site requests are not allowed.');
}
