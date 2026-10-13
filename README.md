# RepoSpec

A **Next.js web app** for controlling the context your AI coding assistant sees.
Inspect database schemas, API routes, and exported TypeScript contracts, choose
what to include, and sync accurate Markdown within a token budget.

The local dashboard and companion CLI share one extraction engine. Source code
stays on your machine. No database, cloud service, API key, or model call is needed.

## Run the web app

Requires Node.js 22 or newer and npm.

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:3000**. The app initially inspects this repository.
To inspect another local repository, set `REPOSPEC_CWD` before starting:

```powershell
$env:REPOSPEC_CWD = 'C:\path\to\your-project'
npm run dev
```

```sh
REPOSPEC_CWD=/path/to/your-project npm run dev
```

For a production build running locally:

```sh
npm run build
npm start
```

The launcher binds to `127.0.0.1` and disables Next.js telemetry. This is a local
filesystem application; it is intended to run on the developer's machine.

## Dashboard workflow

1. Inspect the token gauge, source treemap, and section allocation in Overview.
2. Toggle files in the treemap or Source explorer. Search is reflected in the URL.
3. Adjust the budget or output paths in Settings. The preview updates automatically.
4. Compare Changes with the first saved output, or copy the generated Markdown.
5. Select **Sync context** to write all output files and save the inclusion settings.

The dashboard refreshes from disk every five seconds while visible. Section costs
exclude Markdown formatting; the total uses the complete output. Treemap areas
show each file's contract cost before pruning. Tiny cells have separate controls.
Files without extractable contracts appear in the explorer with zero tokens.

## Configuration

Create `.repospec.json` at the target project's root, or use a `repospec` object
in its `package.json`. When neither exists, the engine uses defaults and reports it.

```json
{
  "tokenBudget": 2500,
  "output": [".cursorrules", ".ai-context.md"],
  "include": ["prisma/**/*.prisma", "src/**/*.ts", "app/api/**/*.ts"],
  "exclude": ["**/*.test.ts", "**/node_modules/**"],
  "rulesFile": ".repospec/rules.md",
  "xmlTags": false,
  "disabledFiles": [],
  "disabledSections": []
}
```

Use per-package patterns such as `packages/*/src/**/*.ts` for a monorepo.
The CLI auto-detects a workspace when `--cwd` is omitted. Explicit `--cwd` fixes
the target directory. Relative include/exclude/output paths stay inside it.

Budgets of zero or less mean unlimited. Positive budgets are enforced using
`gpt-tokenizer` with its o200k tokenizer. The engine removes architecture rules,
then types, then routes; database columns are reduced last, preserving keys where
possible. Extremely small budgets can produce an empty file rather than exceed
the cap. Output is deterministic; generation time and token metadata live in
`.repospec/state.json` so timestamps do not cause artificial drift.

## Companion CLI

```sh
npm run build:cli
node dist/cli.js init --cwd /path/to/project
node dist/cli.js generate --cwd /path/to/project
node dist/cli.js watch --cwd /path/to/project
node dist/cli.js doctor --cwd /path/to/project
```

Every command accepts `--cwd`, `--config`, `--budget`, `--dry-run`, and `--verbose`.
`init --hook` optionally creates a fail-open post-commit hook, preserving existing
hooks. The hook expects `repospec` on PATH and never downloads packages.
`doctor` exits with code 1 when outputs are missing or stale.

The npm package is **not published**. To install the companion CLI locally:

```sh
npm pack
npm install -g ./adeyanjufuhad-repospec-0.1.0.tgz
repospec generate --cwd /path/to/project
```

The tarball contains the CLI and engine; run the Next.js dashboard from this checkout.

## Coverage and limits

- Prisma: model/view fields, enum values, nullability, keys, and explicit relations.
- Drizzle: literal `pgTable`, `mysqlTable`, and `sqliteTable` declarations, imported
  aliases, column constraints, arrays, and direct references to tables in the same file.
- Zod: exported literal object schemas, common primitive/nested/array/union/enum
  shapes, optional and nullable fields. Composed object schemas and transformed
  fields are skipped with warnings rather than evaluated.
- Next.js App Router: GET/POST/PUT/PATCH/DELETE handlers, route groups, dynamic
  parameters, export aliases, and explicit request/response type annotations.
- TypeScript: exported interfaces, type aliases, and enums; implementations and
  comments are discarded. Imported types and complex runtime behavior are not inferred.

SQL, Express, FastAPI, dynamic schema factories, cross-file Drizzle relations,
and whole-program type expansion are outside this first version's coverage.
Unparseable files are warned about and skipped. Files over 1 MB are skipped.
Rules files have a 128 KB limit. Source is never executed.

Environment files, credential files, private keys, generated directories, and
symlinks outside the workspace are excluded. Output writes use an atomic rename
per file. Existing nonempty documents without the RepoSpec header are protected;
choose a different output path to preserve hand-written assistant rules. Multiple
outputs are preflighted together, but are not one filesystem transaction.

## Development and verification

```sh
npm run typecheck
npm test
npm run build:ui
npm run test:package
```

Tests cover extractor fixtures, golden Markdown, token boundaries, incremental
cache reuse, CLI drift, watcher edits/deletions, and output/path protections.
See [validation notes](docs/VALIDATION.md), the [specification map](docs/IMPLEMENTATION.md),
and [design system](DESIGN.md). The interface uses the requested navy-to-cyan palette
with Geist typography, keyboard controls, and reduced-motion support.
