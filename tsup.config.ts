import { defineConfig } from 'tsup';

const env = process.env.NODE_ENV;

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true, // Generate declaration file (.d.ts)
  splitting: true,
  sourcemap: true,
  clean: true,
  skipNodeModulesBundle: true,
  minify: env === 'production'
});
