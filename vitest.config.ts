import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // framework/tooling
        'src/**/*.d.ts',
        'src/test/**',
        'src/types/**',
        'node_modules',
        '.next',
        // Next.js app-router route files — tested via E2E, not unit tests
        'src/app/**',
        'src/middleware.ts',
        // React components — tested via E2E / component tests separately
        'src/components/**',
        // Server-side infrastructure — require live Supabase / external APIs
        'src/lib/actions/**',
        'src/lib/data/**',
        'src/lib/supabase/**',
        'src/lib/import/import.service.ts',
        'src/lib/signwell/**',
        'src/lib/notifications/**',
        'src/lib/contracts/**',
        // TanStack Query hooks — require QueryClient context + live Supabase
        'src/hooks/**',
        // Re-export barrels and pure type files — no executable logic
        'src/lib/query-keys.ts',
        'src/lib/utils.ts',
        'src/lib/finance/index.ts',
        'src/lib/finance/types.ts',
        'src/lib/actions/index.ts',
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
