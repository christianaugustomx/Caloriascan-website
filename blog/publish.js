#!/usr/bin/env node
/* CalorIA Scan — publish a blog draft.
   Run:  node blog/publish.js <slug> [YYYY-MM-DD]        (date defaults to today, local time)
   Marks the post live in posts.json (drops "draft", sets the date), regenerates the blog into a
   temp dir, copies only that post's pages + both hubs + sitemap-blog.xml into the site, and stages
   them with git together with the post's hero/OG/story images. posts.json is served publicly, so
   the staged copy leaves out any other drafts; your working copy keeps them.
   It does not commit or push: check `git diff --cached --stat`, then commit and push. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const BLOG = __dirname;
const ROOT = path.join(BLOG, '..');
const [slug, dateArg] = process.argv.slice(2);
if (!slug) { console.error('Usage: node blog/publish.js <slug> [YYYY-MM-DD]'); process.exit(1); }
const date = dateArg || new Date().toLocaleDateString('en-CA');
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { console.error(`Bad date: ${date} (use YYYY-MM-DD)`); process.exit(1); }

const file = path.join(BLOG, 'posts.json');
const original = fs.readFileSync(file, 'utf8');
const posts = JSON.parse(original);
const post = posts.find(p => p.slug === slug);
if (!post) { console.error(`No post with slug "${slug}" in blog/posts.json`); process.exit(1); }
delete post.draft;
post.date = date;
const json = list => JSON.stringify(list, null, 2) + '\n';
fs.writeFileSync(file, json(posts));

// Regenerate into a temp dir (drafts are left out) and copy only what this publish changes.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-publish-'));
execFileSync(process.execPath, [path.join(BLOG, 'generate.js'), tmp], { stdio: 'inherit' });

// Refuse to publish if the post links to a page that isn't live (for example another draft).
const missing = [];
for (const f of [`blog/${slug}.html`, `en/blog/${slug}.html`]) {
  const html = fs.readFileSync(path.join(tmp, f), 'utf8');
  for (const [, href] of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    if (/^\/(assets|blog\/(img|og|ig))\//.test(href)) continue;
    const rel = href.replace(/^\/|\/$/g, '');
    const found = (rel ? [rel, `${rel}.html`, `${rel}/index.html`] : ['index.html'])
      .some(c => [tmp, ROOT].some(base => fs.existsSync(path.join(base, c)) && fs.statSync(path.join(base, c)).isFile()));
    if (!found) missing.push(`${f}: ${href}`);
  }
}
if (missing.length) {
  fs.writeFileSync(file, original);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.error(`Not published: ${slug} links to pages that aren't live yet:\n  ${[...new Set(missing)].join('\n  ')}\nPublish those first, or remove the links.`);
  process.exit(1);
}

const pages = [`blog/${slug}.html`, `en/blog/${slug}.html`, 'blog/index.html', 'en/blog/index.html', 'sitemap-blog.xml'];
for (const f of pages) fs.copyFileSync(path.join(tmp, f), path.join(ROOT, f));
fs.rmSync(tmp, { recursive: true, force: true });

const images = [`blog/img/${slug}.jpg`, ...['og', 'ig'].flatMap(d => ['es', 'en'].map(L => `blog/${d}/${slug}-${L}.jpg`))]
  .filter(f => fs.existsSync(path.join(ROOT, f)));
const git = (args, input) => execFileSync('git', args, { cwd: ROOT, input, encoding: 'utf8' }).trim();
git(['add', '--', ...pages, ...images]);
const blob = git(['hash-object', '-w', '--stdin'], json(posts.filter(p => !p.draft)));
git(['update-index', '--cacheinfo', `100644,${blob},blog/posts.json`]);

const left = posts.filter(p => p.draft).map(p => p.slug);
console.log(`\nPublished ${slug} (${date}). Staged:\n  blog/posts.json (without drafts)\n  ${[...pages, ...images].join('\n  ')}`);
if (left.length) console.log(`Still drafts in your working copy (not staged): ${left.join(', ')}`);
console.log('Next: git diff --cached --stat, then commit and push.');
