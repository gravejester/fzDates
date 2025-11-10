import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const entry = path.join(projectRoot, 'src', 'index.js');

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

await Promise.all([
  esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: ['es2019'],
    outfile: path.join(distDir, 'index.mjs'),
    sourcemap: true,
    logLevel: 'info'
  }),
  esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: ['node18'],
    outfile: path.join(distDir, 'index.cjs'),
    sourcemap: true,
    logLevel: 'info'
  })
]);
