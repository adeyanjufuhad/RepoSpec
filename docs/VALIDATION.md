# Validation record

Verified locally on Windows with Node.js 22.14.0 on 13 October 2026.

- TypeScript checks pass for the engine and Next.js application.
- 15 automated tests pass across extractor, compactor, pipeline, CLI, and watcher suites.
- The Next.js 16.4.0 production build passes for `/`, `/api/scan`, and `/api/sync`.
- `generate` writes context files; `doctor` confirms matching output and detects drift.
- The built npm tarball was installed in an isolated temporary consumer. Its
  installed CLI successfully generated context and passed `doctor`.
- A real dashboard scan displayed the repository's contracts and source costs.
- Browser interactions verified section exclusion (460 → 444 tokens), budget pruning,
  restoring the 2,500-token budget, settings persistence, and successful sync.
- Desktop and mobile layouts were inspected during the earlier browser pass.
- The final browser retest after treemap/accessibility refinements was blocked by
  the browser tool's URL policy. Those changes passed TypeScript and production build
  checks; a final visual retest remains a manual check.

The final treemap uses weighted rectangle partitioning rather than minimum-sized
flex cells. Small-file controls remain available below the chart.

Observed cached dashboard scans of this repository took 23–73 ms in the earlier
browser pass. This is a small-repository observation, not a large-monorepo benchmark.

CI runs the checks on Ubuntu and Windows. CI results must be read from GitHub;
the presence of a workflow file alone does not establish a passing remote run.
