import type { NextConfig } from 'next';
import path from 'node:path';
const config: NextConfig = {
  serverExternalPackages: ['ts-morph', 'tinyglobby'],
  turbopack: { root: path.resolve(process.cwd(), '..') },
  outputFileTracingRoot: path.resolve(process.cwd(), '..'),
  poweredByHeader: false,
};
export default config;
