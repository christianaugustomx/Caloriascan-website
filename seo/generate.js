#!/usr/bin/env node
/* CalorIA Scan — bilingual SEO page generator
   Reads pages.json (snapshot of dishes) and emits static HTML + sitemap + robots.
   Refresh data with fetch-dishes.js (needs Supabase key). No runtime deps. */
const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://caloriascan.com';
const APP_URL = 'https://apps.apple.com/app/id6761160287';
const OUT = process.argv[2] || './build';
const pages = JSON.parse(fs.readFileSync(path.join(__dirname, 'pages.json'), 'utf8'));

const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const escAttr = s => esc(s).replace(/"/g,'&quot;');
const titleCase = s => String(s).replace(/\w\S*/g, w => /^(in|a|an|the|of|and|al|de|con|la|el)$/i.test(w) ? w.toLowerCase() : w[0].toUpperCase()+w.slice(1)).replace(/^./,c=>c.toUpperCase());
const per100 = (v,g) => g ? Math.round(v*100/g) : v;

const cuisineEN = { 'Estados Unidos':'American','Italia':'Italian','Guatemala':'Guatemalan','Honduras':'Central American','México':'Mexican','Yucatán':'Mexican (Yucatán)' };
const cuisineES = { 'Estados Unidos':'estadounidense','Italia':'italiano','Guatemala':'guatemalteco','Honduras':'centroamericano','México':'mexicano','Yucatán':'mexicano (yucateco)' };

function nutritionRows(p, L){
  const labels = L==='en'
    ? {cal:'Calories',prot:'Protein',carb:'Carbs',fat:'Fat',fib:'Fiber',sod:'Sodium'}
    : {cal:'Calorías',prot:'Proteína',carb:'Carbohidratos',fat:'Grasa',fib:'Fibra',sod:'Sodio'};
  const unit = v => v;
  const r = [
    [labels.cal, p.cal, per100(p.cal,p.g), 'kcal'],
    [labels.prot, p.prot, per100(p.prot,p.g), 'g'],
    [labels.carb, p.carb, per100(p.carb,p.g), 'g'],
    [labels.fat, p.fat, per100(p.fat,p.g), 'g'],
  ];
  if (p.fib>0) r.push([labels.fib, p.fib, per100(p.fib,p.g), 'g']);
  if (p.sod>0) r.push([labels.sod, p.sod, per100(p.sod,p.g), 'mg']);
  return r.map(([n,a,b,u])=>`<tr><th scope="row">${esc(n)}</th><td>${a}${u==='kcal'?'':' '+u}${u==='kcal'?' kcal':''}</td><td>${b}${u==='kcal'?' kcal':' '+u}</td></tr>`).join('');
}

function macroBars(p, L){
  const kc = p.prot*4 + p.carb*4 + p.fat*9 || 1;
  const seg = [['#2e7d32', Math.round(p.prot*4/kc*100), L==='en'?'Protein':'Proteína'],
               ['#f39c12', Math.round(p.carb*4/kc*100), L==='en'?'Carbs':'Carbos'],
               ['#e74c3c', Math.round(p.fat*9/kc*100), L==='en'?'Fat':'Grasa']];
  const bar = seg.map(([c,w])=>`<span style="background:${c};width:${w}%"></span>`).join('');
  const leg = seg.map(([c,w,n])=>`<li><i style="background:${c}"></i>${esc(n)} ${w}%</li>`).join('');
  return `<div class="macrobar">${bar}</div><ul class="legend">${leg}</ul>`;
}

function related(p, all, L){
  const sib = all.filter(x=>x.slug!==p.slug && x.cluster===p.cluster).slice(0,6);
  const pool = sib.length>=4 ? sib : all.filter(x=>x.slug!==p.slug).slice(0,6);
  return pool.map(x=>{
    const url = L==='en' ? `/en/calories/${x.slug}` : `/calorias/${x.slug}`;
    const label = L==='en' ? `${esc(x.emoji)} ${esc(titleCase(x.en_title))}` : `${esc(x.emoji)} ${esc(x.name)}`;
    return `<li><a href="${url}">${label}</a></li>`;
  }).join('');
}

function faq(p, L){
  const dn = L==='en' ? titleCase(p.en_title) : p.name;
  const hiP = p.prot>=20, keto = p.carb<=10;
  if (L==='en') return [
    [`How many calories are in ${dn}?`, `A serving of ${dn} (${p.serving_size}) has approximately ${p.cal} calories, with ${p.prot}g of protein, ${p.carb}g of carbs and ${p.fat}g of fat.`],
    [`Is ${dn} high in protein?`, hiP ? `Yes — at ${p.prot}g of protein per serving, ${dn} is a solid protein source.` : `${dn} provides ${p.prot}g of protein per serving, a moderate amount. Pair it with a protein side to balance the meal.`],
    [`Is ${dn} keto-friendly?`, keto ? `With only ${p.carb}g of carbs per serving, ${dn} can fit a low-carb or keto diet.` : `${dn} has ${p.carb}g of carbs per serving, so it's better suited to a balanced rather than strict keto diet.`],
    [`How do I track ${dn} accurately?`, `Portions vary by cook and restaurant. Scan your plate with CalorIA Scan to get calories and macros adjusted to your exact serving — built for Mexican & Latino food.`],
  ];
  return [
    [`¿Cuántas calorías tiene ${dn}?`, `Una porción de ${dn} (${p.serving_size}) tiene aproximadamente ${p.cal} calorías, con ${p.prot}g de proteína, ${p.carb}g de carbohidratos y ${p.fat}g de grasa.`],
    [`¿${dn} es alto en proteína?`, hiP ? `Sí — con ${p.prot}g de proteína por porción, ${dn} es una buena fuente de proteína.` : `${dn} aporta ${p.prot}g de proteína por porción, una cantidad moderada. Acompáñalo con una guarnición proteica.`],
    [`¿${dn} es apto para keto?`, keto ? `Con solo ${p.carb}g de carbohidratos por porción, ${dn} puede entrar en una dieta baja en carbos o keto.` : `${dn} tiene ${p.carb}g de carbohidratos por porción, así que encaja mejor en una dieta balanceada que en keto estricta.`],
    [`¿Cómo cuento las calorías de ${dn} con precisión?`, `Las porciones varían. Escanea tu plato con CalorIA Scan para obtener calorías y macros ajustados a tu porción exacta — hecho para la comida mexicana y latina.`],
  ];
}

function page(p, all, L){
  const isEN = L==='en';
  const dish = isEN ? titleCase(p.en_title) : p.name;
  const url = `${DOMAIN}${isEN?'/en/calories/':'/calorias/'}${p.slug}`;
  const altEN = `${DOMAIN}/en/calories/${p.slug}`;
  const altES = `${DOMAIN}/calorias/${p.slug}`;
  const title = isEN ? `${dish} Calories: Nutrition Facts & Macros | CalorIA Scan`
                     : `Calorías de ${dish}: Información Nutricional y Macros | CalorIA Scan`;
  const desc = isEN
    ? `${dish} has about ${p.cal} calories per serving (${p.serving_size}): ${p.prot}g protein, ${p.carb}g carbs, ${p.fat}g fat. Full macros and how to track it accurately.`
    : `${dish} tiene unas ${p.cal} calorías por porción (${p.serving_size}): ${p.prot}g proteína, ${p.carb}g carbos, ${p.fat}g grasa. Macros completos y cómo contarlas.`;
  const cuisine = isEN ? (cuisineEN[p.region]||'Latino') : (cuisineES[p.region]||'latino');
  const lead = isEN
    ? `A serving of <strong>${dish}</strong> (${p.serving_size}) has approximately <strong>${p.cal} calories</strong>, with ${p.prot}g of protein, ${p.carb}g of carbohydrates and ${p.fat}g of fat.`
    : `Una porción de <strong>${dish}</strong> (${p.serving_size}) tiene aproximadamente <strong>${p.cal} calorías</strong>, con ${p.prot}g de proteína, ${p.carb}g de carbohidratos y ${p.fat}g de grasa.`;
  const about = isEN
    ? `${dish} is a popular ${cuisine} dish. Calorie counts vary with portion size, ingredients and preparation, so the figures below are a reliable estimate for a standard serving.`
    : `${esc(p.description||dish+' es un platillo '+cuisine+' popular.')} Las calorías varían según la porción, los ingredientes y la preparación, así que los valores de abajo son un estimado confiable para una porción estándar.`;
  const faqs = faq(p, L);
  const breadcrumb = isEN ? ['Home','/en/','Calories','/en/calories/',dish] : ['Inicio','/','Calorías','/calorias/',dish];

  const ld = [
    {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
      {"@type":"ListItem","position":1,"name":breadcrumb[0],"item":DOMAIN+breadcrumb[1]},
      {"@type":"ListItem","position":2,"name":breadcrumb[2],"item":DOMAIN+breadcrumb[3]},
      {"@type":"ListItem","position":3,"name":dish,"item":url}
    ]},
    {"@context":"https://schema.org","@type":"NutritionInformation",
      "name": isEN ? `${dish} nutrition facts` : `Información nutricional de ${dish}`,
      "description": desc,
      "servingSize": p.serving_size,
      "calories": `${p.cal} kcal`,
      "proteinContent": `${p.prot} g`,
      "carbohydrateContent": `${p.carb} g`,
      "fatContent": `${p.fat} g`,
      ...(p.fib>0 ? {"fiberContent": `${p.fib} g`} : {}),
      ...(p.sod>0 ? {"sodiumContent": `${p.sod} mg`} : {})
    },
    {"@context":"https://schema.org","@type":"FAQPage","mainEntity":faqs.map(([q,a])=>({"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}}))}
  ];
  const t = isEN ? {
    onserv:'Per serving',per100:'Per 100 g',nutrition:`${dish} Nutrition Facts`,macros:'Macro split',
    about:`About ${dish}`,faqTitle:'Frequently asked questions',related:'Related foods',
    ctaTitle:`Track ${dish} the smart way`,ctaText:`CalorIA Scan reads your plate from a photo and gives calories & macros tuned for Mexican and Latino food — where generic apps get it wrong.`,
    ctaBtn:'Get CalorIA Scan free',switch:'Español',disc:'This is informational only and not medical advice. Values are estimates for standard portions and vary by preparation.'
  } : {
    onserv:'Por porción',per100:'Por 100 g',nutrition:`Información nutricional de ${dish}`,macros:'Distribución de macros',
    about:`Sobre ${dish}`,faqTitle:'Preguntas frecuentes',related:'Alimentos relacionados',
    ctaTitle:`Cuenta ${dish} de forma inteligente`,ctaText:`CalorIA Scan lee tu plato desde una foto y te da calorías y macros pensados para la comida mexicana y latina — donde las apps genéricas se equivocan.`,
    ctaBtn:'Descarga CalorIA Scan gratis',switch:'English',disc:'Información orientativa, no consejo médico. Los valores son estimados para porciones estándar y varían según la preparación.'
  };

  return `<!DOCTYPE html>
<html lang="${L}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escAttr(title)}</title>
<meta name="description" content="${escAttr(desc)}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="en" href="${altEN}">
<link rel="alternate" hreflang="es" href="${altES}">
<link rel="alternate" hreflang="x-default" href="${altEN}">
<meta property="og:type" content="article">
<meta property="og:title" content="${escAttr(title)}">
<meta property="og:description" content="${escAttr(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="CalorIA Scan">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>
:root{--g:#2e7d32;--ink:#1c2430;--mut:#5b6675;--line:#e6e9ef;--bg:#fff}
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:var(--bg);line-height:1.6}
.wrap{max-width:760px;margin:0 auto;padding:20px 18px 60px}
a{color:var(--g)}nav.bc{font-size:13px;color:var(--mut);margin:6px 0 14px}nav.bc a{color:var(--mut);text-decoration:none}
.lang{float:right;font-size:13px;text-decoration:none;border:1px solid var(--line);padding:3px 10px;border-radius:20px}
h1{font-size:30px;line-height:1.2;margin:.2em 0}.emoji{font-size:34px}
.lead{font-size:18px}
table{width:100%;border-collapse:collapse;margin:14px 0;font-size:15px}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line)}thead th{background:#f6f8fb;font-size:13px;text-transform:uppercase;letter-spacing:.03em;color:var(--mut)}
td{text-align:right}th[scope=row]{font-weight:600}
h2{font-size:21px;margin:30px 0 8px}
.macrobar{display:flex;height:16px;border-radius:8px;overflow:hidden;margin:10px 0 8px}.macrobar span{display:block}
.legend{list-style:none;display:flex;gap:16px;padding:0;margin:0;font-size:14px;color:var(--mut)}.legend i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:5px;vertical-align:middle}
.faq dt{font-weight:600;margin-top:14px}.faq dd{margin:4px 0 0;color:var(--mut)}
.cta{background:#f0f7f1;border:1px solid #cfe6d3;border-radius:14px;padding:20px;margin:30px 0;text-align:center}
.cta h2{margin-top:0}.btn{display:inline-block;background:var(--g);color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;margin-top:8px}
ul.rel{list-style:none;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:8px}ul.rel a{display:block;border:1px solid var(--line);border-radius:10px;padding:10px 12px;text-decoration:none;color:var(--ink);font-size:15px}
.disc{font-size:12px;color:var(--mut);border-top:1px solid var(--line);margin-top:36px;padding-top:14px}
footer{font-size:13px;color:var(--mut);margin-top:18px}footer a{color:var(--mut)}
@media(max-width:520px){ul.rel{grid-template-columns:1fr}h1{font-size:25px}}
</style>
</head>
<body>
<div class="wrap">
<a class="lang" href="${isEN?altES:altEN}" hreflang="${isEN?'es':'en'}">${t.switch}</a>
<nav class="bc"><a href="${breadcrumb[1]}">${breadcrumb[0]}</a> › <a href="${breadcrumb[3]}">${breadcrumb[2]}</a> › ${esc(dish)}</nav>
<div class="emoji">${esc(p.emoji)}</div>
<h1>${isEN?'Calories in '+esc(dish):'Calorías de '+esc(dish)}</h1>
<p class="lead">${lead}</p>

<h2>${esc(t.nutrition)}</h2>
<table>
<thead><tr><th></th><th>${esc(t.onserv)}</th><th>${esc(t.per100)}</th></tr></thead>
<tbody>${nutritionRows(p,L)}</tbody>
</table>
<p style="font-size:13px;color:var(--mut)">${isEN?'Serving':'Porción'}: ${esc(p.serving_size)}${p.region?` · ${isEN?'Style':'Estilo'}: ${esc(p.region)}`:''}</p>

<h2>${esc(t.macros)}</h2>
${macroBars(p,L)}

<h2>${esc(t.about)}</h2>
<p>${about}</p>

<div class="cta">
<h2>${esc(t.ctaTitle)}</h2>
<p>${esc(t.ctaText)}</p>
<a class="btn" href="${APP_URL}" rel="nofollow">${esc(t.ctaBtn)}</a>
</div>

<h2>${esc(t.faqTitle)}</h2>
<dl class="faq">${faqs.map(([q,a])=>`<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join('')}</dl>

<h2>${esc(t.related)}</h2>
<ul class="rel">${related(p,all,L)}</ul>

<p class="disc">${esc(t.disc)}</p>
<footer>© ${new Date().getFullYear()} CalorIA Scan · <a href="${isEN?'/en/':'/'}">${isEN?'Home':'Inicio'}</a> · <a href="/privacy-policy">${isEN?'Privacy':'Privacidad'}</a> · <a href="/terms">${isEN?'Terms':'Términos'}</a></footer>
</div>
</body>
</html>`;
}

function hub(all, L){
  const isEN = L==='en';
  const url = `${DOMAIN}${isEN?'/en/calories/':'/calorias/'}`;
  const title = isEN ? 'Calories in Mexican & Latino Food — Full List | CalorIA Scan' : 'Calorías de Comida Mexicana y Latina — Lista Completa | CalorIA Scan';
  const desc = isEN ? 'Calories and macros for 60+ Mexican, Latino and everyday foods — tacos, burritos, burgers, pizza and more. Built for accurate Latino-food tracking.' : 'Calorías y macros de 60+ platillos mexicanos, latinos y del día a día — tacos, burritos, hamburguesas, pizza y más.';
  const items = all.slice().sort((a,b)=> (isEN?titleCase(a.en_title):a.name).localeCompare(isEN?titleCase(b.en_title):b.name))
    .map(x=>`<li><a href="${isEN?'/en/calories/':'/calorias/'}${x.slug}">${esc(x.emoji)} ${esc(isEN?titleCase(x.en_title):x.name)} <span>${x.cal} kcal</span></a></li>`).join('');
  return `<!DOCTYPE html>
<html lang="${L}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escAttr(title)}</title>
<meta name="description" content="${escAttr(desc)}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="en" href="${DOMAIN}/en/calories/">
<link rel="alternate" hreflang="es" href="${DOMAIN}/calorias/">
<link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/calories/">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:#1c2430;line-height:1.6}.wrap{max-width:820px;margin:0 auto;padding:24px 18px 60px}h1{font-size:30px}ul{list-style:none;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:8px}a.lang{float:right;font-size:13px;border:1px solid #e6e9ef;padding:3px 10px;border-radius:20px;text-decoration:none;color:#5b6675}li a{display:flex;justify-content:space-between;border:1px solid #e6e9ef;border-radius:10px;padding:10px 12px;text-decoration:none;color:#1c2430}li span{color:#5b6675;font-size:13px}@media(max-width:520px){ul{grid-template-columns:1fr}}</style>
</head>
<body><div class="wrap">
<a class="lang" href="${isEN?'/calorias/':'/en/calories/'}">${isEN?'Español':'English'}</a>
<h1>${isEN?'Calories in Mexican & Latino food':'Calorías de comida mexicana y latina'}</h1>
<p>${isEN?'Calories and macros for 60+ dishes — tap any to see the full breakdown.':'Calorías y macros de 60+ platillos — toca cualquiera para ver el detalle.'}</p>
<ul>${items}</ul>
</div></body></html>`;
}

// ---- write files ----
// SAFETY: refuse to rm the repo root. rmSync('.',{recursive:true}) wipes everything,
// including .git. Only wipe OUT if it's a dedicated build dir.
const absOut = path.resolve(OUT);
const absHere = path.resolve(__dirname, '..');
if (absOut === absHere || absOut === '/' || OUT === '.' || OUT === './') {
  console.error('Refusing to rm output dir', JSON.stringify(OUT), '— pass a dedicated build dir like ./build');
  process.exit(1);
}
fs.rmSync(OUT,{recursive:true,force:true});
const dEN = path.join(OUT,'en','calories'); const dES = path.join(OUT,'calorias');
fs.mkdirSync(dEN,{recursive:true}); fs.mkdirSync(dES,{recursive:true});
let urls=[];
for(const p of pages){
  fs.writeFileSync(path.join(dEN,p.slug+'.html'), page(p,pages,'en'));
  fs.writeFileSync(path.join(dES,p.slug+'.html'), page(p,pages,'es'));
  urls.push(p.slug);
}
fs.writeFileSync(path.join(dEN,'index.html'), hub(pages,'en'));
fs.writeFileSync(path.join(dES,'index.html'), hub(pages,'es'));

// sitemap with hreflang alternates
const today = new Date().toISOString().slice(0,10);
const entry = (loc,en,es) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <xhtml:link rel="alternate" hreflang="en" href="${en}"/>\n    <xhtml:link rel="alternate" hreflang="es" href="${es}"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="${en}"/>\n  </url>`;
let sm = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;
sm += entry(`${DOMAIN}/en/`, `${DOMAIN}/en/`, `${DOMAIN}/`) + '\n';
sm += entry(`${DOMAIN}/en/calories/`, `${DOMAIN}/en/calories/`, `${DOMAIN}/calorias/`) + '\n';
sm += entry(`${DOMAIN}/calorias/`, `${DOMAIN}/en/calories/`, `${DOMAIN}/calorias/`) + '\n';
for(const s of urls){
  const en=`${DOMAIN}/en/calories/${s}`, es=`${DOMAIN}/calorias/${s}`;
  sm += entry(en,en,es)+'\n'; sm += entry(es,en,es)+'\n';
}
sm += `</urlset>\n`;
fs.writeFileSync(path.join(OUT,'sitemap.xml'), sm);
fs.writeFileSync(path.join(OUT,'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${DOMAIN}/sitemap.xml\n`);

console.log('Generated', pages.length, 'concepts ->', pages.length*2, 'pages + 2 hubs + sitemap + robots into', OUT);
