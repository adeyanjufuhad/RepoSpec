#!/usr/bin/env node
import { Command, InvalidArgumentError } from 'commander';
import { mkdir, writeFile, chmod } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { DEFAULT_CONFIG, detectWorkspace, loadConfig, safePath } from './config';
import { readOptional, ScanEngine, syncOutputs } from './engine';
import { watchWorkspace } from './watcher';

const exec = promisify(execFile);
const program = new Command().name('repospec').description('Local, token-budgeted context for AI code assistants.').version('0.1.0');
function integer(value: string) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n > 1000000) throw new InvalidArgumentError('Expected an integer up to 1000000. Use 0 for unlimited.');
  return n;
}
function common(command: Command) {
  return command.option('--cwd <directory>', 'Workspace directory (auto-detected by default)')
    .option('--config <path>', 'Configuration file relative to the workspace')
    .option('--budget <tokens>', 'Token cap; zero or negative means unlimited', integer)
    .option('--dry-run', 'Print output without changing files')
    .option('--verbose', 'Print detailed diagnostics');
}
type Options = { cwd?: string; config?: string; budget?: number; dryRun?: boolean; verbose?: boolean; hook?: boolean };
async function workspace(options: Options) { return options.cwd ? path.resolve(options.cwd) : detectWorkspace(process.cwd()); }
async function run(options: Options) {
  const loaded = await loadConfig(await workspace(options), options.config, options.budget);
  if (loaded.notice) console.error(loaded.notice);
  const result = await new ScanEngine().scan(loaded.root, loaded.config);
  result.warnings.forEach(w => console.error(`Warning: ${w}`));
  if (options.verbose) console.error(`Scanned ${result.files.length} files; parsed ${result.parsedFiles} in ${result.durationMs} ms. Workspace: ${loaded.root}`);
  return { ...loaded, result };
}
common(program.command('generate').description('Extract contracts and write AI context files')).action(async (options: Options) => {
  const { root, config, result } = await run(options);
  if (options.dryRun) { process.stdout.write(result.markdown); return; }
  const { written } = await syncOutputs(root, config, result);
  console.log(`${written.length ? `Wrote ${written.join(', ')}` : 'Context is already current'} (${result.tokens} tokens).`);
});
common(program.command('doctor').description('Report missing or stale context files')).action(async (options: Options) => {
  const { root, config, result } = await run(options);
  let drift = false;
  for (const output of config.output) {
    const existing = await readOptional(await safePath(root, output));
    const state = existing === null ? 'MISSING' : existing !== result.markdown ? 'STALE' : 'CURRENT';
    console.log(`${state} ${output}`);
    drift ||= state !== 'CURRENT';
  }
  if (drift) { console.log('Run repospec generate to refresh context.'); process.exitCode = 1; }
});
common(program.command('watch').description('Continuously rebuild changed source contracts')).action(async (options: Options) => {
  const watcher = await watchWorkspace(await workspace(options), options);
  const stop = async () => { await watcher.close(); };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
});
common(program.command('init').description('Create config and optionally install a fail-open Git hook')).option('--hook', 'Install post-commit hook without replacing an existing hook').action(async (options: Options) => {
  const root = await workspace(options);
  const relative = options.config ?? '.repospec.json';
  const target = await safePath(root, relative);
  const config = { ...DEFAULT_CONFIG, tokenBudget: options.budget ?? DEFAULT_CONFIG.tokenBudget };
  const json = JSON.stringify(config, null, 2) + '\n';
  if (options.dryRun) { process.stdout.write(json); return; }
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, json, { flag: 'wx' });
  console.log(`Created ${relative}.`);
  if (options.hook) {
    const { stdout } = await exec('git', ['rev-parse', '--git-path', 'hooks/post-commit'], { cwd: root });
    const hook = path.resolve(root, stdout.trim());
    await mkdir(path.dirname(hook), { recursive: true });
    const text = '#!/bin/sh\n# RepoSpec: fail-open; never downloads or installs packages.\nif command -v repospec >/dev/null 2>&1; then\n  repospec generate >/dev/null 2>&1 || printf "%s\\n" "RepoSpec: context refresh failed; commit was preserved." >&2\nelse\n  printf "%s\\n" "RepoSpec: install the CLI on PATH to enable context refresh." >&2\nfi\nexit 0\n';
    await writeFile(hook, text, { flag: 'wx', mode: 0o755 });
    await chmod(hook, 0o755);
    console.log('Installed fail-open post-commit hook.');
  }
});
program.parseAsync().catch(error => { console.error(`RepoSpec: ${(error as Error).message}`); process.exitCode = 1; });

