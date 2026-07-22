#!/usr/bin/env node
/* CalorIA Scan — blog stock photo fetcher.
   Pulls CC0 / public-domain images (no attribution required) from Openverse per post,
   normalizes to JPEG (max 1600px) via sips, saves to blog/img/<slug>.jpg.
   Records provenance in blog/img/credits.json. Run:  node blog/fetch-stock.js [slug] */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const IMG = path.join(__dirname, 'img');
fs.mkdirSync(IMG, { recursive: true });

// per-slug search queries (first acceptable hit wins), tried in order
const QUERIES = {
  'e141-clorofila-cobre-colorante': ['green gummy candy', 'green chewing gum', 'green candy sweets'],
  'barras-granola-azucar-oculta': ['granola bar oats', 'oat bars snack', 'granola bars'],
  'productos-light-azucar-oculta': ['strawberry yogurt', 'yogurt breakfast bowl', 'yogurt'],
  'huevo-colesterol-mito': ['fried eggs breakfast', 'eggs food', 'boiled eggs'],
  'aguacate-engorda-mito': ['avocado toast', 'halved avocado', 'avocado fruit'],
  'refresco-zero-edulcorantes-oms': ['cola glass ice', 'soda pouring glass', 'soft drink cola'],
  'sal-presion-arterial-oms': ['salt shaker table', 'coarse salt bowl', 'sea salt food'],
  'pan-integral-mito': ['whole grain bread', 'bread loaf sliced', 'bread'],
  'jugo-natural-vs-fruta': ['orange juice glass', 'fresh orange juice', 'orange juice'],
  'calorias-platillos-mexicanos-favoritos': ['tacos plate table', 'mexican food tacos', 'mexican tacos street food'],
  'mitos-comida-virales': ['fresh vegetables fruits', 'healthy food table', 'fruits vegetables'],
};

const BAD = /zygote|cell|sperm|easter|tattoo|sculpture|diagram|chart|\blogo\b|anatomy|microscope|virus|molecule|chemical|\bnail\b|soap|sign|poster|drawing|cartoon|painting|statue|coin|stamp|silver|cellar|century|antique|museum|\b1[0-9]{3}\b|engraving|porcelain|ceramic vase/i;

const GOOD_SOURCES = ['rawpixel', 'stocksnap'];  // curated CC0 stock, reliably on-topic & attractive

function apiSearch(q){
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license=cc0,pdm&size=large&mature=false&page_size=20`;
  const raw = execSync(`curl -s --max-time 25 ${JSON.stringify(url)}`, { maxBuffer: 8e6 }).toString();
  try { return JSON.parse(raw).results || []; } catch { return []; }
}

function pick(slug){
  const all = [];
  for (const q of QUERIES[slug]){
    for (const r of apiSearch(q)){
      if (!r.url || BAD.test(r.title || '') || (r.width || 0) < 900) continue;
      all.push({ ...r, query: q });
    }
  }
  // prefer curated stock sources, keep query order otherwise
  all.sort((a,b)=> (GOOD_SOURCES.includes(b.source)?1:0) - (GOOD_SOURCES.includes(a.source)?1:0));
  return all;  // return ranked candidates; caller downloads the first that yields a valid image
}

function download(cand, outFile){
  for (const src of [cand.url, cand.thumbnail].filter(Boolean)){
    const rawFile = outFile + '.raw';
    try {
      execSync(`curl -s -L --max-time 45 -o ${JSON.stringify(rawFile)} ${JSON.stringify(src)}`);
      execSync(`sips -s format jpeg -s formatOptions 82 -Z 1600 ${JSON.stringify(rawFile)} --out ${JSON.stringify(outFile)}`, { stdio: 'ignore' });
      fs.rmSync(rawFile, { force: true });
      return true;
    } catch { fs.rmSync(rawFile, { force: true }); }
  }
  return false;
}

const only = process.argv[2];
const slugs = only ? [only] : Object.keys(QUERIES);
const credits = fs.existsSync(path.join(IMG,'credits.json')) ? JSON.parse(fs.readFileSync(path.join(IMG,'credits.json'),'utf8')) : {};

const RANK = only && process.argv[3] ? parseInt(process.argv[3],10) : 0;  // node fetch-stock.js <slug> <rank> to re-pick
for (const slug of slugs){
  const cands = pick(slug);
  if (!cands.length){ console.log('!! no candidates for', slug); continue; }
  const outFile = path.join(IMG, `${slug}.jpg`);
  let done = false;
  for (let i = (only?RANK:0); i < cands.length && !done; i++){
    const hit = cands[i];
    if (download(hit, outFile)){
      const dim = execSync(`sips -g pixelWidth -g pixelHeight ${JSON.stringify(outFile)}`).toString().match(/\d+/g);
      credits[slug] = { rank: i, title: hit.title, license: hit.license, creator: hit.creator || null,
                        source: hit.source, landing: hit.foreign_landing_url || null, query: hit.query, url: hit.url };
      console.log(`OK  ${slug}  #${i} [${hit.license}] ${dim ? dim.join('x') : '?'}  ${(hit.title||'').slice(0,45)}  (${hit.source})`);
      done = true;
    }
  }
  if (!done) console.log('!! all downloads failed for', slug);
}
fs.writeFileSync(path.join(IMG,'credits.json'), JSON.stringify(credits,null,2)+'\n');
console.log('\ncredits.json updated');
