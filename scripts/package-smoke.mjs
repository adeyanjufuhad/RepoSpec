import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const exec = promisify(execFile);
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this through npm run test:package.');
const runNpm = (args, cwd = process.cwd()) => exec(process.execPath, [npmCli, ...args], { cwd, maxBuffer: 4 * 1024 * 1024 });
const { stdout } = await runNpm(['pack', '--ignore-scripts', '--json']);
const [{ filename }] = JSON.parse(stdout);
const tarball = path.resolve(filename);
const consumer = await mkdtemp(path.join(os.tmpdir(), 'repospec-package-'));
try {
  await writeFile(path.join(consumer, 'package.json'), JSON.stringify({ name: 'repospec-consumer-check', version: '1.0.0', private: true }));
  await writeFile(path.join(consumer, 'types.ts'), 'export interface PackedContract { id: string; active: boolean }');
  await runNpm(['install', tarball, '--ignore-scripts', '--no-audit', '--no-fund', '--workspaces=false'], consumer);
  const bin = path.join(consumer, 'node_modules', '@adeyanjufuhad', 'repospec', 'dist', 'cli.js');
  await exec(process.execPath, [bin, 'generate', '--cwd', consumer]);
  const text = await readFile(path.join(consumer, '.ai-context.md'), 'utf8');
  if (!text.includes('interface PackedContract')) throw new Error('Installed package did not extract the consumer contract.');
  await exec(process.execPath, [bin, 'doctor', '--cwd', consumer]);
  console.log(`Packed consumer generate + doctor passed: ${filename}`);
} finally {
  const relative = path.relative(path.resolve(os.tmpdir()), path.resolve(consumer));
  if (!relative.startsWith('repospec-package-') || relative.includes(path.sep) || path.isAbsolute(relative)) throw new Error('Refusing cleanup outside the generated temporary consumer.');
  await rm(consumer, { recursive: true, force: true });
}
