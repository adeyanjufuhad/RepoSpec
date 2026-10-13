import { createHash, randomUUID } from 'node:crypto';
import { readFile, mkdir, writeFile, rename, unlink, stat } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { ALWAYS_IGNORE, isSecret, safePath, slash, type Config } from './config.js';
import { emptyModel, type SourceEntry, type Section } from './model.js';
import { parseSource } from './extractors/ast.js';
import { extractPrisma, extractTsSchemas } from './extractors/schema.js';
import { extractTypes } from './extractors/types.js';
import { extractRoutes } from './extractors/routes.js';
import { compactModel, countTokens, sectionLines } from './compactor.js';

export interface ScanOptions { disabledFiles?: string[]; disabledSections?: Section[]; budget?: number }
export class ScanEngine {
  private cache = new Map<string, SourceEntry>();
  async scan(root: string, config: Config, options: ScanOptions = {}) {
    const started = performance.now();
    const matches = await fg(config.include, { cwd: root, ignore: [...ALWAYS_IGNORE, ...config.exclude, ...config.output], onlyFiles: true, followSymbolicLinks: false, dot: true });
    const paths = matches.map(slash).filter(p => !isSecret(p) && /\.(prisma|tsx?|mts|cts)$/.test(p)).sort();
    const model = emptyModel();
    const files: { path: string; tokens: number; sections: Section[]; included: boolean; cached: boolean; warnings: string[] }[] = [];
    const warnings: string[] = [];
    const disabledFiles = new Set(options.disabledFiles ?? config.disabledFiles);
    const disabledSections = new Set(options.disabledSections ?? config.disabledSections);
    let parsedFiles = 0;
    for (const relative of paths) {
      const key = path.join(root, relative);
      try {
        const file = await safePath(root, relative);
        if ((await stat(file)).size > 1024 * 1024) { warnings.push(`${relative}: skipped file larger than 1 MB.`); continue; }
        const content = await readFile(file, 'utf8');
        const hash = createHash('sha256').update(content).digest('hex');
        let entry = this.cache.get(key);
        const cached = entry?.hash === hash;
        if (!cached) {
          parsedFiles++;
          const data = emptyModel();
          const localWarnings: string[] = [];
          try {
            if (relative.endsWith('.prisma')) data.database = extractPrisma(content);
            else {
              const source = parseSource(relative, content);
              const schema = extractTsSchemas(source);
              data.database = schema.tables;
              localWarnings.push(...schema.warnings);
              data.routes = extractRoutes(source, relative);
              data.types = extractTypes(source);
            }
          } catch { localWarnings.push('Could not parse source; skipped this file.'); }
          entry = { path: relative, hash, model: data, warnings: localWarnings };
          this.cache.set(key, entry);
        }
        entry = entry!;
        const lines = sectionLines(entry.model);
        const sections = (Object.keys(lines) as Section[]).filter(s => lines[s].length);
        const included = !disabledFiles.has(relative);
        files.push({ path: relative, tokens: countTokens(Object.values(lines).flat().join('\n')), sections, included, cached, warnings: entry.warnings });
        warnings.push(...entry.warnings.map(w => `${relative}: ${w}`));
        if (included) {
          if (!disabledSections.has('database')) model.database.push(...entry.model.database);
          if (!disabledSections.has('routes')) model.routes.push(...entry.model.routes);
          if (!disabledSections.has('types')) model.types.push(...entry.model.types);
        }
      } catch (error) { warnings.push(`${relative}: ${(error as Error).message}`); }
    }
    const live = new Set(paths.map(p => path.join(root, p)));
    for (const key of this.cache.keys()) if (key.startsWith(root + path.sep) && !live.has(key)) this.cache.delete(key);
    if (!disabledSections.has('rules')) {
      try {
        const file = await safePath(root, config.rulesFile);
        if ((await stat(file)).size > 128 * 1024) throw new Error('Rules file exceeds 128 KB.');
        model.rules = (await readFile(file, 'utf8')).split(/\r?\n/).map(s => s.replace(/^\s*[-*]\s+/, '').trim()).filter(s => s && !s.startsWith('#'));
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') warnings.push(`Rules: ${(error as Error).message}`); }
    }
    model.database.sort((a, b) => a.name.localeCompare(b.name));
    const referenceCorpus = [...model.routes.map(r => `${r.bodyType ?? ''} ${r.responseType ?? ''}`), ...model.types.map(t => t.signature)].join('\n');
    const frequency = (name: string) => referenceCorpus.split(new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')).length;
    model.types.sort((a, b) => frequency(b.name) - frequency(a.name) || a.name.localeCompare(b.name));
    const result = compactModel(model, options.budget ?? config.tokenBudget, config.xmlTags);
    if (result.pruned) warnings.push('Lower-priority contracts were pruned to fit the token budget.');
    const updated = new Date().toISOString();
    result.model.meta.updated = updated;
    return { ...result, files, warnings, updated, durationMs: Math.round(performance.now() - started), parsedFiles, root, project: path.basename(root), budget: options.budget ?? config.tokenBudget, outputs: config.output, counts: { database: model.database.length, routes: model.routes.length, types: model.types.length, rules: model.rules.length } };
  }
}
export type ScanResult = Awaited<ReturnType<ScanEngine['scan']>>;
export async function readOptional(file: string) {
  try { return await readFile(file, 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}
export async function atomicWrite(root: string, relative: string, content: string) {
  const target = await safePath(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await safePath(root, relative);
  const temporary = `${target}.${randomUUID()}.tmp`;
  try { await writeFile(temporary, content, { flag: 'wx', mode: 0o600 }); await rename(temporary, target); }
  finally { await unlink(temporary).catch(() => {}); }
}
export async function syncOutputs(root: string, config: Config, result: ScanResult) {
  const previous: Record<string, string | null> = {};
  // Preflight every target before changing any output.
  for (const output of config.output) {
    previous[output] = await readOptional(await safePath(root, output));
    if (previous[output] && !previous[output]!.startsWith('# RepoSpec context\n')) throw new Error(`${output} contains unmanaged content. Choose a new output path or move the existing file before syncing.`);
  }
  const written: string[] = [];
  for (const output of config.output) {
    if (previous[output] !== result.markdown) { await atomicWrite(root, output, result.markdown); written.push(output); }
  }
  await atomicWrite(root, '.repospec/state.json', JSON.stringify({ updated: result.updated, tokens: result.tokens, output: config.output, fingerprint: createHash('sha256').update(result.markdown).digest('hex') }, null, 2) + '\n');
  return { written, previous };
}
