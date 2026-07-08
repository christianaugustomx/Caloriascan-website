#!/usr/bin/env node
/* CalorIA Scan — bilingual SEO BLOG generator
   Reads posts.json (article content) and emits static HTML posts + hub + blog sitemap.
   Mirrors seo/generate.js. No runtime deps. Run:  node blog/generate.js .
   Default output dir is ./build for previewing; pass '.' to write into the site root. */
const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://caloriascan.com';
const APP_URL = 'https://apps.apple.com/app/id6761160287';
const OG_IMAGE = `${DOMAIN}/android-chrome-512x512.png`;
const OUT = process.argv[2] || './build';
const posts = JSON.parse(fs.readFileSync(path.join(__dirname, 'posts.json'), 'utf8'));

const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const escAttr = s => esc(s).replace(/"/g,'&quot;');
const enc = s => encodeURIComponent(String(s == null ? '' : s));
const wordCount = body => body.reduce((n,b)=> n + (b.h?b.h.split(/\s+/).length:0) + b.p.reduce((m,p)=> m + p.replace(/<[^>]+>/g,' ').split(/\s+/).filter(Boolean).length, 0), 0);

function shareBar(url, title, L){
  const t = L==='en' ? 'Share' : 'Compartir';
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`;
  const tw = `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`;
  const wa = `https://wa.me/?text=${enc(title+' '+url)}`;
  const copyLabel = L==='en' ? 'Copy link' : 'Copiar enlace';
  return `<div class="share" aria-label="${escAttr(t)}">
<span class="share-label">${esc(t)}</span>
<a class="sb sb-x" href="${tw}" target="_blank" rel="noopener nofollow" aria-label="X (Twitter)">𝕏</a>
<a class="sb sb-fb" href="${fb}" target="_blank" rel="noopener nofollow" aria-label="Facebook">f</a>
<a class="sb sb-wa" href="${wa}" target="_blank" rel="noopener nofollow" aria-label="WhatsApp">✆</a>
<button class="sb sb-cp" type="button" onclick="navigator.clipboard&amp;&amp;navigator.clipboard.writeText('${url}');this.textContent='✓';this.setAttribute('aria-label','${escAttr(L==='en'?'Copied':'Copiado')}')" aria-label="${escAttr(copyLabel)}">⧉</button>
</div>`;
}

function related(p, all, L){
  const pool = all.filter(x=>x.slug!==p.slug).slice(0,4);
  return pool.map(x=>{
    const c = x[L];
    const url = L==='en' ? `/en/blog/${x.slug}` : `/blog/${x.slug}`;
    return `<li><a href="${url}"><span class="rc-emoji">${esc(x.emoji)}</span><span class="rc-cat">${esc(L==='en'?x.category_en:x.category_es)}</span><span class="rc-title">${esc(c.title)}</span></a></li>`;
  }).join('');
}

function post(p, all, L){
  const isEN = L==='en';
  const c = p[L];
  const url = `${DOMAIN}${isEN?'/en/blog/':'/blog/'}${p.slug}`;
  const altEN = `${DOMAIN}/en/blog/${p.slug}`;
  const altES = `${DOMAIN}/blog/${p.slug}`;
  const title = `${c.title} | CalorIA Scan`;
  const cat = isEN ? p.category_en : p.category_es;
  const readMin = Math.max(2, Math.round(wordCount(c.body)/200));
  const dateStr = new Date(p.date+'T12:00:00Z').toLocaleDateString(isEN?'en-US':'es-MX',{year:'numeric',month:'long',day:'numeric'});
  const t = isEN ? {
    home:'Home', blog:'Blog', by:'By', min:'min read', tldr:'The short version',
    sources:'Sources', related:'Keep reading', ctaTitle:'Stop guessing your calories',
    ctaText:'CalorIA Scan reads your plate from a photo and gives you calories and macros tuned for real Mexican and Latino food — where generic apps get it wrong.',
    ctaBtn:'Get CalorIA Scan free', switch:'Español',
    disc:'This article is informational and not medical advice. Consult a doctor or registered dietitian before changing your diet, especially with a pre-existing condition.'
  } : {
    home:'Inicio', blog:'Blog', by:'Por', min:'min de lectura', tldr:'En resumen',
    sources:'Fuentes', related:'Sigue leyendo', ctaTitle:'Deja de adivinar tus calorías',
    ctaText:'CalorIA Scan lee tu plato desde una foto y te da calorías y macros pensados para la comida mexicana y latina real — donde las apps genéricas se equivocan.',
    ctaBtn:'Descarga CalorIA Scan gratis', switch:'English',
    disc:'Este artículo es informativo y no constituye consejo médico. Consulta a un médico o nutriólogo antes de cambiar tu dieta, especialmente si tienes alguna condición de salud.'
  };

  const ld = [
    {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
      {"@type":"ListItem","position":1,"name":t.home,"item":DOMAIN+(isEN?'/en/':'/')},
      {"@type":"ListItem","position":2,"name":t.blog,"item":DOMAIN+(isEN?'/en/blog/':'/blog/')},
      {"@type":"ListItem","position":3,"name":c.title,"item":url}
    ]},
    {"@context":"https://schema.org","@type":"BlogPosting",
      "headline": c.title,
      "description": c.excerpt,
      "image": OG_IMAGE,
      "datePublished": p.date,
      "dateModified": p.date,
      "inLanguage": L,
      "author": {"@type":"Organization","name":"CalorIA Scan","url":DOMAIN},
      "publisher": {"@type":"Organization","name":"CalorIA Scan","logo":{"@type":"ImageObject","url":OG_IMAGE}},
      "mainEntityOfPage": {"@type":"WebPage","@id":url},
      "articleSection": cat,
      "citation": c.sources.map(s=>s.name)
    }
  ];

  const bodyHTML = c.body.map(b=>`<h2>${esc(b.h)}</h2>${b.p.map(x=>`<p>${x}</p>`).join('')}`).join('\n');
  const tldrHTML = `<div class="tldr"><h2>${esc(t.tldr)}</h2><ul>${c.tldr.map(x=>`<li>${x}</li>`).join('')}</ul></div>`;
  const sourcesHTML = `<ol class="sources">${c.sources.map(s=>`<li><a href="${escAttr(s.url)}" target="_blank" rel="noopener nofollow">${esc(s.name)}</a></li>`).join('')}</ol>`;

  return `<!DOCTYPE html>
<html lang="${L}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escAttr(title)}</title>
<meta name="description" content="${escAttr(c.excerpt)}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="en" href="${altEN}">
<link rel="alternate" hreflang="es" href="${altES}">
<link rel="alternate" hreflang="x-default" href="${altEN}">
<meta property="og:type" content="article">
<meta property="og:title" content="${escAttr(c.title)}">
<meta property="og:description" content="${escAttr(c.excerpt)}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="CalorIA Scan">
<meta property="og:image" content="${OG_IMAGE}">
<meta property="og:locale" content="${isEN?'en_US':'es_MX'}">
<meta property="article:published_time" content="${p.date}">
<meta property="article:section" content="${escAttr(cat)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escAttr(c.title)}">
<meta name="twitter:description" content="${escAttr(c.excerpt)}">
<meta name="twitter:image" content="${OG_IMAGE}">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>
:root{--g:#2e7d32;--ink:#1c2430;--mut:#5b6675;--line:#e6e9ef;--bg:#fff;--soft:#f6f8fb}
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:var(--bg);line-height:1.7}
.wrap{max-width:720px;margin:0 auto;padding:20px 18px 64px}
a{color:var(--g)}
nav.bc{font-size:13px;color:var(--mut);margin:6px 0 18px}nav.bc a{color:var(--mut);text-decoration:none}
.lang{float:right;font-size:13px;text-decoration:none;border:1px solid var(--line);padding:3px 10px;border-radius:20px;color:var(--mut)}
.chip{display:inline-block;background:#eaf4ec;color:var(--g);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:4px 11px;border-radius:20px}
h1{font-size:33px;line-height:1.18;margin:.35em 0 .15em;letter-spacing:-.01em}
.dek{font-size:19px;color:var(--mut);margin:.4em 0 1em}
.meta{font-size:13px;color:var(--mut);margin:0 0 16px}
.share{display:flex;align-items:center;gap:8px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:12px 0;margin:0 0 26px}
.share-label{font-size:13px;color:var(--mut);margin-right:2px}
.sb{width:36px;height:36px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;font-size:16px;font-weight:700;color:#fff;border:none;cursor:pointer;line-height:1}
.sb-x{background:#000}.sb-fb{background:#1877f2}.sb-wa{background:#25d366}.sb-cp{background:#8895a7}
h2{font-size:23px;line-height:1.25;margin:34px 0 10px;letter-spacing:-.01em}
p{margin:0 0 16px;font-size:17px}
.tldr{background:var(--soft);border:1px solid var(--line);border-left:4px solid var(--g);border-radius:12px;padding:16px 20px;margin:26px 0}
.tldr h2{margin:0 0 8px;font-size:15px;text-transform:uppercase;letter-spacing:.05em;color:var(--g)}
.tldr ul{margin:0;padding-left:20px}.tldr li{margin:6px 0;font-size:16px}
.cta{background:#f0f7f1;border:1px solid #cfe6d3;border-radius:16px;padding:24px;margin:34px 0;text-align:center}
.cta h2{margin:0 0 8px}.cta p{color:var(--ink)}.btn{display:inline-block;background:var(--g);color:#fff;text-decoration:none;padding:13px 24px;border-radius:10px;font-weight:700;margin-top:6px}
.sources{font-size:14px;color:var(--mut);padding-left:22px}.sources li{margin:7px 0}.sources a{word-break:break-word}
ul.rel{list-style:none;padding:0;margin:14px 0 0;display:grid;grid-template-columns:1fr 1fr;gap:12px}
ul.rel a{display:block;border:1px solid var(--line);border-radius:12px;padding:14px;text-decoration:none;color:var(--ink);transition:border-color .15s}
ul.rel a:hover{border-color:var(--g)}
.rc-emoji{font-size:24px;display:block}.rc-cat{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--g);margin:6px 0 3px}.rc-title{display:block;font-size:15px;font-weight:600;line-height:1.35}
.disc{font-size:12px;color:var(--mut);border-top:1px solid var(--line);margin-top:38px;padding-top:14px}
footer{font-size:13px;color:var(--mut);margin-top:16px}footer a{color:var(--mut)}
@media(max-width:560px){h1{font-size:27px}.dek{font-size:17px}ul.rel{grid-template-columns:1fr}}
</style>
</head>
<body>
<article class="wrap">
<a class="lang" href="${isEN?altES:altEN}" hreflang="${isEN?'es':'en'}">${t.switch}</a>
<nav class="bc"><a href="${isEN?'/en/':'/'}">${t.home}</a> › <a href="${isEN?'/en/blog/':'/blog/'}">${t.blog}</a></nav>
<span class="chip">${esc(cat)}</span>
<h1>${esc(c.title)}</h1>
<p class="dek">${esc(c.dek)}</p>
<p class="meta">${t.by} CalorIA Scan · ${dateStr} · ${readMin} ${t.min}</p>
${shareBar(url, c.title, L)}
${tldrHTML}
${bodyHTML}

<div class="cta">
<h2>${esc(t.ctaTitle)}</h2>
<p>${esc(t.ctaText)}</p>
<a class="btn" href="${APP_URL}" rel="nofollow">${esc(t.ctaBtn)}</a>
</div>

<h2>${esc(t.sources)}</h2>
${sourcesHTML}

${shareBar(url, c.title, L)}

<h2>${esc(t.related)}</h2>
<ul class="rel">${related(p,all,L)}</ul>

<p class="disc">${esc(t.disc)}</p>
<footer>© ${new Date().getFullYear()} CalorIA Scan · <a href="${isEN?'/en/':'/'}">${t.home}</a> · <a href="/privacy-policy">${isEN?'Privacy':'Privacidad'}</a> · <a href="/terms">${isEN?'Terms':'Términos'}</a></footer>
</article>
</body>
</html>`;
}

function hub(all, L){
  const isEN = L==='en';
  const url = `${DOMAIN}${isEN?'/en/blog/':'/blog/'}`;
  const title = isEN ? 'Nutrition Myths & Food Science — CalorIA Scan Blog' : 'Mitos de Nutrición y Ciencia de la Comida — Blog CalorIA Scan';
  const desc = isEN ? 'Viral food claims, checked against real science. Hidden sugar in "light" products, the egg-cholesterol myth, sweeteners and more — every claim sourced.' : 'Los mitos de la comida que se vuelven virales, revisados con ciencia real. Azúcar oculta en productos "light", el mito del huevo y el colesterol, edulcorantes y más — con fuentes.';
  const items = all.slice().sort((a,b)=> b.date.localeCompare(a.date)).map(x=>{
    const c = x[L];
    const cat = isEN ? x.category_en : x.category_es;
    const dateStr = new Date(x.date+'T12:00:00Z').toLocaleDateString(isEN?'en-US':'es-MX',{year:'numeric',month:'short',day:'numeric'});
    return `<li><a href="${isEN?'/en/blog/':'/blog/'}${x.slug}">
<span class="e">${esc(x.emoji)}</span>
<span class="cat">${esc(cat)}</span>
<span class="tt">${esc(c.title)}</span>
<span class="dk">${esc(c.dek)}</span>
<span class="dt">${dateStr}</span>
</a></li>`;
  }).join('');
  const ld = {"@context":"https://schema.org","@type":"Blog","name":"CalorIA Scan Blog","url":url,"inLanguage":L,
    "blogPost": all.map(x=>({"@type":"BlogPosting","headline":x[L].title,"url":`${DOMAIN}${isEN?'/en/blog/':'/blog/'}${x.slug}`,"datePublished":x.date}))};
  return `<!DOCTYPE html>
<html lang="${L}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escAttr(title)}</title>
<meta name="description" content="${escAttr(desc)}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="en" href="${DOMAIN}/en/blog/">
<link rel="alternate" hreflang="es" href="${DOMAIN}/blog/">
<link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/blog/">
<meta property="og:type" content="website">
<meta property="og:title" content="${escAttr(title)}">
<meta property="og:description" content="${escAttr(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${OG_IMAGE}">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>
:root{--g:#2e7d32;--ink:#1c2430;--mut:#5b6675;--line:#e6e9ef}
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);line-height:1.6}
.wrap{max-width:780px;margin:0 auto;padding:24px 18px 64px}
a.lang{float:right;font-size:13px;border:1px solid var(--line);padding:3px 10px;border-radius:20px;text-decoration:none;color:var(--mut)}
nav.bc{font-size:13px;color:var(--mut);margin:6px 0 12px}nav.bc a{color:var(--mut);text-decoration:none}
h1{font-size:32px;letter-spacing:-.01em;margin:.2em 0 .1em}.sub{color:var(--mut);font-size:18px;margin:0 0 26px}
ul{list-style:none;padding:0;margin:0;display:grid;gap:14px}
li a{display:block;border:1px solid var(--line);border-radius:14px;padding:18px 20px;text-decoration:none;color:var(--ink);transition:border-color .15s,box-shadow .15s}
li a:hover{border-color:var(--g);box-shadow:0 4px 16px rgba(46,125,50,.08)}
.e{font-size:26px}.cat{display:inline-block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--g);margin-left:8px}
.tt{display:block;font-size:20px;font-weight:700;line-height:1.3;margin:8px 0 4px;letter-spacing:-.01em}
.dk{display:block;color:var(--mut);font-size:15px}.dt{display:block;color:var(--mut);font-size:12px;margin-top:8px}
footer{font-size:13px;color:var(--mut);margin-top:30px;border-top:1px solid var(--line);padding-top:16px}footer a{color:var(--mut)}
@media(max-width:560px){h1{font-size:27px}}
</style>
</head>
<body><div class="wrap">
<a class="lang" href="${isEN?'/blog/':'/en/blog/'}">${isEN?'Español':'English'}</a>
<nav class="bc"><a href="${isEN?'/en/':'/'}">${isEN?'Home':'Inicio'}</a> › Blog</nav>
<h1>${isEN?'Food myths, checked against real science':'Mitos de la comida, revisados con ciencia real'}</h1>
<p class="sub">${isEN?'The viral claims everyone repeats — sourced, fact-checked, and explained in plain language.':'Las afirmaciones virales que todos repiten — con fuentes, verificadas y explicadas en simple.'}</p>
<ul>${items}</ul>
<footer>© ${new Date().getFullYear()} CalorIA Scan · <a href="${isEN?'/en/':'/'}">${isEN?'Home':'Inicio'}</a> · <a href="${isEN?'/en/calories/':'/calorias/'}">${isEN?'Food calories':'Calorías de alimentos'}</a></footer>
</div></body></html>`;
}

// ---- write files ----
const absOut = path.resolve(OUT);
if (absOut === '/' ) { console.error('Refusing to write to /'); process.exit(1); }
const dEN = path.join(OUT,'en','blog'); const dES = path.join(OUT,'blog');
fs.mkdirSync(dEN,{recursive:true}); fs.mkdirSync(dES,{recursive:true});
for(const p of posts){
  fs.writeFileSync(path.join(dEN,p.slug+'.html'), post(p,posts,'en'));
  fs.writeFileSync(path.join(dES,p.slug+'.html'), post(p,posts,'es'));
}
fs.writeFileSync(path.join(dEN,'index.html'), hub(posts,'en'));
fs.writeFileSync(path.join(dES,'index.html'), hub(posts,'es'));

// blog sitemap with hreflang alternates
const today = new Date().toISOString().slice(0,10);
const entry = (loc,en,es,lastmod) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <xhtml:link rel="alternate" hreflang="en" href="${en}"/>\n    <xhtml:link rel="alternate" hreflang="es" href="${es}"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="${en}"/>\n  </url>`;
let sm = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;
sm += entry(`${DOMAIN}/en/blog/`, `${DOMAIN}/en/blog/`, `${DOMAIN}/blog/`, today) + '\n';
sm += entry(`${DOMAIN}/blog/`, `${DOMAIN}/en/blog/`, `${DOMAIN}/blog/`, today) + '\n';
for(const p of posts){
  const en=`${DOMAIN}/en/blog/${p.slug}`, es=`${DOMAIN}/blog/${p.slug}`;
  sm += entry(en,en,es,p.date)+'\n'; sm += entry(es,en,es,p.date)+'\n';
}
sm += `</urlset>\n`;
fs.writeFileSync(path.join(OUT,'sitemap-blog.xml'), sm);

console.log('Generated', posts.length, 'posts ->', posts.length*2, 'pages + 2 hubs + sitemap-blog.xml into', OUT);
