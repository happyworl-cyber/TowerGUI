import * as fs from 'fs';
import * as path from 'path';

interface CreateOptions {
  name: string;
  targetDir: string;
}

const TEMPLATES_DIR = path.resolve(__dirname, '..', 'templates');

function renderTemplate(content: string, vars: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

function copyTemplate(srcDir: string, destDir: string, vars: Record<string, string>): void {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    if (entry.isDirectory()) {
      copyTemplate(srcPath, path.join(destDir, entry.name), vars);
    } else if (entry.name.endsWith('.tpl')) {
      const destName = entry.name.replace(/\.tpl$/, '');
      const content = fs.readFileSync(srcPath, 'utf-8');
      fs.writeFileSync(path.join(destDir, destName), renderTemplate(content, vars), 'utf-8');
    } else {
      fs.copyFileSync(srcPath, path.join(destDir, entry.name));
    }
  }
}

function toDisplayName(name: string): string {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function handleCreate(opts: CreateOptions): void {
  const { name, targetDir } = opts;
  const projectRoot = path.resolve(targetDir, name);
  const unityRoot = projectRoot;
  const tsRoot = path.join(projectRoot, 'TsProject');

  console.log(`\n  Creating TowerUI project: ${name}\n`);

  // 1. TsProject
  console.log('  [1/4] Scaffolding TypeScript project...');
  copyTemplate(
    path.join(TEMPLATES_DIR, 'ts-project'),
    tsRoot,
    { PROJECT_NAME: name, DISPLAY_NAME: toDisplayName(name) }
  );

  // 2. Unity setup script
  console.log('  [2/4] Creating Unity setup script...');
  const scriptsDir = path.join(unityRoot, 'Assets', 'Scripts');
  copyTemplate(
    path.join(TEMPLATES_DIR, 'unity'),
    scriptsDir,
    { PROJECT_NAME: name, DISPLAY_NAME: toDisplayName(name) }
  );

  // 3. Unity Packages/manifest.json reference
  console.log('  [3/4] Configuring Unity package reference...');
  const manifestDir = path.join(unityRoot, 'Packages');
  if (!fs.existsSync(manifestDir)) fs.mkdirSync(manifestDir, { recursive: true });

  const manifestPath = path.join(manifestDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      if (!manifest.dependencies) manifest.dependencies = {};
      if (!manifest.dependencies['com.towerui.runtime']) {
        manifest.dependencies['com.towerui.runtime'] = 'file:../../../packages/unity-runtime';
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
        console.log('    Added com.towerui.runtime to manifest.json');
      }
    } catch {
      console.log('    ⚠ Could not update manifest.json, add manually.');
    }
  } else {
    console.log('    ⚠ No manifest.json found. After creating Unity project, add to Packages/manifest.json:');
    console.log('      "com.towerui.runtime": "file:../../../packages/unity-runtime"');
  }

  // 4. Resources dir
  const resDir = path.join(unityRoot, 'Assets', 'Resources');
  if (!fs.existsSync(resDir)) fs.mkdirSync(resDir, { recursive: true });

  console.log('  [4/4] Done!\n');
  console.log(`  Next steps:`);
  console.log(`  ────────────────────────────────────────────`);
  console.log(`  1. Create Unity project at:  ${unityRoot}`);
  console.log(`     (if not already created via Unity Hub)`);
  console.log(`  2. Install Puerts plugin into the Unity project`);
  console.log(`  3. Generate Puerts typings:`);
  console.log(`     Unity → PuerTS → Generate → index.d.ts`);
  console.log(`     Copy to: ${tsRoot}/typings/`);
  console.log(`  4. Install dependencies:`);
  console.log(`     cd ${tsRoot}`);
  console.log(`     pnpm install`);
  console.log(`  5. Build:`);
  console.log(`     node build.mjs`);
  console.log(`  6. Open Unity, press Play!`);
  console.log('');
}
