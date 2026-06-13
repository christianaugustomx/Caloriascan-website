#!/usr/bin/env node
/* Refresh seo/pages.json from Supabase. Zero-dependency (Node 18+ fetch).
   Usage:
     SUPABASE_URL=https://<ref>.supabase.co SUPABASE_KEY=<key> node seo/fetch-dishes.js
   SUPABASE_KEY: use your ANON key if the `dishes` table has a public read RLS policy
   (recommended). If reads are blocked, use the service_role key — but NEVER commit it;
   keep it in a .gitignored .env and pass it via the shell. */
const fs = require('fs'), path = require('path');
const URL = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_KEY;
if (!URL || !KEY) { console.error('Set SUPABASE_URL and SUPABASE_KEY env vars.'); process.exit(1); }
const maps = JSON.parse(fs.readFileSync(path.join(__dirname,'mappings.json'),'utf8'));
const cols = 'name,name_normalized,category,region,description,emoji,base_calories,base_protein,base_carbs,base_fat,base_fiber,base_sodium,serving_size,serving_grams';

async function bestMatch(m){
  const u = `${URL}/rest/v1/dishes?select=${cols}&is_active=eq.true&name_normalized=ilike.*${encodeURIComponent(m.pattern)}*`;
  const r = await fetch(u, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error(`${m.slug}: HTTP ${r.status} ${await r.text()}`);
  let rows = await r.json();
  if (m.anti) rows = rows.filter(d => !d.name_normalized.includes(m.anti));
  if (!rows.length) return null;
  rows.sort((a,b) => (a.name_normalized===m.pattern?0:1)-(b.name_normalized===m.pattern?0:1) || a.name.length-b.name.length);
  return rows[0];
}

(async () => {
  const out = [];
  for (const m of maps) {
    const d = await bestMatch(m);
    if (!d) { console.warn('NO MATCH:', m.slug, `(pattern "${m.pattern}")`); continue; }
    out.push({ slug:m.slug, name:d.name, category:d.category, region:d.region, description:d.description,
      emoji:d.emoji||'🍽️', cal:d.base_calories, prot:d.base_protein, carb:d.base_carbs, fat:d.base_fat,
      fib:d.base_fiber||0, sod:d.base_sodium||0, serving_size:d.serving_size, g:d.serving_grams,
      query_en:m.query_en, query_es:m.query_es, en_title:m.en_title, cluster:m.cluster });
  }
  fs.writeFileSync(path.join(__dirname,'pages.json'), JSON.stringify(out, null, 0));
  console.log(`Wrote pages.json with ${out.length}/${maps.length} concepts.`);
})();
