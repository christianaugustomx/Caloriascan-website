#!/usr/bin/env node
/* CalorIA Scan — bilingual SEO BLOG generator
   Reads posts.json (article content) and emits static HTML posts + the two hubs + blog sitemap.
   No runtime deps. Run:  node blog/generate.js <out-dir> [--drafts]      (default out-dir: ./build)
   Generate into a temp dir and copy only the files you mean to publish: several live article
   pages carry hand edits that a full overwrite would undo.
   Posts with "draft": true are left out of pages, hubs and sitemap unless you pass --drafts
   (local preview only). The hubs keep their hand-designed shell, read from blog/index.html and
   en/blog/index.html; only their JSON-LD list and card sections are rebuilt (see hub()). */
const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://caloriascan.com';
const APP_URL = 'https://apps.apple.com/app/id6761160287';
const OG_IMAGE = `${DOMAIN}/android-chrome-512x512.png`;
const ARGS = process.argv.slice(2);
const OUT = ARGS.find(a => !a.startsWith('--')) || './build';
const WITH_DRAFTS = ARGS.includes('--drafts');
const posts = JSON.parse(fs.readFileSync(path.join(__dirname, 'posts.json'), 'utf8'))
  .filter(p => WITH_DRAFTS || !p.draft);

const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const escAttr = s => esc(s).replace(/"/g,'&quot;');
const enc = s => encodeURIComponent(String(s == null ? '' : s));
const wordCount = body => body.reduce((n,b)=> n + (b.h?b.h.split(/\s+/).length:0) + b.p.filter(p=>!/^<figure/.test(p)).reduce((m,p)=> m + p.replace(/<[^>]+>/g,' ').split(/\s+/).filter(Boolean).length, 0), 0);

// Health-related clusters show a visible "information, not medical advice" note under the byline.
const MED_CLUSTERS = new Set(['salud','mitos','azucar','aditivos','calorias']);
const IG_HANDLE = 'caloriascan';
const IG_TAGS = {
  es: {
    _:        ['CalorIAScan','AlimentacionConsciente','ContarCalorias','Nutricion','ComidaMexicana'],
    azucar:   ['CalorIAScan','AzucarOculta','LeerEtiquetas','ContarCalorias','AlimentacionConsciente'],
    mitos:    ['CalorIAScan','MitosDeComida','Nutricion','AlimentacionConsciente','CienciaDeLaComida'],
    recetas:  ['CalorIAScan','RecetasMexicanas','ComidaMexicana','Macros','ContarCalorias'],
    salud:    ['CalorIAScan','Nutricion','Macros','AlimentacionConsciente','ContarCalorias'],
    aditivos: ['CalorIAScan','Aditivos','LeerEtiquetas','Ingredientes','AlimentacionConsciente'],
    producto: ['CalorIAScan','AppDeNutricion','ContarCalorias','Macros','ComidaMexicana']
  },
  en: {
    _:        ['CalorIAScan','MindfulEating','CalorieTracking','Nutrition','MexicanFood'],
    azucar:   ['CalorIAScan','HiddenSugar','ReadTheLabel','CalorieTracking','MindfulEating'],
    mitos:    ['CalorIAScan','FoodMyths','Nutrition','MindfulEating','FoodScience'],
    recetas:  ['CalorIAScan','MexicanRecipes','MexicanFood','Macros','CalorieTracking'],
    salud:    ['CalorIAScan','Nutrition','Macros','MindfulEating','CalorieTracking'],
    aditivos: ['CalorIAScan','FoodAdditives','ReadTheLabel','Ingredients','MindfulEating'],
    producto: ['CalorIAScan','NutritionApp','CalorieTracking','Macros','MexicanFood']
  }
};
// Instagram has no web share URL and does not link captions, so we hand over a ready caption + image.
function igCaption(p, url, L){
  const c = p[L];
  const tags = ((p.ig_tags && p.ig_tags[L]) || IG_TAGS[L][p.cluster] || IG_TAGS[L]._).map(t=>'#'+t).join(' ');
  const cta = L==='en' ? 'Read the full article (link in bio):' : 'Lee el artículo completo (link en bio):';
  return `${c.title}\n\n${c.excerpt}\n\n${cta}\n${url.replace(/^https?:\/\//,'')}\n\n${tags}`;
}

function shareBar(p, url, L){
  const title = p[L].title;
  const t = L==='en' ? 'Share' : 'Compartir';
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`;
  const tw = `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`;
  const wa = `https://wa.me/?text=${enc(title+' '+url)}`;
  const copyLabel = L==='en' ? 'Copy link' : 'Copiar enlace';
  const T = L==='en' ? {
    h:'Post on Instagram', steps:'Copy the text, download the image, then open Instagram and paste it. Instagram does not allow clickable links in captions: add the article link as a link sticker on a Story, or keep it in your bio.',
    cap:'Caption', copy:'Copy text', copied:'Copied', dl:'Download image', share:'Share image', open:'Open Instagram'
  } : {
    h:'Publicar en Instagram', steps:'Copia el texto, descarga la imagen y abre Instagram para pegarlo. Instagram no permite enlaces en los pies de foto: pon el enlace del artículo como sticker de enlace en una Story, o déjalo en tu bio.',
    cap:'Texto del post', copy:'Copiar texto', copied:'Copiado', dl:'Descargar imagen', share:'Compartir imagen', open:'Abrir Instagram'
  };
  const img = `/blog/ig/${p.slug}-${L}.jpg`;
  return `<div class="share" aria-label="${escAttr(t)}">
<span class="share-label">${esc(t)}</span>
<a class="sb sb-x" href="${tw}" target="_blank" rel="noopener nofollow" aria-label="X (Twitter)">𝕏</a>
<a class="sb sb-fb" href="${fb}" target="_blank" rel="noopener nofollow" aria-label="Facebook">f</a>
<a class="sb sb-wa" href="${wa}" target="_blank" rel="noopener nofollow" aria-label="WhatsApp">✆</a>
<button class="sb sb-ig" type="button" aria-label="Instagram" aria-expanded="false" aria-controls="ig-panel" onclick="igToggle(this)"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="#fff" stroke="none"/></svg></button>
<button class="sb sb-cp" type="button" onclick="navigator.clipboard&amp;&amp;navigator.clipboard.writeText('${url}');this.textContent='✓';this.setAttribute('aria-label','${escAttr(L==='en'?'Copied':'Copiado')}')" aria-label="${escAttr(copyLabel)}">⧉</button>
</div>
<section class="ig-panel" id="ig-panel" hidden aria-label="${escAttr(T.h)}">
<h3>${esc(T.h)}</h3>
<p class="ig-steps">${esc(T.steps)}</p>
<label class="ig-lab" for="ig-cap">${esc(T.cap)}</label>
<textarea id="ig-cap" readonly rows="9">${esc(igCaption(p, url, L))}</textarea>
<div class="ig-btns">
<button type="button" class="ig-b ig-b1" id="ig-copy" data-done="${escAttr(T.copied)}" onclick="igCopy(this)">${esc(T.copy)}</button>
<a class="ig-b" href="${img}" download="${escAttr(p.slug+'-'+L+'.jpg')}">${esc(T.dl)}</a>
<button type="button" class="ig-b" id="ig-share" data-img="${img}" hidden onclick="igShare(this)">${esc(T.share)}</button>
<a class="ig-b" href="https://www.instagram.com/${IG_HANDLE}/" target="_blank" rel="noopener">${esc(T.open)}</a>
</div>
</section>
<script>
function igToggle(b){var p=document.getElementById('ig-panel'),o=p.hidden;p.hidden=!o;b.setAttribute('aria-expanded',o?'true':'false')}
function igCopy(b){var t=document.getElementById('ig-cap'),d=b.getAttribute('data-done'),l=b.textContent;function ok(){b.textContent=d;setTimeout(function(){b.textContent=l},1800)}t.focus();t.select();if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t.value).then(ok,function(){try{document.execCommand('copy');ok()}catch(e){}})}else{try{document.execCommand('copy');ok()}catch(e){}}}
function igShare(b){var t=document.getElementById('ig-cap').value;fetch(b.getAttribute('data-img')).then(function(r){return r.blob()}).then(function(bl){var f=new File([bl],'caloriascan.jpg',{type:'image/jpeg'});if(navigator.canShare&&navigator.canShare({files:[f]})){return navigator.share({files:[f],text:t})}}).catch(function(){})}
(function(){try{var f=new File([''],'a.jpg',{type:'image/jpeg'});if(navigator.canShare&&navigator.canShare({files:[f]}))document.getElementById('ig-share').hidden=false}catch(e){}})();
</script>`;
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
  const ogImg = `${DOMAIN}/blog/og/${p.slug}-${L}.jpg`;
  // "hero_img" (a file in blog/img/) gives the article page its own crop; hub cards and share images keep <slug>.jpg
  const heroFile = p.hero_img || `${p.slug}.jpg`;
  const hasHero = fs.existsSync(path.join(__dirname, 'img', heroFile));
  const heroUrl = `/blog/img/${heroFile}`;
  const altEN = `${DOMAIN}/en/blog/${p.slug}`;
  const altES = `${DOMAIN}/blog/${p.slug}`;
  const title = `${c.title} | CalorIA Scan`;
  const cat = isEN ? p.category_en : p.category_es;
  const readMin = Math.max(2, Math.round(wordCount(c.body)/200));
  const dateStr = new Date(p.date+'T12:00:00Z').toLocaleDateString(isEN?'en-US':'es-MX',{year:'numeric',month:'long',day:'numeric'});
  const reviewedStr = new Date((p.reviewed||p.date)+'T12:00:00Z').toLocaleDateString(isEN?'en-US':'es-MX',{year:'numeric',month:'long',day:'numeric'});
  const t = isEN ? {
    home:'Home', blog:'Blog', by:'By', min:'min read', tldr:'The short version',
    sources:'Sources', related:'Keep reading', ctaTitle:'Stop guessing your calories',
    ctaText:'CalorIA Scan reads your plate from a photo and gives you calories and macros tuned for real Mexican and Latino food — where generic apps get it wrong.',
    ctaBtn:'Get CalorIA Scan free', appTag:'With CalorIA Scan', jump:'Jump to', medB:'Informational, not medical advice.', medT:'Consult a doctor or registered dietitian before changing your diet, especially with a pre-existing condition.', medRev:'Sources reviewed on', medPub:'Sources checked at publication', medTerms:'See terms', termsHref:'/en/terms', switch:'Español',
    disc:'This article is informational and not medical advice. Consult a doctor or registered dietitian before changing your diet, especially with a pre-existing condition.',
    comments:'Comments', commentPlaceholder:'Write your comment...', namePlaceholder:'Your name',
    commentBtn:'Post'
  } : {
    home:'Inicio', blog:'Blog', by:'Por', min:'min de lectura', tldr:'En resumen',
    sources:'Fuentes', related:'Sigue leyendo', ctaTitle:'Deja de adivinar tus calorías',
    ctaText:'CalorIA Scan lee tu plato desde una foto y te da calorías y macros pensados para la comida mexicana y latina real — donde las apps genéricas se equivocan.',
    ctaBtn:'Descarga CalorIA Scan gratis', appTag:'Con CalorIA Scan', jump:'Ir a', medB:'Información, no consejo médico.', medT:'Consulta a un médico o nutriólogo antes de cambiar tu dieta, sobre todo si tienes alguna condición de salud.', medRev:'Fuentes revisadas el', medPub:'Fuentes consultadas al publicar', medTerms:'Ver términos', termsHref:'/terms', switch:'English',
    disc:'Este artículo es informativo y no constituye consejo médico. Consulta a un médico o nutriólogo antes de cambiar tu dieta, especialmente si tienes alguna condición de salud.',
    comments:'Comentarios', commentPlaceholder:'Escribe tu comentario...', namePlaceholder:'Tu nombre',
    commentBtn:'Publicar'
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
      "image": ogImg,
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

  const sectionHTML = b => `<h2>${esc(b.h)}</h2>${b.p.map(x=>/^<figure/.test(x)?x:`<p>${x}</p>`).join('')}`;
  // body items flagged "app": true render as a highlighted CalorIA Scan callout (id=que-hace-caloria-scan)
  const bodyHTML = c.body.map(b=> b.app
    ? `<section class="app-callout" id="que-hace-caloria-scan"><div class="app-tag"><img src="/assets/icon-app.png" alt="" width="30" height="30"><span>${esc(t.appTag)}</span></div>${sectionHTML(b)}</section>`
    : sectionHTML(b)).join('\n');
  const appSec = c.body.find(b=>b.app);
  const tldrHTML = `<div class="tldr"><h2>${esc(t.tldr)}</h2><ul>${c.tldr.map(x=>`<li>${x}</li>`).join('')}</ul>${appSec?`<a class="tldr-jump" href="#que-hace-caloria-scan">${esc(t.jump)}: ${esc(appSec.h)} ↓</a>`:''}</div>`;
  const hasSources = c.sources && c.sources.length > 0;
  const sourcesHTML = hasSources ? `<ol class="sources">${c.sources.map(s=>`<li><a href="${escAttr(s.url)}" target="_blank" rel="noopener nofollow">${esc(s.name)}</a></li>`).join('')}</ol>` : '';

  return `<!DOCTYPE html>
<html lang="${L}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">${p.draft?'\n<meta name="robots" content="noindex">':''}
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
<meta property="og:image" content="${ogImg}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="${isEN?'en_US':'es_MX'}">
<meta property="article:published_time" content="${p.date}">
<meta property="article:section" content="${escAttr(cat)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escAttr(c.title)}">
<meta name="twitter:description" content="${escAttr(c.excerpt)}">
<meta name="twitter:image" content="${ogImg}">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>
:root{--g:#2e7d32;--ink:#1c2430;--mut:#5b6675;--line:#e6e9ef;--bg:#FDFBF7;--soft:#f6f8fb}
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background-color:var(--bg);background-image:linear-gradient(rgba(0,71,171,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,71,171,.03) 1px,transparent 1px);background-size:40px 40px;line-height:1.7}
.wrap{max-width:720px;margin:0 auto;padding:20px 18px 64px}
a{color:var(--g)}
nav.bc{font-size:13px;color:var(--mut);margin:6px 0 18px}nav.bc a{color:var(--mut);text-decoration:none}
.lang{float:right;font-size:13px;text-decoration:none;border:1px solid var(--line);padding:3px 10px;border-radius:20px;color:var(--mut)}
.chip{display:inline-block;background:#eaf4ec;color:var(--g);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:4px 11px;border-radius:20px}
h1{font-size:33px;line-height:1.18;margin:.35em 0 .15em;letter-spacing:-.01em}
.dek{font-size:19px;color:var(--mut);margin:.4em 0 1em}
.hero{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:16px;display:block;margin:8px 0 22px;background:#eef1f5}
.meta{font-size:13px;color:var(--mut);margin:0 0 16px}
.med-note{display:flex;gap:12px;align-items:flex-start;background:#fff8e6;border:1px solid #f0dca6;border-radius:12px;padding:12px 16px;margin:0 0 18px;font-size:14px;line-height:1.5;color:#5b4a1a}
.med-i{flex:none;width:22px;height:22px;border-radius:50%;background:#e0a82e;color:#fff;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;margin-top:1px}
.med-note b{color:#3d3010}.med-note small{display:block;margin-top:4px;font-size:12.5px;color:#8a7433}.med-note a{color:#8a6a10;font-weight:700}
.share{display:flex;align-items:center;gap:8px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:12px 0;margin:0 0 26px}
.share-label{font-size:13px;color:var(--mut);margin-right:2px}
.sb{width:36px;height:36px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;font-size:16px;font-weight:700;color:#fff;border:none;cursor:pointer;line-height:1}
.sb-x{background:#000}.sb-fb{background:#1877f2}.sb-wa{background:#25d366}.sb-cp{background:#8895a7}
.sb-ig{background:radial-gradient(circle at 30% 107%,#fdf497 0%,#fdf497 5%,#fd5949 45%,#d6249f 60%,#285AEB 90%)}
.ig-panel{border:1px solid var(--line);border-radius:16px;background:#fff;padding:18px 18px 20px;margin:-10px 0 26px}
.ig-panel[hidden]{display:none}
.ig-panel h3{font-size:18px;margin:0 0 6px}
.ig-steps{font-size:14px;color:var(--mut);margin:0 0 12px;line-height:1.5}
.ig-lab{display:block;font-size:13px;font-weight:700;color:var(--mut);margin:0 0 6px}
.ig-panel textarea{width:100%;font:inherit;font-size:14px;line-height:1.5;color:var(--ink);border:1px solid var(--line);border-radius:12px;padding:12px;background:#fafbfc;resize:vertical}
.ig-btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.ig-b{display:inline-flex;align-items:center;justify-content:center;padding:10px 16px;border-radius:12px;border:1px solid var(--line);background:#fff;color:var(--ink);font-size:14px;font-weight:700;font-family:inherit;text-decoration:none;cursor:pointer;line-height:1.2}
.ig-b:hover{background:#f4f6f9}.ig-b[hidden]{display:none}
.ig-b1{background:#d6249f;border-color:#d6249f;color:#fff}.ig-b1:hover{background:#bf1f8e}
h2{font-size:23px;line-height:1.25;margin:34px 0 10px;letter-spacing:-.01em}
p{margin:0 0 16px;font-size:17px}
.tldr{background:var(--soft);border:1px solid var(--line);border-left:4px solid var(--g);border-radius:12px;padding:16px 20px;margin:26px 0}
.tldr h2{margin:0 0 8px;font-size:15px;text-transform:uppercase;letter-spacing:.05em;color:var(--g)}
.tldr ul{margin:0;padding-left:20px}.tldr li{margin:6px 0;font-size:16px}
.tldr-jump{display:inline-block;margin-top:10px;font-size:15px;font-weight:700;color:var(--g);text-decoration:none}.tldr-jump:hover{text-decoration:underline}
.app-callout{position:relative;margin:40px 0;padding:22px 24px 20px 30px;border-radius:20px;background:linear-gradient(160deg,#f3faf4 0%,#e8f4eb 100%);border:1.5px solid #bfe0c5;box-shadow:0 10px 30px rgba(46,125,50,.12);scroll-margin-top:20px}
.app-callout::before{content:"";position:absolute;left:0;top:0;bottom:0;width:7px;border-radius:20px 0 0 20px;background:linear-gradient(180deg,var(--g),#e8622e)}
.app-tag{display:flex;align-items:center;gap:10px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--g)}
.app-tag img{border-radius:8px;display:block}
.app-callout h2{margin:8px 0 12px}
.app-callout ul{list-style:none;padding:0;margin:0 0 14px}
.app-callout li{position:relative;padding:11px 0 11px 36px;border-top:1px solid #d3e8d6;font-size:16px;line-height:1.5}
.app-callout li:first-child{border-top:0}
.app-callout li::before{content:"✓";position:absolute;left:0;top:11px;width:23px;height:23px;border-radius:50%;background:var(--g);color:#fff;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;line-height:1}
.app-callout p:last-of-type{margin-bottom:6px}
@media(max-width:560px){.app-callout{padding:20px 18px 18px 24px}}
.cta{background:#f0f7f1;border:1px solid #cfe6d3;border-radius:16px;padding:24px;margin:34px 0;text-align:center}
.cta h2{margin:0 0 8px}.cta p{color:var(--ink)}.btn{display:inline-block;background:var(--g);color:#fff;text-decoration:none;padding:13px 24px;border-radius:10px;font-weight:700;margin-top:6px}
.sources{font-size:14px;color:var(--mut);padding-left:22px}.sources li{margin:7px 0}.sources a{word-break:break-word}
ul.rel{list-style:none;padding:0;margin:14px 0 0;display:grid;grid-template-columns:1fr 1fr;gap:12px}
ul.rel a{display:block;border:1px solid var(--line);border-radius:12px;padding:14px;text-decoration:none;color:var(--ink);transition:border-color .15s}
ul.rel a:hover{border-color:var(--g)}
.rc-emoji{font-size:24px;display:block}.rc-cat{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--g);margin:6px 0 3px}.rc-title{display:block;font-size:15px;font-weight:600;line-height:1.35}
.comments{margin:38px 0}
.comments-list{margin:0 0 18px}
.comment-item{padding:14px 0;border-bottom:1px solid var(--line)}
.comment-item:last-child{border-bottom:none}
.comment-meta{display:flex;gap:10px;align-items:baseline;font-size:13px;color:var(--mut);margin-bottom:4px}
.comment-meta strong{color:var(--ink);font-size:14px}
.comment-text{margin:0;white-space:pre-wrap;word-break:break-word;font-size:15px}
.comment-empty{font-size:14px;color:var(--mut)}
.comment-form{background:var(--soft);border:1px solid var(--line);border-radius:14px;padding:18px}
.comment-form textarea{width:100%;border:1px solid var(--line);border-radius:10px;padding:12px;font-family:inherit;font-size:15px;resize:vertical;background:#fff;color:var(--ink)}
.comment-row{display:flex;gap:10px;margin-top:10px;flex-wrap:wrap}
.comment-row input{flex:1;min-width:160px;border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-family:inherit;font-size:14px;background:#fff}
.comment-row button{background:var(--g);color:#fff;border:none;border-radius:10px;padding:10px 20px;font-weight:700;font-size:14px;cursor:pointer}
.comment-row button:disabled{opacity:.6;cursor:not-allowed}
.comment-error{font-size:13px;color:#c0392b;margin:10px 0 0;display:none}
.comment-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.disc{font-size:12px;color:var(--mut);border-top:1px solid var(--line);margin-top:38px;padding-top:14px}
footer{font-size:13px;color:var(--mut);margin-top:16px}footer a{color:var(--mut)}
.shots{margin:26px 0}.shots .phones{display:flex;flex-wrap:wrap;justify-content:center;gap:22px}.shots figcaption{font-size:13px;color:var(--mut);text-align:center;margin-top:12px}
.phone{position:relative;width:300px;height:590px;border:7px solid #1c2430;border-radius:38px;background:#FCF3E9;overflow:hidden;font-family:ui-rounded,"SF Pro Rounded","Nunito",-apple-system,"Segoe UI",system-ui,sans-serif;color:#2b1c12;line-height:1.25;box-shadow:0 14px 34px rgba(60,40,20,.18);text-align:left}
.phone *{box-sizing:border-box;margin:0}
.phone .ph-top{display:flex;align-items:center;gap:22px;padding:16px 16px 8px}.phone .ph-top b{font-size:19px;font-weight:800}
.phone .ph-card{background:#fff;border-radius:22px;padding:14px;margin:8px 10px 10px;box-shadow:0 4px 14px rgba(120,80,30,.07)}
.phone .ph-ring{display:flex;align-items:center;gap:12px}.phone .ph-ring .ph-mut{white-space:nowrap}.phone .ph-ring div>.ph-mut:last-child{font-size:11px}.phone .ph-ring svg{flex:none}
.phone .ph-mut{color:#8b7a6a;font-size:12px}.phone .ph-big{font-size:36px;font-weight:900;color:#2DBE60;line-height:1.05}
.phone .ph-bar{height:11px;border-radius:6px;background:#8FB0E4;margin:12px 0 9px}.phone .ph-leg{font-size:12px;color:#8b7a6a;display:flex;align-items:center;gap:6px}
.phone .dot{width:9px;height:9px;border-radius:50%;display:inline-block;flex:none}
.phone .ph-h{display:flex;align-items:center;gap:8px;font-weight:800;font-size:17px}
.phone .pro{background:#F5821F;color:#fff;font-size:9px;font-weight:800;border-radius:10px;padding:3px 8px;letter-spacing:.03em}
.phone .seg{display:inline-flex;background:#FFCB77;border-radius:14px;padding:3px;margin:10px 0 9px}.phone .seg span{font-size:12px;padding:6px 12px;border-radius:11px;color:#6b4a1c}.phone .seg .on{background:#FF8A1F;color:#fff;font-weight:700}
.phone .ph-stack{display:flex;gap:2px;height:11px;margin:9px 0 10px}.phone .ph-stack i{display:block;height:100%}.phone .ph-stack i:first-child{border-radius:6px 0 0 6px}.phone .ph-stack i:last-child{border-radius:0 6px 6px 0}
.phone .ph-note{background:#E6F6EA;border-radius:14px;padding:9px 12px;font-size:12.5px;color:#6f6558;margin-bottom:8px}
.phone .ph-row{display:flex;align-items:center;gap:10px;padding:7px 0}.phone .ph-row .n{flex:1;font-size:14px;color:#7a6a5a;font-weight:700}.phone .ph-row small{display:block;font-size:11.5px;font-weight:500;color:#8b7a6a}.phone .ph-row .r{text-align:right;font-weight:800;font-size:14px;color:#2b1c12}.phone .ph-row .r small{font-weight:500}
.phone .ph-ai{background:linear-gradient(135deg,#FFF1E0,#FFE2C8);border:1.5px solid #F8C79A;border-radius:22px;padding:13px 14px;margin:8px 10px 10px}
.phone .ph-ai .hd{display:flex;align-items:center;gap:9px;font-weight:800;font-size:14px}.phone .ph-ai .hd .pro{margin-left:auto}.phone .ph-ai p{display:flex;gap:9px;font-size:12.5px;line-height:1.45;color:#3a2a1e;margin:9px 0 0}
.phone .chips{display:flex;gap:7px;margin:10px 0 6px;overflow:hidden;white-space:nowrap}.phone .chips span{border:1.5px solid #E6DED3;border-radius:20px;padding:6px 11px;font-size:12px;color:#4a3a2c;display:inline-flex;align-items:center;gap:6px;flex:none}.phone .chips .on{background:#FF8A1F;border-color:#FF8A1F;color:#fff;font-weight:700}
.phone .ph-meal{display:flex;gap:10px;padding:7px 0}.phone .ph-ico{width:40px;height:40px;border-radius:12px;background:#FFCB77;flex:none;display:flex;align-items:center;justify-content:center;font-size:18px}
.phone .ph-meal b{display:block;font-size:14px;color:#7a6a5a;font-weight:700}.phone .ph-meal .m{font-size:11.5px;color:#8b7a6a}.phone .tag{display:inline-block;background:#E8EEFA;color:#6a7f9e;border-radius:10px;padding:3px 9px;font-size:11.5px;margin-top:5px}.phone .tag.p{background:#FBEBD0;color:#9a7a45}
.phone .ph-nav{position:absolute;left:10px;right:10px;bottom:12px;height:56px;background:#fff;border-radius:26px;box-shadow:0 -2px 18px rgba(120,80,30,.12);display:grid;grid-template-columns:1fr 1fr 62px 1fr 1fr;align-items:center;text-align:center}
.phone .ph-nav div{font-size:10px;color:#b9a99a;display:flex;flex-direction:column;align-items:center;gap:2px}.phone .ph-nav div svg{width:20px;height:20px;fill:currentColor}.phone .ph-nav .on{color:#F5821F;font-weight:700}
.phone .ph-fab{position:absolute;left:50%;bottom:36px;width:54px;height:54px;margin-left:-27px;border-radius:50%;background:linear-gradient(#FFB04A,#F57C1F);box-shadow:0 4px 0 #D96A12,0 8px 16px rgba(245,124,31,.35);display:flex;align-items:center;justify-content:center}.phone .ph-fab svg{width:26px;height:26px;fill:#fff}
@media(max-width:560px){.phone{width:100%;max-width:300px}}
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
${MED_CLUSTERS.has(p.cluster)?`<div class="med-note" role="note"><span class="med-i" aria-hidden="true">i</span><div><b>${esc(t.medB)}</b> ${esc(t.medT)}<small>${p.reviewed?`${esc(t.medRev)} ${esc(reviewedStr)}`:`${esc(t.medPub)} (${esc(dateStr)})`} · <a href="${t.termsHref}">${esc(t.medTerms)}</a></small></div></div>`:''}
${hasHero ? `<img class="hero" src="${heroUrl}" alt="${escAttr(c.title)}" width="1200" height="675" loading="eager">` : ''}
${tldrHTML}
${bodyHTML}

<div class="cta">
<h2>${esc(t.ctaTitle)}</h2>
<p>${esc(t.ctaText)}</p>
<a class="btn" href="${APP_URL}" rel="nofollow">${esc(t.ctaBtn)}</a>
</div>

${hasSources ? `<h2>${esc(t.sources)}</h2>\n${sourcesHTML}` : ''}

${shareBar(p, url, L)}

<div class="comments">
<h2>${esc(t.comments)}</h2>
<div class="comments-list" id="commentsList"></div>
<form class="comment-form" id="commentForm">
<textarea id="commentMessage" rows="4" maxlength="1000" placeholder="${escAttr(t.commentPlaceholder)}" required></textarea>
<div class="comment-row">
<input type="text" id="commentName" maxlength="60" placeholder="${escAttr(t.namePlaceholder)}" required>
<input type="text" id="commentWebsite" class="comment-hp" tabindex="-1" autocomplete="off" aria-hidden="true">
<button type="submit" id="commentSubmit">${esc(t.commentBtn)}</button>
</div>
<p class="comment-error" id="commentError"></p>
</form>
</div>

<h2>${esc(t.related)}</h2>
<ul class="rel">${related(p,all,L)}</ul>

<p class="disc">${esc(t.disc)}</p>
<footer>© ${new Date().getFullYear()} CalorIA Scan · <a href="${isEN?'/en/':'/'}">${t.home}</a> · <a href="/privacy-policy">${isEN?'Privacy':'Privacidad'}</a> · <a href="/terms">${isEN?'Terms':'Términos'}</a></footer>
</article>
<script src="/blog/comments.js" defer></script>
</body>
</html>`;
}

// ---- hubs ----
// blog/index.html and en/blog/index.html are hand-designed pages. Their shell (nav, styles, CTA,
// footer, search script) is read from the live files and kept untouched; only the JSON-LD list and
// the card sections between HUB_START and HUB_END are rebuilt from posts.json. To change the
// shell, edit the hub files themselves. To change a card, edit posts.json (es/en "card" overrides
// the dek shown on the hub).
const HUB_START = '<!-- blog cards: generated by blog/generate.js from posts.json, edit posts.json instead -->';
const HUB_END = '<!-- /blog cards -->';
const HUB = {
  es: { file: path.join(__dirname, 'index.html'), base: '/blog/', latest: 'Último artículo', read: 'Leer artículo →',
        noPosts: 'No hay artículos en esta categoría todavía.',
        ids: { featured: 'catalogo', app: 'sobre-la-app', health: 'salud', myths: 'mitos', recipes: 'recetas' },
        labels: { app: 'Sobre la App', health: 'Salud', myths: 'Mitos', recipes: 'Recetas' } },
  en: { file: path.join(__dirname, '..', 'en', 'blog', 'index.html'), base: '/en/blog/', latest: 'Latest article', read: 'Read article →',
        noPosts: 'No articles in this category yet.',
        ids: { featured: 'catalog', app: 'about-the-app', health: 'health', myths: 'myths', recipes: 'recipes' },
        labels: { app: 'About the App', health: 'Health', myths: 'Myths', recipes: 'Recipes' } }
};
// Hub section and badge color for each Spanish category (unknown categories fall back to Salud).
const HUB_SECTION = { Salud: 'health', Mitos: 'myths', Aditivos: 'myths', Edulcorantes: 'myths', Recetas: 'recipes', Producto: 'app', Historia: 'app' };
const BADGE_STYLE = {
  Salud: 'color:var(--red);background:rgba(184,55,42,.10)',
  Mitos: 'color:var(--orange);background:rgba(204,85,0,.10)',
  Aditivos: 'color:var(--green);background:rgba(45,140,107,.10)',
  Edulcorantes: 'color:var(--blue);background:rgba(0,71,171,.10)',
  Producto: 'color:var(--green);background:rgba(45,140,107,.10)',
  Historia: 'color:var(--blue);background:rgba(31,82,222,.10)',
  Recetas: 'color:var(--blue);background:rgba(31,82,222,.10)'
};
const APP_ICON = '<img src="/assets/icon-app.png" alt="CalorIA Scan">';
const GRID_FILL = 'grid-template-columns:repeat(auto-fill,minmax(300px,1fr))';

function hub(all, L){
  const isEN = L==='en', H = HUB[L];
  let html = fs.readFileSync(H.file, 'utf8');
  const short = d => new Date(d+'T12:00:00Z').toLocaleDateString(isEN?'en-US':'es-MX',{year:'numeric',month:'short',day:'numeric'});
  const hasImg = x => fs.existsSync(path.join(__dirname, 'img', `${x.slug}.jpg`));
  const blurb = x => x[L].card || x[L].dek;
  const badge = x => {
    const cat = isEN ? x.category_en : x.category_es;
    const label = x.category_es === 'Historia' ? cat : `${x.emoji} ${cat}`;
    return `<span class="badge" style="${BADGE_STYLE[x.category_es] || BADGE_STYLE.Salud}">${esc(label)}</span>`;
  };
  const card = x => {
    const thumb = hasImg(x)
      ? `<div class="thumb"><img src="/blog/img/${x.slug}.jpg" alt="${escAttr(x[L].title)}">${badge(x)}</div>`
      : `<div class="thumb logo"><span class="icon-wrap">${APP_ICON}</span>${badge(x)}</div>`;
    return `    <a class="glass card" href="${H.base}${x.slug}">
      ${thumb}
      <div class="body">
        <h3>${esc(x[L].title)}</h3>
        <p class="dk">${esc(blurb(x))}</p>
        <span class="dt">${short(x.date)}</span>
      </div>
    </a>`;
  };
  // Newest first (same-day posts keep their posts.json order). The newest post is the featured one.
  const byDate = all.map((x,i)=>({x,i})).sort((a,b)=> b.x.date.localeCompare(a.x.date) || a.i-b.i).map(o=>o.x);
  const [top, ...rest] = byDate;
  if (!top) throw new Error('hub: no published posts');
  const section = (key, wrap, gridStyle) => {
    const items = rest.filter(x => (HUB_SECTION[x.category_es] || 'health') === key);
    if (!items.length) return '';
    return `<section class="${wrap}" id="${H.ids[key]}" style="margin-top:16px">
  <div class="eyebrow">${esc(H.labels[key])}</div>
  <div class="grid"${gridStyle ? ` style="${gridStyle}"` : ''}>
${items.map(card).join('\n')}
  </div>
</section>`;
  };
  const featuredImg = hasImg(top)
    ? `<div class="featured-img"><img src="/blog/img/${top.slug}.jpg" alt="${escAttr(top[L].title)}"></div>`
    : `<div class="featured-img logo"><div class="logo-badge">${APP_ICON}</div></div>`;
  const grids = [section('app','featured-wrap',GRID_FILL), section('health','grid-wrap'), section('myths','grid-wrap')].filter(Boolean).join('\n\n');
  const cards = `${HUB_START}
<section class="featured-wrap" id="${H.ids.featured}">
  <div class="eyebrow">${esc(H.latest)}</div>
  <a class="featured" href="${H.base}${top.slug}">
    ${featuredImg}
    <div class="featured-body">
      <div class="badge-row">
        ${badge(top)}
        <span class="badge-date">${short(top.date)}</span>
      </div>
      <h2>${esc(top[L].title)}</h2>
      <p class="dek">${esc(blurb(top))}</p>
      <span class="read-more">${esc(H.read)}</span>
    </div>
  </a>
</section>
</div>

${grids}

<p class="no-posts" id="no-posts" style="max-width:1100px;margin:0 auto;padding:0 20px">${esc(H.noPosts)}</p>

${section('recipes','grid-wrap',GRID_FILL)}
${HUB_END}`;

  // Card region: between the markers, or (first run on a hand-made hub) from the featured section
  // up to the last section before the CTA.
  let start = html.indexOf(HUB_START), end;
  if (start >= 0) {
    end = html.indexOf(HUB_END, start);
    if (end < 0) throw new Error(`hub ${L}: ${HUB_START} without ${HUB_END} in ${H.file}`);
    end += HUB_END.length;
  } else {
    start = html.indexOf(`<section class="featured-wrap" id="${H.ids.featured}">`);
    const cta = html.indexOf('<section class="cta-wrap">');
    end = cta < 0 ? -1 : html.lastIndexOf('</section>', cta) + '</section>'.length;
  }
  if (start < 0 || end <= start) throw new Error(`hub ${L}: card region not found in ${H.file}`);
  html = html.slice(0, start) + cards + html.slice(end);

  const ldRe = /<script type="application\/ld\+json">[\s\S]*?<\/script>/;
  if (!ldRe.test(html)) throw new Error(`hub ${L}: JSON-LD block not found in ${H.file}`);
  const ld = {"@context":"https://schema.org","@type":"Blog","name":"CalorIA Scan Blog","url":`${DOMAIN}${H.base}`,"inLanguage":L,
    "blogPost": byDate.map(x=>({"@type":"BlogPosting","headline":x[L].title,"url":`${DOMAIN}${H.base}${x.slug}`,"datePublished":x.date}))};
  return html.replace(ldRe, () => `<script type="application/ld+json">${JSON.stringify(ld)}</script>`);
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
// the hubs change whenever a post goes live, so their lastmod is the newest post's date
const today = posts.reduce((m,p)=> p.date > m ? p.date : m, '');
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
