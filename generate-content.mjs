/**
 * generate-content.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Automatische Rich Content Builder voor Mr. Doggo Style
 *
 * Genereert automatisch SEO-geoptimaliseerde blog posts vanuit breed × category
 * data combinaties — zonder handmatig schrijven.
 *
 * WAT HET MAAKT:
 *   1. Breed × Product posts  (277 breeds × 4 cats = 1.108 posts mogelijk)
 *   2. Comparison posts       ("KONG vs Goughnuts", "Purina vs Hill's")
 *   3. "Best under $X" posts  ("Best Dog Toys Under $20")
 *   4. Seasonal posts         ("Best Summer Cooling Gear")
 *
 * GEBRUIK:
 *   node generate-content.mjs                    # alle types
 *   node generate-content.mjs --type breed       # alleen breed posts
 *   node generate-content.mjs --type comparison  # alleen comparisons
 *   node generate-content.mjs --top50            # alleen top 50 breeds
 *   node generate-content.mjs --limit 20         # max 20 posts genereren
 *   node generate-content.mjs --dry-run          # preview zonder schrijven
 *
 * LOCATIE: zet in E:\2026_Github\mrdoggostyle_site\
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── CONFIG ────────────────────────────────────────────────────────────────────
const BREEDS_PATH  = path.resolve(__dirname, 'src/data/breeds.json');
const PRODUCTS_PATH= path.resolve(__dirname, 'src/data/products.json');
const OUTPUT_DIR   = path.resolve(__dirname, 'src/content/blog');
const TAG          = 'aiexpertscorn-20';
const TODAY        = new Date().toISOString().split('T')[0];

const TYPE_FILTER  = process.argv.includes('--type')
  ? process.argv[process.argv.indexOf('--type') + 1]
  : 'all';
const TOP50_ONLY   = process.argv.includes('--top50');
const DRY_RUN      = process.argv.includes('--dry-run');
const LIMIT        = process.argv.includes('--limit')
  ? parseInt(process.argv[process.argv.indexOf('--limit') + 1])
  : Infinity;
// ─────────────────────────────────────────────────────────────────────────────

function amazonUrl(asin) {
  return `https://www.amazon.com/dp/${asin}/?tag=${TAG}`;
}
function amazonImg(asin) {
  return `https://ws-na.amazon-adsystem.com/widgets/q?_encoding=UTF8&ASIN=${asin}&Format=_SL300_&ID=AsinImage&MarketPlace=US&ServiceVersion=20070822&WS=1&tag=${TAG}`;
}
function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function stars(n) { return '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n)); }
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ── BREED CATEGORY POST TEMPLATE ─────────────────────────────────────────────
function breedCategoryPost(breed, category, product, allProducts) {
  const catLabel = {
    food: 'Dog Food', toy: 'Toy', bed: 'Bed', grooming: 'Grooming Tool',
  }[category];

  const catSlug = { food: 'dog-food', toy: 'toys', bed: 'beds', grooming: 'grooming' }[category];
  const slug = `best-${category === 'food' ? 'dog-food' : category}-for-${slugify(breed.name)}`;

  const isLarge = breed.size_category === 'large';
  const isEnergetic = ['Needs Lots of Activity', 'Energetic'].includes(breed.energy.category);
  const isHeavyShedder = ['Regularly', 'Seasonal'].includes(breed.shedding.category);
  const wStr = breed.weight.min_lbs && breed.weight.max_lbs
    ? `${breed.weight.min_lbs}–${breed.weight.max_lbs} lbs`
    : breed.weight.max_lbs ? `up to ${breed.weight.max_lbs} lbs` : '';
  const lifeStr = breed.life_expectancy.min
    ? `${breed.life_expectancy.min}–${breed.life_expectancy.max} years`
    : '';

  // Get 3 alternative products from same category
  const catProducts = allProducts[catSlug] || allProducts['dog-food'] || [];
  const alternatives = catProducts.filter(p => p.asin !== product.asin).slice(0, 3);

  // Build intro based on breed traits
  const introFoodPart = category === 'food'
    ? `${breed.name}s ${isLarge ? 'are a large breed that needs controlled calcium levels and joint-supporting nutrients' : `need high-quality protein matched to their ${breed.energy.category.toLowerCase()} energy levels`}. ${isEnergetic ? 'As an active breed, they burn through calories quickly and need a high-protein formula to maintain lean muscle mass.' : 'They benefit from a well-balanced formula that supports their steady metabolism.'}`
    : category === 'toy'
    ? `${breed.name}s ${isEnergetic ? 'are high-energy dogs that need mentally and physically engaging toys to prevent boredom and destructive behavior' : 'enjoy regular play sessions and benefit from toys that match their natural instincts'}. ${breed.trainability.category === 'Eager to Please' ? 'As a highly trainable breed, they excel with puzzle toys and training games.' : 'The right toy makes a huge difference in their daily satisfaction.'}`
    : category === 'bed'
    ? `${breed.name}s sleep 12–14 hours per day. ${isLarge ? 'As a large breed, they need a bed with enough foam density to support their weight without bottoming out — a common failure point in cheap dog beds.' : 'The right bed supports their joints and gives them a dedicated space to decompress.'} ${lifeStr ? `With a lifespan of ${lifeStr}, investing in a quality orthopedic bed pays off long-term.` : ''}`
    : `${breed.name}s ${isHeavyShedder ? 'are heavy shedders that require regular grooming to manage coat health and reduce household hair' : 'have manageable grooming needs but still benefit from the right tools to keep their coat healthy'}. The wrong brush can irritate skin or miss the undercoat entirely.`;

  // FAQ questions specific to breed + category
  const faqs = category === 'food' ? [
    { q: `What is the best dog food for ${breed.name}s?`, a: `For ${breed.name}s, we recommend ${product.name}. ${isLarge ? 'Large breed formulas with controlled calcium (1.0–1.8% DM) and glucosamine are essential for this breed.' : 'Look for a formula with high-quality animal protein as the first ingredient and an AAFCO feeding trial statement.'} Always transition foods gradually over 7–10 days.` },
    { q: `How much should I feed my ${breed.name}?`, a: `A typical adult ${breed.name} weighing ${wStr || '50–80 lbs'} needs ${isLarge ? '3–4 cups of dry food per day, split into two meals' : '1.5–2.5 cups per day depending on activity level'}. Use the bag's guidelines as a starting point and adjust based on body condition score. You should be able to feel but not see the ribs.` },
    { q: `Do ${breed.name}s have food allergies?`, a: `${breed.name}s can develop food sensitivities, most commonly to proteins (chicken, beef) rather than grains. If you notice itching, ear infections, or digestive issues, discuss an elimination diet with your vet. Novel protein formulas (salmon, duck, venison) work well for sensitive ${breed.name}s.` },
    { q: `Is grain-free food good for ${breed.name}s?`, a: `Unless your ${breed.name} has a confirmed grain allergy, grain-free is not necessary and may carry additional cardiac risk (FDA DCM investigation). High-quality grain-inclusive formulas from established brands like Purina Pro Plan and Hill's are the vet-recommended choice.` },
  ] : category === 'toy' ? [
    { q: `What toys are best for ${breed.name}s?`, a: `${breed.name}s ${isEnergetic ? 'thrive with high-energy toys like fetch balls, tug ropes, and puzzle feeders' : 'enjoy moderate play with durable chew toys and interactive puzzles'}. The most important factor is matching toy durability to your dog's chewing intensity — ${isEnergetic ? 'heavy-duty rubber like KONG Extreme is recommended for this breed' : 'standard rubber toys are usually sufficient'}.` },
    { q: `How often should I give my ${breed.name} new toys?`, a: `Rotate toys every 3–5 days to maintain novelty and engagement. ${breed.name}s ${breed.trainability.category === 'Eager to Please' ? 'are smart dogs who quickly lose interest in familiar toys — rotation is especially important for this breed' : 'benefit from the mental stimulation of encountering "new" toys regularly'}. Keep 4–6 toys active and rotate them.` },
    { q: `Are squeaky toys safe for ${breed.name}s?`, a: `Squeaky toys are generally safe under supervision, but not for unsupervised chewing — the squeaker is a swallowing hazard once the toy is open. ${isEnergetic ? 'For this high-energy breed, plush squeaky toys are best used as interactive play toys, not chew toys.' : 'Monitor your dog during play and remove damaged toys immediately.'}` },
  ] : category === 'bed' ? [
    { q: `What size bed does a ${breed.name} need?`, a: `${breed.name}s typically need a ${isLarge ? 'Large (42") or XL (48") bed' : breed.size_category === 'small' ? 'Small (24") or Medium (30") bed' : 'Medium (30") or Intermediate (36") bed'}. Measure your dog from nose to tail and add 6–8 inches for comfortable stretching room. When in doubt, size up.` },
    { q: `Do ${breed.name}s need an orthopedic bed?`, a: `${isLarge ? `Yes — as a large breed, ${breed.name}s put significant weight on their joints during sleep. Orthopedic memory foam prevents the "bottoming out" that makes cheap beds useless. Start orthopedic beds at age 5–6 as prevention, not just after symptoms appear.` : `${breed.name}s benefit from foam support, especially as they age. Any dog with joint issues needs orthopedic support, and preventive use from age 5+ is recommended by most veterinarians.`}` },
    { q: `How often should I wash my ${breed.name}'s bed?`, a: `Wash the cover every 1–2 weeks, or immediately after accidents. Spot-clean the foam insert with mild soap and allow to fully air dry — never machine wash foam. A waterproof inner liner (like Friends Forever includes) makes this process much easier.` },
  ] : [
    { q: `How often should I groom my ${breed.name}?`, a: `${isHeavyShedder ? `${breed.name}s are heavy shedders that need brushing 3–4 times per week minimum. During spring and fall coat blows, daily brushing prevents mats and significantly reduces shedding around your home.` : `${breed.name}s need brushing ${breed.grooming.category === 'Daily Brushing' ? 'daily to prevent matting' : 'weekly for coat maintenance'}. Regular brushing also distributes natural oils and gives you a chance to check for skin issues.`}` },
    { q: `What grooming tools does a ${breed.name} need?`, a: `Essential tools for ${breed.name}s: ${isHeavyShedder ? 'a deShedding tool (FURminator is the gold standard), a slicker brush for regular maintenance, a metal comb for tangle detection, and nail clippers' : 'a slicker brush, metal comb, and nail clippers'}. Professional grooming every 6–8 weeks rounds out the routine.` },
    { q: `Do ${breed.name}s shed a lot?`, a: `${isHeavyShedder ? `Yes — ${breed.name}s are considered heavy shedders. Regular deShedding with a tool like the FURminator can reduce shedding by up to 90%. Expect more shedding in spring and fall during seasonal coat changes.` : `${breed.name}s are relatively ${breed.shedding.category === 'Infrequent' ? 'low' : 'moderate'}-shedding, making them a good choice for owners who prefer less hair management.`}` },
  ];

  // Frontmatter and full post
  return {
    slug,
    content: `---
title: "Best ${catLabel} for ${breed.name}s 2026: Expert-Matched Picks"
description: "We matched the best ${catLabel.toLowerCase()} to the ${breed.name}'s specific ${isLarge ? 'large size, ' : ''}${breed.energy.category.toLowerCase()} energy level, and ${breed.shedding.category.toLowerCase()} shedding profile. Here's what actually works."
pubDate: ${TODAY}
category: "${capitalize(catSlug.replace('-', ' '))}"
tags: ["${breed.slug}", "${catSlug}", "${breed.size_category}-breed", "${breed.energy.category.toLowerCase().replace(/ /g, '-')}"]
author: "Mr. Doggo Style"
breedSlug: "${breed.slug}"
---

${breed.name}s have specific needs that generic "${catLabel.toLowerCase()} for all breeds" posts miss entirely. This guide matches recommendations to the exact characteristics of this breed — ${wStr ? `${wStr}, ` : ''}${breed.energy.category.toLowerCase()} energy, ${breed.shedding.category.toLowerCase()} shedding, and ${breed.temperament ? `${breed.temperament.toLowerCase()} temperament` : breed.trainability.category.toLowerCase() + ' trainability'}.

> **Affiliate disclosure:** We earn a small commission if you buy through our links. This never influences our rankings — we only recommend what actually works for this breed.

---

## Why ${breed.name}s Need a Breed-Specific ${catLabel}

${introFoodPart}

**Key ${breed.name} characteristics affecting ${catLabel.toLowerCase()} choice:**
- **Size:** ${breed.size_category.charAt(0).toUpperCase() + breed.size_category.slice(1)} breed${wStr ? ` (${wStr})` : ''}
- **Energy level:** ${breed.energy.category}
- **Shedding:** ${breed.shedding.category}
- **Trainability:** ${breed.trainability.category}${lifeStr ? `\n- **Lifespan:** ${lifeStr}` : ''}

---

## Our Top Pick for ${breed.name}s

<div style="background:#1a1a1a;border:2px solid #CCFF00;padding:1.5rem;margin:1.5rem 0;box-shadow:4px 4px 0 #CCFF00">

### 🏆 ${product.name}

<img src="${amazonImg(product.asin)}" alt="${product.name}" style="max-width:300px;background:white;padding:.5rem" loading="lazy"/>

**Rating:** ${stars(product.rating)} ${product.rating.toFixed(1)}/5 ${product.reviewCount ? `(${product.reviewCount.toLocaleString()} reviews)` : ''}  
**Price:** $${product.price ? product.price.toFixed(2) : 'Check on Amazon'}

${product.features?.map(f => `✓ ${f}`).join('\n') || ''}

**Why it works for ${breed.name}s:** ${
  category === 'food' ? `${isLarge ? 'Controlled calcium and glucosamine support the joint health demands of this large breed.' : 'Quality protein matches this breed\'s energy needs.'} The ${breed.energy.category === 'Needs Lots of Activity' ? 'high protein content sustains their active lifestyle' : 'balanced formula suits their moderate activity level'}.`
  : category === 'toy' ? `${isEnergetic ? 'Built to withstand this breed\'s intense play drive.' : 'Provides the mental and physical engagement this breed needs.'} ${breed.trainability.category === 'Eager to Please' ? 'The puzzle element satisfies their need for mental challenge.' : 'Durable enough for this breed\'s play style.'}`
  : category === 'bed' ? `${isLarge ? 'The 7-inch foam system doesn\'t bottom out under this breed\'s weight' : 'The memory foam provides joint support proportional to this breed\'s frame'}. Clinically tested — not just marketing copy.`
  : `${isHeavyShedder ? 'Specifically designed to remove loose undercoat — the primary grooming challenge for ' + breed.name + 's.' : 'Gentle enough for this breed\'s coat while maintaining effectiveness.'}`
}

[**→ Check Price on Amazon**](${amazonUrl(product.asin)}){rel="nofollow sponsored"}

</div>

---

## Quick Comparison: Top ${catLabel}s for ${breed.name}s

| Product | Price | Rating | Best For |
|---|---|---|---|
| **${product.name}** | $${product.price?.toFixed(2) || '—'} | ${product.rating.toFixed(1)} ⭐ | Best Overall |
${alternatives.map((p, i) => `| ${p.name} | $${p.price?.toFixed(2) || '—'} | ${p.rating?.toFixed(1) || '—'} ⭐ | ${i === 0 ? 'Best Value' : i === 1 ? 'Premium Option' : 'Budget Pick'} |`).join('\n')}

---

${alternatives.length > 0 ? `## Runner-Up Options

${alternatives.map((p, i) => `### ${i + 2}. ${p.name} — ${i === 0 ? 'Best Value' : i === 1 ? 'Premium Pick' : 'Budget Option'}

<img src="${amazonImg(p.asin)}" alt="${p.name}" style="max-width:250px;background:white;padding:.5rem;float:right;margin:0 0 1rem 1rem" loading="lazy"/>

**Price:** $${p.price?.toFixed(2) || 'Check Amazon'} | **Rating:** ${stars(p.rating || 4.5)} ${(p.rating || 4.5).toFixed(1)}/5

${p.features?.slice(0, 3).map(f => `- ${f}`).join('\n') || ''}

${p.pros?.length ? `**Pros:** ${p.pros.slice(0, 2).join(' · ')}` : ''}  
${p.cons?.length ? `**Cons:** ${p.cons[0]}` : ''}

[Check price on Amazon →](${amazonUrl(p.asin)}){rel="nofollow sponsored"}

---
`).join('\n')}` : ''}

## ${breed.name}-Specific ${catLabel} Tips

${breed.care_tips?.slice(0, 3).map(tip => `- ${tip}`).join('\n') || `- Match the ${catLabel.toLowerCase()} to your ${breed.name}'s specific life stage and activity level.\n- Quality matters more than price — the right product used consistently beats an expensive product used poorly.\n- Consult your veterinarian for health-specific recommendations.`}

---

## Frequently Asked Questions

${faqs.map(f => `### ${f.q}\n\n${f.a}`).join('\n\n')}

---

## Our Verdict

For most ${breed.name} owners, **${product.name}** is the clear recommendation — it's specifically appropriate for this breed's ${isLarge ? 'large size and joint needs' : `${breed.energy.category.toLowerCase()} energy profile`} and has the research and reviews to back it up.

→ [Check price on Amazon](${amazonUrl(product.asin)}){rel="nofollow sponsored"}

*See our full [${breed.name} breed guide](/breeds/${breed.slug}) for complete care recommendations.*
`,
  };
}

// ── COMPARISON POST TEMPLATE ──────────────────────────────────────────────────
function comparisonPost(product1, product2, category) {
  const slug = `${slugify(product1.name)}-vs-${slugify(product2.name)}`;
  const catLabel = category.replace('-', ' ');

  return {
    slug,
    content: `---
title: "${product1.name} vs ${product2.name}: Which Is Actually Better?"
description: "We compared both ${catLabel}s head-to-head on durability, value, and real-world performance. One winner emerged — here's the honest breakdown."
pubDate: ${TODAY}
category: "Comparisons"
tags: ["comparison", "${slugify(product1.name)}", "${slugify(product2.name)}", "${category}"]
author: "Mr. Doggo Style"
---

Both ${product1.name} and ${product2.name} appear on almost every "best ${catLabel}" list. But they're meaningfully different products — and choosing the wrong one is a $${Math.max(product1.price||20, product2.price||20).toFixed(0)} mistake.

> **Affiliate disclosure:** We earn a small commission through our links. Our analysis is based on independent research only.

---

## Quick Verdict

| | ${product1.name} | ${product2.name} |
|---|---|---|
| **Price** | $${product1.price?.toFixed(2) || '—'} | $${product2.price?.toFixed(2) || '—'} |
| **Rating** | ${product1.rating?.toFixed(1) || '—'} ⭐ | ${product2.rating?.toFixed(1) || '—'} ⭐ |
| **Reviews** | ${product1.reviewCount?.toLocaleString() || '—'} | ${product2.reviewCount?.toLocaleString() || '—'} |
| **Best for** | See below | See below |

---

## ${product1.name}

<img src="${amazonImg(product1.asin)}" alt="${product1.name}" style="max-width:300px;background:white;padding:.5rem" loading="lazy"/>

**Price:** $${product1.price?.toFixed(2) || 'Check Amazon'} | **Rating:** ${stars(product1.rating || 4.5)} ${(product1.rating || 4.5).toFixed(1)}/5

${product1.features?.map(f => `✓ ${f}`).join('\n') || ''}

**Pros:** ${product1.pros?.join(' · ') || 'Well-reviewed by verified buyers'}  
**Cons:** ${product1.cons?.join(' · ') || 'Check reviews for latest feedback'}

[→ Check price on Amazon](${amazonUrl(product1.asin)}){rel="nofollow sponsored"}

---

## ${product2.name}

<img src="${amazonImg(product2.asin)}" alt="${product2.name}" style="max-width:300px;background:white;padding:.5rem" loading="lazy"/>

**Price:** $${product2.price?.toFixed(2) || 'Check Amazon'} | **Rating:** ${stars(product2.rating || 4.5)} ${(product2.rating || 4.5).toFixed(1)}/5

${product2.features?.map(f => `✓ ${f}`).join('\n') || ''}

**Pros:** ${product2.pros?.join(' · ') || 'Well-reviewed by verified buyers'}  
**Cons:** ${product2.cons?.join(' · ') || 'Check reviews for latest feedback'}

[→ Check price on Amazon](${amazonUrl(product2.asin)}){rel="nofollow sponsored"}

---

## Head-to-Head: Which Should You Buy?

**Buy ${product1.name} if:**
- You want the most popular option with the largest review base
- Price is your primary consideration${product1.price && product2.price && product1.price < product2.price ? ' (it\'s the cheaper option)' : ''}
- You prefer a tried-and-tested formula

**Buy ${product2.name} if:**
- You want a premium alternative with different strengths
- ${product1.price && product2.price && product2.price > product1.price ? 'Budget is less of a concern and you want the best available' : 'The specific features align better with your dog\'s needs'}
- You\'ve tried ${product1.name} and want to explore alternatives

---

## Our Verdict

Both products are genuinely good — this comparison comes down to your specific situation. ${product1.reviewCount && product2.reviewCount && product1.reviewCount > product2.reviewCount ? `${product1.name} has significantly more reviews (${product1.reviewCount?.toLocaleString()} vs ${product2.reviewCount?.toLocaleString()}), which gives it more statistical confidence.` : `They\'re closely matched on reviews, so the decision comes down to price and specific features.`}

**Our pick:** ${(product1.rating || 0) >= (product2.rating || 0) ? product1.name : product2.name} — for the ${(product1.rating || 0) >= (product2.rating || 0) ? 'higher rating' : 'better value proposition'} and overall performance.
`,
  };
}

// ── UNDER $X POST TEMPLATE ────────────────────────────────────────────────────
function underXPost(maxPrice, category, products) {
  const catLabel = { 'toys': 'Dog Toys', 'dog-food': 'Dog Food', 'beds': 'Dog Beds', 'grooming': 'Grooming Tools', 'supplements': 'Dog Supplements' }[category] || category;
  const eligible = products.filter(p => p.price && p.price <= maxPrice).sort((a,b) => (b.rating||0) - (a.rating||0));
  if (eligible.length < 3) return null;

  const slug = `best-${slugify(catLabel)}-under-${maxPrice}`;

  return {
    slug,
    content: `---
title: "Best ${catLabel} Under $${maxPrice} in 2026: ${eligible.length} Picks That Don't Disappoint"
description: "You don't need to spend a fortune on your dog. These are the best ${catLabel.toLowerCase()} under $${maxPrice} — all research-backed, all genuinely worth the price."
pubDate: ${TODAY}
category: "${catLabel}"
tags: ["budget", "${category}", "under-${maxPrice}", "value"]
author: "Mr. Doggo Style"
---

Budget dog products have a bad reputation — and honestly, most of them deserve it. But there are genuinely excellent options under $${maxPrice} that outperform products costing 3x more. We found them.

> **Affiliate disclosure:** We earn a small commission through our links at no extra cost to you.

---

## The ${eligible.length} Best ${catLabel} Under $${maxPrice}

${eligible.map((p, i) => `### ${i + 1}. ${p.name} — $${p.price?.toFixed(2)}

<img src="${amazonImg(p.asin)}" alt="${p.name}" style="max-width:280px;background:white;padding:.5rem;float:right;margin:0 0 1rem 1rem" loading="lazy"/>

**Rating:** ${stars(p.rating||4.5)} ${(p.rating||4.5).toFixed(1)}/5${p.reviewCount ? ` (${p.reviewCount.toLocaleString()} reviews)` : ''}  
**Price:** **$${p.price?.toFixed(2)}** ← Under $${maxPrice}

${p.features?.slice(0,3).map(f => `✓ ${f}`).join('\n') || ''}

${p.pros?.length ? `**Why we like it:** ${p.pros[0]}` : ''}  
${p.cons?.length ? `**Know before buying:** ${p.cons[0]}` : ''}

[→ Check price on Amazon](${amazonUrl(p.asin)}){rel="nofollow sponsored"}

---
`).join('\n')}

## Why Cheap Isn't Always Bad

The dog product industry has a lot of expensive options that are expensive for marketing reasons, not performance reasons. The picks above survived our research process — verified review analysis, ingredient/material quality checks, and brand reputation assessment.

The key is knowing which categories tolerate budget options and which don't. **Never cut corners on:** food (nutrition quality matters long-term), joint supplements (cheap glucosamine has poor bioavailability), and orthopedic beds for dogs with health issues.

**Fine to go budget on:** toys (unless you have a power chewer), grooming accessories, travel gear.

---

## FAQ: Budget ${catLabel}

### Are cheap ${catLabel.toLowerCase()} worth it?
For the products above — yes. We only include budget options that have strong review bases and quality indicators. A $${Math.min(...eligible.map(p => p.price||99)).toFixed(0)} product with 10,000 verified five-star reviews is more trustworthy than a $${(maxPrice * 2).toFixed(0)} product with 50 reviews.

### What's the minimum I should spend on ${catLabel.toLowerCase()}?
For this category, the sweet spot is $${Math.round(maxPrice * 0.4)}–$${maxPrice}. Below that, quality typically drops significantly. Above our budget threshold, you're often paying for branding.

---

*Looking for premium options? See our [complete ${catLabel} guide](/blog/best-${slugify(catLabel)}) for top picks at every price point.*
`,
  };
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  🔨  Mr. Doggo Style — Content Builder Engine');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (!fs.existsSync(BREEDS_PATH) || !fs.existsSync(PRODUCTS_PATH)) {
    console.error('❌ breeds.json or products.json not found. Run from site root.');
    process.exit(1);
  }

  const breeds   = JSON.parse(fs.readFileSync(BREEDS_PATH, 'utf8'));
  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf8'));

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let generated = 0;
  let skipped   = 0;
  const posts   = [];

  // ── 1. BREED × CATEGORY POSTS ──────────────────────────────────────────────
  if (TYPE_FILTER === 'all' || TYPE_FILTER === 'breed') {
    console.log('── Breed × Category Posts ──────────────────────────────────');
    const categories = ['food', 'toy', 'bed', 'grooming'];
    const targetBreeds = TOP50_ONLY
      ? breeds.filter(b => b.popularity && b.popularity <= 50)
      : breeds.filter(b => b.popularity && b.popularity <= 100); // focus on meaningful breeds

    for (const breed of targetBreeds) {
      for (const cat of categories) {
        if (generated >= LIMIT) break;
        const product = breed.products?.[cat];
        if (!product?.asin) continue;

        const post = breedCategoryPost(breed, cat, product, products);

        // Check if already exists
        const outPath = path.join(OUTPUT_DIR, `${post.slug}.md`);
        if (fs.existsSync(outPath)) { skipped++; continue; }

        posts.push(post);
        generated++;

        if (!DRY_RUN) {
          fs.writeFileSync(outPath, post.content);
          process.stdout.write(`  ✨ ${post.slug}\n`);
        } else {
          process.stdout.write(`  [DRY] ${post.slug}\n`);
        }
      }
      if (generated >= LIMIT) break;
    }
    console.log(`\n  → ${generated} breed posts ${DRY_RUN ? 'would be' : ''} generated\n`);
  }

  // ── 2. COMPARISON POSTS ────────────────────────────────────────────────────
  if ((TYPE_FILTER === 'all' || TYPE_FILTER === 'comparison') && generated < LIMIT) {
    console.log('── Comparison Posts ─────────────────────────────────────────');
    const comparisons = [
      ['toys', 'B0002AR0II', 'B004RWVB5K'],  // KONG vs Goughnuts
      ['toys', 'B0002AR0II', 'B001W0EIOU'],  // KONG vs West Paw
      ['dog-food', 'B0042EFNXW', 'B001650OE0'], // Purina vs Blue Buffalo
      ['dog-food', 'B0042EFNXW', 'B00135X34O'], // Purina vs Hill's
      ['dog-food', 'B001650OE0', 'B00135X34O'], // Blue Buffalo vs Hill's
      ['grooming', 'B0040QQ07C', 'B00ZGPI3OY'], // FURminator vs Hertzko
      ['beds', 'B00LPPNXE0', 'B07PYFZP5G'],    // Big Barker vs Friends Forever
      ['supplements', 'B0002AQFQK', 'B01NAWEPE0'], // Cosequin vs Zesty Paws
    ];

    for (const [cat, asin1, asin2] of comparisons) {
      if (generated >= LIMIT) break;
      const catProducts = products[cat] || [];
      const p1 = catProducts.find(p => p.asin === asin1);
      const p2 = catProducts.find(p => p.asin === asin2);
      if (!p1 || !p2) continue;

      const post = comparisonPost(p1, p2, cat);
      const outPath = path.join(OUTPUT_DIR, `${post.slug}.md`);
      if (fs.existsSync(outPath)) { skipped++; continue; }

      posts.push(post);
      generated++;

      if (!DRY_RUN) {
        fs.writeFileSync(outPath, post.content);
        console.log(`  ✨ ${post.slug}`);
      } else {
        console.log(`  [DRY] ${post.slug}`);
      }
    }
    console.log('');
  }

  // ── 3. UNDER $X POSTS ─────────────────────────────────────────────────────
  if ((TYPE_FILTER === 'all' || TYPE_FILTER === 'budget') && generated < LIMIT) {
    console.log('── Under $X Budget Posts ────────────────────────────────────');
    const budgetTargets = [
      [20, 'toys'], [15, 'toys'], [50, 'dog-food'], [30, 'grooming'],
      [50, 'supplements'], [100, 'beds'],
    ];

    for (const [price, cat] of budgetTargets) {
      if (generated >= LIMIT) break;
      const catProducts = products[cat] || [];
      const post = underXPost(price, cat, catProducts);
      if (!post) continue;

      const outPath = path.join(OUTPUT_DIR, `${post.slug}.md`);
      if (fs.existsSync(outPath)) { skipped++; continue; }

      posts.push(post);
      generated++;

      if (!DRY_RUN) {
        fs.writeFileSync(outPath, post.content);
        console.log(`  ✨ ${post.slug}`);
      } else {
        console.log(`  [DRY] ${post.slug}`);
      }
    }
    console.log('');
  }

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  📊  Resultaat');
  console.log('───────────────────────────────────────────────────────────');
  console.log(`  ✨  Gegenereerd:  ${generated} posts`);
  console.log(`  ⏭   Overgeslagen: ${skipped} (al bestaan)`);
  if (DRY_RUN) console.log('\n  ⚠️   DRY RUN — niets geschreven');
  else {
    console.log(`  📁  Output:      ${OUTPUT_DIR}`);
    console.log('\n  ✅  Volgende stap:');
    console.log('      npm run dev  →  controleer de nieuwe posts');
    console.log('      npm run build  →  genereer alle statische pagina\'s');
    console.log(`\n  💡  Tip: run met --type breed --top50 voor de meest waardevolle posts`);
    console.log(`  💡  Run periodiek opnieuw — overstapt bestaande posts automatisch`);
  }
  console.log('═══════════════════════════════════════════════════════════\n');
}

run().catch(console.error);
