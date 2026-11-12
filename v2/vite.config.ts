import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' makes the built site work at any address
// (for example devinkearns.com/phinder-is-phabulous/).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2020' },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
