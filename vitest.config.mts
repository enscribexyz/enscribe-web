import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths({ ignoreConfigErrors: true })],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        '.next/**',
        'contracts/**',
        'types/supabase.ts',
        'docs/**',
        '**/*.config.*',
        '**/setup.ts',
      ],
    },
    include: ['test/**/*.test.{ts,tsx}'],
  },
})
