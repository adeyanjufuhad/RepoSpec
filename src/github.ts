import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import tar from 'tar-stream';
import { isSecret } from './config';

export class GitHubError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function parseGitHubRepo(input: string) {
  const value = input.trim();
  const match = value.match(/^(?:https:\/\/github\.com\/)?([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9_.-]{1,100}?)(?:\.git)?\/?$/);
  if (!match || ['.', '..'].includes(match[2])) throw new GitHubError('Enter a GitHub repository URL or owner/repository.');
  return { owner: match[1], repo: match[2], fullName: `${match[1]}/${match[2]}` };
}
export function sourcePath(value: string) {
  if (!value || value.startsWith('/') || value.includes('\\') || value.includes('\0') || value.split('/').some(p => p === '..') || isSecret(value)) return false;
  if (value.split('/').some(p => ['node_modules', '.git', '.next', 'dist', 'build', 'coverage', 'vendor'].includes(p))) return false;
  return value === '.repospec/rules.md' || (/\.(prisma|ts|tsx|mts|cts)$/.test(value) && !/\.(test|spec|d)\.[cm]?tsx?$/.test(value));
}
export async function githubJson<T>(endpoint: string, token?: string): Promise<T> {
  const response = await fetch(`https://api.github.com${endpoint}`, { headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'RepoSpec', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, cache: 'no-store', signal: AbortSignal.timeout(15000), redirect: 'error' });
  if (!response.ok) {
    if (response.status === 401) throw new GitHubError('Your GitHub session expired. Sign in again.', 401);
    if (response.status === 404) throw new GitHubError('Repository not found or not accessible. For a private repo, sign in and grant the GitHub App access.', 404);
    if (response.status === 403 || response.status === 429) throw new GitHubError('GitHub has limited this request. Check app access, sign in, or try again later.', 429);
    throw new GitHubError('GitHub could not complete the request. Try again shortly.', 502);
  }
  return response.json() as Promise<T>;
}
export interface GitHubRepository { id: number; full_name: string; name: string; private: boolean; html_url: string; default_branch: string; description: string | null }
export function archiveRedirect(location: string) {
  const url = new URL(location);
  if (url.protocol !== 'https:' || url.hostname !== 'codeload.github.com' || url.port || url.username || url.password) throw new GitHubError('GitHub returned an unexpected archive location.', 502);
  return url;
}
export async function readArchive(body: ReadableStream<Uint8Array>) {
  const sources: { path: string; content: string }[] = [], warnings: string[] = [];
  const extract = tar.extract();
  let sourceBytes = 0, archiveBytes = 0, compressedBytes = 0;
  const compressedLimit = new Transform({ transform(chunk, _encoding, callback) { compressedBytes += chunk.length; callback(compressedBytes > 12 * 1024 * 1024 ? new GitHubError('Repository archive exceeds the 12 MB download limit. Choose a smaller repository.') : null, chunk); } });
  const expandedLimit = new Transform({ transform(chunk, _encoding, callback) { archiveBytes += chunk.length; callback(archiveBytes > 48 * 1024 * 1024 ? new GitHubError('Repository archive exceeds the 48 MB expanded limit. Choose a smaller repository.') : null, chunk); } });
  extract.on('entry', (header, stream, next) => {
    const relative = header.name.split('/').slice(1).join('/');
    if (header.type !== 'file' || !sourcePath(relative)) { stream.resume(); stream.on('end', next); return; }
    if ((header.size ?? 0) > 128 * 1024 || sources.length >= 300) { warnings.push(`${relative}: skipped due to file size or the 300-file limit.`); stream.resume(); stream.on('end', next); return; }
    const chunks: Buffer[] = [];
    stream.on('data', (data: unknown) => { const chunk = Buffer.from(data as Uint8Array); sourceBytes += chunk.length; if (sourceBytes > 4 * 1024 * 1024) { extract.destroy(new GitHubError('Extractable source exceeds the 4 MB limit. Choose a smaller repository.')); return; } chunks.push(chunk); });
    stream.on('end', () => { sources.push({ path: relative, content: Buffer.concat(chunks).toString('utf8') }); next(); });
    stream.on('error', error => extract.destroy(error));
  });
  await pipeline(Readable.fromWeb(body as import('node:stream/web').ReadableStream<Uint8Array>), compressedLimit, createGunzip(), expandedLimit, extract, { signal: AbortSignal.timeout(30000) });
  return { sources, warnings };
}
export async function fetchGitHubSnapshot(input: string, ref: string | undefined, token?: string) {
  const parsed = parseGitHubRepo(input);
  const repository = await githubJson<GitHubRepository>(`/repos/${parsed.fullName}`, token);
  if (repository.private && !token) throw new GitHubError('Sign in with GitHub to analyze this private repository.', 401);
  const branch = ref?.trim() || repository.default_branch;
  if (!branch || branch.length > 200 || /[\0-\x1f]/.test(branch)) throw new GitHubError('Enter a valid branch, tag, or commit.');
  const commit = await githubJson<{ sha: string }>(`/repos/${parsed.fullName}/commits/${encodeURIComponent(branch)}`, token);
  if (!/^[a-f0-9]{40}$/i.test(commit.sha)) throw new GitHubError('GitHub returned an invalid commit identifier.', 502);
  let response: Response;
  if (repository.private) {
    response = await fetch(`https://api.github.com/repos/${parsed.fullName}/tarball/${commit.sha}`, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'RepoSpec', Accept: 'application/vnd.github+json' }, redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (response.status === 302) {
      const location = response.headers.get('location');
      if (!location) throw new GitHubError('GitHub did not supply a repository archive.', 502);
      response = await fetch(archiveRedirect(location), { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(30000) });
    }
  } else response = await fetch(`https://codeload.github.com/${parsed.fullName}/tar.gz/${commit.sha}`, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(30000) });
  if (!response.ok || !response.body) throw new GitHubError('The repository archive is unavailable. Check GitHub App access or try another repository.', 502);
  return { ...await readArchive(response.body), repository: { fullName: repository.full_name, private: repository.private, url: repository.html_url, description: repository.description, branch, commit: commit.sha } };
}
