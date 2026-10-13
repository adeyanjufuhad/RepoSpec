import { expect, it } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { watchWorkspace } from '../src/watcher.js';
const exec = promisify(execFile);
const cli = path.resolve('dist/cli.js');
const run = (args: string[]) => exec(process.execPath, [cli, ...args]);
it('supports init, dry-run, generate, config override and doctor drift', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'repospec-cli-'));
  try {
    await writeFile(path.join(root, 'types.ts'), 'export interface Account { id: string }');
    const args = ['--cwd', root, '--config', 'custom.json'];
    const dry = await run(['init', ...args, '--dry-run', '--budget', '120']);
    expect(JSON.parse(dry.stdout).tokenBudget).toBe(120);
    await expect(readFile(path.join(root, 'custom.json'))).rejects.toThrow();
    await run(['init', ...args, '--budget', '120']);
    await run(['generate', ...args]);
    expect((await run(['doctor', ...args])).stdout).toContain('CURRENT');
    await writeFile(path.join(root, 'types.ts'), 'export interface Account { id: string; name: string }');
    await expect(run(['doctor', ...args])).rejects.toMatchObject({ code: 1 });
  } finally { await rm(root, { recursive: true, force: true }); }
}, 20000);
it('watcher rebuilds on edit and removes deleted contracts', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'repospec-watch-'));
  let watcher: Awaited<ReturnType<typeof watchWorkspace>> | undefined;
  try {
    await writeFile(path.join(root, 'types.ts'), 'export interface Initial { id: string }');
    watcher = await watchWorkspace(root, {}, () => {});
    await writeFile(path.join(root, 'types.ts'), 'export interface Changed { id: string }');
    const waitFor = async (expected: string) => {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const text = await readFile(path.join(root, '.ai-context.md'), 'utf8');
        if (text.includes(expected)) return;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error(`Watcher did not produce ${expected}`);
    };
    await waitFor('Changed');
    await rm(path.join(root, 'types.ts'));
    await waitFor('No matching contracts');
  } finally { await watcher?.close(); await rm(root, { recursive: true, force: true }); }
}, 15000);
