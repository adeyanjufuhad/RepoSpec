import { authConfigured, userSession } from '@/lib/auth';
export const runtime = 'nodejs';
export async function GET() {
  const session = await userSession();
  return Response.json({ configured: authConfigured(), user: session ? { login: session.login } : null, installUrl: process.env.GITHUB_APP_SLUG ? `https://github.com/apps/${encodeURIComponent(process.env.GITHUB_APP_SLUG)}/installations/new` : null }, { headers: { 'Cache-Control': 'private, no-store' } });
}
