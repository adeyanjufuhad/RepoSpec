import { Suspense } from 'react';
import GitHubWorkspace from '@/components/github-workspace';
export const metadata = { title: 'GitHub workspace · RepoSpec', description: 'Analyze a GitHub repository and generate focused AI context.' };
export default function WorkspacePage() { return <Suspense fallback={<main id="main" className="p-10">Loading repository workspace…</main>}><GitHubWorkspace/></Suspense>; }
