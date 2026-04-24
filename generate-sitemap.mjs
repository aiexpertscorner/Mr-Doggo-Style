/**
 * generate-sitemap.mjs
 * Generates public/sitemap.xml covering all 3000+ pages
 * Run: node generate-sitemap.mjs
 * Then commit public/sitemap.xml — Cloudflare serves it statically
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT    = path.dirname(fileURLToPath(import.meta.url));
const SITE    = 'https://pupwiki.com';
const TODAY   = new Date().toISOString().split('T')[0];
const OUT     = path.join(ROOT, 'public', 'sitemap.xml');

const breeds      = JSON.parse(fs.readFileSync(path.join(ROOT,'src','data','master-breeds.json'),'utf8'));
const crossbreeds = JSON.parse(fs.readFileSync(path.join(ROOT,'src','data','master-crossbreeds.json'),'utf8'));
const status      = JSON.parse(fs.readFileSync(path.join(ROOT,'src','data','content-status.json'),'utf8'));

const urls = [];

// Helper
function add(loc, priority, changefreq = 'weekly') {
  urls.push({ loc: `${SITE}${loc}`, priority, changefreq, lastmod: TODAY });
}

// Static pages
add('/', 1.0, 'daily');
add('/breeds', 0.9, 'weekly');
add('/blog', 0.8, 'daily');
add('/dog-names', 0.8, 'weekly');
add('/about', 0.4, 'monthly');
add('/disclosure', 0.3, 'monthly');

// Category pages
const CATS = ['dog-food','toys','beds','health','training','grooming','supplements','smart-tech','travel','lifestyle'];
CATS.forEach(c => add(`/categories/${c}`, 0.85, 'weekly'));

// Breed hub pages (277)
breeds.forEach(b => add(`/breeds/${b.slug}`, 0.9, 'weekly'));
crossbreeds.forEach(b => add(`/breeds/${b.slug}`, 0.85, 'weekly'));

// Cost calculator hub + all breed pages
add('/cost-calculator', 0.9, 'weekly');
breeds.forEach(b => add(`/cost-calculator/${b.slug}`, 0.85, 'weekly'));
crossbreeds.forEach(b => add(`/cost-calculator/${b.slug}`, 0.80, 'weekly'));

// Breed cluster blog posts
breeds.forEach(b => {
  const s = status[b.slug] || {};
  if (s.food_post)        add(`/blog/best-food-for-${b.slug}`,       0.80, 'monthly');
  if (s.toy_post)         add(`/blog/best-toys-for-${b.slug}`,        0.75, 'monthly');
  if (s.bed_post)         add(`/blog/best-bed-for-${b.slug}`,         0.70, 'monthly');
  if (s.grooming_post)    add(`/blog/best-grooming-for-${b.slug}`,    0.70, 'monthly');
  if (s.health_post)      add(`/blog/${b.slug}-health-problems`,       0.75, 'monthly');
  if (s.supplement_post)  add(`/blog/best-supplements-for-${b.slug}`, 0.65, 'monthly');
  if (s.training_post)    add(`/blog/training-a-${b.slug}`,           0.65, 'monthly');
  if (s.names_page)       add(`/dog-names/${b.slug}`,                 0.75, 'monthly');
});

// Static blog posts (existing non-breed posts)
const staticPosts = [
  'best-dog-food-large-breeds','best-dog-beds-orthopedic','best-gps-dog-trackers',
  'best-indestructible-dog-toys','best-no-pull-harnesses','best-interactive-dog-toys',
  'best-joint-supplements-dogs','best-dog-grooming-tools','best-dog-shampoo',
  'best-dog-training-collars','best-grain-free-dog-food','best-senior-dog-food',
  'best-puppy-food-large-breeds','best-fetch-toys-dogs','best-flea-tick-prevention',
  'best-automatic-dog-feeders','best-dog-cooling-mats','best-dog-crates-large-breeds',
  'best-dog-dental-chews','best-dog-leashes-large-dogs','best-dog-nail-clippers',
  'best-elevated-dog-beds','chewy-vs-amazon-dog-food','furminator-vs-cheaper-alternatives',
  'kong-vs-goughnuts',
  // Phase 5 money pages
  'best-dog-food-maker-chefpaw-review-2026',
  'best-gifts-for-dog-lovers-2026',
  'best-training-tools-stubborn-dogs-2026',
  // Comparison posts
  'embark-dna-test-vs-wisdom-panel-essential','kong-extreme-vs-goughnuts-maxx',
  'kong-classic-vs-west-paw-toppl','fi-series-4-gps-vs-tractive-gps-dog-4',
  'purina-pro-plan-large-breed-vs-hills-science-diet-large-breed',
  'the-farmers-dog-vs-ollie-fresh-food','big-barker-orthopedic-vs-petfusion-ultimate-bed',
  'ruffwear-front-range-vs-rabbitgoo-no-pull-harness','nutramax-cosequin-vs-zesty-paws-mobility',
  'stella-chewys-freeze-dried-vs-instinct-raw-boost-mixers',
];
staticPosts.forEach(s => add(`/blog/${s}`, 0.65, 'monthly'));

// Build XML
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

fs.writeFileSync(OUT, xml, 'utf8');

console.log(`\n✓ sitemap.xml written to public/`);
console.log(`  Total URLs: ${urls.length}`);
console.log(`  Breed hubs: ${breeds.length}`);
console.log(`  Blog posts: ${urls.filter(u=>u.loc.includes('/blog/')).length}`);
console.log(`  Name pages: ${urls.filter(u=>u.loc.includes('/dog-names/')).length}`);
console.log(`\nNext steps:`);
console.log(`  1. npm run build  (no more sitemap error)`);
console.log(`  2. git add public/sitemap.xml && git commit -m "sitemap: ${urls.length} URLs"`);
console.log(`  3. Submit https://pupwiki.com/sitemap.xml to Google Search Console\n`);
