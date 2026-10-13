# RepoSpec architecture
- Keep repository parsing and output generation entirely on the local machine.
- Extract contracts statically; never execute source code from the analyzed workspace.
- Never include environment files, credentials, or private key files in context.
- Route all dashboard scan and sync operations through the shared core engine.
- Report unsupported or unparseable source patterns instead of guessing contracts.
