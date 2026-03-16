import { build, context } from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');

const packagesDir = path.resolve(__dirname, '../../../packages');

const config = {
  entryPoints: ['src/main.tsx'],
  bundle: true,
  outfile: '../Assets/Resources/main.mjs',
  format: 'esm',
  platform: 'neutral',
  target: 'es2020',
  sourcemap: false,
  jsx: 'automatic',
  external: ['csharp', 'puerts'],
  define: {
    'process.env.NODE_ENV': '"development"',
    'process': '{"env":{"NODE_ENV":"development"}}',
  },
  mainFields: ['module', 'main'],
  alias: {
    '@tower-ui/core': path.join(packagesDir, 'core/src/index.ts'),
    '@tower-ui/unity-adapter': path.join(packagesDir, 'unity-adapter/src/index.ts'),
    '@tower-ui/schema': path.join(packagesDir, 'schema/src/index.ts'),
  },
  loader: {
    '.ts': 'ts',
    '.tsx': 'tsx',
  },
};

if (isWatch) {
  const ctx = await context(config);
  await ctx.watch();
  console.log('[build] watching...');
} else {
  await build(config);
  console.log('[build] done → ../Assets/Resources/main.mjs');
}
