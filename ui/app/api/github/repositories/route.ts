import { userSession } from '@/lib/auth';
import { githubJson, GitHubError, type GitHubRepository } from '../../../../../src/github';
export const runtime = 'nodejs';
export async function GET() {
  const session = await userSession();
  if (!session) return Response.json({ error: 'Sign in with GitHub first.' }, { status: 401 });
  try {
    const installations = await githubJson<{ installations: { id: number }[]; total_count: number }>('/user/installations?per_page=10', session.token);
    const repos: GitHubRepository[] = []; let more = installations.total_count > 10;
    for (const installation of installations.installations) {
      const result = await githubJson<{ repositories: GitHubRepository[]; total_count: number }>(`/user/installations/${installation.id}/repositories?per_page=100`, session.token);
      repos.push(...result.repositories); more ||= result.total_count > 100;
    }
    return Response.json({ repositories: [...new Map(repos.map(r => [r.id, { fullName: r.full_name, private: r.private, description: r.description }])).values()].sort((a, b) => a.fullName.localeCompare(b.fullName)), more }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return Response.json({ error: (error as Error).message }, { status: error instanceof GitHubError ? error.status : 502 }); }
}
