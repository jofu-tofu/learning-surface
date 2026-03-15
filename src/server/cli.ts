import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import envPaths from 'env-paths';
import { startServer } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const appPaths = envPaths('learning-surface', { suffix: '' });
const sessionDir =
  process.argv[2] ||
  process.env.LEARNING_SURFACE_DATA ||
  (process.env.NODE_ENV === 'production' ? appPaths.data : './session');
const port = parseInt(process.argv[3] || '8080', 10);

// In production (compiled), clientDir is dist/client/ relative to dist/server/cli.js
// In dev (tsx), clientDir is not passed — Vite serves the frontend separately
const clientDir = process.env.NODE_ENV === 'production'
  ? resolve(__dirname, '..', 'client')
  : undefined;

startServer({ sessionDir, port, clientDir }).catch((err) => {
  console.error('Server failed:', err);
  process.exit(1);
});
