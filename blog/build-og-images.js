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
const IMG = path.join(__dirname, 'img');
const TMP = process.env.TMPDIR || '/tmp';
fs.mkdirSync(OUT, { recursive: true });

const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fit = t => t.length > 60 ? 48 : t.length > 46 ? 55 : t.length > 32 ? 62 : 70;

function textCard(title, cat, emoji, tag){
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

function photoCard(title, cat, emoji, tag, imgPath){
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}
html,body{width:1200px;height:630px;overflow:hidden}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.card{position:relative;width:1200px;height:630px;overflow:hidden}
.bg{position:absolute;inset:0;background:#1c2430 url("file://${imgPath}") center/cover no-repeat}
.grad{position:absolute;inset:0;background:linear-gradient(to top,rgba(12,17,23,.94) 4%,rgba(12,17,23,.68) 42%,rgba(12,17,23,.12) 82%)}
.top{position:absolute;top:46px;left:64px;display:flex;align-items:center;gap:18px}
.emoji{font-size:62px;line-height:1;filter:drop-shadow(0 2px 6px rgba(0,0,0,.45))}
.chip{background:rgba(255,255,255,.94);color:#2e7d32;font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;padding:10px 22px;border-radius:30px}
.content{position:absolute;left:0;right:0;bottom:0;padding:0 64px 52px}
h1{color:#fff;font-size:${fit(title)}px;line-height:1.12;letter-spacing:-.02em;font-weight:800;max-width:1060px;text-shadow:0 2px 16px rgba(0,0,0,.55);margin-bottom:26px}
.foot{display:flex;align-items:flex-end;justify-content:space-between}
.brand{font-size:34px;font-weight:800;color:#fff;letter-spacing:-.01em;text-shadow:0 2px 10px rgba(0,0,0,.5)}
.brand .ia{color:#ff8a4c}
.dom{font-size:19px;color:#d7dbe0;font-weight:600;margin-top:3px;text-shadow:0 1px 6px rgba(0,0,0,.5)}
.tag{font-size:22px;color:#eafaef;font-weight:700;text-shadow:0 1px 8px rgba(0,0,0,.6)}
</style></head><body>
<div class="card">
<div class="bg"></div><div class="grad"></div>
<div class="top"><span class="emoji">${esc(emoji)}</span><span class="chip">${esc(cat)}</span></div>
<div class="content">
<h1>${esc(title)}</h1>
<div class="foot">
<div><div class="brand">Calor<span class="ia">IA</span> Scan</div><div class="dom">caloriascan.com</div></div>
<div class="tag">${esc(tag)}</div>
</div>
</div>
</div>
</body></html>`;
}

function card(title, cat, emoji, tag, imgPath){
  return imgPath ? photoCard(title, cat, emoji, tag, imgPath) : textCard(title, cat, emoji, tag);
}

function render(html, outJpg){
  const base = path.basename(outJpg).replace(/\.jpg$/, '');
  const tmpHtml = path.join(TMP, `ogcard-${base}.html`);
  const tmpPng = path.join(TMP, `ogcard-${base}.png`);
  fs.writeFileSync(tmpHtml, html);
  execFileSync(CHROME, [
    '--headless=new','--disable-gpu','--hide-scrollbars','--no-sandbox',
    '--force-device-scale-factor=1','--default-background-color=FFFFFFFF',
    '--window-size=1200,630', `--screenshot=${tmpPng}`, `file://${tmpHtml}`
  ], { stdio: 'ignore' });
  execFileSync('sips', ['-s','format','jpeg','-s','formatOptions','86', tmpPng, '--out', outJpg], { stdio: 'ignore' });
  fs.rmSync(tmpHtml, { force: true });
  fs.rmSync(tmpPng, { force: true });
}

let n = 0;
for (const p of posts){
  const photo = path.join(IMG, `${p.slug}.jpg`);
  const imgPath = fs.existsSync(photo) ? photo : null;
  for (const L of ['es','en']){
    const c = p[L];
    const cat = L === 'en' ? p.category_en : p.category_es;
    const hasSources = c.sources && c.sources.length > 0;
    const tag = hasSources
      ? (L === 'en' ? '🔬 With real sources' : '🔬 Con fuentes reales')
      : (L === 'en' ? '🌽 Our story' : '🌽 Nuestra historia');
    render(card(c.title, cat, p.emoji, tag, imgPath), path.join(OUT, `${p.slug}-${L}.jpg`));
    n++;
  }
}
// hub cards
const hubImg = fs.existsSync(path.join(IMG,'mitos-comida-virales.jpg')) ? path.join(IMG,'mitos-comida-virales.jpg') : null;
render(card('Mitos de la comida, revisados con ciencia real', 'Blog', '🤯', '🔬 Con fuentes reales', hubImg), path.join(OUT, '_hub-es.jpg'));
render(card('Food myths, checked against real science', 'Blog', '🤯', '🔬 With real sources', hubImg), path.join(OUT, '_hub-en.jpg'));
n += 2;

console.log('Rendered', n, 'OG images (1200x630) into', OUT);
