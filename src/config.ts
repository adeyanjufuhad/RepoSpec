import { readFile, realpath, lstat } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

export const configSchema = z.object({
  tokenBudget: z.number().int().max(1000000).default(2500),
  output: z.array(z.string().min(1)).min(1).default(['.cursorrules', '.ai-context.md']),
  include: z.array(z.string().min(1)).default(['**/*.prisma', '**/*.{ts,tsx}']),
  exclude: z.array(z.string()).default(['**/*.test.*', '**/*.spec.*', '**/tests/**', '**/ui/**']),
  rulesFile: z.string().default('.repospec/rules.md'),
  xmlTags: z.boolean().default(false),
  disabledFiles: z.array(z.string()).default([]),
  disabledSections: z.array(z.enum(['database', 'routes', 'types', 'rules'])).default([]),
}).strict();
export type Config = z.infer<typeof configSchema>;
export const DEFAULT_CONFIG = configSchema.parse({});
export const ALWAYS_IGNORE = ['**/node_modules/**', '**/.git/**', '**/.next/**', '**/dist/**', '**/coverage/**', '**/.repospec/**', '**/.env*', '**/*.{pem,key,p12,pfx}', '**/credentials*', '**/secrets*', '**/*.min.*', '**/package-lock.json'];
export const slash = (p: string) => p.replaceAll('\\', '/');
export function isSecret(p: string) {
  return slash(p).split('/').some(s => /^\.env/i.test(s) || /^(credentials|secrets)(\.|$)/i.test(s) || /\.(pem|key|p12|pfx)$/i.test(s));
}
export function inside(root: string, target: string) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}
/** Validate existing ancestors too, so symlinked output directories cannot escape. */
export async function safePath(root: string, relative: string): Promise<string> {
  if (path.isAbsolute(relative) || isSecret(relative)) throw new Error(`Unsafe workspace path: ${relative}`);
  const target = path.resolve(root, relative);
  if (!inside(root, target) || target === root || slash(relative).split('/').includes('.git')) throw new Error(`Unsafe workspace path: ${relative}`);
  const canonicalRoot = await realpath(root);
  let current = target;
  while (current !== path.dirname(current)) {
    try {
      const stat = await lstat(current);
      if (stat.isSymbolicLink()) throw new Error(`Symlink paths are not supported: ${relative}`);
      const canonical = await realpath(current);
      if (!inside(canonicalRoot, canonical)) throw new Error(`Path leaves workspace: ${relative}`);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      current = path.dirname(current);
    }
  }
  return target;
}
export async function detectWorkspace(start: string): Promise<string> {
  let dir = path.resolve(start);
  let nearest = dir;
  let found = false;
  while (true) {
    for (const filename of ['.repospec.json', 'pnpm-workspace.yaml']) {
      try { await lstat(path.join(/* turbopackIgnore: true */ dir, filename)); return dir; } catch { /* search upwards */ }
    }
    try {
      const pkg = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'));
      if (pkg.workspaces || pkg.repospec) return dir;
      if (!found) { nearest = dir; found = true; }
    } catch { /* not a package */ }
    if (dir === path.dirname(dir)) return nearest;
    dir = path.dirname(dir);
  }
}
export async function loadConfig(cwd: string, configPath?: string, budget?: number) {
  const root = await realpath(path.resolve(cwd));
  let raw: unknown;
  let notice: string | undefined;
  const configFile = path.resolve(root, configPath ?? '.repospec.json');
  try { raw = JSON.parse(await readFile(/* turbopackIgnore: true */ configFile, 'utf8')); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || configPath) throw new Error(`Cannot read config ${configFile}: ${(error as Error).message}`);
    try { raw = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).repospec; } catch { /* defaults */ }
    if (!raw) notice = 'No RepoSpec config found; using local defaults.';
  }
  const config = configSchema.parse(raw ?? {});
  if (budget !== undefined) config.tokenBudget = configSchema.shape.tokenBudget.parse(budget);
  for (const output of config.output) {
    await safePath(root, output);
    if (/\.(ts|tsx|js|jsx|json|prisma)$/i.test(output) || output === config.rulesFile || output.startsWith('.repospec/')) throw new Error(`Output must be a context document, not source/config: ${output}`);
  }
  await safePath(root, config.rulesFile);
  return { root, config, configFile, notice };
}

