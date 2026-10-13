import { z } from 'zod';
import { emptyModel, type IntermediateModel, type Section } from './model';
import { extractPrisma, extractTsSchemas } from './extractors/schema';
import { extractRoutes } from './extractors/routes';
import { extractTypes } from './extractors/types';
import { parseSource } from './extractors/ast';
import { compactModel, countTokens, sectionLines } from './compactor';

const column = z.object({ name: z.string().max(200), type: z.string().max(20000), constraints: z.array(z.string().max(200)).max(20).optional() });
export const modelSchema = z.object({
  database: z.array(z.object({ name: z.string().max(200), columns: z.array(column).max(500), foreignKeys: z.array(z.object({ column: z.string(), references: z.object({ table: z.string(), column: z.string() }) })).max(500).optional() })).max(500),
  routes: z.array(z.object({ method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']), path: z.string().max(2000), params: z.array(z.string()).max(50).optional(), bodyType: z.string().max(20000).optional(), responseType: z.string().max(20000).optional() })).max(2000),
  types: z.array(z.object({ name: z.string().max(200), signature: z.string().max(50000) })).max(2000),
  rules: z.array(z.string().max(20000)).max(200), meta: z.object({ tokens: z.number().optional(), updated: z.string().max(64).optional() }),
});
export const snapshotSchema = z.object({ files: z.array(z.object({ path: z.string().max(1000), model: modelSchema, warnings: z.array(z.string().max(2000)).max(100) })).max(300), rules: z.array(z.string().max(20000)).max(200) });
export type Snapshot = z.infer<typeof snapshotSchema>;
export interface ContextOptions { budget: number; disabledFiles: string[]; disabledSections: Section[] }
export const contextOptionsSchema = z.object({ budget: z.number().int().min(100).max(20000).default(2500), disabledFiles: z.array(z.string().max(1000)).max(300).default([]), disabledSections: z.array(z.enum(['database', 'routes', 'types', 'rules'])).max(4).default([]) });
export function extractSnapshot(sources: { path: string; content: string }[]): Snapshot {
  const files: Snapshot['files'] = [];
  const rules: string[] = [];
  for (const source of sources) {
    if (source.path === '.repospec/rules.md') {
      rules.push(...source.content.split(/\r?\n/).map(s => s.replace(/^\s*[-*]\s+/, '').trim()).filter(s => s && !s.startsWith('#')).slice(0, 200));
      continue;
    }
    const model = emptyModel(), warnings: string[] = [];
    try {
      if (source.path.endsWith('.prisma')) model.database = extractPrisma(source.content);
      else {
        const ast = parseSource(source.path, source.content);
        const schemas = extractTsSchemas(ast);
        model.database = schemas.tables; warnings.push(...schemas.warnings);
        model.routes = extractRoutes(ast, source.path); model.types = extractTypes(ast);
      }
    } catch { warnings.push('Could not parse this file; its contracts were skipped.'); }
    files.push({ path: source.path, model, warnings });
  }
  return { files: files.sort((a, b) => a.path.localeCompare(b.path)), rules };
}
export function compileSnapshot(snapshot: Snapshot, options: ContextOptions) {
  const model: IntermediateModel = emptyModel();
  const disabled = new Set(options.disabledFiles), sections = new Set(options.disabledSections);
  const warnings: string[] = [];
  const files = snapshot.files.map(file => {
    const lines = sectionLines(file.model);
    warnings.push(...file.warnings.map(w => `${file.path}: ${w}`));
    const included = !disabled.has(file.path);
    if (included) {
      if (!sections.has('database')) model.database.push(...file.model.database);
      if (!sections.has('routes')) model.routes.push(...file.model.routes);
      if (!sections.has('types')) model.types.push(...file.model.types);
    }
    return { path: file.path, tokens: countTokens(Object.values(lines).flat().join('\n')), included, cached: false, sections: (Object.keys(lines) as Section[]).filter(s => lines[s].length), warnings: file.warnings };
  });
  if (!sections.has('rules')) model.rules = snapshot.rules;
  model.database.sort((a, b) => a.name.localeCompare(b.name));
  model.types.sort((a, b) => a.name.localeCompare(b.name));
  const result = compactModel(model, options.budget);
  if (result.pruned) warnings.push('Lower-priority contracts were pruned to fit your budget.');
  return { ...result, files, warnings, counts: { database: model.database.length, routes: model.routes.length, types: model.types.length, rules: model.rules.length } };
}
export type ContextResult = ReturnType<typeof compileSnapshot>;
