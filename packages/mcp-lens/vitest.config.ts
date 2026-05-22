import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'renderer/src/**/*.test.ts',
      'renderer/src/**/*.test.tsx',
    ],
    environment: 'node',
  },
});
