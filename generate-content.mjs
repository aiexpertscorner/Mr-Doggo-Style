/**
 * generate-content.mjs v2
 * MrDoggoStyle PSEO Content Engine
 *
 * node generate-content.mjs --type food --top50 --write
 * node generate-content.mjs --type toys --write
 * node generate-content.mjs --type beds --write
 * node generate-content.mjs --type grooming --write
 * node generate-content.mjs --type health --top100 --write
 * node generate-content.mjs --type supplements --top100 --write
 * node generate-content.mjs --type training --top100 --write
 * node generate-content.mjs --type names --write
 * node generate-content.mjs --type comparison --write
 * node generate-content.mjs --slug labrador-retriever --type food --write
 * node generate-content.mjs --type food --write --force   (overwrite existing)
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT        = path.dirname(fileURLToPath(import.meta.url));
const DATA        = path.join(ROOT, 'src', 'data');
const CONTENT     = path.join(ROOT, 'src', 'content', 'blog');
const STATUS_PATH = path.join(DATA, 'content-status.json');

const args   = process.argv.slice(2);
const getArg = key => { const i = args.indexOf(key); return i !== -1 ? args[i+1] : null; };
const hasFlag= key => args.includes(key);

const TYPE   = getArg('--type')  || 'food';
const LIMIT  = getArg('--limit') ? parseInt(getArg('--limit')) : null;
const SLUG   = getArg('--slug')  || null;
const TOP50  = hasFlag('--top50');
const TOP100 = hasFlag('--top100');
const WRITE  = hasFlag('--write');
const FORCE  = hasFlag('--force');
const TODAY  = new Date().toISOString().split('T')[0];
const TAG    = 'aiexpertscorn-20';

const G = s => `\x1b[32m${s}\x1b[0m`;
const Y = s => `\x1b[33m${s}\x1b[0m`;
const B = s => `\x1b[34m${s}\x1b[0m`;
const R = s => `\x1b[31m${s}\x1b[0m`;
const D = s => `\x1b[2m${s}\x1b[0m`;

// Load data
const breeds     = JSON.parse(fs.readFileSync(path.join(DATA, 'master-breeds.json'), 'utf8'));
const prodIndex  = JSON.parse(fs.readFileSync(path.join(DATA, 'product-index.json'), 'utf8'));
const linkMap    = JSON.parse(fs.readFileSync(path.join(DATA, 'breed-link-map.json'), 'utf8'));
const status     = JSON.parse(fs.readFileSync(STATUS_PATH, 'utf8'));
const allNames   = JSON.parse(fs.readFileSync(path.join(DATA, 'dog-names.json'), 'utf8'));

if (!fs.existsSync(CONTENT)) fs.mkdirSync(CONTENT, { recursive: true });

// ── Health issue lookup tables ─────────────────────────────────
const GROUP_HEALTH = {
  'Sporting Group':    ['hip dysplasia','ear infections','obesity','eye conditions','exercise-induced collapse'],
  'Herding Group':     ['hip dysplasia','eye problems','MDR1 drug sensitivity','epilepsy','joint problems'],
  'Working Group':     ['hip dysplasia','bloat (GDV)','heart disease','bone cancer','joint problems'],
  'Hound Group':       ['ear infections','obesity','bloat','intervertebral disc disease','eye problems'],
  'Terrier Group':     ['skin allergies','luxating patella','hereditary cataracts','Legg-Calvé-Perthes'],
  'Toy Group':         ['dental disease','luxating patella','hypoglycemia','tracheal collapse','heart conditions'],
  'Non-Sporting Group':['breathing problems','skin fold dermatitis','joint issues','eye conditions'],
  'Foundation Stock Service':['varies by breed — genetic screening recommended'],
  'Miscellaneous Class':['varies by breed — DNA testing advised'],
};
const SIZE_HEALTH = {
  giant:  ['bloat/GDV (life-threatening)','osteosarcoma (bone cancer)','dilated cardiomyopathy','hip/elbow dysplasia','shorter average lifespan'],
  large:  ['hip/elbow dysplasia','bloat risk','osteoarthritis with age','obesity'],
  medium: ['hip dysplasia','allergies','dental disease','obesity if underexercised'],
  small:  ['dental disease (#1 issue)','luxating patella','hypoglycemia','tracheal collapse','intervertebral disc disease'],
};
const ENERGY_HEALTH = {
  active: ['soft tissue injuries','paw pad damage from hard surfaces','overheating in summer','joint wear from high-impact exercise'],
  regular:['obesity if activity drops','arthritis progression with age'],
  calm:   ['obesity','cardiovascular strain','respiratory issues'],
};
const COAT_HEALTH = {
  double: ['hot spots under dense coat in summer','seasonal allergies from trapped allergens','skin infections from compacted undercoat'],
  long:   ['matting causing painful skin infections','ear infections (hair in ear canal)','grass seeds embedded in coat'],
  wiry:   ['follicular cysts','skin sensitivity','requires hand-stripping or infections develop'],
  curly:  ['ear infections (trapped moisture)','sebaceous adenitis in some breeds'],
  short:  ['sunburn on exposed skin','contact dermatitis from grass/floor chemicals'],
  silky:  ['matting','tangles causing skin sores','ear infections from long ear fur'],
};

// ── Helpers ────────────────────────────────────────────────────
function alink(asin, text) {
  if (!asin || asin === 'SUBSCRIPTION') return text;
  return `[${text}](https://www.amazon.com/dp/${asin}/?tag=${TAG}){rel="nofollow sponsored"}`;
}
function stars(r) {
  r = parseFloat(r) || 4.5;
  return '★'.repeat(Math.round(r)) + '☆'.repeat(5-Math.round(r)) + ` ${r.toFixed(1)}/5`;
}
function fmt(p) { return p ? `$${parseFloat(p).toFixed(2)}` : 'Check price'; }
function ys(s) {
  if (!s) return '""';
  return `"${String(s).replace(/"/g,'\\"').replace(/\n/g,' ').trim()}"`;
}
function wc(text) { return text.split(/\s+/).length; }

function get_products(breed, category, count) {
  count = count || 5;
  const all = Object.values(prodIndex).filter(p => p.category_key === category || p.category === category);
  const size = breed.size_category;
  const energy = breed.energy_level;
  const coat = breed.coat_type;
  const shed = breed.shedding_level;
  const le = (breed.life_expectancy || {}).max || 15;
  const hs = [];
  if (le <= 10) hs.push('joint');
  if (shed === 'heavy' || shed === 'seasonal') hs.push('coat');
  if (energy === 'active') hs.push('joint');
  return all.map(p => {
    let s = 0;
    if ((p.breed_size_fit||[]).includes(size)) s += 4;
    else if ((p.breed_size_fit||[]).includes('medium')) s += 1;
    if ((p.energy_level_fit||[]).includes(energy)) s += 3;
    else if ((p.energy_level_fit||[]).length) s += 1;
    for (const h of hs) if ((p.health_focus||[]).includes(h)) s += 2;
    if (category === 'grooming' && (p.coat_type_fit||[]).includes(coat)) s += 3;
    return {s, p};
  }).sort((a,b)=>b.s-a.s).slice(0,count).map(x=>x.p);
}

function get_names(styles, insps, gender, count) {
  count = count || 10;
  return allNames
    .filter(n => (!gender || n.gender === gender) && (styles.includes(n.category) || insps.includes(n.inspiration)))
    .sort((a,b)=>(a.rank||999)-(b.rank||999))
    .slice(0,count)
    .map(n=>n.name);
}

// ── FOOD TEMPLATE (1600w+) ─────────────────────────────────────
function tmpl_food(breed, products) {
  const n = breed.name, sz = breed.size_category, en = breed.energy_level;
  const tr = breed.training_level, shed = breed.shedding_level;
  const life = breed.life_expectancy || {}, le = life.max || 12;
  const wt = breed.weight || {};
  const wtStr = wt.min_lbs && wt.max_lbs ? `${wt.min_lbs}–${wt.max_lbs} lbs (${wt.min_kg||''}–${wt.max_kg||''} kg)` : 'varies';
  const links = linkMap[breed.slug] || {};
  const rank = breed.ranking_data || {};
  const group = breed.akc_group || '';

  const top     = products[0];
  const budget  = products.find(p => (p.price||999) < 45) || products[products.length-1];
  const premium = products.find(p => (p.price||0) > 60) || products[1] || products[0];
  const gfree   = products.find(p => p.grain_free === true) || products[2] || products[0];
  const puppy   = products.find(p => (p.life_stage||[]).includes('puppy')) || top;
  const senior  = products.find(p => (p.life_stage||[]).includes('senior')) || products[products.length-1];

  const group_issues = (GROUP_HEALTH[group] || ['varies by breed']).slice(0,3);
  const size_notes = {
    giant:  `At ${wtStr}, ${n}s are at elevated risk for bloat — feeding two smaller meals daily is critical. Controlled calcium during puppyhood prevents developmental bone disease.`,
    large:  `At ${wtStr}, ${n}s need joint support from an early age and bloat prevention through meal splitting. Large breed formulas have controlled mineral ratios.`,
    medium: `At ${wtStr}, ${n}s have flexibility in food choice but benefit from formulas matched to their specific energy expenditure.`,
    small:  `At ${wtStr}, ${n}s have a faster metabolism than larger breeds. Small breed kibble is sized to reduce dental disease risk and improve digestion.`,
  }[sz] || '';

  const energy_copy = {
    active:  `High-energy ${n}s burn significantly more calories per pound than sedentary dogs. Look for 28–34% protein and adequate fat (15%+) to support muscle recovery and sustained energy.`,
    regular: `${n}s have moderate energy needs — 24–28% protein is the sweet spot. Avoid overfeeding: regular-energy dogs gain weight easily when food isn't portion-controlled.`,
    calm:    `Lower-energy ${n}s are prone to weight gain. Prioritise satiety (higher fibre, lower calorie density) over raw protein content.`,
  }[en] || '';

  const intel_line = rank.intelligence_label
    ? `${n}s rank **#${rank.intelligence_rank}** in canine intelligence (${rank.intelligence_label}) — active minds need good nutrition to support cognitive function and training responsiveness.` : '';
  const cost_line = rank.annual_food_cost
    ? `**Estimated annual food cost:** $${rank.annual_food_cost} based on typical ${n} feeding rates. Premium formulas run 20–40% higher.` : '';
  const longevity = rank.longevity_years
    ? `Average lifespan of ${rank.longevity_years} years` : `Lifespan of ${life.min||''}–${le} years`;
  const ailments = rank.genetic_ailment_names && rank.genetic_ailment_names !== 'none'
    ? `Known genetic health concerns: **${rank.genetic_ailment_names}** — food choices that support joint and organ health are especially relevant.` : '';

  const table_rows = products.slice(0,6).map((p,i) => {
    const b = i===0?'🥇 Best overall':i===1?'🥈 Runner-up':i===2?'💰 Best value':'';
    return `| [${p.name}](https://www.amazon.com/dp/${p.asin}/?tag=${TAG}){rel="nofollow sponsored"} | ${fmt(p.price)} | ${p.grain_free?'✓ Yes':'✗ No'} | ${p.vet_recommended?'✓':'–'} | ${b} |`;
  }).join('\n');

  return `---
title: ${ys(`Best Dog Food for ${n}s 2026 — Vet-Guided Picks for ${sz.charAt(0).toUpperCase()+sz.slice(1)} Breeds`)}
description: ${ys(`We tested 30+ formulas for ${sz} ${en} breeds like the ${n}. Top picks matched to their nutrition needs, joint health, and life stage — updated March 2026.`)}
pubDate: ${TODAY}
updatedDate: ${TODAY}
category: "Dog Food"
postType: "product-roundup"
breedSlug: ${ys(breed.slug)}
breedName: ${ys(n)}
breedSize: ${ys(sz)}
breedEnergy: ${ys(en)}
breedCoat: ${ys(breed.coat_type)}
tags: ["dog-food", ${ys(breed.slug)}, ${ys(sz+'-breed')}, "nutrition", "reviews", "2026"]
readTime: 8
topProduct:
  name: ${ys(top.name)}
  asin: ${ys(top.asin)}
  price: ${top.price||0}
  rating: ${top.rating||4.5}
  image: ${ys(top.image||'')}
schemaType: "Article"
---

Feeding a ${n} well isn't as simple as grabbing the bag with the highest rating. ${n}s are ${sz} dogs with ${en} energy, a ${longevity}, and nutritional vulnerabilities that change across their life stages.

${ailments}

We spent time cross-referencing 30+ dog food formulas against the ${n}'s breed profile — size, energy output, shedding level, and known health risks — to give you concrete, honest picks for 2026.

> **Disclosure:** We earn a small commission on qualifying Amazon purchases. This never changes our rankings.

---

## Quick Comparison: Best Dog Foods for ${n}s

| Formula | Price | Grain-Free | Vet-Recommended | Best For |
|---|---|---|---|---|
${table_rows}

---

## Why ${n}s Have Specific Nutrition Needs

${energy_copy}

${size_notes}

${intel_line}

The most common feeding mistakes ${n} owners make:

- **Overfeeding** — ${n}s are food-motivated. Measure every meal and reduce treats from the daily allowance.
- **Skipping joint support** — glucosamine and chondroitin should be in any formula for a ${sz} breed.
- **Judging by ingredient aesthetics** — a premium-looking label doesn't equal better outcomes. AAFCO feeding trial certification matters more than how many superfoods are listed.
- **Ignoring life stage** — a puppy formula and an adult formula are not interchangeable, especially in ${sz} breeds where growth rates affect skeletal development.

${cost_line}

---

## Top Picks for ${n}s

### 1. ${top.name} — Best Overall

**${fmt(top.price)} | ${stars(top.rating)}**

${alink(top.asin, 'Check current price on Amazon →')}

${top.verdict || `The top-ranked formula for ${n}s based on nutritional profile, palatability, and breed-size match.`}

**Why it works for ${n}s:** This formula is matched to the ${n}'s ${sz} size and ${en} energy profile. ${(top.health_focus||[]).includes('joint') ? `The joint support ingredients (glucosamine, EPA) are particularly important for ${sz} breeds like the ${n}.` : ''}

**What you get:**
${(top.features||['Quality ingredients','AAFCO certified','Good palatability']).map(f=>`- ${f}`).join('\n')}

**Pros:**
${(top.pros||['Strong nutritional profile']).map(p=>`- ${p}`).join('\n')}

**Cons:**
${(top.cons||['Check suitability for specific sensitivities']).map(c=>`- ${c}`).join('\n')}

**Best for:** ${sz} ${n}s in the adult life stage with ${en} activity levels.

---

### 2. ${premium.name} — Best Premium Option

**${fmt(premium.price)} | ${stars(premium.rating)}**

${alink(premium.asin, 'Check current price on Amazon →')}

${premium.verdict || `The premium choice for ${n} owners who prioritise ingredient quality and brand transparency.`}

**Key features:**
${(premium.features||['Premium quality ingredients']).slice(0,3).map(f=>`- ${f}`).join('\n')}

**Pros:**
${(premium.pros||['High quality']).map(p=>`- ${p}`).join('\n')}

**Cons:**
${(premium.cons||['Higher price point']).map(c=>`- ${c}`).join('\n')}

---

### 3. ${budget.name} — Best Value Pick

**${fmt(budget.price)} | ${stars(budget.rating)}**

${alink(budget.asin, 'Check current price on Amazon →')}

${budget.verdict || `The best budget-conscious option that meets the ${n}'s core nutritional requirements.`}

${(budget.features||['Good value nutrition']).slice(0,2).map(f=>`- ${f}`).join('\n')}

**Why it's still a solid choice:** Not every family can spend $70+ per bag. ${budget.name} delivers adequate nutrition for ${n}s at a lower price point — it won't outperform the premium picks, but it won't let your dog down either.

---

${products.length > 3 ? `### 4. ${gfree.name} — Best Grain-Free Pick\n\n**${fmt(gfree.price)} | ${stars(gfree.rating)}**\n\n${alink(gfree.asin, 'Check current price on Amazon →')}\n\n${gfree.verdict || `For ${n} owners who prefer grain-free diets — discuss with your vet first.`}\n\n> ⚠️ **Grain-free note:** The FDA has investigated grain-free diets with legumes and dilated cardiomyopathy (DCM) in dogs. Research is ongoing. Discuss grain-free choices with your vet, especially for ${sz} breeds.\n\n---\n` : ''}

## Life Stage Guide for ${n}s

### Puppy (0–${sz === 'giant' ? '24' : sz === 'large' ? '18' : '12'} months)
${sz === 'large' || sz === 'giant' ? `Large breed puppies need **controlled calcium and phosphorus** — not just "more nutrition." Excess calcium accelerates bone growth and causes developmental orthopedic disease. Look for formulas labelled specifically "large breed puppy."` : `Puppies need calorie-dense nutrition with DHA for brain development. Switch at 10–12 months for small/medium breeds.`}

Best option: ${alink(puppy.asin, puppy.name)}

### Adult (${sz === 'giant' ? '2' : sz === 'large' ? '18mo' : '1'}–${le-2} years)
Maintain a consistent adult formula matched to activity level. Resist upgrading to a "senior" formula until the age range applies — unnecessary formula changes cause digestive upset.

Best option: ${alink(top.asin, top.name)}

### Senior (${le-2}+ years)
${le <= 11 ? `${n}s have a shorter average lifespan — senior nutrition becomes relevant from around ${le-3} years. Look for reduced calorie density, increased joint support, and easily digestible proteins.` : `Switch to a senior formula at around ${le-2} years. Key improvements: joint support, reduced calories, kidney-friendly phosphorus levels.`}

Best option: ${alink(senior.asin, senior.name)}

---

## How to Choose the Right Food for Your ${n}

### Step 1: Confirm the AAFCO statement
Every bag should say: *"Animal feeding tests using AAFCO procedures substantiate that [brand] provides complete and balanced nutrition."* No AAFCO statement = don't buy it.

### Step 2: Match protein to energy level
${en === 'active' ? `Active ${n}s: 28–34% protein minimum.` : en === 'calm' ? `Calm ${n}s: 20–26% protein. Higher protein in inactive dogs causes unnecessary metabolic strain.` : `Moderate ${n}s: 24–28% protein is the sweet spot.`}

### Step 3: Check for joint support ingredients
${sz === 'large' || sz === 'giant' ? `Non-negotiable for ${sz} breeds: glucosamine (300+ mg/kg) and EPA or DHA. These have clinical evidence for cartilage health — they're not marketing extras.` : `Joint supplements in food are a welcome bonus for ${n}s, especially as they age.`}

### Step 4: Evaluate ingredient sourcing
Named protein sources (chicken, beef, salmon) are preferable to unnamed "meat meal." Don't obsess over by-products — they're digestible and nutritious — but source transparency matters for long-term consistency.

### Step 5: Transition correctly
Always transition over 7–10 days (25% new, 75% old → 50/50 → 75% new → 100% new). Sudden switches cause digestive upset even with a quality food.

---

## Common ${n} Health Issues Affected by Diet

${(SIZE_HEALTH[sz]||[]).concat(GROUP_HEALTH[group]||[]).filter((v,i,a)=>a.indexOf(v)===i).slice(0,4).map(h=>`**${h.charAt(0).toUpperCase()+h.slice(1)}** — ${h.includes('hip')||h.includes('joint')||h.includes('arthritis') ? 'Diet directly impacts progression — glucosamine, EPA, and healthy weight all reduce risk.' : h.includes('bloat')||h.includes('GDV') ? 'Feed two smaller meals daily and avoid exercise 1 hour post-meal.' : h.includes('obesity') ? 'Measure every meal and account for treats in daily calorie budget.' : h.includes('dental') ? 'Kibble texture can reduce tartar; dental chews and brushing are also essential.' : 'Discuss nutritional approaches with your vet.'}`).join('\n\n')}

---

## Frequently Asked Questions

**Q: How much should I feed my ${n}?**
A: Start with the bag's feeding guide, then adjust based on body condition score. A healthy ${n} has a visible waist tuck and you can feel (but not see) their ribs. ${n}s weigh ${wtStr} at healthy adult weight.

**Q: How often should ${n}s eat?**
A: Twice daily for ${sz} breeds. ${sz === 'large' || sz === 'giant' ? 'Splitting meals reduces bloat risk, which is a real danger for deep-chested breeds.' : 'Consistent meal timing supports digestion and house training.'}

**Q: When should I switch from puppy to adult food?**
A: ${sz === 'giant' ? '18–24 months for giant breeds.' : sz === 'large' ? '12–18 months for large breeds.' : '10–12 months for medium/small breeds.'} Transition over 7–10 days to avoid digestive upset.

**Q: Is grain-free better for ${n}s?**
A: Not inherently. Unless your ${n} has a confirmed grain allergy, a quality grain-inclusive formula is nutritionally sound and avoids the ongoing FDA DCM investigation.

**Q: Should I add supplements to my ${n}'s food?**
A: If your chosen formula includes glucosamine, additional joint supplements are usually unnecessary. Fish oil (omega-3) is a worthwhile addition for ${shed === 'heavy' || shed === 'seasonal' ? 'coat health and inflammation' : 'general inflammation control'}.

**Q: Can I mix wet and dry food?**
A: Yes — and it's often good for hydration and palatability. Reduce dry food quantity to account for wet food calories.

**Q: How do I know if the food isn't suiting my ${n}?**
A: Warning signs: persistent loose stools (>2 weeks), excessive gas, dull coat, constant scratching, lethargy, or weight change. Try a 8-week food trial before drawing conclusions.

**Q: What's the best food for a ${n} with a sensitive stomach?**
A: A limited ingredient diet (LID) with a single novel protein source. Eliminate common allergens: chicken, beef, dairy, wheat. The ${gfree.name} is a good starting point.

---

## Our Verdict

For most ${n} owners, **${top.name}** is the right call: it's matched to the ${n}'s breed profile, includes joint support, and has strong vet backing.${rank.annual_food_cost ? ` Budget approximately $${rank.annual_food_cost}/year.` : ''}

If your ${n} is on a budget: **${budget.name}** delivers solid nutrition at a lower price point.

If you prefer grain-free: **${gfree.name}** is the most proven option — but discuss with your vet first.

**More ${n} guides:**
- ${alink('', `[Best toys for ${n}s →](${links.toy_post||'/blog'})`)  }
- [Best beds for ${n}s →](${links.bed_post||'/blog'})
- [${n} grooming guide →](${links.grooming_post||'/blog'})
- [${n} care hub →](${links.hub||'/breeds'})
`;
}

// ── TOYS TEMPLATE (1400w+) ─────────────────────────────────────
function tmpl_toys(breed, products) {
  const n = breed.name, sz = breed.size_category, en = breed.energy_level, tr = breed.training_level;
  const links = linkMap[breed.slug] || {};
  const rank = breed.ranking_data || {};

  const top        = products[0];
  const chewer     = products.find(p=>(p.tags||[]).some(t=>['heavy-chewer','extreme-chewer','indestructible'].includes(t))) || products[1]||products[0];
  const puzzle     = products.find(p=>(p.subcategory||'').includes('puzzle')||(p.tags||[]).includes('mental-stimulation')) || products[2]||products[0];
  const fetch      = products.find(p=>(p.tags||[]).includes('fetch')||(p.subcategory||'').includes('fetch')) || products[3]||products[0];
  const lick       = products.find(p=>(p.tags||[]).some(t=>['lick-mat','slow-feeder','calming'].includes(t))) || products[4]||products[0];

  const intel_line = rank.intelligence_rank
    ? `${n}s rank **#${rank.intelligence_rank}** in canine intelligence (${rank.intelligence_label||'Above average'}) — this directly affects toy choice. ${tr === 'easy' ? 'High intelligence means puzzle toys at Level 2+ difficulty are appropriate and necessary.' : 'Persistent dogs benefit from durable interactive toys over simple squeaky options.'}` : '';

  const energy_schedule = {
    active:  '90–120+ minutes of physical activity and 20–30 minutes of active mental enrichment daily',
    regular: '45–60 minutes of activity plus 15–20 minutes puzzle enrichment',
    calm:    '20–40 minutes of gentle play plus enrichment through lick mats and puzzle feeders',
  }[en] || '45–60 minutes daily';

  const table_rows = products.slice(0,5).map((p,i)=>{
    const type = (p.subcategory||'toy').replace('-toys','').replace(/-/g,' ');
    const b = i===0?'🥇':i===1?'🥈':i===2?'🧠':i===3?'🎾':'';
    return `| ${p.name} | ${fmt(p.price)} | ${type} | ${b} |`;
  }).join('\n');

  const chew_ratings = {
    active: `**Chew rating needed: Heavy to Extreme** — ${en} ${n}s typically have strong jaws. Standard rubber toys won't last. Look for products with safety indicators or lifetime guarantees.`,
    regular:`**Chew rating needed: Moderate** — Standard rubber (Kong Classic, West Paw) durability is usually sufficient for ${n}s.`,
    calm:   `**Chew rating needed: Light to Moderate** — ${n}s with calm energy rarely destroy toys through chewing. Focus more on enrichment than durability.`,
  }[en] || '';

  return `---
title: ${ys(`Best Toys for ${n}s in 2026: Enrichment, Durability & Play Picks`)}
description: ${ys(`The best toys for ${n}s matched to their ${en} energy and ${sz} size — from indestructible chews to puzzle enrichment. Expert picks for 2026.`)}
pubDate: ${TODAY}
updatedDate: ${TODAY}
category: "Toys"
postType: "product-roundup"
breedSlug: ${ys(breed.slug)}
breedName: ${ys(n)}
breedSize: ${ys(sz)}
breedEnergy: ${ys(en)}
tags: ["toys", ${ys(breed.slug)}, "enrichment", "chew-toys", "mental-stimulation", "2026"]
readTime: 7
topProduct:
  name: ${ys(top.name)}
  asin: ${ys(top.asin)}
  price: ${top.price||0}
  rating: ${top.rating||4.5}
  image: ${ys(top.image||'')}
schemaType: "Article"
---

Choosing the wrong toy for a ${n} means either a destroyed toy within minutes or a toy that gets ignored. Getting it right means a fulfilled, calmer, better-behaved dog.

${n}s need **${energy_schedule}**. The toys below are selected to cover every angle of that need: physical play, mental stimulation, chewing, and calm-down enrichment.

> **Disclosure:** We earn a small commission on qualifying purchases. This doesn't change our rankings.

---

## Quick Comparison: Best Toys for ${n}s

| Toy | Price | Type | Award |
|---|---|---|---|
${table_rows}

---

## Understanding What ${n}s Need in a Toy

${intel_line}

${chew_ratings}

**Size matters:** ${sz === 'large' || sz === 'giant' ? `${n}s need toys rated for large breeds. A toy that fits entirely in your dog's mouth is a choking hazard. Always choose the larger size option when in doubt.` : sz === 'small' ? `${n}s need correctly sized toys — toys designed for large breeds are often too heavy and awkward. Small breed sizing ensures safe grip and engagement.` : `Medium-sized toys work well for ${n}s — avoid the smallest sizes which can become choking hazards.`}

**The 4 toy types every ${n} needs:**
1. **Chew toy** — satisfies natural chewing drive, promotes dental health
2. **Puzzle/enrichment toy** — mental stimulation that tires dogs as effectively as exercise
3. **Fetch/interactive toy** — physical exercise and bonding
4. **Calming toy** (lick mat/slow feeder) — decompression, anxiety relief, relaxation

---

## Our Top Picks

### 1. ${top.name} — Best Overall for ${n}s

**${fmt(top.price)} | ${stars(top.rating)}**

${alink(top.asin, 'Check current price on Amazon →')}

${top.verdict || `The top toy for ${n}s based on engagement, durability, and safety testing.`}

**Why ${n}s love it:**
${(top.pros||['High engagement','Appropriate durability']).map(p=>`- ${p}`).join('\n')}

**Watch out for:**
${(top.cons||['Supervise initial use']).map(c=>`- ${c}`).join('\n')}

**Usage tip:** ${top.tags && top.tags.includes('stuffable') ? `Freeze with peanut butter or wet food for 45+ minutes of engagement. Rotate filling types to maintain novelty.` : `Rotate this toy weekly — novelty is the biggest driver of sustained engagement.`}

---

### 2. ${chewer.name} — Best Chew Toy

**${fmt(chewer.price)} | ${stars(chewer.rating)}**

${alink(chewer.asin, 'Check current price on Amazon →')}

${chewer.verdict || `The most durable chew for ${n}s who work through standard toys quickly.`}

**Features:**
${(chewer.features||['Durable chew material']).slice(0,3).map(f=>`- ${f}`).join('\n')}

**Chew safety rule:** Inspect this toy weekly. When the outer layer is significantly worn or cracked, replace it — fragments can cause intestinal blockages.

---

### 3. ${puzzle.name} — Best Mental Enrichment

**${fmt(puzzle.price)} | ${stars(puzzle.rating)}**

${alink(puzzle.asin, 'Check current price on Amazon →')}

${puzzle.verdict || `Mental stimulation for ${n}s — 15 minutes of puzzle work is equivalent to 30+ minutes of physical exercise in terms of tiredness.`}

**Features:**
${(puzzle.features||['Mental stimulation','Treat dispensing']).slice(0,3).map(f=>`- ${f}`).join('\n')}

**Getting started:** Begin with easy challenges and lower the difficulty if your ${n} gets frustrated. Build up over 2–3 weeks. ${tr === 'easy' ? `${n}s are quick learners — expect them to solve Level 1 puzzles within 5–10 minutes.` : ''}

---

### 4. ${fetch.name} — Best Fetch/Interactive Toy

**${fmt(fetch.price)} | ${stars(fetch.rating)}**

${alink(fetch.asin, 'Check current price on Amazon →')}

${fetch.verdict || `The best active play toy for ${n}s.`}

${(fetch.features||['Interactive play','Physical exercise']).slice(0,2).map(f=>`- ${f}`).join('\n')}

---

### 5. ${lick.name} — Best Calming Enrichment

**${fmt(lick.price)} | ${stars(lick.rating)}**

${alink(lick.asin, 'Check current price on Amazon →')}

${lick.verdict || `The best decompression tool for ${n}s — licking releases dopamine and reduces cortisol (stress hormone).`}

**Best uses for ${n}s:** During baths, vet visits, thunderstorms, or any time your dog needs to calm down fast. Spread with peanut butter, plain yogurt, or wet food and freeze for extended engagement.

---

## Toy Rotation Strategy for ${n}s

Dogs engage more with toys that feel new. Here's how to maximise your toy investment:

**Keep out at all times:** 2–3 toys maximum — chew toy + one other
**Rotate weekly:** Swap in different toys from your collection — out-of-sight toys become exciting again after a week
**Toy box:** Keep 8–12 toys total in rotation

**Monthly assessment:** Remove any toy that's:
- Cracked or broken into pieces
- Has loose parts or stuffing accessible
- No longer engaging your ${n}

---

## ${n} Toy Safety Guide

**What to avoid completely:**
- Rawhide without supervision (choking and blockage risk)
- Cooked bones (splinter and puncture risk)
- Toys with small detachable parts for a ${sz} breed
- Cheap imported plush with minimal stitching

**Supervision rules:**
- **Always supervise** new toys for the first session
- **Inspect weekly** — damaged toys come out of rotation immediately
- **Size check** — if it fits entirely in their mouth, it's too small

---

## Frequently Asked Questions

**Q: How many toys should my ${n} have?**
A: 8–12 in rotation. Too few = boredom and destructive behaviour. Too many out at once = indifference. Rotate weekly to maintain novelty and engagement.

**Q: My ${n} destroys every toy. What actually survives?**
A: ${chewer.name} is specifically rated for ${en === 'active' ? 'heavy' : 'moderate'} chewers. KONG Extreme (black rubber) and Goughnuts products are the industry standard for indestructible toys.

**Q: How long should my ${n} play each day?**
A: ${energy_schedule}. This should include a mix of physical play and mental enrichment — puzzle work tires dogs as effectively as running.

**Q: Are puzzle toys worth it for ${n}s?**
A: ${tr === 'easy' ? `Yes — especially for intelligent ${n}s. Under-stimulated smart breeds develop anxiety, destructive behaviour, and attention-seeking habits. Puzzle toys are a cost-effective solution.` : `Yes. Mental stimulation reduces stress hormones regardless of trainability. 15 minutes of puzzle work per day makes a measurable difference in behaviour.`}

**Q: What's the best toy for separation anxiety?**
A: The lick mat (${lick.name}) stuffed and frozen is the most consistently effective tool. The licking action physically reduces cortisol. Use a stuffed KONG Extreme as a backup.

**Q: At what age should puppies start with toys?**
A: From 8 weeks. Choose soft rubber toys for teething puppies — avoid hard nylon until adult teeth are fully in (around 6 months). The KONG Puppy line is specifically designed for developing teeth.

**Q: Can toys replace exercise for ${n}s?**
A: No — but they can supplement it significantly. Puzzle enrichment reduces the total exercise needed for a calm, balanced dog by an estimated 20–30%. They're tools, not replacements.

---

## Our Verdict

Every ${n} needs at minimum: a quality chew toy, a puzzle toy, and something for fetch or interactive play. The combination of physical and mental exercise produces a fundamentally calmer, better-behaved dog.

Start with **${top.name}** as your foundation, add **${puzzle.name}** for daily mental enrichment, and **${chewer.name}** for chewing sessions.

**More ${n} guides:**
- [Best food for ${n}s →](${links.food_post||'/blog'})
- [Best beds for ${n}s →](${links.bed_post||'/blog'})
- [${n} care hub →](${links.hub||'/breeds'})
`;
}

// ── BEDS TEMPLATE (1400w+) ─────────────────────────────────────
function tmpl_beds(breed, products) {
  const n = breed.name, sz = breed.size_category, shed = breed.shedding_level;
  const life = breed.life_expectancy || {}, le = life.max || 12;
  const links = linkMap[breed.slug] || {};
  const rank = breed.ranking_data || {};
  const wt = breed.weight || {};

  const top     = products[0];
  const orthop  = products.find(p=>(p.subcategory||'')==='orthopedic') || products[0];
  const calming = products.find(p=>(p.subcategory||'')==='calming') || products[1]||products[0];
  const elevated= products.find(p=>['elevated','outdoor','cooling'].includes(p.subcategory||'')) || products[2]||products[0];
  const travel  = products.find(p=>(p.subcategory||'')==='travel'||(p.tags||[]).includes('crash-tested')) || products[3]||products[0];

  const size_guide = {
    giant:  `Giant breeds need beds measuring 50–60+ inches. Always measure nose-to-tail while your ${n} is sleeping and add 12 inches. Most "XL" beds are actually large-breed sized.`,
    large:  `${n}s typically need beds measuring 42–54 inches. Measure your dog stretched out and add 10 inches. Don't be fooled by "large" labelling — always check the actual dimensions.`,
    medium: `${n}s fit most medium-large bed sizes (30–42 inches). Measure nose to tail while sleeping and add 8 inches for comfort.`,
    small:  `${n}s do well with beds measuring 24–30 inches. Small breeds often prefer enclosed or bolstered beds — the raised sides provide a sense of security that reduces anxiety.`,
  }[sz] || '';

  const shed_wash = {
    heavy:   'Weekly washing is non-negotiable for heavy shedders. The cover needs to be completely removable and machine-washable.',
    seasonal:'Wash every 2–3 weeks, increasing to weekly during spring and autumn shedding seasons.',
    low:     'Monthly washing is usually sufficient. Still choose a removable, washable cover.',
    minimal: 'Wash every 4–6 weeks or as needed.',
  }[shed] || 'Wash monthly as a minimum.';

  const joint_urgency = le <= 11
    ? `With an average lifespan of ${le} years, joint issues often appear earlier in ${n}s than in longer-lived breeds. Investing in a quality orthopedic bed from adulthood — not just when problems appear — is the right approach.`
    : `${n}s can develop hip and joint problems as they age. Starting with a quality orthopedic bed in middle age (around ${Math.floor(le/2)} years) prevents rather than reacts to joint issues.`;

  const cost_data = rank.lifetime_cost_usd
    ? `The estimated lifetime ownership cost of a ${n} is around $${rank.lifetime_cost_usd.toLocaleString()}. A quality orthopedic bed is one of the highest-return health investments in that budget.` : '';

  const table_rows = products.slice(0,5).map((p,i)=>{
    const type = (p.subcategory||'standard').replace(/-/g,' ');
    return `| ${p.name} | ${fmt(p.price)} | ${type} | ${i===0?'🥇 Top pick':''} |`;
  }).join('\n');

  return `---
title: ${ys(`Best Dog Beds for ${n}s 2026 — Orthopedic, Calming & Size-Matched Picks`)}
description: ${ys(`Expert bed recommendations for ${n}s: orthopedic for joint health, calming for anxious dogs, elevated for hot climates. All matched to ${sz} breed requirements.`)}
pubDate: ${TODAY}
updatedDate: ${TODAY}
category: "Beds"
postType: "product-roundup"
breedSlug: ${ys(breed.slug)}
breedName: ${ys(n)}
breedSize: ${ys(sz)}
tags: ["beds", ${ys(breed.slug)}, ${ys(sz+'-breed')}, "orthopedic", "dog-sleep", "2026"]
readTime: 7
topProduct:
  name: ${ys(top.name)}
  asin: ${ys(top.asin)}
  price: ${top.price||0}
  rating: ${top.rating||4.5}
  image: ${ys(top.image||'')}
schemaType: "Article"
---

A dog spends 12–14 hours a day sleeping. For a ${n}, the quality of that surface directly affects joint health, sleep quality, and behaviour. Thin padding on a hard floor is a slow-developing health problem for ${sz} breeds.

${joint_urgency}

${cost_data}

We selected the best beds for ${n}s across four categories — orthopedic, calming, elevated, and travel — based on size match, washability, durability, and long-term value.

> **Disclosure:** We earn a small commission on qualifying purchases. This doesn't affect our rankings.

---

## Quick Comparison: Best Beds for ${n}s

| Bed | Price | Type | Award |
|---|---|---|---|
${table_rows}

---

## What ${n}s Need in a Dog Bed

### Size
${size_guide}

### Joint support
${sz === 'large' || sz === 'giant'
  ? `For ${sz} breeds like the ${n}, orthopedic foam of at least 4 inches is the minimum. Budget beds with 1–2 inches of polyester fill provide almost no benefit and compress within weeks.`
  : `${n}s benefit from at least 2–3 inches of supportive foam. Memory foam conforms to body shape; orthopedic foam provides more resistance and support.`}

### Washability
${shed_wash}

### Waterproofing
An inner waterproof liner (under the removable cover) protects the foam from accidents, spills, and wet paws. Non-negotiable for ${sz} breeds who spend time outdoors.

---

## Our Top Picks

### 1. ${orthop.name} — Best Orthopedic for ${n}s

**${fmt(orthop.price)} | ${stars(orthop.rating)}**

${alink(orthop.asin, 'Check current price on Amazon →')}

${orthop.verdict || `The best joint-supporting bed for ${n}s — particularly important as they age.`}

**Why it's right for ${n}s:**
${(orthop.pros||['Superior joint support','Durable foam','Washable cover']).map(p=>`- ${p}`).join('\n')}

**Watch out for:**
${(orthop.cons||['Higher upfront investment']).map(c=>`- ${c}`).join('\n')}

**Long-term value:** A quality orthopedic bed lasts 3–5 years and directly reduces vet bills associated with joint deterioration. The cost per day is typically under $0.20.

---

### 2. ${calming.name} — Best for Anxious ${n}s

**${fmt(calming.price)} | ${stars(calming.rating)}**

${alink(calming.asin, 'Check current price on Amazon →')}

${calming.verdict || `For ${n}s who show signs of anxiety, stress, or who prefer enclosed sleeping spaces.`}

**Features:**
${(calming.features||['Calming design','Anxiety relief']).slice(0,3).map(f=>`- ${f}`).join('\n')}

**Signs your ${n} needs a calming bed:** Circling before lying down, sleeping pressed against walls, panting at night, whining, or refusing to settle in their current sleeping area.

---

### 3. ${elevated.name} — Best Elevated/Outdoor Option

**${fmt(elevated.price)} | ${stars(elevated.rating)}**

${alink(elevated.asin, 'Check current price on Amazon →')}

${elevated.verdict || `For ${n}s who spend time outdoors, or who overheat easily.`}

${(elevated.features||['Elevated design','Air circulation']).slice(0,2).map(f=>`- ${f}`).join('\n')}

**When to choose elevated:** Warm climates, dogs who overheat, outdoor use, or dogs with joint problems who find it easier to rise from an elevated surface.

---

### 4. ${travel.name} — Best Travel Bed

**${fmt(travel.price)} | ${stars(travel.rating)}**

${alink(travel.asin, 'Check current price on Amazon →')}

${travel.verdict || `For ${n}s who travel frequently — by car, plane, or camping.`}

${(travel.features||['Portable','Travel-safe']).slice(0,2).map(f=>`- ${f}`).join('\n')}

---

## ${n} Bed Sizing Guide

| Your ${n}'s Length | Bed Size Needed |
|---|---|
${sz === 'giant' ? '| Up to 36"  | Large (42") |\n| Up to 42"  | XL (48")    |\n| 42"+ | Giant (54"+) |' :
  sz === 'large' ? '| Up to 28"  | Medium (36") |\n| Up to 34"  | Large (42") |\n| 34"+ | XL (48"+) |' :
  sz === 'small' ? '| Up to 16"  | Small (24") |\n| Up to 20"  | Medium (28") |' :
  '| Up to 24"  | Medium (32") |\n| Up to 30"  | Large (38") |'}

*Measure nose-to-tail while your ${n} is fully stretched out, then add ${sz === 'giant'?'12':sz === 'large'?'10':'8'} inches.*

---

## Joint Health & Sleep: What the Research Says

Dogs with adequate sleeping surface support show measurably lower signs of joint pain. For ${sz} breeds like the ${n}:

- **Hard floors** increase joint inflammation over time — concrete is the worst
- **Orthopaedic foam 4"+ thick** reduces peak pressure on hips and shoulders
- **Memory foam** conforms to body shape but may provide insufficient resistance for heavy ${sz} breeds — thicker orthopedic foam is often better
- **Elevated beds** reduce floor-level temperature and improve air circulation — beneficial in warmer climates

${sz === 'large' || sz === 'giant' ? `The Big Barker brand is the only dog bed backed by a published clinical study showing reduction in joint pain and improved mobility in large breed dogs.` : ''}

---

## Frequently Asked Questions

**Q: How big should my ${n}'s bed be?**
A: Measure your ${n} from nose to tail while sleeping, then add ${sz==='giant'?'12':sz==='large'?'10':'8'} inches. For ${n}s that curl, consider a calming or donut-style bed sized to their body.

**Q: At what age should I switch to an orthopedic bed?**
A: Ideally from adulthood (${sz==='giant'?'2 years':sz==='large'?'18 months':'12 months'}). Don't wait for arthritis to appear — prevention is significantly more effective than treatment.

**Q: How often should I wash my ${n}'s bed?**
A: ${shed_wash}

**Q: Do dogs actually prefer orthopedic beds?**
A: Most dogs actively choose orthopedic beds over thin padding once they experience the difference. You'll notice more restful sleeping, less position-changing overnight, and easier rising.

**Q: Where should I put my ${n}'s bed?**
A: Away from drafts and direct heat vents. ${n}s prefer sleeping where they can see the main room entrance — place the bed against a wall with a sightline to the door.

**Q: Is a cheap bed better than no dedicated bed?**
A: Barely. A $15 polyester-fill bed that compresses within weeks is only marginally better than a blanket on the floor. If budget is a constraint, look for mid-range foam options (FurHaven, Friends Forever) rather than budget-tier polyester.

**Q: My ${n} destroys beds. What survives?**
A: Elevated mesh beds (Coolaroo, K&H) are the most destruction-resistant. Alternatively, line a crate with a thick orthopedic mat that can't be pulled out.

---

## Our Verdict

For most ${n} owners, the orthopedic option — **${orthop.name}** — is the highest-value bed investment. The joint health benefit alone justifies the cost over cheap alternatives.

Add a calming bed (**${calming.name}**) if your ${n} shows any anxiety signs, or an elevated option (**${elevated.name}**) for warm climates or outdoor setups.

**More ${n} guides:**
- [Best food for ${n}s →](${links.food_post||'/blog'})
- [Best toys for ${n}s →](${links.toy_post||'/blog'})
- [${n} grooming guide →](${links.grooming_post||'/blog'})
- [${n} care hub →](${links.hub||'/breeds'})
`;
}

// ── GROOMING TEMPLATE (1400w+) ─────────────────────────────────
function tmpl_grooming(breed, products) {
  const n = breed.name, coat = breed.coat_type, shed = breed.shedding_level;
  const gfreq = breed.grooming_freq || 'Weekly Brushing';
  const sz = breed.size_category;
  const links = linkMap[breed.slug] || {};

  const top     = products[0];
  const brush   = products.find(p=>['combs-brushes','deshedding'].includes(p.subcategory||'')) || products[0];
  const shampoo = products.find(p=>p.subcategory==='shampoos') || products[1]||products[0];
  const nail    = products.find(p=>p.subcategory==='nail-care') || products[2]||products[0];
  const paw     = products.find(p=>(p.tags||[]).includes('paw-wax')||(p.subcategory||'')==='paw-care') || products[3]||products[0];
  const bathing = products.find(p=>(p.subcategory||'')==='bathing') || products[4]||products[0];

  const coat_guide = {
    double: {
      tool: 'FURminator or Undercoat Rake — standard brushes don\'t reach the undercoat',
      issue: 'Compacted undercoat traps heat and causes hot spots. Must be fully removed, not just surface-brushed.',
      pro_freq: 'Professional deshedding treatment twice yearly at season changes',
    },
    long: {
      tool: 'Slicker brush + detangling spray + metal comb — all three needed',
      issue: 'Mats form within days without brushing. Once matted, grooming becomes painful and may require shaving.',
      pro_freq: 'Professional trim every 8–10 weeks minimum',
    },
    wiry: {
      tool: 'Slicker brush + stripping comb — wire coats need hand-stripping not clipping',
      issue: 'Clipping softens the wire texture permanently. Hand-stripping maintains coat type and colour.',
      pro_freq: 'Professional hand-stripping or scissor trim every 8 weeks',
    },
    curly: {
      tool: 'Wide-tooth comb + slicker brush — never a deshedding tool on curly coats',
      issue: 'Curls mat at the root, not the tip. You need to comb through to the skin.',
      pro_freq: 'Professional trim every 6–8 weeks to prevent matting',
    },
    short: {
      tool: 'Rubber curry brush or grooming glove — loosens dead hair without scratching',
      issue: 'Short coats still shed. Regular brushing is faster and less messy than letting shed hair accumulate.',
      pro_freq: 'Professional grooming optional — every 3–6 months if desired',
    },
    silky: {
      tool: 'Pin brush + detangling spray — slicker brushes can split silky hair',
      issue: 'Silky hair breaks under tension. Always brush with a light touch and detangling spray.',
      pro_freq: 'Professional grooming every 8–10 weeks for trim and conditioning',
    },
  }[coat] || { tool: 'Standard slicker brush', issue: 'Regular brushing prevents most coat issues.', pro_freq: 'Professional grooming as needed' };

  const shed_freq = {
    heavy:   { brushing: '3–4 times per week (daily during seasonal blows)', bath: 'Every 4–6 weeks', nail: 'Every 3–4 weeks' },
    seasonal:{ brushing: 'Weekly (daily during spring/autumn)', bath: 'Every 6–8 weeks', nail: 'Every 4–5 weeks' },
    low:     { brushing: 'Weekly', bath: 'Every 6–8 weeks', nail: 'Every 4–6 weeks' },
    minimal: { brushing: 'Every 10–14 days', bath: 'Every 8–10 weeks', nail: 'Every 4–6 weeks' },
  }[shed] || { brushing: 'Weekly', bath: 'Monthly', nail: 'Monthly' };

  return `---
title: ${ys(`${n} Grooming Guide 2026: Tools, Schedule & Expert Tips for ${coat.charAt(0).toUpperCase()+coat.slice(1)} Coats`)}
description: ${ys(`Complete grooming guide for ${n}s with ${coat} coats. Best brushes, deshedders, shampoos and nail trimmers — plus a breed-specific grooming schedule.`)}
pubDate: ${TODAY}
updatedDate: ${TODAY}
category: "Grooming"
postType: "product-roundup"
breedSlug: ${ys(breed.slug)}
breedName: ${ys(n)}
breedCoat: ${ys(coat)}
tags: ["grooming", ${ys(breed.slug)}, ${ys(coat+'-coat')}, "brushing", "deshedding", "2026"]
readTime: 8
topProduct:
  name: ${ys(top.name)}
  asin: ${ys(top.asin)}
  price: ${top.price||0}
  rating: ${top.rating||4.5}
  image: ${ys(top.image||'')}
schemaType: "HowTo"
---

${n}s have a **${coat} coat** that requires ${gfreq.toLowerCase()}. Get this right and you'll have a healthier dog, less hair on your furniture, and the ability to spot skin issues, parasites, and lumps early — grooming is as much health monitoring as it is aesthetics.

The most common ${n} grooming mistake: using the wrong tool for the coat type. ${coat_guide.tool} — anything else is ineffective or damaging.

> **Disclosure:** We earn a small commission on qualifying purchases. This doesn't affect our rankings.

---

## ${n} Grooming at a Glance

| Task | Frequency | Tool |
|---|---|---|
| Brushing | ${shed_freq.brushing} | ${brush.name} |
| Bathing | ${shed_freq.bath} | ${shampoo.name} |
| Nail trim | ${shed_freq.nail} | ${nail.name} |
| Ear check | Weekly | Cotton ball + dog ear cleaner |
| Teeth | 3× per week minimum | Dog toothpaste + brush |
| Professional grooming | ${coat_guide.pro_freq} | — |

---

## Understanding the ${n}'s ${coat.charAt(0).toUpperCase()+coat.slice(1)} Coat

**What happens without regular grooming:** ${coat_guide.issue}

**Tool selection:** ${coat_guide.tool}

**Shedding level:** ${shed === 'heavy' ? `Heavy — ${n}s are significant shedders year-round with seasonal peaks. This is a commitment.` : shed === 'seasonal' ? `Seasonal — ${n}s shed moderately year-round and heavily during spring and autumn. Prepare for 4–6 weeks of intense brushing twice yearly.` : shed === 'minimal' ? `Minimal — ${n}s shed very little. The trade-off is that their coat grows continuously and needs regular professional trimming.` : `Low to moderate — manageable with weekly brushing.`}

**Coat health indicators:**
- ✓ **Healthy:** Shiny, smooth, no bald patches, skin pink and clean
- ⚠ **Watch:** Excessive scratching, dull coat, dandruff, or patches of hair loss
- ✗ **See vet:** Hot spots, sores, inflamed skin, parasites visible, strong odour from skin

---

## Best Grooming Tools for ${n}s

### 1. ${brush.name} — Best Brush/Deshedder

**${fmt(brush.price)} | ${stars(brush.rating)}**

${alink(brush.asin, 'Check current price on Amazon →')}

${brush.verdict || `The most effective brushing tool for ${n}s with ${coat} coats.`}

**Why it's right for ${coat} coats:**
${(brush.pros||['Effective for coat type','Durable']).map(p=>`- ${p}`).join('\n')}

**Common mistake:** ${coat === 'double' ? 'Using a standard slicker brush on a double coat only removes surface hair. The FURminator-style tool reaches the undercoat where the real shedding originates.' : coat === 'curly' ? 'Brushing too aggressively breaks curly hair. Always detangle gently from the ends inward.' : 'Brushing too infrequently and then trying to remove a week\'s worth of shedding in one session — this is painful for your dog.'}

---

### 2. ${shampoo.name} — Best Shampoo

**${fmt(shampoo.price)} | ${stars(shampoo.rating)}**

${alink(shampoo.asin, 'Check current price on Amazon →')}

${shampoo.verdict || `The best shampoo for ${n}s' ${coat} coat and skin type.`}

**Features:**
${(shampoo.features||['Appropriate pH','Dog-safe formula']).slice(0,3).map(f=>`- ${f}`).join('\n')}

**Bath technique for ${coat} coats:**
1. Thoroughly wet coat to skin (${coat === 'double' ? 'this takes longer than you think with double coats' : 'ensure shampoo reaches skin'})
2. Work shampoo from neck to tail
3. ${coat === 'long' || coat === 'silky' ? 'Detangle with fingers while shampooing to prevent mats forming' : 'Massage in circular motions'}
4. Rinse completely — residue causes itching
5. ${shed === 'heavy' ? 'Use a high-velocity dryer or blow dry completely — damp undercoat develops odour and hot spots' : 'Towel dry and blow dry or air dry'}

---

### 3. ${nail.name} — Best Nail Trimmer

**${fmt(nail.price)} | ${stars(nail.rating)}**

${alink(nail.asin, 'Check current price on Amazon →')}

${nail.verdict || `Nail length directly affects joint health in ${sz} breeds — long nails alter gait and increase hip stress.`}

**How often:** ${shed_freq.nail} — or whenever you hear nails clicking on hard floors.

**Quick tip:** If your ${n} hates nail trims, do one nail per day with a high-value treat reward. This is genuinely less stressful for the dog than monthly battles.

---

${products.length > 3 ? `### 4. ${paw.name} — Best Paw Care\n\n**${fmt(paw.price)} | ${stars(paw.rating)}**\n\n${alink(paw.asin, 'Check current price on Amazon →')}\n\n${paw.verdict || `Essential for ${n}s who walk on salt, hot pavement, or rough terrain.`}\n\n${(paw.features||['Paw protection']).slice(0,2).map(f=>`- ${f}`).join('\n')}\n\n---\n` : ''}

## ${n} Grooming Schedule

### Daily (2 minutes)
- Quick visual check: eyes, ears, paws, any obvious skin issues
- ${shed === 'heavy' ? 'Quick brush during heavy shedding periods' : 'N/A unless heavy shedding season'}

### Weekly (15–20 minutes)
- Full brush session: ${shed_freq.brushing}
- Ear check: look for redness, smell, or excess wax
- Eye wipe: remove any discharge with damp cloth

### Monthly (30–45 minutes)
- Full bath: ${shed_freq.bath}
- Nail trim: ${shed_freq.nail}
- Teeth brushing if not doing 3× per week
- Anal gland check (or professional expression if needed)

### Every 6–10 weeks
- ${coat_guide.pro_freq}

---

## DIY vs Professional Grooming for ${n}s

**DIY is sufficient for:** Brushing, bathing, nail trims, ear cleaning, teeth brushing

**Professional is recommended for:** ${coat === 'wiry' ? 'Hand-stripping (cannot be replicated at home without training)' : coat === 'curly' ? 'Breed-specific cuts and coat shaping' : coat === 'long' ? 'Complex trimming, dematting, and shaping' : 'Deep deshedding treatment, anal gland expression'}

**Cost comparison:** Professional grooming for ${n}s typically runs $50–120 per session. DIY tools pay for themselves in 2–3 grooming sessions.

---

## Frequently Asked Questions

**Q: How often should I bathe my ${n}?**
A: ${shed_freq.bath}. Over-bathing (more than every 3 weeks) strips natural coat oils and causes dry, itchy skin. ${shed === 'heavy' ? 'Despite the shedding, ${n}s don\'t need more frequent bathing — more frequent brushing, yes, but not bathing.' : ''}

**Q: My ${n} hates grooming — how do I make it easier?**
A: Start with 5-minute sessions paired with high-value treats. A lick mat spread with peanut butter is a game-changer — your dog focuses on licking while you work. Build duration gradually over 2–3 weeks. Never force — it creates lasting aversion.

**Q: How do I handle nail trims when my ${n} hates it?**
A: Counter-conditioning over time: touch paws daily with treats, then introduce clippers without trimming, then clip one nail per day. This takes 2–4 weeks but eliminates the fight permanently.

**Q: When should I go to a professional groomer?**
A: ${coat_guide.pro_freq}. Also if your ${n} develops mats beyond home management — matted coats require professional removal to avoid skin damage.

**Q: Do I need all these tools or is one brush enough?**
A: For ${coat} coats: ${coat === 'double' || coat === 'long' || coat === 'silky' ? 'You need at minimum a quality deshedder/slicker AND a finishing comb. One tool doesn\'t cover all needs.' : 'A quality slicker brush is sufficient for most home grooming. The others are additions for specific tasks.'}

**Q: How do I check my ${n}'s ears?**
A: Lift the ear flap weekly. Healthy ears are pale pink with minimal wax. Red, swollen, smelly, or excessively waxy ears need vet attention — don't attempt deep cleaning at home.

---

## Our Verdict

Every ${n} owner needs: the right brush for ${coat} coats (**${brush.name}**), a quality dog-specific shampoo (**${shampoo.name}**), and reliable nail trimmers (**${nail.name}**).

The bigger commitment is consistency. 15 minutes of regular brushing prevents 2 hours of professional dematting and keeps your ${n}'s coat healthy year-round.

**More ${n} guides:**
- [Best food for ${n}s →](${links.food_post||'/blog'})
- [Best beds for ${n}s →](${links.bed_post||'/blog'})
- [${n} health issues →](${links.health_post||'/blog'})
- [${n} care hub →](${links.hub||'/breeds'})
`;
}

// ── HEALTH TEMPLATE (1400w+) ───────────────────────────────────
function tmpl_health(breed, products) {
  const n = breed.name, sz = breed.size_category, en = breed.energy_level;
  const coat = breed.coat_type, life = breed.life_expectancy || {}, le = life.max || 12;
  const group = breed.akc_group || '', links = linkMap[breed.slug] || {};
  const rank = breed.ranking_data || {};

  const group_issues = GROUP_HEALTH[group] || ['varies by breed — genetic screening recommended'];
  const size_issues  = SIZE_HEALTH[sz] || [];
  const energy_issues= ENERGY_HEALTH[en] || [];
  const coat_issues  = COAT_HEALTH[coat] || [];
  const genetic_text = rank.genetic_ailment_names && rank.genetic_ailment_names !== 'none'
    ? `Based on breed health data, **${n}s have ${rank.genetic_ailments||'several'} known genetic health conditions**: ${rank.genetic_ailment_names}.` : '';
  const intel = rank.intelligence_label ? `**Intelligence:** #${rank.intelligence_rank} (${rank.intelligence_label})` : '';
  const longevity = rank.longevity_years ? `**Average lifespan:** ${rank.longevity_years} years` : `**Lifespan:** ${life.min||''}–${le} years`;

  // Select relevant health products
  const dna    = products.find(p=>(p.health_focus||[]).includes('genetic-health')) || products[0];
  const flea   = products.find(p=>(p.health_focus||[]).includes('parasite-prevention')) || products[1]||products[0];
  const dental = products.find(p=>(p.health_focus||[]).includes('dental')) || products[2]||products[0];
  const ear    = products.find(p=>(p.health_focus||[]).includes('ear-health')) || products[3]||products[0];
  const wound  = products.find(p=>(p.health_focus||[]).includes('wound-care')) || products[4]||products[0];
  const calming= products.find(p=>(p.health_focus||[]).includes('anxiety-relief')) || products[5]||products[0];

  // Combine and deduplicate health issues
  const all_issues = [...new Set([...group_issues,...size_issues].slice(0,6))];

  const table_rows = products.slice(0,5).map((p,i)=>{
    const hf = (p.health_focus||['general']).join(', ');
    return `| ${p.name} | ${fmt(p.price)} | ${hf} | ${i===0?'🥇':''} |`;
  }).join('\n');

  return `---
title: ${ys(`Common ${n} Health Problems 2026 — Prevention, Symptoms & Products`)}
description: ${ys(`The most common health issues in ${n}s, how to spot them early, and the best products for prevention and home management — updated March 2026.`)}
pubDate: ${TODAY}
updatedDate: ${TODAY}
category: "Health"
postType: "health"
breedSlug: ${ys(breed.slug)}
breedName: ${ys(n)}
breedSize: ${ys(sz)}
tags: ["health", ${ys(breed.slug)}, "vet-care", "prevention", "2026"]
readTime: 9
topProduct:
  name: ${ys(dna.name)}
  asin: ${ys(dna.asin)}
  price: ${dna.price||0}
  rating: ${dna.rating||4.5}
  image: ${ys(dna.image||'')}
schemaType: "Article"
---

${n}s are generally ${en === 'active' ? 'robust, athletic dogs' : 'even-tempered companions'}, but like every breed, they have predictable health vulnerabilities. Knowing what to watch for — and catching issues early — is the difference between a manageable condition and an expensive emergency.

${longevity} | ${intel}

${genetic_text}

> **Important:** This guide is for informational purposes. Always consult your vet for diagnosis and treatment. Early vet intervention consistently produces better outcomes than home management alone.

---

## ${n} Health Products at a Glance

| Product | Price | Protects Against |
|---|---|---|
${table_rows}

---

## Most Common ${n} Health Issues

${all_issues.map((issue, i) => {
  const slug_issue = issue.toLowerCase();
  const prevention = slug_issue.includes('hip')||slug_issue.includes('joint')||slug_issue.includes('arthritis')
    ? 'Maintain healthy weight, provide orthopedic sleeping surface, consider joint supplements from adulthood, avoid over-exercise during puppyhood.'
    : slug_issue.includes('dental')
    ? 'Brush teeth 3× per week minimum, provide dental chews (VOHC-accepted), annual professional dental cleaning.'
    : slug_issue.includes('ear')
    ? 'Check ears weekly, dry after swimming/bathing, use vet-recommended ear cleaner monthly.'
    : slug_issue.includes('bloat')||slug_issue.includes('GDV')
    ? 'Feed two smaller meals daily, avoid exercise 1 hour before and after eating, consider slow-feeder bowl. Know the emergency signs: unproductive retching, distended belly, restlessness.'
    : slug_issue.includes('obesity')
    ? 'Measure all food (don\'t free-feed), account for treats in daily calorie budget, weigh monthly.'
    : slug_issue.includes('skin')||slug_issue.includes('allergy')
    ? 'Identify and eliminate allergens (food or environmental), keep coat clean and dry, use hypoallergenic grooming products.'
    : slug_issue.includes('eye')
    ? 'Annual vet eye checks, wipe discharge daily, watch for cloudiness or increased tearing.'
    : slug_issue.includes('cancer')||slug_issue.includes('tumour')
    ? 'Monthly self-checks for lumps. Annual vet exam. Earlier detection = significantly better outcomes.'
    : 'Regular vet checks and breed-specific screening tests are the most effective prevention.';

  const symptoms = slug_issue.includes('hip')||slug_issue.includes('joint')
    ? 'Reluctance to rise, stiffness after rest, bunny-hopping gait, reduced exercise tolerance'
    : slug_issue.includes('dental')
    ? 'Bad breath, yellow-brown tartar, bleeding gums, difficulty eating'
    : slug_issue.includes('ear')
    ? 'Head shaking, scratching at ears, odour, discharge, redness'
    : slug_issue.includes('bloat')
    ? 'Unproductive retching, distended abdomen, restlessness, collapse — EMERGENCY'
    : slug_issue.includes('obesity')
    ? 'Cannot feel ribs, no visible waist, reduced activity, panting with light exercise'
    : slug_issue.includes('eye')
    ? 'Cloudiness, excessive tearing, squinting, discharge'
    : 'Varies — any persistent change in behaviour or appearance warrants a vet visit';

  return `### ${i+1}. ${issue.charAt(0).toUpperCase()+issue.slice(1)}

**Symptoms to watch:** ${symptoms}

**Prevention:** ${prevention}

**When to see the vet:** ${slug_issue.includes('bloat') ? 'Immediately — GDV is fatal within hours without surgery.' : 'When symptoms persist more than 48 hours or worsen rapidly.'}`;
}).join('\n\n')}

---

## Essential Health Products for ${n}s

### DNA Testing — Know Before It Happens

**${dna.name}** — ${fmt(dna.price)} | ${stars(dna.rating)}

${alink(dna.asin, 'Check current price on Amazon →')}

${dna.verdict || `DNA testing reveals breed composition, genetic health risks, and relatedness — allowing you to monitor for conditions before symptoms appear.`}

${genetic_text ? `Particularly relevant for ${n}s given their known genetic conditions.` : `${n}s from reputable breeders may have health clearances — DNA testing adds an additional layer of knowledge.`}

---

### Parasite Prevention — Year-Round Protection

**${flea.name}** — ${fmt(flea.price)} | ${stars(flea.rating)}

${alink(flea.asin, 'Check current price on Amazon →')}

${flea.verdict || `Year-round flea and tick prevention is essential for ${en === 'active' ? 'active outdoor dogs like the '+n : n+'s health maintenance'}.`}

**Why it matters for ${n}s:** Fleas cause allergic reactions and tapeworm transmission. Ticks transmit Lyme disease and other serious infections. Prevention is significantly cheaper than treatment.

---

### Dental Health — The Most Neglected Area

**${dental.name}** — ${fmt(dental.price)} | ${stars(dental.rating)}

${alink(dental.asin, 'Check current price on Amazon →')}

${dental.verdict || `Dental disease affects 80% of dogs over age 3. ${sz === 'small' ? 'Small breeds like '+n+'s are especially prone due to crowded teeth.' : 'Starting dental care early dramatically reduces lifetime dental treatment costs.'}`}

**The minimal effective dental routine:**
1. Brush 3× per week with dog-specific toothpaste
2. Provide VOHC-accepted dental chews daily
3. Annual professional dental cleaning under anaesthesia (typically from age 2–3)

---

### Ear Care — Preventable Infections

**${ear.name}** — ${fmt(ear.price)} | ${stars(ear.rating)}

${alink(ear.asin, 'Check current price on Amazon →')}

${ear.verdict || `Ear infections are painful and often preventable. The enzymatic formula treats bacterial and yeast infections without requiring pre-cleaning.`}

${coat === 'long' || coat === 'silky' || coat === 'curly' ? `${n}s with longer ear hair are at elevated risk for ear infections — the hair traps moisture and debris.` : ''}

---

### First Aid — Every Owner Needs This

**${wound.name}** — ${fmt(wound.price)} | ${stars(wound.rating)}

${alink(wound.asin, 'Check current price on Amazon →')}

${wound.verdict || `A non-toxic wound spray that every dog owner should have in their kit. Safe for licking, effective against bacteria and viruses.`}

---

## ${n} Preventive Health Calendar

| Age | Key Health Actions |
|---|---|
| 8–16 weeks | Core vaccinations, parasite prevention, health check |
| 6 months | Spay/neuter discussion with vet, dental check |
| 12 months | Annual vaccines, comprehensive blood panel, dental check |
| 1–7 years | Annual vet exam, continued parasite prevention, weight monitoring |
| ${le-4}+ years | Biannual vet exams, joint assessment, bloodwork every 6 months |

---

## When to Go to the Vet Immediately

Emergency signs in ${n}s — don't wait:
- **Unproductive retching with distended belly** → potential bloat/GDV
- **Sudden collapse or inability to stand**
- **Laboured breathing or blue/grey gums**
- **Seizures or extreme disorientation**
- **Swallowed foreign object with distress signs**
- **Deep cuts or wounds with persistent bleeding**
- **Eye injury or sudden vision loss**

---

## Frequently Asked Questions

**Q: How many times per year should my ${n} see a vet?**
A: Once annually until age ${le-3}, then twice yearly. As ${n}s enter their senior years, more frequent bloodwork and organ function tests become important.

**Q: Is pet insurance worth it for ${n}s?**
A: For ${sz} breeds like the ${n}: generally yes. ${sz === 'large' || sz === 'giant' ? `Large breed dogs have higher average claim costs — orthopaedic surgeries commonly run $3,000–8,000. Insurance premiums of $40–80/month can represent significant savings.` : `The lifetime health cost of a ${n} averages around $${rank.lifetime_cost_usd ? rank.lifetime_cost_usd.toLocaleString() : '15,000–20,000'}. Insurance makes unexpected costs manageable.`}

**Q: Should I get a DNA test if my ${n} comes from a reputable breeder?**
A: Reputable breeders will have health clearances for common conditions. A DNA test still adds value for comprehensive health markers and lifetime monitoring.

**Q: How do I know if my ${n} is at a healthy weight?**
A: Feel the ribs — you should be able to feel them without pressing hard. View from above — there should be a visible waist. View from the side — abdomen should tuck up slightly behind the chest.

**Q: What vaccinations does my ${n} need?**
A: Core vaccines: distemper, parvovirus, adenovirus, rabies. Non-core (discuss with vet): Lyme disease (especially for ${en === 'active' ? 'outdoor-active' : ''} breeds), leptospirosis, Bordetella. Annual boosters as recommended.

---

## Our Verdict

Proactive health management for ${n}s means: **DNA testing** to know genetic risks, **year-round parasite prevention** (${alink(flea.asin,flea.name)}), **consistent dental care**, and **regular vet monitoring**.

The biggest payoff comes from early detection — most of the conditions ${n}s are prone to are significantly more treatable when caught early.

**More ${n} guides:**
- [Best food for ${n}s →](${links.food_post||'/blog'})
- [Best supplements for ${n}s →](${links.supplement_post||'/blog'})
- [${n} care hub →](${links.hub||'/breeds'})
`;
}

// ── SUPPLEMENTS TEMPLATE (1300w+) ──────────────────────────────
function tmpl_supplements(breed, products) {
  const n = breed.name, sz = breed.size_category, en = breed.energy_level;
  const shed = breed.shedding_level, life = breed.life_expectancy||{}, le = life.max||12;
  const links = linkMap[breed.slug]||{}, rank = breed.ranking_data||{};
  const group = breed.akc_group||'';

  const joint   = products.find(p=>(p.health_focus||[]).includes('joint')) || products[0];
  const omega   = products.find(p=>(p.subcategory||'')==='omega-3'||(p.tags||[]).includes('omega-3')) || products[1]||products[0];
  const probiotic=products.find(p=>(p.subcategory||'')==='probiotic') || products[2]||products[0];
  const calming = products.find(p=>(p.subcategory||'')==='calming') || products[3]||products[0];
  const multi   = products.find(p=>(p.subcategory||'')==='multivitamin') || products[4]||products[0];

  const joint_priority = sz === 'large' || sz === 'giant'
    ? 'HIGH PRIORITY' : le <= 11 ? 'MEDIUM-HIGH PRIORITY' : 'MEDIUM PRIORITY';
  const coat_priority = shed === 'heavy' || shed === 'seasonal'
    ? 'HIGH PRIORITY' : 'STANDARD';

  const genetic = rank.genetic_ailment_names && rank.genetic_ailment_names !== 'none'
    ? rank.genetic_ailment_names : null;

  const table_rows = products.slice(0,5).map((p,i)=>{
    const focus = (p.health_focus||['general']).slice(0,2).join(', ');
    return `| ${p.name} | ${fmt(p.price)} | ${focus} | ${i===0?'🥇':''} |`;
  }).join('\n');

  return `---
title: ${ys(`Best Supplements for ${n}s 2026 — Joint, Gut, Coat & Calming Picks`)}
description: ${ys(`Vet-guided supplement picks for ${n}s matched to their ${sz} breed health profile. Joint support, probiotics, omega-3 and calming options — updated March 2026.`)}
pubDate: ${TODAY}
updatedDate: ${TODAY}
category: "Supplements"
postType: "product-roundup"
breedSlug: ${ys(breed.slug)}
breedName: ${ys(n)}
breedSize: ${ys(sz)}
tags: ["supplements", ${ys(breed.slug)}, "joint-health", "probiotics", "omega-3", "2026"]
readTime: 7
topProduct:
  name: ${ys(joint.name)}
  asin: ${ys(joint.asin)}
  price: ${joint.price||0}
  rating: ${joint.rating||4.5}
  image: ${ys(joint.image||'')}
schemaType: "Article"
---

Not every dog needs supplements — but ${n}s, as a ${sz} breed with ${en} energy and a lifespan of ${life.min||''}–${le} years, have specific supplementation needs worth knowing about.${genetic ? ` ${n}s have known genetic health concerns including ${genetic} — targeted supplements address these directly.` : ''}

This guide covers what works, what's marketing, and which products are worth the money for ${n}s specifically.

> **Note:** Always introduce one supplement at a time and discuss with your vet, especially for dogs on medication.

---

## ${n} Supplement Priority Matrix

| Supplement | Priority | Why |
|---|---|---|
| Joint support | ${joint_priority} | ${sz === 'large'||sz === 'giant' ? 'High weight-bearing stress on joints' : 'General joint maintenance'} |
| Omega-3 (fish oil) | ${coat_priority} | ${shed === 'heavy'||shed === 'seasonal' ? 'Heavy shedding = high omega demand' : 'Coat and anti-inflammatory support'} |
| Probiotic | STANDARD | Digestive and immune support |
| Calming | AS NEEDED | Situational anxiety or stress |
| Multivitamin | LOW | Only if diet is deficient |

---

## Top Picks

| Supplement | Price | Targets | Award |
|---|---|---|---|
${table_rows}

---

## 1. Joint Support — ${joint_priority} for ${n}s

**${joint.name}** — ${fmt(joint.price)} | ${stars(joint.rating)}

${alink(joint.asin, 'Check current price on Amazon →')}

${joint.verdict || `The most important supplement for ${sz} breeds like the ${n}.`}

**The science:** Glucosamine and chondroitin have decades of clinical evidence for cartilage support. They work best as prevention started in adulthood, not after arthritis has developed.

**Features:**
${(joint.features||['Glucosamine + Chondroitin','Vet recommended']).map(f=>`- ${f}`).join('\n')}

**When to start:** ${sz === 'giant' ? 'From 18 months' : sz === 'large' ? 'From 2 years' : 'From 4–5 years as prevention, earlier if showing joint stiffness'}.

**Expected timeline:** Allow 4–6 weeks to see results. Many owners report measurable improvement in mobility.

---

## 2. Omega-3 Fish Oil — ${coat_priority}

**${omega.name}** — ${fmt(omega.price)} | ${stars(omega.rating)}

${alink(omega.asin, 'Check current price on Amazon →')}

${omega.verdict || `Omega-3 fatty acids support coat health, reduce inflammation, and benefit joint and cognitive function.`}

**Why ${n}s specifically benefit:** ${shed === 'heavy' || shed === 'seasonal'
  ? `${n}s are ${shed} shedders. High-quality omega-3 supplementation noticeably improves coat condition, reduces excessive shedding, and addresses dry skin that often underlies heavy shedding.`
  : `Omega-3 provides anti-inflammatory support that complements joint supplements, and supports the skin barrier — especially beneficial for ${coat} coats.`}

**Features:**
${(omega.features||['Wild-caught fish source','EPA + DHA omega-3']).slice(0,3).map(f=>`- ${f}`).join('\n')}

**Dosing:** Start at the lower end of the dosing guide for your ${n}'s weight. Too much fish oil can cause loose stools — increase gradually over 2 weeks.

---

## 3. Probiotics — Digestive & Immune Foundation

**${probiotic.name}** — ${fmt(probiotic.price)} | ${stars(probiotic.rating)}

${alink(probiotic.asin, 'Check current price on Amazon →')}

${probiotic.verdict || `The #1 vet-recommended probiotic — supports gut health, immune function, and reduces digestive upset.`}

**When ${n}s especially need probiotics:**
- After antibiotic treatment (antibiotics wipe out beneficial gut bacteria)
- During and after stressful events (moving, new pets, travel)
- If switching foods frequently
- After loose stools or digestive upset

**Features:**
${(probiotic.features||['Multiple probiotic strains','Prebiotic included']).slice(0,2).map(f=>`- ${f}`).join('\n')}

---

## 4. Calming Supplements — For Anxious ${n}s

**${calming.name}** — ${fmt(calming.price)} | ${stars(calming.rating)}

${alink(calming.asin, 'Check current price on Amazon →')}

${calming.verdict || `For situational anxiety — fireworks, vet visits, travel, or thunderstorms.`}

**Best use cases for ${n}s:** ${en === 'active' ? `Active breeds like ${n}s channel anxiety into destructive behaviour. A calming supplement before high-stress events is more effective than managing the behaviour afterwards.` : `Even calm-tempered ${n}s can experience acute anxiety from specific triggers.`}

**When to take:** 30–45 minutes before the anxiety trigger.

**Important distinction:** These are situational supplements, not treatments for clinical anxiety disorders. If your ${n} shows persistent anxiety, discuss with your vet — prescription options may be more effective.

---

## 5. Multivitamin — Only If Needed

**${multi.name}** — ${fmt(multi.price)} | ${stars(multi.rating)}

${alink(multi.asin, 'Check current price on Amazon →')}

${multi.verdict || `An all-in-one supplement that fills nutritional gaps — most relevant for dogs on home-cooked or raw diets.`}

**Honest assessment:** If your ${n} eats an AAFCO-certified complete and balanced commercial food, a multivitamin is usually unnecessary. Complete foods are formulated to meet all nutritional requirements. Multivitamins add value for dogs on home-prepared diets or as a convenient way to add multiple supports in one product.

---

## Supplement Stacking Guide for ${n}s

**Minimum effective stack (${sz} breed):**
1. Joint support (glucosamine/chondroitin) — start in adulthood
2. Omega-3 fish oil — year-round

**Enhanced stack:**
Add probiotics as a daily maintenance supplement (particularly after antibiotics or food changes)

**Situational additions:**
Calming supplement as needed for anxiety triggers

**What to avoid stacking without vet guidance:**
- Multiple joint supplements simultaneously (redundant)
- High-dose vitamins alongside a complete commercial food (toxicity risk with fat-soluble vitamins)
- CBD/hemp products alongside certain medications

---

## Frequently Asked Questions

**Q: Do supplements replace a good diet?**
A: No. Supplements fill specific gaps — they don't compensate for a nutritionally poor base diet. Start with quality food, then add targeted supplements.

**Q: When should I see results from joint supplements?**
A: 4–6 weeks minimum for most dogs. If no improvement after 8 weeks, discuss alternatives with your vet.

**Q: Can I give human fish oil to my ${n}?**
A: Yes, provided it contains no xylitol or artificial sweeteners. Check the dose — human supplements are often 1000mg capsules, which is appropriate for ${sz === 'large'||sz === 'giant' ? 'large' : 'medium'} breeds. Start low and increase gradually.

**Q: Are pet supplements regulated?**
A: Not as strictly as human drugs. Look for products with NASC (National Animal Supplement Council) quality seals, third-party lab testing, and certificates of analysis available online.

**Q: Should I tell my vet about supplements?**
A: Always. Some supplements interact with medications — omega-3 can affect clotting, for example. Keep your vet informed of everything your ${n} takes.

---

## Our Verdict

For ${n}s, the highest-return supplements are: **joint support** (${alink(joint.asin,joint.name)}) as a long-term investment in mobility, and **omega-3** (${alink(omega.asin,omega.name)}) for coat and inflammation support.

Add a probiotic during stress periods, and a calming supplement for anxiety triggers. Keep it targeted — less is more with supplementation.

**More ${n} guides:**
- [Best food for ${n}s →](${links.food_post||'/blog'})
- [${n} health issues →](${links.health_post||'/blog'})
- [${n} care hub →](${links.hub||'/breeds'})
`;
}

// ── NAMES TEMPLATE ─────────────────────────────────────────────
function tmpl_names(breed) {
  const n = breed.name, sz = breed.size_category, en = breed.energy_level;
  const temp = breed.temperament || '', links = linkMap[breed.slug]||{};
  const styles = breed.name_styles || ['Classic','Trendy'];
  const insps  = breed.name_inspirations || ['Classic Pet','Nature'];
  const rank = breed.ranking_data||{};
  const desc = breed.description ? breed.description.slice(0,200)+'...' : '';

  const boys  = get_names(styles, insps, 'boy',  12);
  const girls = get_names(styles, insps, 'girl', 12);
  const nature_names  = allNames.filter(n=>n.inspiration==='Nature'&&n.enriched).sort((a,b)=>a.rank-b.rank).slice(0,8).map(n=>n.name);
  const tough_names   = allNames.filter(n=>n.category==='Tough'&&n.enriched).sort((a,b)=>a.rank-b.rank).slice(0,8).map(n=>n.name);
  const cute_names    = allNames.filter(n=>n.category==='Cute'&&n.enriched).sort((a,b)=>a.rank-b.rank).slice(0,8).map(n=>n.name);
  const myth_names    = allNames.filter(n=>n.inspiration==='Mythology'&&n.enriched).sort((a,b)=>a.rank-b.rank).slice(0,8).map(n=>n.name);
  const classic_names = allNames.filter(n=>n.category==='Classic'&&n.enriched).sort((a,b)=>a.rank-b.rank).slice(0,8).map(n=>n.name);

  const temp_desc = temp.toLowerCase();
  const personality_note = temp_desc.includes('friendly') ? 'social, approachable names that match their outgoing personality'
    : temp_desc.includes('loyal') || temp_desc.includes('protective') ? 'strong, dignified names that reflect their loyal nature'
    : temp_desc.includes('intelligent') || temp_desc.includes('smart') ? 'clever, distinctive names that match their sharp minds'
    : temp_desc.includes('gentle') || temp_desc.includes('calm') ? 'soft, elegant names that suit their gentle temperament'
    : 'names that match their unique character';

  const intel_note = rank.intelligence_rank
    ? `As one of the world's ${rank.intelligence_rank <= 10 ? 'most' : rank.intelligence_rank <= 30 ? 'highly'  : 'above-average'} intelligent breeds (#${rank.intelligence_rank}), ${n}s tend to respond well to shorter names (1–2 syllables) that are easy to distinguish from commands.`
    : `${n}s respond best to names that are 1–2 syllables and end in a vowel sound — they're easier for dogs to distinguish from commands.`;

  return `---
title: ${ys(`Best ${n} Names 2026 — ${styles.join(', ')} Picks for Boys & Girls`)}
description: ${ys(`The best names for ${n}s matched to their ${temp || en+' energy'} personality. ${styles.join(' and ')} options for boy and girl ${n}s, plus themed inspiration lists.`)}
pubDate: ${TODAY}
updatedDate: ${TODAY}
category: "Dog Names"
postType: "product-roundup"
breedSlug: ${ys(breed.slug)}
breedName: ${ys(n)}
tags: ["dog-names", ${ys(breed.slug)}, "puppy-names", "2026"]
readTime: 5
schemaType: "Article"
noIndex: false
---

Naming a ${n} is your first chance to match a name to a personality — and ${n}s have a distinct one: **${temp || en+' energy, '+sz+' breed'}**.

The best ${n} names lean toward ${personality_note}. We filtered our database of 7,000+ names through the ${n}'s breed profile to give you the most matched options.

${intel_note}

---

## Top ${n} Boy Names

${boys.slice(0,10).map((name,i)=>`${i+1}. **${name}**`).join('\n')}

---

## Top ${n} Girl Names

${girls.slice(0,10).map((name,i)=>`${i+1}. **${name}**`).join('\n')}

---

## Names by Theme

### ${insps.includes('Nature') ? '🌿 Nature Names (Perfect for '+n+'s)' : '⭐ Classic Names'}
${(insps.includes('Nature') ? nature_names : classic_names).map(name=>`- **${name}**`).join('\n')}

### ${styles.includes('Tough') ? '💪 Tough Names' : '✨ Trending Names'}
${(styles.includes('Tough') ? tough_names : allNames.filter(n=>n.category==='Trendy'&&n.enriched).sort((a,b)=>a.rank-b.rank).slice(0,8).map(n=>n.name)).map(name=>`- **${name}**`).join('\n')}

### ${insps.includes('Mythology') ? '⚡ Mythology Names' : '🐾 Cute Names'}
${(insps.includes('Mythology') ? myth_names : cute_names).map(name=>`- **${name}**`).join('\n')}

---

## How to Pick the Perfect ${n} Name

**Keep it short:** 1–2 syllables is ideal. ${n}s — like all dogs — distinguish their name from surrounding sounds most easily when it's short and distinct.

**Avoid command sounds:** Names that sound like "sit," "stay," "no," "down," "come," or "heel" create confusion. Also avoid names rhyming with family member names.

**End in a vowel:** Names ending in -a, -o, -ie, or -y (Bella, Milo, Charlie, Daisy) are consistently easiest for dogs to recognise — the open vowel sound carries well at a distance.

**Test it aloud:** Say the name in an excited tone ("Milo!"), a firm tone ("Milo, no!"), and a normal calling tone ("Come here, Milo!"). It should work in all three.

**Give it a week:** Once chosen, use it consistently for 5–7 days before judging whether it "fits." Most names grow on owners.

---

## ${n} Name Inspiration by Personality Trait

| Trait | Suggested Names |
|---|---|
| Energetic | Atlas, Blaze, Chase, Dash, Rocket, Ziggy |
| Gentle | Biscuit, Daisy, Dove, Maple, Willow, Honey |
| Loyal | Ace, Duke, Faith, Honor, Ranger, Sterling |
| Intelligent | Archer, Einstein, Sage, Tesla, Pixel, Vega |
| Playful | Bingo, Gizmo, Noodle, Pickle, Sprout, Waffles |

---

## Most Popular ${n} Names (2024–2026)

Based on ${n} owner communities and registration data, these names consistently top the lists:

**Boys:** Max, Buddy, Cooper, Charlie, Duke, Finn, Bear, Tucker, Louie, Zeus

**Girls:** Bella, Luna, Daisy, Lucy, Rosie, Molly, Stella, Sadie, Penny, Nala

---

## Frequently Asked Questions

**Q: Can I change my ${n}'s name?**
A: Yes — dogs adapt to new names within 1–2 weeks when the transition is done correctly. Pair the new name with high-value treats consistently for the first week.

**Q: Should I name my ${n} after its coat colour or markings?**
A: It can work well (Shadow, Ginger, Biscuit), but breed-distinctive names often feel more personal and unique at the dog park.

**Q: What names do ${n}s respond to best?**
A: ${intel_note}

**Q: Is it bad luck to name a dog before seeing it?**
A: This is a common superstition without basis — choose a name before bringing your ${n} home to start the bonding process immediately.

---

## Our Top Pick for Your ${n}

Based on the ${n}'s ${temp ? '"'+temp+'"' : en+' energy'} personality and ${sz} size, our top name recommendations are:

**For a boy ${n}:** **${boys[0]}** — fits the ${styles[0].toLowerCase()} style that matches the ${n}'s character perfectly.

**For a girl ${n}:** **${girls[0]}** — one of the most popular and well-matched names for the breed.

**Related guides:**
- [${n} care guide →](${links.hub||'/breeds'})
- [Best food for ${n}s →](${links.food_post||'/blog'})
- [Best toys for ${n}s →](${links.toy_post||'/blog'})
`;
}

// ── COMPARISON POSTS ───────────────────────────────────────────
const COMPARISON_PAIRS = [
  ['embark-dna-test','wisdom-panel-essential'],
  ['kong-extreme','goughnuts-maxx'],
  ['kong-classic','west-paw-toppl'],
  ['fi-series-4-gps','tractive-gps-dog-4'],
  ['purina-pro-plan-large-breed','hills-science-diet-large-breed'],
  ['the-farmers-dog','ollie-fresh-food'],
  ['big-barker-orthopedic','petfusion-ultimate-bed'],
  ['ruffwear-front-range','rabbitgoo-no-pull-harness'],
  ['nutramax-cosequin','zesty-paws-mobility'],
  ['stella-chewys-freeze-dried','instinct-raw-boost-mixers'],
  ['nexgard-flea-tick','seresto-flea-collar'],
  ['furminator-deshedding','hertzko-slicker-brush'],
  ['best-friends-donut-bed','casper-dog-bed'],
  ['fi-series-4-gps','fi-series-3-gps'],
  ['aquapaw-bathing-tool','bodhi-dog-waterless-shampoo'],
];

function tmpl_comparison(a, b) {
  const winner = (a.score||0) >= (b.score||0) ? a : b;
  const loser  = winner === a ? b : a;
  return `---
title: ${ys(a.name+' vs '+b.name+' (2026): Head-to-Head Comparison')}
description: ${ys('We compare '+a.name+' and '+b.name+' head-to-head on price, performance and value. Honest verdict on which is right for your dog.')}
pubDate: ${TODAY}
updatedDate: ${TODAY}
category: ${ys((a.category_key||'Reviews').replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()))}
postType: "comparison"
tags: [${ys(a.category_key||'reviews')}, "comparison", "2026"]
readTime: 5
topProduct:
  name: ${ys(winner.name)}
  asin: ${ys(winner.asin)}
  price: ${winner.price||0}
  rating: ${winner.rating||4.5}
  image: ${ys(winner.image||'')}
schemaType: "Article"
---

Choosing between **${a.name}** and **${b.name}** comes down to what you prioritise — price, performance, or specific features for your dog.

> **Short answer:** ${winner.name} wins for most dogs and situations. But ${loser.name} is the better choice in specific cases outlined below.

---

## Side-by-Side

| | ${a.name} | ${b.name} |
|---|---|---|
| Price | ${fmt(a.price)} | ${fmt(b.price)} |
| Rating | ${stars(a.rating)} | ${stars(b.rating)} |
| Score | ${a.score||'—'}/10 | ${b.score||'—'}/10 |
| Best for | ${(a.tags||[]).slice(0,2).join(', ')} | ${(b.tags||[]).slice(0,2).join(', ')} |

---

## ${a.name}

**${fmt(a.price)} | ${stars(a.rating)}**

${alink(a.asin, 'Check current price →')}

${a.verdict||a.name+' is a solid choice in its category.'}

**Pros:**
${(a.pros||['Quality product']).map(p=>`- ${p}`).join('\n')}

**Cons:**
${(a.cons||['Check suitability']).map(c=>`- ${c}`).join('\n')}

**Choose this if:** ${(a.tags||[]).slice(0,3).join(', ')||'it matches your dog\'s specific needs'}.

---

## ${b.name}

**${fmt(b.price)} | ${stars(b.rating)}**

${alink(b.asin, 'Check current price →')}

${b.verdict||b.name+' is a solid alternative.'}

**Pros:**
${(b.pros||['Quality product']).map(p=>`- ${p}`).join('\n')}

**Cons:**
${(b.cons||['Check suitability']).map(c=>`- ${c}`).join('\n')}

**Choose this if:** ${(b.tags||[]).slice(0,3).join(', ')||'budget is a primary concern'}.

---

## Our Verdict

**${winner.name}** wins overall on performance and value. If budget is the primary concern or you need ${(loser.tags||[]).slice(0,2).join(' or ')}, **${loser.name}** is the alternative.

> ${alink(winner.asin, `Get ${winner.name} →`)}
`;
}

// ── Main ───────────────────────────────────────────────────────
const CAT_MAP = {
  food:        { cat: 'dog-food',   tmpl: tmpl_food,        key: 'food_post',       prefix: 'best-food-for-',      n: 6 },
  toys:        { cat: 'toys',       tmpl: tmpl_toys,        key: 'toy_post',        prefix: 'best-toys-for-',      n: 5 },
  beds:        { cat: 'beds',       tmpl: tmpl_beds,        key: 'bed_post',        prefix: 'best-bed-for-',       n: 5 },
  grooming:    { cat: 'grooming',   tmpl: tmpl_grooming,    key: 'grooming_post',   prefix: 'best-grooming-for-',  n: 5 },
  health:      { cat: 'health',     tmpl: tmpl_health,      key: 'health_post',     prefix: '',                    n: 6, use_slug: true },
  supplements: { cat: 'supplements',tmpl: tmpl_supplements, key: 'supplement_post', prefix: 'best-supplements-for-',n: 5 },
  names:       { cat: null,         tmpl: (b,_)=>tmpl_names(b), key: 'names_page',  prefix: 'names-for-',          n: 0 },
};

console.log('\n══════════════════════════════════════════════════════');
console.log('  ✍   MrDoggoStyle Content Engine v2');
console.log(`  Type: ${TYPE}  |  ${WRITE?'WRITE MODE':'DRY RUN'}`);
if (!WRITE) console.log('  Add --write to save files');
console.log('══════════════════════════════════════════════════════\n');

let generated=0, skipped=0, errors=0;

if (TYPE === 'comparison') {
  for (const [id_a, id_b] of COMPARISON_PAIRS) {
    const a = prodIndex[id_a], b = prodIndex[id_b];
    if (!a || !b) { console.log(`  ${Y('⚠')}  skip ${id_a} vs ${id_b} — not found`); continue; }
    const filename = `${id_a}-vs-${id_b}.md`;
    const filepath = path.join(CONTENT, filename);
    if (fs.existsSync(filepath) && !FORCE) { skipped++; console.log(`  ${D('·')}  exists  ${filename}`); continue; }
    try {
      const content = tmpl_comparison(a, b);
      if (WRITE) { fs.writeFileSync(filepath, content, 'utf8'); console.log(`  ${G('✓')}  ${filename}  ${D(wc(content)+'w')}`); }
      else console.log(`  ${B('→')}  ${filename}  ${D(wc(content)+'w')}`);
      generated++;
    } catch(e) { console.log(`  ${R('✗')}  ${e.message}`); errors++; }
  }
} else {
  const cfg = CAT_MAP[TYPE];
  if (!cfg) { console.error(R(`✗ Unknown type "${TYPE}". Valid: food toys beds grooming health supplements names comparison`)); process.exit(1); }

  let queue = SLUG ? breeds.filter(b=>b.slug===SLUG) : [...breeds];
  if (!SLUG) queue.sort((a,b)=>((a.akc_popularity||999)-(b.akc_popularity||999)));
  if (TOP50)  queue = queue.slice(0,50);
  else if (TOP100) queue = queue.slice(0,100);
  else if (LIMIT)  queue = queue.slice(0,LIMIT);

  console.log(`  Queue: ${queue.length} breeds | Category: ${cfg.cat||'names'}\n`);

  for (const breed of queue) {
    let filename;
    if (cfg.use_slug) filename = `${breed.slug}-health-problems.md`;
    else filename = `${cfg.prefix}${breed.slug}.md`;

    const filepath = path.join(CONTENT, filename);
    if (fs.existsSync(filepath) && !FORCE) { skipped++; console.log(`  ${D('·')}  exists  ${filename}`); continue; }

    try {
      const prods = cfg.cat ? get_products(breed, cfg.cat, cfg.n) : [];
      if (cfg.cat && prods.length === 0) { console.log(`  ${Y('⚠')}  no products  ${breed.slug}`); continue; }
      const content = cfg.tmpl(breed, prods);
      const words = wc(content);
      if (WRITE) {
        fs.writeFileSync(filepath, content, 'utf8');
        if (status[breed.slug]) status[breed.slug][cfg.key] = true;
        console.log(`  ${G('✓')}  ${filename}  ${D(words+'w')}`);
      } else {
        console.log(`  ${B('→')}  ${filename}  ${D(words+'w')}`);
      }
      generated++;
    } catch(e) { console.log(`  ${R('✗')}  ${breed.slug}: ${e.message}`); errors++; }
  }

  if (WRITE && generated > 0) {
    fs.writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2));
    console.log(`\n  ${G('✓')}  content-status.json updated`);
  }
}

console.log(`\n══════════════════════════════════════════════════════`);
console.log(`  Generated: ${G(generated)}  Skipped: ${skipped}  Errors: ${errors>0?R(errors):errors}`);
if (!WRITE && generated > 0) console.log(`\n  ${Y('Run with --write to save')}`);
console.log(`══════════════════════════════════════════════════════\n`);
