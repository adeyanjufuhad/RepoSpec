import { expect, it } from 'vitest';
import { emptyModel } from '../src/model.js';
import { compactModel, countTokens, serialize } from '../src/compactor.js';
const model = { ...emptyModel(), database: [{ name: 'users', columns: [{ name: 'id', type: 'uuid', constraints: ['PK'] }] }], routes: [{ method: 'GET' as const, path: '/api/users' }], types: [{ name: 'User', signature: 'interface User { id: string }' }], rules: ['Use the shared database client.'] };
it('serializes a deterministic golden artifact', () => {
  expect(serialize(model)).toBe('# RepoSpec context\n\n## Database\nTable users (id: uuid [PK])\n\n## API routes\nGET /api/users\n\n## Core types\ninterface User { id: string }\n\n## Architecture rules\n- Use the shared database client.\n');
});
it('respects every budget boundary including tiny and unlimited budgets', () => {
  const full = countTokens(serialize(model));
  for (let budget = 1; budget <= full + 1; budget++) expect(compactModel(model, budget).tokens).toBeLessThanOrEqual(budget);
  expect(compactModel(model, full).pruned).toBe(false);
  expect(compactModel(model, full - 1).model.rules).toEqual([]);
  expect(compactModel(model, 0).tokens).toBe(full);
  expect(compactModel(model, -1).tokens).toBe(full);
  expect(compactModel(model, 40).model.database.length).toBe(1);
});
it('does not mutate its input or leak orphaned foreign keys', () => {
  const before = JSON.stringify(model);
  compactModel(model, 20);
  expect(JSON.stringify(model)).toBe(before);
});
