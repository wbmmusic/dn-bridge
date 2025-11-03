import { defineConfig } from 'vite';
import { builtinModules } from 'module';

export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        'electron',
        ...builtinModules,
        ...builtinModules.map((m: string) => `node:${m}`),
      ],
      output: {
        format: 'cjs',
      }
    },
  },
});