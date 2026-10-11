#!/usr/bin/env node
/**
 * Tell IndexNow search engines (Bing, Yandex, Seznam, Naver…) which of our PUBLIC URLs changed,
 * so new and updated pages are crawled in hours instead of weeks. Bing's index feeds ChatGPT's
 * web search, so this is part of showing up in AI answers.
 *
 * Usage:  node scripts/indexnow.mjs            # submits every URL in the live sitemap
 *         node scripts/indexnow.mjs --dry-run  # prints what it would send
 *         node scripts/indexnow.mjs /compare /compare/astrotalk-alternative   # just these paths
 *
 * It sends only public sitemap URLs plus the key that is already published at /<key>.txt.
 */
const HOST = 'www.vedichour.com';
const KEY = 'e5c9bf297eca826d209df4df2e9d18fd';
const SITE = `https://${HOST}`;
const dry = process.argv.includes('--dry-run');
const paths = process.argv.slice(2).filter((a) => a.startsWith('/'));

async function sitemapUrls() {
  const res = await fetch(`${SITE}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

const urlList = paths.length ? paths.map((p) => `${SITE}${p}`) : await sitemapUrls();
const body = { host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urlList.slice(0, 10000) };
console.log(`IndexNow: ${body.urlList.length} URLs for ${HOST}${dry ? ' (dry run, nothing sent)' : ''}`);
if (dry) process.exit(0);

// The key file must be live first; otherwise the engines reject the submission.
const keyCheck = await fetch(body.keyLocation);
if (!keyCheck.ok || (await keyCheck.text()).trim() !== KEY) throw new Error('key file is not live yet at ' + body.keyLocation);

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});
console.log('IndexNow response:', res.status, res.status === 200 || res.status === 202 ? 'accepted' : await res.text());
