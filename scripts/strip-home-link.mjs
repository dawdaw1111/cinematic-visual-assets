import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const linkStart = '(0,$.jsxs)(`a`,{href:`https://www.runninghub.cn/user-center/1858756858017173505/webapp?inviteCode=rh-v1287`';
const linkEnd = "children:`Ulika's Knowledge Base`})]})";

export function stripHomeLink(bundle) {
  const start = bundle.indexOf(linkStart);
  if (start === -1) {
    if (!bundle.includes('Ulika\'s Knowledge Base') && !bundle.includes('1858756858017173505')) return bundle;
    throw new Error('首页链接结构已变化，无法安全删除。');
  }
  if (bundle.indexOf(linkStart, start + linkStart.length) !== -1) {
    throw new Error('找到多个首页链接，请先确认删除范围。');
  }
  const end = bundle.indexOf(linkEnd, start);
  if (end === -1) throw new Error('未找到首页链接结尾，无法安全删除。');
  return bundle.slice(0, start) + 'null' + bundle.slice(end + linkEnd.length);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const bundlePath = resolve('public/assets/index.js');
  const bundle = await readFile(bundlePath, 'utf8');
  const updated = stripHomeLink(bundle);
  if (updated !== bundle) await writeFile(bundlePath, updated, 'utf8');
  console.log(updated === bundle ? '首页链接已移除。' : '已删除首页外部链接。');
}
