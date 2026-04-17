/**
 * setup-structure.mjs
 * Creates all required directories and syncs src/styles → public/styles.
 * Run this ONCE after placing the zip contents.
 *
 * Usage (from project root):
 *   node setup-structure.mjs
 */

import fs   from 'fs';
import path from 'path';

const ROOT = process.cwd();
const G = s => `\x1b[32m${s}\x1b[0m`;
const B = s => `\x1b[34m${s}\x1b[0m`;
const Y = s => `\x1b[33m${s}\x1b[0m`;

function mkdirp(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    fs.mkdirSync(abs, { recursive: true });
    console.log(`  ${G('✓ created')}  ${rel}`);
  } else {
    console.log(`  · exists   ${rel}`);
  }
}

function copyFile(src, dest) {
  const absS = path.join(ROOT, src);
  const absD = path.join(ROOT, dest);
  if (!fs.existsSync(absS)) {
    console.log(`  ${Y('⚠ skip')}    ${src} (not found)`);
    return false;
  }
  fs.mkdirSync(path.dirname(absD), { recursive: true });
  fs.copyFileSync(absS, absD);
  console.log(`  ${G('✓ copied')}  ${src} → ${dest}`);
  return true;
}

function findFiles(dir) {
  const found = [];
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return found;
  function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else found.push(path.relative(ROOT, full).replace(/\\/g, '/'));
    }
  }
  walk(abs);
  return found;
}

console.log('\n══════════════════════════════════════════════════════');
console.log('  🔧  MrDoggoStyle Structure Setup');
console.log('══════════════════════════════════════════════════════\n');

// ── 1. Create required directories ────────────────────────────
console.log(B('── Creating directories ──'));
const DIRS = [
  'src/layouts',
  'src/components/ui',
  'src/components/content',
  'src/components/names',
  'src/styles/layouts',
  'src/styles/components',
  'src/pages/blog',
  'src/pages/categories',
  'src/pages/breeds',
  'src/pages/dog-names',
  'src/data',
  'src/scripts',
  'public/styles/layouts',
  'public/styles/components',
  'public/scripts',
  'scripts',
];
DIRS.forEach(mkdirp);

// ── 2. Sync src/styles → public/styles ────────────────────────
console.log(`\n${B('── Syncing src/styles → public/styles ──')}`);
const cssFiles = findFiles('src/styles');
let synced = 0;
for (const srcFile of cssFiles) {
  const dest = srcFile.replace('src/styles', 'public/styles');
  if (copyFile(srcFile, dest)) synced++;
}
console.log(`  Synced: ${synced} CSS files`);

// ── 3. Sync name-generator script ─────────────────────────────
console.log(`\n${B('── Checking scripts ──')}`);
// Try both locations it might be at
const scriptCandidates = [
  'src/scripts/name-generator.mjs',
  'scripts/name-generator.mjs',
];
for (const candidate of scriptCandidates) {
  if (fs.existsSync(path.join(ROOT, candidate))) {
    copyFile(candidate, 'public/scripts/name-generator.mjs');
    break;
  }
}

// ── 4. Check BaseLayout imports and report ────────────────────
console.log(`\n${B('── Checking BaseLayout.astro ──')}`);
const baseLayoutPath = 'src/layouts/BaseLayout.astro';
if (fs.existsSync(path.join(ROOT, baseLayoutPath))) {
  const content = fs.readFileSync(path.join(ROOT, baseLayoutPath), 'utf8');

  // Check what it imports
  const imports = [...content.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
  imports.forEach(imp => {
    if (!imp.startsWith('.')) return;
    const fileDir = path.dirname(path.join(ROOT, baseLayoutPath));
    const resolved = path.resolve(fileDir, imp);
    const candidates = [resolved, resolved + '.astro', resolved + '.ts'];
    const ok = candidates.some(c => fs.existsSync(c));
    console.log(`  ${ok ? G('✓') : Y('✗')}  import "${imp}"`);
  });
} else {
  console.log(`  BaseLayout.astro not found yet — place it from the light-theme-pack zip`);
}

// ── 5. Quick diagnosis of the original error ──────────────────
console.log(`\n${B('── Diagnosing original error ──')}`);
console.log(`  The error "Could not import ../components/ui/Header.astro" means:`);

const headerExists = fs.existsSync(path.join(ROOT, 'src/components/ui/Header.astro'));
const headerOldExists = fs.existsSync(path.join(ROOT, 'src/components/Header.astro'));

if (!headerExists && headerOldExists) {
  console.log(`  ${Y('→')} Header.astro is at src/components/Header.astro (old location)`);
  console.log(`  ${Y('→')} BaseLayout.astro expects it at src/components/ui/Header.astro`);
  console.log(`  ${Y('FIX:')} Copy it to the right place:`);
  console.log(`     node -e "require('fs').mkdirSync('src/components/ui',{recursive:true});require('fs').copyFileSync('src/components/Header.astro','src/components/ui/Header.astro')"`);
  console.log(`\n  OR place the new Header.astro from mrdoggostyle-light-theme-pack.zip`);
  console.log(`  into src/components/ui/Header.astro`);
} else if (!headerExists) {
  console.log(`  ${Y('→')} Header.astro does not exist anywhere in src/components/`);
  console.log(`  ${Y('FIX:')} Place src/components/ui/Header.astro from mrdoggostyle-light-theme-pack.zip`);
} else {
  console.log(`  ${G('✓')} src/components/ui/Header.astro exists — error should be resolved`);
}

// Also check Footer
const footerExists    = fs.existsSync(path.join(ROOT, 'src/components/ui/Footer.astro'));
const footerOldExists = fs.existsSync(path.join(ROOT, 'src/components/Footer.astro'));
if (!footerExists && footerOldExists) {
  console.log(`\n  ${Y('→')} Same issue with Footer.astro — at wrong location`);
}

// ── 6. Summary ────────────────────────────────────────────────
console.log(`\n══════════════════════════════════════════════════════`);
console.log(`  ✅  Setup complete`);
console.log(`  Next: run  node audit-project.mjs  to see full status`);
console.log(`  Then: npm run dev`);
console.log('══════════════════════════════════════════════════════\n');
