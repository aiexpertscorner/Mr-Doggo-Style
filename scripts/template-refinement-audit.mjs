import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const targetRoot = join(root, 'src');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (full.endsWith('.astro') || full.endsWith('.css')) out.push(full);
  }
  return out;
}

const files = walk(targetRoot);
const astroFiles = files.filter((f) => f.endsWith('.astro'));

const rows = astroFiles.map((file) => {
  const text = readFileSync(file, 'utf8');
  const rel = relative(root, file);
  return {
    file: rel,
    inlineStyleAttrs: (text.match(/\sstyle=/g) || []).length,
    inlineJsHandlers: (text.match(/\son[a-z]+=\"/gi) || []).length,
    hasStyleBlock: /<style[\s>]/.test(text),
    awinSlots: (text.match(/AwinProductSlot/g) || []).length,
    amazonSlots: (text.match(/AmazonProductSlot/g) || []).length,
  };
});

const hotspots = rows
  .filter((r) => r.inlineStyleAttrs > 0 || r.inlineJsHandlers > 0)
  .sort((a, b) => (b.inlineStyleAttrs + b.inlineJsHandlers) - (a.inlineStyleAttrs + a.inlineJsHandlers))
  .slice(0, 20);

const summary = {
  generatedAt: new Date().toISOString(),
  totals: {
    astroTemplates: astroFiles.length,
    totalInlineStyleAttrs: rows.reduce((s, r) => s + r.inlineStyleAttrs, 0),
    totalInlineJsHandlers: rows.reduce((s, r) => s + r.inlineJsHandlers, 0),
    templatesUsingAwinSlot: rows.filter((r) => r.awinSlots > 0).length,
    templatesUsingAmazonSlot: rows.filter((r) => r.amazonSlots > 0).length,
  },
  hotspots,
};

console.log(JSON.stringify(summary, null, 2));
