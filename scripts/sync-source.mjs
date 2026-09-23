import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const sourceRoot = 'https://vibex.runninghub.cn/p/app-512109a8895f48c0b1ac4afc6ed12385';
const apiUrl = `${sourceRoot}/__pb/api/category_items?perPage=500`;
const bundleUrl = `${sourceRoot}/assets/index-D9xoyNS5.js`;
const cssUrl = `${sourceRoot}/assets/index-CnGMAmiC.css`;
const heroVideoUrl = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_063509_7d167302-4fd4-480b-8260-18ab572333d4.mp4';
const celestiaUrl = 'https://motionsites.ai/assets/hero-celestia-preview-0yO3jXO8.gif';
const orbitUrl = 'https://motionsites.ai/assets/hero-orbit-web3-preview-BXt4OttD.gif';

const publicAssets = resolve('public/assets');
const mediaDir = resolve('public/assets/media');
const dataDir = resolve('data');

await Promise.all([
  mkdir(publicAssets, { recursive: true }),
  mkdir(mediaDir, { recursive: true }),
  mkdir(dataDir, { recursive: true })
]);

async function fetchRetry(url, options = {}, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 400));
    }
  }
  throw new Error(`Failed to fetch ${url}: ${lastError?.message || lastError}`);
}

async function download(url, destination) {
  try {
    const head = await fetchRetry(url, { method: 'HEAD' }, 2);
    const expected = Number(head.headers.get('content-length') || 0);
    const existing = await stat(destination).catch(() => null);
    if (existing && expected > 0 && existing.size === expected) return 'cached';
  } catch {}

  const response = await fetchRetry(url);
  if (!response.body) throw new Error(`Empty response body: ${url}`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination));
  return 'downloaded';
}

function mediaExtension(item) {
  const pathname = new URL(item.media_url).pathname;
  const suffix = extname(pathname).toLowerCase();
  if (suffix && suffix.length <= 6) return suffix;
  return item.media_type === 'video' ? '.mp4' : '.jpg';
}

console.log('正在读取公开页面与内容数据…');
const [sourceData, originalBundle, originalCss] = await Promise.all([
  fetchRetry(apiUrl).then((response) => response.json()),
  fetchRetry(bundleUrl).then((response) => response.text()),
  fetchRetry(cssUrl).then((response) => response.text())
]);

await writeFile(
  resolve(dataDir, 'category_items.original.json'),
  `${JSON.stringify(sourceData, null, 2)}\n`,
  'utf8'
);

const mediaItems = sourceData.items.filter((item) => item.media_url);
let cursor = 0;
let completed = 0;
const failures = [];

async function mediaWorker() {
  while (cursor < mediaItems.length) {
    const item = mediaItems[cursor++];
    const extension = mediaExtension(item);
    const fileName = `${item.id}${extension}`;
    const destination = resolve(mediaDir, fileName);
    try {
      await download(item.media_url, destination);
      item.media_url = `/assets/media/${fileName}`;
    } catch (error) {
      failures.push({ id: item.id, url: item.media_url, error: error.message });
    }
    completed += 1;
    if (completed % 10 === 0 || completed === mediaItems.length) {
      console.log(`素材同步 ${completed}/${mediaItems.length}`);
    }
  }
}

await Promise.all(Array.from({ length: 8 }, () => mediaWorker()));

console.log('正在同步首页视频与动态素材…');
await Promise.all([
  download(heroVideoUrl, resolve(publicAssets, 'hero.mp4')),
  download(orbitUrl, resolve(publicAssets, 'showcase.gif'))
]);

// 该文件在原站当前同样返回 404。保留一个本地缺失地址，复现原站的当前展示状态，
// 同时避免运行时依赖外部域名。
const localCelestiaUrl = '/assets/hero-celestia-preview-0yO3jXO8.gif';

const localBundle = originalBundle
  .replaceAll(`${sourceRoot}/__pb`, '/__pb')
  .replace(
    'function ig(){if(typeof window>`u`)return null;let e=window.location.pathname.match(/^\\/(?:app-preview|p)\\/app-[0-9a-f]{32}(?=\\/|$)/);return e?e[0]:null}',
    'function ig(){if(typeof window>`u`)return null;let e=window.location.pathname.match(/^\\/(?:app-preview|p)\\/app-[0-9a-f]{32}(?=\\/|$)/);if(e)return e[0];if(window.location.hostname.endsWith(`.github.io`)){let t=window.location.pathname.split(`/`).filter(Boolean)[0];return t?`/${t}`:null}return null}'
  )
  .replaceAll(heroVideoUrl, '/assets/hero.mp4')
  .replaceAll(orbitUrl, '/assets/showcase.gif')
  .replaceAll(celestiaUrl, localCelestiaUrl);

await Promise.all([
  writeFile(resolve(publicAssets, 'index.js'), localBundle, 'utf8'),
  writeFile(resolve(publicAssets, 'index.css'), originalCss, 'utf8'),
  writeFile(
    resolve(dataDir, 'category_items.json'),
    `${JSON.stringify(sourceData, null, 2)}\n`,
    'utf8'
  )
]);

const totalBytes = await Promise.all(
  mediaItems.map(async (item) => {
    if (!item.media_url.startsWith('/assets/media/')) return 0;
    return (await stat(resolve('public', item.media_url.slice(1)))).size;
  })
).then((sizes) => sizes.reduce((sum, size) => sum + size, 0));

console.log(`同步完成：${sourceData.items.length} 条内容，${completed - failures.length}/${completed} 个媒体素材，${(totalBytes / 1024 / 1024).toFixed(1)} MB。`);
if (failures.length) {
  console.warn('以下素材保留原始远程地址：');
  for (const failure of failures) console.warn(`- ${failure.id}: ${failure.error}`);
  process.exitCode = 1;
}
