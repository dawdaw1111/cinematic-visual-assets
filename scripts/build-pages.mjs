import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'cinematic-visual-assets';
const basePath = `/${repository}`;
const publicDir = resolve('public');
const outputDir = resolve('dist');

await rm(outputDir, { recursive: true, force: true });
await cp(publicDir, outputDir, { recursive: true });
await mkdir(resolve(outputDir, 'data'), { recursive: true });

const sourceData = JSON.parse(await readFile(resolve('data/category_items.json'), 'utf8'));
for (const item of sourceData.items) {
  if (typeof item.media_url === 'string' && item.media_url.startsWith('/assets/')) {
    item.media_url = `${basePath}${item.media_url}`;
  }
}

let html = await readFile(resolve(outputDir, 'index.html'), 'utf8');
html = html.replaceAll('href="/assets/', `href="${basePath}/assets/`);
html = html.replaceAll('src="/assets/', `src="${basePath}/assets/`);

let bundle = await readFile(resolve(outputDir, 'assets/index.js'), 'utf8');
bundle = bundle.replaceAll('/assets/', `${basePath}/assets/`);

await Promise.all([
  writeFile(resolve(outputDir, 'index.html'), html, 'utf8'),
  writeFile(resolve(outputDir, '404.html'), html, 'utf8'),
  writeFile(resolve(outputDir, 'assets/index.js'), bundle, 'utf8'),
  writeFile(resolve(outputDir, 'data/category_items.json'), `${JSON.stringify(sourceData)}\n`, 'utf8'),
  writeFile(resolve(outputDir, '.nojekyll'), '', 'utf8')
]);

console.log(`GitHub Pages build complete: ${basePath}/`);
