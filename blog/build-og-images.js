#!/usr/bin/env node
/* CalorIA Scan — blog Open Graph image generator.
   Renders a 1200x630 branded share card (headline baked in) per post per language,
   plus the hub, using headless Google Chrome. Output -> blog/og/<slug>-<lang>.png
   Run:  node blog/build-og-images.js   (then re-run blog/generate.js)  */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const posts = JSON.parse(fs.readFileSync(path.join(__dirname, 'posts.json'), 'utf8'));
const OUT = path.join(__dirname, 'og');
const TMP = process.env.TMPDIR || '/tmp';
fs.mkdirSync(OUT, { recursive: true });

const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fit = t => t.length > 60 ? 48 : t.length > 46 ? 55 : t.length > 32 ? 62 : 70;

function card(title, cat, emoji, tag){
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}
html,body{width:1200px;height:630px;overflow:hidden}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#faf8f1}
.card{position:relative;width:1200px;height:630px;padding:60px 74px;display:flex;flex-direction:column}
.accent{position:absolute;left:0;top:0;bottom:0;width:14px;background:#2e7d32}
.top{display:flex;align-items:center;gap:22px}
.emoji{font-size:80px;line-height:1}
.chip{background:#eaf4ec;color:#2e7d32;font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;padding:10px 22px;border-radius:30px}
h1{font-size:${fit(title)}px;line-height:1.13;letter-spacing:-.02em;color:#1c2430;font-weight:800;margin-top:36px;max-width:1020px}
.spacer{flex:1}
.foot{display:flex;align-items:flex-end;justify-content:space-between;border-top:2px solid #e5e2d6;padding-top:26px}
.brand{font-size:36px;font-weight:800;color:#1c2430;letter-spacing:-.01em}
.brand .ia{color:#e8622e}
.tag{font-size:23px;color:#2e7d32;font-weight:700}
.dom{font-size:20px;color:#9a958a;font-weight:600;margin-top:4px}
</style></head><body>
<div class="card">
<div class="accent"></div>
<div class="top"><span class="emoji">${esc(emoji)}</span><span class="chip">${esc(cat)}</span></div>
<h1>${esc(title)}</h1>
<div class="spacer"></div>
<div class="foot">
<div><div class="brand">Calor<span class="ia">IA</span> Scan</div><div class="dom">caloriascan.com</div></div>
<div class="tag">${esc(tag)}</div>
</div>
</div>
</body></html>`;
}

function render(html, outPng){
  const tmpFile = path.join(TMP, 'ogcard-' + Math.abs(html.length) + '-' + path.basename(outPng) + '.html');
  fs.writeFileSync(tmpFile, html);
  execFileSync(CHROME, [
    '--headless=new','--disable-gpu','--hide-scrollbars','--no-sandbox',
    '--force-device-scale-factor=1','--default-background-color=FFFFFFFF',
    '--window-size=1200,630', `--screenshot=${outPng}`, `file://${tmpFile}`
  ], { stdio: 'ignore' });
  fs.rmSync(tmpFile, { force: true });
}

let n = 0;
for (const p of posts){
  for (const L of ['es','en']){
    const c = p[L];
    const cat = L === 'en' ? p.category_en : p.category_es;
    const tag = L === 'en' ? '🔬 With real sources' : '🔬 Con fuentes reales';
    render(card(c.title, cat, p.emoji, tag), path.join(OUT, `${p.slug}-${L}.png`));
    n++;
  }
}
// hub cards
render(card('Mitos de la comida, revisados con ciencia real', 'Blog', '🤯', '🔬 Con fuentes reales'), path.join(OUT, '_hub-es.png'));
render(card('Food myths, checked against real science', 'Blog', '🤯', '🔬 With real sources'), path.join(OUT, '_hub-en.png'));
n += 2;

console.log('Rendered', n, 'OG images (1200x630) into', OUT);
