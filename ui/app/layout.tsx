import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
export const metadata: Metadata = { title: 'RepoSpec — Give your AI the right context', description: 'Turn GitHub repositories into focused, token-budgeted context for your AI coding assistant.' };
export const viewport: Viewport = { themeColor: '#03045e' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}><body><a className="skip-link" href="#main">Skip to content</a>{children}</body></html>;
}
