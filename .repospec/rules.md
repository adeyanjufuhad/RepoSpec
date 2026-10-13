# RepoSpec architecture
- Hosted GitHub snapshots are parsed in server memory; do not persist repository source.
- Keep optional filesystem scanning and output writes restricted to the local dashboard and CLI.
- Extract contracts statically; never execute source code from the analyzed workspace.
- Never include environment files, credentials, or private key files in context.
- Route all dashboard scan and sync operations through the shared core engine.
- Report unsupported or unparseable source patterns instead of guessing contracts.
