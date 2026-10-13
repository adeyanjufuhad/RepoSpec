import { getSchema } from '@mrleebo/prisma-ast';
import { Node, SyntaxKind, type SourceFile } from 'ts-morph';
import type { Column, Table } from '../model.js';
import { compact, unwrap } from './ast.js';

export function extractPrisma(content: string): Table[] {
  const schema = getSchema(content);
  const models = schema.list.filter(b => b.type === 'model' || b.type === 'view');
  const enums = new Map(schema.list.filter(b => b.type === 'enum').map(e => [e.name, e.enumerators.filter(v => v.type === 'enumerator').map(v => v.name)]));
  return models.map(model => {
    const table: Table = { name: model.name, columns: [], foreignKeys: [] };
    for (const field of model.properties) {
      if (field.type !== 'field') continue;
      const base = typeof field.fieldType === 'string' ? field.fieldType : field.fieldType.name;
      const constraints: string[] = [];
      if (!field.optional && !field.array) constraints.push('NOT NULL');
      if (field.attributes?.some(a => a.name === 'id')) constraints.unshift('PK');
      if (field.attributes?.some(a => a.name === 'unique')) constraints.push('UNIQUE');
      const enumValues = enums.get(base);
      const type = (enumValues ? `enum(${enumValues.map(v => JSON.stringify(v)).join(',')})` : base) + (field.array ? '[]' : '') + (field.optional ? '?' : '');
      table.columns.push({ name: field.name, type, constraints });
      const relation = field.attributes?.find(a => a.name === 'relation');
      const args = new Map(relation?.args?.flatMap(a => typeof a.value === 'object' && a.value && 'type' in a.value && a.value.type === 'keyValue' ? [[a.value.key, a.value.value] as const] : []) ?? []);
      const fields = args.get('fields');
      const references = args.get('references');
      if (fields && references && typeof fields === 'object' && typeof references === 'object' && 'type' in fields && 'type' in references && fields.type === 'array' && references.type === 'array') {
        fields.args.forEach((column, i) => {
          if (typeof column === 'string' && typeof references.args[i] === 'string') table.foreignKeys!.push({ column, references: { table: base, column: references.args[i] as string } });
        });
      }
    }
    for (const attr of model.properties) {
      if (attr.type !== 'attribute' || !['id', 'unique'].includes(attr.name)) continue;
      const val = attr.args?.[0]?.value;
      if (val && typeof val === 'object' && 'type' in val && val.type === 'array') {
        for (const name of val.args) table.columns.find(c => c.name === name)?.constraints?.push(attr.name === 'id' ? 'COMPOSITE PK' : 'COMPOSITE UNIQUE');
      }
    }
    return table;
  });
}

function calls(node: Node): { name: string; args: Node[] }[] {
  node = unwrap(node);
  if (!Node.isCallExpression(node)) return [];
  const expr = node.getExpression();
  if (Node.isPropertyAccessExpression(expr)) return [...calls(expr.getExpression()), { name: expr.getName(), args: node.getArguments() }];
  return [{ name: expr.getText(), args: node.getArguments() }];
}
function literal(node?: Node): string | undefined {
  return node && (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) ? node.getLiteralText() : undefined;
}
function zodType(node: Node): string {
  const chain = calls(node);
  const base = chain[0];
  if (!base) return 'unknown';
  let type = ({ string: 'string', number: 'number', boolean: 'boolean', bigint: 'bigint', date: 'Date', unknown: 'unknown', any: 'any', null: 'null', never: 'never' } as Record<string, string>)[base.name] ?? 'unknown';
  if (base.name === 'literal' && base.args[0]) type = compact(base.args[0].getText());
  if (base.name === 'enum' && base.args[0] && Node.isArrayLiteralExpression(base.args[0])) type = base.args[0].getElements().map(n => compact(n.getText())).join(' | ');
  if (base.name === 'array' && base.args[0]) type = `(${zodType(base.args[0])})[]`;
  if (base.name === 'union' && base.args[0] && Node.isArrayLiteralExpression(base.args[0])) type = base.args[0].getElements().map(zodType).join(' | ');
  if (base.name === 'object' && base.args[0] && Node.isObjectLiteralExpression(base.args[0])) type = `{ ${base.args[0].getProperties().flatMap(p => Node.isPropertyAssignment(p) && p.getInitializer() ? [`${p.getName()}: ${zodType(p.getInitializer()!)}`] : []).join('; ')} }`;
  if (chain.slice(1).some(c => c.name === 'array')) type = `(${type})[]`;
  if (chain.some(c => c.name === 'nullable' || c.name === 'nullish')) type += ' | null';
  if (chain.some(c => c.name === 'optional' || c.name === 'nullish')) type += ' | undefined';
  return type;
}
export function extractTsSchemas(source: SourceFile): { tables: Table[]; warnings: string[] } {
  const tables: Table[] = [];
  const warnings: string[] = [];
  const tableFns = new Set<string>();
  const zodBindings = new Set<string>();
  const builderNames = new Map<string, string>();
  for (const imp of source.getImportDeclarations()) {
    const mod = imp.getModuleSpecifierValue();
    if (mod.startsWith('drizzle-orm/')) for (const named of imp.getNamedImports()) {
      const local = named.getAliasNode()?.getText() ?? named.getName();
      builderNames.set(local, named.getName());
      if (['pgTable', 'sqliteTable', 'mysqlTable'].includes(named.getName())) tableFns.add(local);
    }
    if (mod === 'zod' || mod.startsWith('zod/')) {
      const ns = imp.getNamespaceImport();
      if (ns) zodBindings.add(ns.getText());
      for (const named of imp.getNamedImports()) if (['z', 'default'].includes(named.getName())) zodBindings.add(named.getAliasNode()?.getText() ?? named.getName());
      if (imp.getDefaultImport()) zodBindings.add(imp.getDefaultImport()!.getText());
    }
  }
  const drizzleMap = new Map<string, string>();
  for (const v of source.getVariableDeclarations()) {
    const init = v.getInitializer();
    if (!init) continue;
    const chain = calls(init);
    if (chain[0] && tableFns.has(chain[0].name)) {
      const tableName = literal(chain[0].args[0]);
      if (tableName) drizzleMap.set(v.getName(), tableName);
    }
  }
  for (const v of source.getVariableDeclarations()) {
    const init = v.getInitializer();
    if (!init) continue;
    const chain = calls(init);
    const first = chain[0];
    if (!first) continue;
    const isDrizzle = tableFns.has(first.name);
    const root = init.getText().split('.')[0];
    const isZod = zodBindings.has(root) && first.name === 'object' && v.isExported();
    if (!isDrizzle && !isZod) continue;
    const obj = first.args[isDrizzle ? 1 : 0];
    const name = isDrizzle ? literal(first.args[0]) : v.getName();
    if (!obj || !Node.isObjectLiteralExpression(obj) || !name) { warnings.push(`Skipped dynamic schema ${v.getName()}; a literal object is required.`); continue; }
    const table: Table = { name, columns: [], foreignKeys: [] };
    for (const p of obj.getProperties()) {
      if (!Node.isPropertyAssignment(p) || !p.getInitializer()) { warnings.push(`Skipped dynamic field in ${name}.`); continue; }
      const value = p.getInitializer()!;
      const fieldChain = calls(value);
      const base = fieldChain[0];
      if (!base) { warnings.push(`Skipped unresolved field ${name}.${p.getName()}.`); continue; }
      const constraints: string[] = [];
      if (fieldChain.some(c => c.name === 'primaryKey')) constraints.push('PK');
      if (fieldChain.some(c => c.name === 'notNull') || (isZod && !fieldChain.some(c => ['optional', 'nullable', 'nullish'].includes(c.name)))) constraints.push('NOT NULL');
      if (fieldChain.some(c => c.name === 'unique')) constraints.push('UNIQUE');
      const column: Column = { name: isDrizzle ? literal(base.args[0]) ?? p.getName() : p.getName(), type: isZod ? zodType(value) : builderNames.get(base.name) ?? base.name, constraints };
      table.columns.push(column);
      const ref = fieldChain.find(c => c.name === 'references')?.args[0];
      const access = ref && Node.isArrowFunction(ref) ? ref.getBody() : undefined;
      if (access && Node.isPropertyAccessExpression(access)) {
        const referenceTable = drizzleMap.get(access.getExpression().getText());
        if (referenceTable) {
          const targetVar = source.getVariableDeclaration(access.getExpression().getText());
          const targetInit = targetVar?.getInitializer();
          const targetObj = targetInit ? calls(targetInit)[0]?.args[1] : undefined;
          const targetField = targetObj && Node.isObjectLiteralExpression(targetObj) ? targetObj.getProperty(access.getName()) : undefined;
          const targetValue = targetField && Node.isPropertyAssignment(targetField) ? targetField.getInitializer() : undefined;
          const targetName = targetValue ? literal(calls(targetValue)[0]?.args[0]) : undefined;
          table.foreignKeys!.push({ column: column.name, references: { table: referenceTable, column: targetName ?? access.getName() } });
        } else warnings.push(`Unresolved foreign table for ${name}.${column.name}; no relation was guessed.`);
      }
    }
    tables.push(table);
  }
  return { tables, warnings };
}
