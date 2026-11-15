import { gallery } from '../public/gallery-data.js';
import { videos } from '../faze.mjs';

const results = [];
let cursor = 0;
const assets = [...gallery, ...process.argv.includes('--videos') ? videos.map(video => ({ id: `video:${video.id}`, title: video.title, url: video.image })) : []];
async function worker() {
  while (cursor < assets.length) {
    const item = assets[cursor++];
    try {
      const response = await fetch(item.url, {
        method: 'GET',
        headers: { Range: 'bytes=0-0', 'User-Agent': 'Mozilla/5.0 FaZe-gallery-audit' },
        signal: AbortSignal.timeout(12000),
        redirect: 'follow'
      });
      const contentType = response.headers.get('content-type') || '';
      await response.body?.cancel();
      const result = { id: item.id, title: item.title, status: response.status,
        contentType, ok: response.ok && contentType.startsWith('image/'), url: item.url };
      if (!result.ok && process.argv.includes('--alternates')) result.candidate = await candidate(item.source);
      results.push(result);
    } catch (error) {
      results.push({ id: item.id, title: item.title, status: 'NETWORK_ERROR',
        ok: false, reason: error.message, url: item.url,
        ...process.argv.includes('--alternates') ? { candidate: await candidate(item.source) } : {} });
    }
  }
}
async function candidate(source) {
  try {
    const response = await fetch(source, { signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) return `SOURCE ${response.status}`;
    const html = await response.text();
    const match = html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i);
    return match?.[1].replace(/&amp;/g, '&') || 'NO OG IMAGE';
  } catch (error) { return `SOURCE ERROR ${error.message}`; }
}
await Promise.all(Array.from({ length: 4 }, worker));
results.sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
console.log(JSON.stringify(results, null, 2));
if (results.some(result => !result.ok)) process.exitCode = 1;
