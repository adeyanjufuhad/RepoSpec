import type { NextConfig } from 'next';
import path from 'node:path';
const config: NextConfig = {
  serverExternalPackages: ['ts-morph', '@mrleebo/prisma-ast', 'gpt-tokenizer', 'tinyglobby'],
  turbopack: { root: path.resolve(process.cwd(), '..') },
  poweredByHeader: false,
};
export default config;
