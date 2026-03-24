import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import stableWsCallback from './eslint-rules/stable-websocket-callback.js';

export default tseslint.config(
  { ignores: ['dist/'] },

  // Base: JS recommended + TS recommended (non-type-checked, keeps it fast)
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // React hooks — catches stale closures and infinite re-renders
  {
    files: ['src/app/**/*.{ts,tsx}'],
    ...reactHooks.configs.flat['recommended-latest'],
  },

  // Project-specific: prevent unstable onMessage → WebSocket reconnect loops
  {
    files: ['src/app/**/*.{ts,tsx}'],
    plugins: {
      'project': { rules: { 'stable-websocket-callback': stableWsCallback } },
    },
    rules: {
      'project/stable-websocket-callback': ['error', {
        stableIdentifiers: ['autoSelectProvider'],
      }],
    },
  },

  // Frontend: warn on console usage
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Project-wide TS rules that complement tsc --noEmit
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', {
        disallowTypeAnnotations: false,
      }],
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
  },
);
