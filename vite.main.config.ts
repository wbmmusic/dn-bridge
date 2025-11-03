import { defineConfig } from 'vite';
import { builtinModules } from 'module';

export default defineConfig({
  build: {
    sourcemap: true,
    rollupOptions: {
      external: [
        'electron',
        'electron-updater',
        ...builtinModules,
        ...builtinModules.map((m: string) => `node:${m}`),
      ],
      output: {
        format: 'cjs',
      }
    },
  },
});