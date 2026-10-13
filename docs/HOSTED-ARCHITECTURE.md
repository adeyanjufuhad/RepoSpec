# Public GitHub product

The user changed scope from a local dashboard to a public Next.js product, with
GitHub repositories only, including private repositories through GitHub sign-in.
This supersedes the PDF's local-only constraint for the web product.

Routes: `/` landing page, `/app` GitHub workspace, `/api/github/analyze` snapshot
extraction, `/api/context` stateless budget recomputation, and GitHub App OAuth
under `/api/auth/github`. The old local dashboard is available at `/local` only
when REPOSPEC_LOCAL_ENABLED=true, and its APIs are disabled by default.

Public repositories can be analyzed without sign-in. A GitHub App provides
read-only Contents and Metadata access to repositories selected during installation.
Each visitor's user access token stays in a sealed, HttpOnly cookie. OAuth state
is single-use and expires; no operator personal token is exposed to users.

The server downloads a commit-pinned archive from GitHub, enforces byte/file/time
limits, ignores secrets and symlinks, and parses source without running it. Source
is not written to disk or retained in an application database. Only extracted
contracts are returned to the browser. Budget changes operate on those contracts.
Exports download to the user's device; the hosted app does not commit to repos.

GitHub App activation requires GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET,
GITHUB_APP_SLUG, SESSION_SECRET, and APP_URL. The interface reports setup status
honestly. Private OAuth cannot be verified until real app credentials are configured.
