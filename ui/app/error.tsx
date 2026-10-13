'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main id="main" className="mx-auto max-w-xl p-12"><h1 className="text-2xl font-semibold">The workspace could not load</h1><p className="my-4">Check the local server terminal for details, then try again.</p><button className="primary-button" onClick={reset}>Try again</button></main>;
}
