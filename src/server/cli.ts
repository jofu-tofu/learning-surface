import envPaths from 'env-paths';
import { startServer } from './index.js';

const appPaths = envPaths('learning-surface', { suffix: '' });
const sessionDir =
  process.argv[2] ||
  process.env.LEARNING_SURFACE_DATA ||
  (process.env.NODE_ENV === 'production' ? appPaths.data : './session');
const port = parseInt(process.argv[3] || '8080', 10);

startServer({ sessionDir, port }).catch((err) => {
  console.error('Server failed:', err);
  process.exit(1);
});
