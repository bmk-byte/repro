import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // supabase/functions/**/*.test.ts are Deno tests (see
    // docs/TESTING_STRATEGY.md) — they import from https:// URLs Deno's
    // module resolver understands but Node's ESM loader doesn't, and
    // they exercise Deno-only globals/APIs. Vitest's default include glob
    // otherwise picks them up and fails with an ESM-loader error before
    // ever reaching the Deno-specific code. Run them with
    // `deno test supabase/functions/_shared/` instead.
    exclude: [...configDefaults.exclude, 'supabase/**'],
  },
});
