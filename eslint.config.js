import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

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

  // Frontend: warn on console usage
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'warn',
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
