import { expect, it } from 'vitest';
import { Readable } from 'node:stream';
import { gzipSync } from 'node:zlib';
import tar from 'tar-stream';
import { archiveRedirect, parseGitHubRepo, readArchive, sourcePath } from '../src/github';
import { compileSnapshot, extractSnapshot, snapshotSchema } from '../src/snapshot';
import { assertSameOrigin, openSession, sameSecret, sealSession } from '../src/session';

it('accepts GitHub repo identifiers and rejects arbitrary URLs and traversal', () => {
  expect(parseGitHubRepo('https://github.com/owner/project.git')).toEqual({ owner: 'owner', repo: 'project', fullName: 'owner/project' });
  for (const input of ['https://evil.test/a/b', 'http://github.com/a/b', 'https://github.com/a/b/tree/main', 'a/..', 'github.com@evil.test/a/b', 'a/b?token=x']) expect(() => parseGitHubRepo(input)).toThrow();
  expect(sourcePath('src/types.ts')).toBe(true);
  for (const file of ['../x.ts', 'src/.env.ts', 'node_modules/x.ts', 'src/x.test.ts', 'src/x.d.ts', 'src/secrets.ts']) expect(sourcePath(file)).toBe(false);
  expect(() => archiveRedirect('https://evil.test/archive')).toThrow();
  expect(() => archiveRedirect('http://codeload.github.com/a/b')).toThrow();
});
it('reads bounded archive source without extracting secrets, tests or symlinks', async () => {
  const pack = tar.pack(); const chunks: Buffer[] = [];
  pack.on('data', chunk => chunks.push(Buffer.from(chunk as Uint8Array)));
  const done = new Promise<void>(resolve => pack.on('end', resolve));
  pack.entry({ name: 'repo/src/types.ts' }, 'export interface Item { id: string }');
  pack.entry({ name: 'repo/.env.ts' }, 'SECRET');
  pack.entry({ name: 'repo/src/types.test.ts' }, 'TEST');
  pack.entry({ name: 'repo/link.ts', type: 'symlink', linkname: '/etc/passwd' });
  pack.entry({ name: 'repo/../escape.ts' }, 'ESCAPE');
  pack.finalize(); await done;
  const body = Readable.toWeb(Readable.from(gzipSync(Buffer.concat(chunks)))) as ReadableStream<Uint8Array>;
  const result = await readArchive(body);
  expect(result.sources).toEqual([{ path: 'src/types.ts', content: 'export interface Item { id: string }' }]);
});
it('compiles extracted snapshots with file and section overrides under budget', () => {
  const snapshot = extractSnapshot([{ path: 'src/types.ts', content: 'export interface Item { id: string; name: string }' }, { path: 'prisma/schema.prisma', content: 'model Item {\n id String @id\n name String\n}' }]);
  expect(snapshotSchema.parse(snapshot)).toEqual(snapshot);
  const included = compileSnapshot(snapshot, { budget: 100, disabledFiles: [], disabledSections: [] });
  expect(included.tokens).toBeLessThanOrEqual(100);
  expect(included.markdown).toContain('Table Item');
  const excluded = compileSnapshot(snapshot, { budget: 2500, disabledFiles: ['src/types.ts'], disabledSections: ['database'] });
  expect(excluded.counts).toMatchObject({ database: 0, types: 0 });
});
it('seals credentials, rejects tampering and expires sessions', () => {
  const secret = 'a-secret-of-at-least-thirty-two-characters';
  const session = { token: 'github-user-token', expires: Date.now() + 10000 };
  const sealed = sealSession(session, secret);
  expect(sealed).not.toContain('github-user-token');
  expect(openSession(sealed, secret)).toEqual(session);
  expect(openSession('x' + sealed.slice(1), secret)).toBeNull();
  expect(openSession(sealed, 'a-different-secret-of-thirty-two-characters')).toBeNull();
  expect(openSession(sealSession({ expires: Date.now() - 1 }, secret), secret)).toBeNull();
  expect(sameSecret('state-a', 'state-b')).toBe(false);
});
it('checks the browser origin against the actual Host instead of an internal proxy URL', () => {
  expect(() => assertSameOrigin(new Request('http://localhost:3000/api/context', { headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' } }))).not.toThrow();
  expect(() => assertSameOrigin(new Request('http://localhost:3000/api/context', { headers: { host: 'example.vercel.app', origin: 'https://example.vercel.app' } }))).not.toThrow();
  for (const origin of ['https://evil.test', 'null', 'https://example.vercel.app.evil.test', 'https://example.vercel.app/path']) expect(() => assertSameOrigin(new Request('https://example.vercel.app/api/context', { headers: { host: 'example.vercel.app', origin } }))).toThrow();
});
