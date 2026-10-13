import { afterEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DEFAULT_CONFIG, loadConfig, safePath } from '../src/config.js';
import { ScanEngine, syncOutputs } from '../src/engine.js';
const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.map(d => rm(d, { recursive: true, force: true }))); dirs.length = 0; });
async function fixture() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'repospec-test-')); dirs.push(dir);
  await mkdir(path.join(dir, 'app/api/users'), { recursive: true });
  await writeFile(path.join(dir, 'app/api/users/route.ts'), 'export async function GET(): Promise<User[]> { return []; }');
  await writeFile(path.join(dir, 'types.ts'), 'export interface User { id: string; email: string }');
  await writeFile(path.join(dir, 'schema.prisma'), 'model User {\n id String @id\n email String @unique\n}');
  await writeFile(path.join(dir, '.env.ts'), 'export type SECRET = "must not leak"');
  await writeFile(path.join(dir, 'broken.ts'), 'export interface {');
  return dir;
}
it('runs full pipeline, caches unchanged files, skips secrets, and detects modifications', async () => {
  const root = await fixture(); const engine = new ScanEngine();
  const first = await engine.scan(root, DEFAULT_CONFIG);
  expect(first.counts).toMatchObject({ database: 1, routes: 1, types: 1 });
  expect(first.warnings).toContain('broken.ts: Could not parse source; skipped this file.');
  expect(first.markdown).not.toContain('SECRET');
  expect(first.tokens).toBeLessThanOrEqual(2500);
  await syncOutputs(root, DEFAULT_CONFIG, first);
  expect(await readFile(path.join(root, '.ai-context.md'), 'utf8')).toBe(first.markdown);
  const second = await engine.scan(root, DEFAULT_CONFIG);
  expect(second.parsedFiles).toBe(0); expect(second.markdown).toBe(first.markdown);
  await writeFile(path.join(root, 'types.ts'), 'export interface User { id: string; active: boolean }');
  const changed = await engine.scan(root, DEFAULT_CONFIG);
  expect(changed.parsedFiles).toBe(1); expect(changed.markdown).not.toBe(first.markdown);
  const excluded = await engine.scan(root, DEFAULT_CONFIG, { disabledFiles: ['types.ts'], disabledSections: ['routes'] });
  expect(excluded.counts.types).toBe(0); expect(excluded.counts.routes).toBe(0);
});
it('protects unmanaged output and rejects traversal/source overwrites', async () => {
  const root = await fixture();
  await expect(safePath(root, '../outside.md')).rejects.toThrow('Unsafe');
  await expect(safePath(root, '.env')).rejects.toThrow('Unsafe');
  await writeFile(path.join(root, '.repospec.json'), JSON.stringify({ output: ['types.ts'] }));
  await expect(loadConfig(root)).rejects.toThrow('not source/config');
  await writeFile(path.join(root, '.ai-context.md'), 'Keep my notes');
  const result = await new ScanEngine().scan(root, DEFAULT_CONFIG);
  await expect(syncOutputs(root, DEFAULT_CONFIG, result)).rejects.toThrow('unmanaged');
  expect(await readFile(path.join(root, '.ai-context.md'), 'utf8')).toBe('Keep my notes');
});
