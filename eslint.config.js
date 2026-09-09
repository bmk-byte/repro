import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // Edge Functions run on Deno, not the browser/Node environment this
    // config targets (globals.browser below doesn't know about `Deno`,
    // and `npm:`/`https://deno.land/...` specifiers aren't resolvable by
    // this project's TS setup). They have their own linter — `deno lint`
    // — which is the correct tool for them; see docs/TESTING_STRATEGY.md
    // for why Edge Functions are tested/linted separately from the rest
    // of the app.
    ignores: ['dist', 'supabase/functions/**'],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  }
);
