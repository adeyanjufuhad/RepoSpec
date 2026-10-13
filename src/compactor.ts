import { encode } from 'gpt-tokenizer';
import type { IntermediateModel, Section, Table } from './model';

export const countTokens = (text: string) => encode(text, { allowedSpecial: new Set(), disallowedSpecial: new Set() }).length;
const ORDER: Section[] = ['database', 'routes', 'types', 'rules'];
export function tableLine(table: Table) {
  return `Table ${table.name} (${table.columns.map(c => {
    const fk = table.foreignKeys?.find(f => f.column === c.name);
    const constraints = [...(c.constraints ?? []), ...(fk ? [`FK → ${fk.references.table}.${fk.references.column}`] : [])];
    return `${c.name}: ${c.type}${constraints.length ? ` [${constraints.join(', ')}]` : ''}`;
  }).join(', ')})`;
}
export function sectionLines(model: IntermediateModel): Record<Section, string[]> {
  return {
    database: model.database.map(tableLine),
    routes: model.routes.map(r => `${r.method} ${r.path}${r.params?.length ? ` → Params: ${r.params.join(', ')}` : ''}${r.bodyType ? ` → Body: ${r.bodyType}` : ''}${r.responseType ? ` → Response: ${r.responseType}` : ''}`),
    types: model.types.map(t => t.signature),
    rules: model.rules.map(r => `- ${r}`),
  };
}
export function serialize(model: IntermediateModel, xmlTags = false): string {
  const lines = sectionLines(model);
  const sections = ORDER.filter(s => lines[s].length).map(s => xmlTags ? `<${s}>\n${lines[s].join('\n')}\n</${s}>` : `## ${s === 'database' ? 'Database' : s === 'routes' ? 'API routes' : s === 'types' ? 'Core types' : 'Architecture rules'}\n${lines[s].join('\n')}`);
  return `# RepoSpec context\n\n${sections.length ? sections.join('\n\n') : 'No matching contracts. Adjust include patterns in .repospec.json.'}\n`;
}
export function compactModel(input: IntermediateModel, budget: number, xmlTags = false) {
  const model = structuredClone(input);
  // Public routes precede internal endpoints. Stable names break equal-priority ties.
  model.routes.sort((a, b) => Number(/\/(internal|_)/.test(a.path)) - Number(/\/(internal|_)/.test(b.path)) || a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
  const original = serialize(model, xmlTags);
  let markdown = original;
  const fits = () => budget <= 0 || countTokens(markdown) <= budget;
  const refresh = () => { markdown = serialize(model, xmlTags); };
  for (const section of ['rules', 'types', 'routes'] as const) {
    while (!fits() && model[section].length) { model[section].pop(); refresh(); }
  }
  while (!fits() && model.database.length) {
    const table = model.database.at(-1)!;
    if (table.columns.length > 1) {
      // Keep primary and foreign key columns for as long as possible.
      const index = table.columns.findLastIndex(c => !c.constraints?.some(s => s.includes('PK')) && !table.foreignKeys?.some(f => f.column === c.name));
      const [removed] = table.columns.splice(index >= 0 ? index : table.columns.length - 1, 1);
      table.foreignKeys = table.foreignKeys?.filter(f => f.column !== removed.name);
    } else model.database.pop();
    refresh();
  }
  if (!fits()) markdown = ''; // Tiny budgets cannot hold even the minimal header.
  const tokens = countTokens(markdown);
  model.meta.tokens = tokens;
  const sections = sectionLines(model);
  const sectionTokens = Object.fromEntries(ORDER.map(s => [s, countTokens(sections[s].join('\n'))])) as Record<Section, number>;
  return { markdown, tokens, originalTokens: countTokens(original), pruned: original !== markdown, model, sectionTokens };
}

