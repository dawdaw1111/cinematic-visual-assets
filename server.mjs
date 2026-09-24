import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';

const root = resolve('public');
const dataFile = resolve('data/category_items.json');
const liblibImportFile = resolve('data/liblib-project-export.json');
const uploadDir = resolve('public/assets/uploads');
const port = Number(process.env.PORT || 4173);

const mime = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
  '.ogg': 'video/ogg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webm': 'video/webm',
  '.webp': 'image/webp'
};

function json(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function readData() {
  return JSON.parse(await readFile(dataFile, 'utf8'));
}

async function saveData(data) {
  data.totalItems = data.items.length;
  data.perPage = Math.max(data.perPage || data.items.length, data.items.length);
  await writeFile(dataFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function handleApi(req, res, url) {
  const collectionPath = '/__pb/api/category_items';
  if (url.pathname === '/__pb/api/liblib-prompts' && req.method === 'POST') {
    const origin = req.headers.origin;
    if (origin && origin !== `http://localhost:${port}` && origin !== `http://127.0.0.1:${port}`) {
      return json(res, 403, { message: 'Local import only' }), true;
    }
    const body = await readBody(req);
    if (!Array.isArray(body?.records)) {
      return json(res, 400, { message: 'Invalid prompt records' }), true;
    }
    const source = JSON.parse(await readFile(liblibImportFile, 'utf8'));
    const items = source.groups.flatMap((group) => group.items || []);
    const seen = new Set();
    let prompts = 0;
    let checked = 0;
    for (const record of body.records) {
      const index = Number(record.index);
      const item = items[index];
      const media = String(item?.media || '').split('?')[0];
      const observedMedia = String(record.src || '').split('?')[0];
      if (!Number.isInteger(index) || !item || seen.has(index) || !record.matched || !media || media !== observedMedia) {
        return json(res, 400, { message: `Prompt/media mismatch at index ${record.index}` }), true;
      }
      seen.add(index);
      item.sourceNodeId = String(record.nodeId || '');
      item.promptChecked = true;
      checked++;
      if (typeof record.prompt === 'string' && record.prompt.trim()) {
        item.prompt = record.prompt;
        prompts++;
      }
    }
    await writeFile(liblibImportFile, `${JSON.stringify(source, null, 2)}\n`, 'utf8');
    return json(res, 200, { checked, prompts, totalItems: items.length }), true;
  }
  if (url.pathname === '/__pb/api/liblib-import' && req.method === 'POST') {
    const body = await readBody(req);
    if (!body?.project || !Array.isArray(body.groups)) {
      return json(res, 400, { message: 'Invalid project payload' }), true;
    }
    await writeFile(liblibImportFile, `${JSON.stringify(body, null, 2)}\n`, 'utf8');
    return json(res, 200, {
      saved: body.groups.reduce((total, group) => total + (group.items?.length || 0), 0),
      file: 'data/liblib-project-export.json'
    }), true;
  }
  if (url.pathname === '/__pb/api/proxy/imgupload' && req.method === 'POST') {
    const webRequest = new Request('http://localhost/upload', {
      method: 'POST',
      headers: req.headers,
      body: Readable.toWeb(req),
      duplex: 'half'
    });
    const formData = await webRequest.formData();
    const file = formData.get('file');
    if (!(file instanceof Blob)) {
      return json(res, 400, { message: '缺少上传文件' }), true;
    }
    const originalName = typeof file.name === 'string' ? file.name : '';
    const extension = extname(originalName).toLowerCase() || {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/webm': '.webm'
    }[file.type] || '.bin';
    const fileName = `${Date.now()}-${randomBytes(6).toString('hex')}${extension}`;
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, fileName), Buffer.from(await file.arrayBuffer()));
    return json(res, 200, { url: `/assets/uploads/${fileName}` }), true;
  }

  if (!url.pathname.startsWith(collectionPath)) return false;

  const data = await readData();
  const id = url.pathname.slice(collectionPath.length).replace(/^\//, '');

  if (req.method === 'GET' && !id) {
    const categoryId = url.searchParams.get('category_id');
    const perPage = Math.max(1, Number(url.searchParams.get('perPage') || 500));
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const filtered = categoryId
      ? data.items.filter((item) => item.category_id === categoryId)
      : data.items;
    const start = (page - 1) * perPage;
    return json(res, 200, {
      items: filtered.slice(start, start + perPage),
      page,
      perPage,
      totalItems: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / perPage))
    }), true;
  }

  if (req.method === 'GET' && id) {
    const item = data.items.find((entry) => entry.id === id);
    return json(res, item ? 200 : 404, item || { message: 'Not found' }), true;
  }

  if (req.method === 'POST' && id === 'bulk') {
    const body = await readBody(req);
    const items = Array.isArray(body.items) ? body.items : [];
    const now = new Date().toISOString().replace('T', ' ').replace('Z', 'Z');
    for (const item of items) {
      data.items.push({
        ...item,
        id: item.id || randomBytes(8).toString('hex').slice(0, 15),
        collectionId: item.collectionId || 'local_category_items',
        collectionName: 'category_items',
        created: item.created || now,
        updated: now
      });
    }
    await saveData(data);
    return json(res, 200, { saved: items.length, errors: [] }), true;
  }

  if (req.method === 'POST' && !id) {
    const body = await readBody(req);
    const now = new Date().toISOString().replace('T', ' ').replace('Z', 'Z');
    const item = {
      ...body,
      id: randomBytes(8).toString('hex').slice(0, 15),
      collectionId: 'local_category_items',
      collectionName: 'category_items',
      created: now,
      updated: now
    };
    data.items.push(item);
    await saveData(data);
    return json(res, 200, item), true;
  }

  if (req.method === 'PATCH' && id) {
    const index = data.items.findIndex((entry) => entry.id === id);
    if (index < 0) return json(res, 404, { message: 'Not found' }), true;
    const body = await readBody(req);
    data.items[index] = {
      ...data.items[index],
      ...body,
      id,
      updated: new Date().toISOString().replace('T', ' ').replace('Z', 'Z')
    };
    await saveData(data);
    return json(res, 200, data.items[index]), true;
  }

  if (req.method === 'DELETE' && id) {
    const index = data.items.findIndex((entry) => entry.id === id);
    if (index < 0) return json(res, 404, { message: 'Not found' }), true;
    const [removed] = data.items.splice(index, 1);
    await saveData(data);
    return json(res, 200, removed), true;
  }

  return json(res, 405, { message: 'Method not allowed' }), true;
}

function safeFilePath(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '');
  const candidate = resolve(join(root, clean));
  return candidate === root || candidate.startsWith(`${root}${sep}`) ? candidate : null;
}

async function serveFile(req, res, filePath) {
  const info = await stat(filePath);
  const type = mime[extname(filePath).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.range;

  if (range && (type.startsWith('video/') || type.startsWith('audio/'))) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match) {
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1;
      if (start <= end && start < info.size) {
        res.writeHead(206, {
          'Accept-Ranges': 'bytes',
          'Content-Range': `bytes ${start}-${end}/${info.size}`,
          'Content-Length': end - start + 1,
          'Content-Type': type,
          'Cache-Control': 'public, max-age=31536000, immutable'
        });
        createReadStream(filePath, { start, end }).pipe(res);
        return;
      }
    }
  }

  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': info.size,
    'Accept-Ranges': 'bytes',
    'Cache-Control': filePath.endsWith('index.html')
      ? 'no-cache'
      : 'public, max-age=31536000, immutable'
  });
  if (req.method === 'HEAD') res.end();
  else createReadStream(filePath).pipe(res);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (await handleApi(req, res, url)) return;

    const requested = safeFilePath(url.pathname);
    if (requested) {
      try {
        const info = await stat(requested);
        if (info.isFile()) return await serveFile(req, res, requested);
      } catch {}
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      return await serveFile(req, res, join(root, 'index.html'));
    }
    json(res, 404, { message: 'Not found' });
  } catch (error) {
    console.error(error);
    json(res, 500, { message: 'Internal server error' });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`电影级视觉资产提示词库：http://localhost:${port}`);
});
