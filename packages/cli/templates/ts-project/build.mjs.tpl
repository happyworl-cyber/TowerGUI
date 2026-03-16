import { build, context } from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');

// Resolve the TowerGUI monorepo packages directory.
// Adjust this path if your project is not inside the TowerGUI workspace.
const packagesDir = process.env.TOWER_UI_PACKAGES
  || path.resolve(__dirname, '../../../packages');

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
    'process.env.NODE_ENV': '"production"',
    'process': '{"env":{"NODE_ENV":"production"}}',
  },
  mainFields: ['module', 'main'],
  alias: {
    '@tower-ui/core': path.join(packagesDir, 'core/src/index.ts'),
    '@tower-ui/unity-adapter': path.join(packagesDir, 'unity-adapter/src/index.ts'),
  },
  loader: { '.ts': 'ts', '.tsx': 'tsx' },
};

if (isWatch) {
  const ctx = await context(config);
  await ctx.watch();
  console.log('[build] watching...');
} else {
  await build(config);
  console.log('[build] done → ../Assets/Resources/main.mjs');
}
