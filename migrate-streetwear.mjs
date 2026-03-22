/**
 * migrate-streetwear.mjs
 * Copies the streetwear redesign pack into your v1 site.
 *
 * Usage (run from E:\2026_Github):
 *   node migrate-streetwear.mjs
 *   node migrate-streetwear.mjs --dry-run
 *   node migrate-streetwear.mjs --backup
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SW_ROOT = path.resolve('E:/2026_Github/mrdoggostyle-streetwear');
const V1_ROOT = path.resolve('E:/2026_Github/mrdoggostyle_site');
const BACKUP_DIR = path.resolve(`E:/2026_Github/mrdoggostyle_BACKUP_BEFORE_STREETWEAR_${ts()}`);

const DRY_RUN   = process.argv.includes('--dry-run');
const DO_BACKUP = process.argv.includes('--backup');

// Never copy these
const SKIP_SEGMENTS = ['node_modules', '.git', 'dist', '.output', '.astro', 'package-lock.json'];

function ts() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0'),
    '_', String(d.getHours()).padStart(2,'0'), String(d.getMinutes()).padStart(2,'0')].join('');
}

function shouldSkip(p) {
  const segs = p.replace(/\\/g, '/').split('/');
  return SKIP_SEGMENTS.some(s => segs.includes(s));
}

function ensureDir(d) { if (!fs.existsSync(d) && !DRY_RUN) fs.mkdirSync(d, { recursive: true }); }
function log(icon, msg) { console.log(`  ${icon}  ${msg}`); }

let stats = { copied: 0, created: 0, skipped: 0, backed: 0 };

function backup(target) {
  if (!DO_BACKUP || !fs.existsSync(target)) return;
  const rel = path.relative(V1_ROOT, target);
  const dst = path.join(BACKUP_DIR, rel);
  ensureDir(path.dirname(dst));
  if (!DRY_RUN) fs.copyFileSync(target, dst);
  stats.backed++;
}

function walkCopy(src, dst, isRoot = false) {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const sp = path.join(src, entry.name);
    const dp = path.join(dst, entry.name);
    const rel = path.relative(SW_ROOT, sp);

    // Skip package.json at root — merge it instead
    if (isRoot && entry.name === 'package.json') {
      log('⏭', `SKIP   ${rel}  (handled by mergePackageJson)`);
      continue;
    }

    if (shouldSkip(sp)) { log('⏭', `SKIP   ${rel}`); stats.skipped++; continue; }

    if (entry.isDirectory()) { ensureDir(dp); walkCopy(sp, dp); continue; }

    const exists = fs.existsSync(dp);
    if (exists) { backup(dp); log('♻️', `UPDATE ${rel}`); stats.copied++; }
    else         { log('✨', `NEW    ${rel}`); stats.created++; }

    if (!DRY_RUN) { ensureDir(path.dirname(dp)); fs.copyFileSync(sp, dp); }
  }
}

function mergePackageJson() {
  const v1Path = path.join(V1_ROOT, 'package.json');
  const swPath = path.join(SW_ROOT, 'package.json');
  if (!fs.existsSync(v1Path) || !fs.existsSync(swPath)) return;

  const v1 = JSON.parse(fs.readFileSync(v1Path, 'utf8'));
  const sw = JSON.parse(fs.readFileSync(swPath, 'utf8'));
  const merged = { ...v1 };
  let changed = false;

  for (const [pkg, ver] of Object.entries(sw.dependencies || {})) {
    if (!v1.dependencies?.[pkg]) {
      merged.dependencies = merged.dependencies || {};
      merged.dependencies[pkg] = ver;
      log('📦', `package.json: add "${pkg}": "${ver}"`);
      changed = true;
    }
  }

  if (changed) {
    log('♻️', 'package.json: writing merged version');
    if (!DRY_RUN) fs.writeFileSync(v1Path, JSON.stringify(merged, null, 2) + '\n');
    stats.copied++;
  } else {
    log('✅', 'package.json: no new dependencies');
    stats.skipped++;
  }
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(60));
console.log('  🎨  MR. DOGGO STYLE — Streetwear Redesign Migration');
console.log('═'.repeat(60));
console.log(`  Source: ${SW_ROOT}`);
console.log(`  Target: ${V1_ROOT}`);
if (DRY_RUN)   console.log('  Mode:   🔍 DRY RUN');
if (DO_BACKUP) console.log(`  Backup: 💾 ${BACKUP_DIR}`);
console.log('─'.repeat(60) + '\n');

if (!fs.existsSync(SW_ROOT)) { console.error(`❌ Streetwear pack niet gevonden:\n   ${SW_ROOT}`); process.exit(1); }
if (!fs.existsSync(V1_ROOT)) { console.error(`❌ V1 site niet gevonden:\n   ${V1_ROOT}`); process.exit(1); }

console.log('── package.json merge ──────────────────────────────────');
mergePackageJson();
console.log('');
console.log('── Bestanden kopiëren ──────────────────────────────────');
walkCopy(SW_ROOT, V1_ROOT, true);

console.log('\n' + '═'.repeat(60));
console.log('  📊  Resultaat');
console.log('─'.repeat(60));
console.log(`  ♻️   Bijgewerkt:  ${stats.copied}`);
console.log(`  ✨  Nieuw:       ${stats.created}`);
console.log(`  ⏭   Overgeslagen:${stats.skipped}`);
if (DO_BACKUP) console.log(`  💾  Backup:      ${stats.backed} bestanden`);
if (DRY_RUN)   console.log('\n  ⚠️   DRY RUN — niets geschreven.');
console.log('\n  ✅  Volgende stappen:');
console.log('      1. cd E:\\2026_Github\\mrdoggostyle_site');
console.log('      2. npm install');
console.log('      3. npm run dev');
console.log('      4. Open http://localhost:4321');
console.log('      5. Controleer homepage, een blogpost, en /breeds/labrador-retriever');
console.log('═'.repeat(60) + '\n');
