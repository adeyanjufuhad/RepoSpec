import { describe, expect, it } from 'vitest';
import { parseSource } from '../src/extractors/ast.js';
import { extractPrisma, extractTsSchemas } from '../src/extractors/schema.js';
import { extractRoutes } from '../src/extractors/routes.js';
import { extractTypes } from '../src/extractors/types.js';

describe('static extractors', () => {
  it('retains Prisma enums, nullable columns and foreign keys without datasource secrets', () => {
    const result = extractPrisma(`datasource db {\n provider = "postgresql"\n url = "postgres://SECRET"\n}\nenum Role {\n ADMIN\n USER\n}\nmodel User {\n id String @id\n role Role\n orders Order[]\n}\nmodel Order {\n id String @id\n userId String\n note String?\n user User @relation(fields: [userId], references: [id])\n}`);
    expect(result[0].columns[1].type).toBe('enum("ADMIN","USER")');
    expect(result[1].foreignKeys).toEqual([{ column: 'userId', references: { table: 'User', column: 'id' } }]);
    expect(result[1].columns[2].type).toBe('String?');
    expect(JSON.stringify(result)).not.toContain('SECRET');
  });
  it('extracts Drizzle aliases and mapped column references', () => {
    const source = parseSource('schema.ts', `import {pgTable as table, text, integer} from 'drizzle-orm/pg-core';
      export const users = table('users', {id: text('user_id').primaryKey()});
      export const orders = table('orders', {id: integer('id').primaryKey(), userId: text('user_id').references(() => users.id).notNull()});`);
    const { tables } = extractTsSchemas(source);
    expect(tables[1].foreignKeys).toEqual([{ column: 'user_id', references: { table: 'users', column: 'user_id' } }]);
    expect(tables[1].columns[1].constraints).toContain('NOT NULL');
  });
  it('extracts nested Zod contracts without evaluating defaults', () => {
    const { tables } = extractTsSchemas(parseSource('schemas.ts', `import { z } from 'zod'; export const OrderInput = z.object({ email: z.string().email(), lines: z.array(z.object({qty: z.number()})), note: z.string().optional(), status: z.enum(['draft', 'paid']) });`));
    expect(tables[0].columns.map(c => c.type)).toEqual(['string', '({ qty: number })[]', 'string | undefined', "'draft' | 'paid'"]);
  });
  it('extracts route aliases, route groups and explicit contracts', () => {
    const source = parseSource('route.ts', `async function handler(req: Request): Promise<Order> { const body: Input = await req.json(); return {} as Order; } export { handler as POST }; export const GET = () => Response.json<Order>({});`);
    const routes = extractRoutes(source, 'src/app/(shop)/api/orders/[id]/route.ts');
    expect(routes).toEqual([{ method: 'GET', path: '/api/orders/[id]', params: ['id'], responseType: 'Order' }, { method: 'POST', path: '/api/orders/[id]', params: ['id'], bodyType: 'Input', responseType: 'Promise < Order >' }]);
  });
  it('emits only exported contracts and preserves literal whitespace', () => {
    const types = extractTypes(parseSource('types.ts', `/** private docs */ export interface Order { id: string; label: 'two  spaces' } type Hidden = string; export function run(){ return 'secret'; }`));
    expect(types).toEqual([{ name: 'Order', signature: "interface Order { id : string ; label : 'two  spaces' }" }]);
  });
  it('rejects malformed TypeScript', () => expect(() => parseSource('bad.ts', 'export interface {')).toThrow());
});
