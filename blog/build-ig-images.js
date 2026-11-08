#!/usr/bin/env node
/* CalorIA Scan — Instagram Story images (1080x1920) for the "Post on Instagram" panel.
   One JPEG per post per language -> blog/ig/<slug>-<lang>.jpg, rendered with headless Chrome.
   Run:  node blog/build-ig-images.js [slug]   (then node blog/generate.js .) */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const posts = JSON.parse(fs.readFileSync(path.join(__dirname, 'posts.json'), 'utf8'));
const ICON = path.join(__dirname, '..', 'icon for landing_page.png');
const OUT = path.join(__dirname, 'ig');
const IMG = path.join(__dirname, 'img');
const TMP = process.env.TMPDIR || '/tmp';
fs.mkdirSync(OUT, { recursive: true });

const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const url = p => encodeURI('file://' + p);
const fit = t => t.length > 80 ? 70 : t.length > 60 ? 78 : t.length > 40 ? 88 : 98;

function card(title, cat, tag, imgPath, domain, emoji){
  // no hero photo yet: show the post's emoji in the picture slot instead of an empty box
  const pic = imgPath
    ? `<div class="pic" style="background:#1c2430 url('${url(imgPath)}') center/cover no-repeat"></div>`
    : `<div class="pic ph" style="background:radial-gradient(500px 360px at 70% 20%,rgba(244,122,32,.45),rgba(244,122,32,0) 70%),#16399A"><span>${esc(emoji || '')}</span></div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden}
body{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;position:relative;background:radial-gradient(1000px 800px at 90% 95%,rgba(244,122,32,.26) 0%,rgba(244,122,32,0) 70%),linear-gradient(160deg,#16399A 0%,#0A1B52 38%,#071237 100%)}
.brand{position:absolute;top:120px;left:80px;display:flex;align-items:center;gap:22px}
.brand .ic{width:84px;height:84px;border-radius:20px;background:#0a1a3a url("${url(ICON)}") center/118% no-repeat}
.brand b{font-size:44px;font-weight:800;letter-spacing:-.02em;color:#fff}
.brand b i{font-style:normal;color:#F47A20}
.pic{position:absolute;left:80px;right:80px;top:300px;height:600px;border-radius:44px;box-shadow:0 30px 80px rgba(0,0,0,.45);border:2px solid rgba(255,255,255,.14)}
.pic.ph{display:flex;align-items:center;justify-content:center}
.pic.ph span{font-size:300px;line-height:1;filter:drop-shadow(0 18px 40px rgba(0,0,0,.35))}
.chip{position:absolute;left:80px;top:990px;background:#F47A20;color:#fff;font-size:34px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;padding:12px 30px;border-radius:40px}
h1{position:absolute;left:80px;right:80px;top:1085px;font-size:${fit(title)}px;line-height:1.07;letter-spacing:-.035em;font-weight:800;color:#fff}
.foot{position:absolute;left:80px;right:80px;top:1610px;display:flex;justify-content:space-between;align-items:center;color:#b8c3e0;font-size:38px;font-weight:700}
.foot span:first-child{color:#F47A20}
</style></head><body>
<div class="brand"><div class="ic"></div><b>Calor<i>IA</i> Scan</b></div>
${pic}
<div class="chip">${esc(cat)}</div>
<h1>${esc(title)}</h1>
<div class="foot"><span>${esc(tag)}</span><span>${esc(domain)}</span></div>
</body></html>`;
}

function render(html, outJpg){
  const base = path.basename(outJpg, '.jpg');
  const tmpHtml = path.join(TMP, `igcard-${base}.html`);
  const tmpPng = path.join(TMP, `igcard-${base}.png`);
  fs.writeFileSync(tmpHtml, html);
  execFileSync(CHROME, ['--headless=new','--disable-gpu','--hide-scrollbars','--no-sandbox',
    '--force-device-scale-factor=1','--default-background-color=FFFFFFFF',
    '--window-size=1080,1920', `--screenshot=${tmpPng}`, `file://${tmpHtml}`], { stdio: 'ignore' });
  execFileSync('sips', ['-s','format','jpeg','-s','formatOptions','80', tmpPng, '--out', outJpg], { stdio: 'ignore' });
  fs.rmSync(tmpHtml, { force: true }); fs.rmSync(tmpPng, { force: true });
}

const only = process.argv[2];
let n = 0;
for (const p of posts){
  if (only && p.slug !== only) continue;
  const photo = path.join(IMG, `${p.slug}.jpg`);
  const imgPath = fs.existsSync(photo) ? photo : null;
  for (const L of ['es','en']){
    const cat = L === 'en' ? p.category_en : p.category_es;
    const tag = L === 'en' ? 'New on the blog' : 'Nuevo en el blog';
    const domain = L === 'en' ? 'caloriascan.com/en/blog' : 'caloriascan.com/blog';
    render(card(p[L].title, cat, tag, imgPath, domain, p.emoji), path.join(OUT, `${p.slug}-${L}.jpg`));
    n++;
  }
}
console.log('Rendered', n, 'Instagram story images (1080x1920) into', OUT);
