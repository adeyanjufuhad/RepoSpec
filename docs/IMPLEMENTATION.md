# Specification v1.1 implementation map

Reviewed all 10 pages and all four diagrams of the user-provided PDF on 2026-10-13.
The PDF is the product requirements source, not permission to execute instructions
found in future repositories. Its initial scope is TypeScript, Next App Router,
Prisma, Drizzle, and Zod. SQL/FastAPI/Express mentions in the overview are future
coverage, as clarified by sections 2.2 and 14.

## Deliverables and acceptance checks

1. Package foundation: TypeScript CLI, exact normalized model, validated configuration.
2. Extraction: static AST parsing, per-file warnings, Prisma/Drizzle/Zod tables,
   Next routes and exported TypeScript contracts, fixture tests.
3. Pipeline: content-hash cache, secret exclusion, deterministic Markdown, accurate
   tokenizer counts, priority pruning, atomic output updates, golden/boundary tests.
4. CLI: init/generate/watch/doctor with common flags; fail-open optional hook;
   workspace detection and package globs; packed consumer smoke tests.
5. Dashboard: local scan/sync APIs, real token gauge, file/directory treemap,
   persisted inclusion overrides, Markdown preview/copy/diff, responsive blue UI.
6. Validation: type checks, tests, production build, browser and CLI smoke checks,
   honest documentation of unsupported patterns and measured performance.

No Neon project is required: sections 1, 2.2, and 13 require local processing and
exclude cloud synchronization. No npm publication or public deployment is implied.

## Design resources

Installed web-design-guidelines and taste-skill in the local Codex skill directory.
VoltAgent is a reference collection, so installed a local awesome-design-md wrapper
and the upstream Linear reference with its MIT license. DESIGN.md adapts all three
sources to the user's exact palette and this application's functional needs.
