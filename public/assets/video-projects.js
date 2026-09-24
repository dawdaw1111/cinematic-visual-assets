const BASE_PATH = new URL(import.meta.url).pathname.replace(/\/assets\/video-projects\.js$/, "");
const DATA_URL = `${BASE_PATH}/data/video-projects.json`;
const NODE_WIDTH = 286;
const NODE_HEIGHT = 248;
const OVERVIEW_SCALE = 0.28;
const CANVAS_OVERSCAN = 300;
const originalTitle = document.title;

const state = {
  projects: [],
  selectedProject: null,
  selectedNode: null,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  loaded: false,
  nodeById: new Map(),
  renderKey: "",
  renderMode: "",
  renderFrame: 0,
  viewportWidth: 0,
  viewportHeight: 0,
};

const app = document.createElement("div");
app.id = "video-projects-root";
app.hidden = true;
document.body.appendChild(app);

function icon(name, size = 18) {
  const icons = {
    grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    film: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4M7 12h10"/>',
    arrowLeft: '<path d="m15 18-6-6 6-6"/><path d="M9 12h12"/>',
    home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    play: '<path d="m5 3 14 9-14 9V3z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    nodes: '<circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="m7 7 4 9M17 7l-4 9M7 6h10"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    prompt: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8M8 13h5"/>',
    brief: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    output: '<path d="M15 10l4.5-4.5L15 1"/><path d="M19 5.5H9a6 6 0 0 0 0 12h2"/><rect width="8" height="6" x="12" y="15" rx="1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    fit: '<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    layers: '<path d="m12 2 9 5-9 5-9-5 9-5z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/>',
    audio: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  };
  return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.grid}</svg>`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isProjectRoute() {
  const path = location.pathname.slice(BASE_PATH.length) || "/";
  return path === "/projects" || path.startsWith("/projects/");
}

function navigate(path) {
  if (!path.startsWith("/projects")) {
    location.href = `${BASE_PATH}${path}`;
    return;
  }
  history.pushState({}, "", `${BASE_PATH}${path}`);
  route();
}

function installEntry() {
  if (document.querySelector(".vp-global-entry")) return;
  const entry = document.createElement("a");
  entry.className = "vp-global-entry";
  entry.href = `${BASE_PATH}/projects`;
  entry.innerHTML = `${icon("nodes", 19)}<span>视频项目</span>`;
  entry.setAttribute("aria-label", "打开视频项目画布");
  entry.addEventListener("click", (event) => {
    event.preventDefault();
    navigate("/projects");
  });
  document.body.appendChild(entry);
}

async function loadData() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.projects = Array.isArray(data.projects) ? data.projects : [];
    state.loaded = true;
    route();
  } catch (error) {
    state.loaded = true;
    app.innerHTML = `<main class="vp-error"><div>${icon("film", 32)}</div><h1>视频项目加载失败</h1><p>请确认 <code>${DATA_URL}</code> 文件存在并且 JSON 格式正确。</p><button class="vp-button" data-home>返回首页</button></main>`;
    app.querySelector("[data-home]")?.addEventListener("click", () => navigate("/"));
    console.error("Video projects module failed to load", error);
  }
}

function route() {
  installEntry();
  const active = isProjectRoute();
  document.body.classList.toggle("vp-active", active);
  app.hidden = !active;
  document.querySelector(".vp-global-entry")?.toggleAttribute("hidden", active);
  if (!active) {
    document.title = originalTitle;
    return;
  }

  if (!state.loaded) {
    app.innerHTML = `<div class="vp-loading"><span></span><p>正在加载视频项目…</p></div>`;
    return;
  }

  const path = location.pathname.slice(BASE_PATH.length) || "/";
  const id = decodeURIComponent(path.slice("/projects/".length));
  if (path === "/projects" || !id) {
    state.selectedProject = null;
    state.selectedNode = null;
    renderProjectList();
    return;
  }

  const project = state.projects.find((item) => item.id === id);
  if (!project) {
    renderNotFound();
    return;
  }
  state.selectedProject = project;
  state.selectedNode = null;
  renderCanvas(project);
}

function renderProjectList() {
  document.title = `视频项目 · ${originalTitle}`;
  app.innerHTML = `
    <main class="vp-library">
      <header class="vp-library-header">
        <button class="vp-brand" type="button" data-home aria-label="返回素材库首页">
          <span class="vp-brand-mark">${icon("film", 20)}</span>
          <span><b>电影级视觉资产库</b><small>VIDEO PROJECTS</small></span>
        </button>
        <div class="vp-local-badge"><span></span>创作项目</div>
      </header>

      <section class="vp-library-hero">
        <div>
          <p class="vp-eyebrow">PROJECT CANVAS</p>
          <h1>视频项目画布</h1>
          <p class="vp-hero-copy">让分镜、人物资产、提示词与生成视频保持在同一张画布里。</p>
        </div>
        <div class="vp-library-stats" aria-label="项目统计">
          <div><strong>${state.projects.length}</strong><span>视频项目</span></div>
          <div><strong>${state.projects.reduce((sum, p) => sum + p.nodes.length, 0)}</strong><span>创作节点</span></div>
          <div><strong>${state.projects.reduce((sum, p) => sum + p.nodes.filter((n) => n.media).length, 0)}</strong><span>媒体素材</span></div>
        </div>
      </section>

      <section class="vp-project-section" aria-labelledby="vp-project-heading">
        <div class="vp-project-toolbar">
          <div>
            <p class="vp-section-kicker">ALL PROJECTS</p>
            <h2 id="vp-project-heading">全部视频项目</h2>
          </div>
          <label class="vp-search">
            <span class="vp-sr-only">搜索项目</span>
            ${icon("search", 17)}
            <input type="search" placeholder="搜索项目、标签…" data-project-search />
          </label>
        </div>
        <div class="vp-project-grid" data-project-grid>
          ${state.projects.map(projectCard).join("")}
        </div>
        <div class="vp-empty" data-empty hidden>${icon("search", 26)}<p>没有找到匹配的项目</p></div>
      </section>
    </main>`;

  app.querySelector("[data-home]")?.addEventListener("click", () => navigate("/"));
  app.querySelectorAll("[data-open-project]").forEach((button) => {
    button.addEventListener("click", () => navigate(`/projects/${encodeURIComponent(button.dataset.openProject)}`));
  });

  app.querySelectorAll(".vp-card-media video").forEach((video) => {
    const card = video.closest(".vp-project-card");
    card?.addEventListener("pointerenter", () => {
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) video.play().catch(() => {});
    });
    card?.addEventListener("pointerleave", () => {
      video.pause();
      video.currentTime = 0;
    });
  });

  const search = app.querySelector("[data-project-search]");
  search?.addEventListener("input", () => filterProjects(search.value));
}

function projectCard(project) {
  const subtitle = project.subtitle || "视频创作项目";
  const description = project.description || "查看项目画布与创作素材。";
  const status = project.status || "创作档案";
  const duration = project.duration || `${project.nodes.length} 个节点`;
  const media = project.cover?.type === "video"
    ? `<video muted loop playsinline preload="metadata" src="${escapeHtml(project.cover.url)}"></video>`
    : `<img src="${escapeHtml(project.cover?.url)}" alt="" loading="lazy" />`;
  return `
    <article class="vp-project-card" style="--project-accent:${escapeHtml(project.accent)}" data-project-card data-search="${escapeHtml(`${project.title} ${project.subtitle} ${project.tags.join(" ")}`.toLowerCase())}">
      <button type="button" class="vp-project-open" data-open-project="${escapeHtml(project.id)}" aria-label="打开项目：${escapeHtml(project.title)}">
        <div class="vp-card-media">
          ${media}
          <span class="vp-status">${escapeHtml(status)}</span>
          <span class="vp-card-play">${icon("play", 18)}</span>
          <span class="vp-card-duration">${escapeHtml(duration)}</span>
        </div>
        <div class="vp-card-body">
          <div class="vp-card-heading"><div><p>${escapeHtml(subtitle)}</p><h3>${escapeHtml(project.title)}</h3></div>${icon("chevron", 20)}</div>
          <p class="vp-card-description">${escapeHtml(description)}</p>
          <div class="vp-tags">${project.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
          <div class="vp-card-meta">
            <span>${icon("nodes", 15)}${project.nodes.length} 个节点</span>
            <span>${icon("calendar", 15)}${escapeHtml(project.updated)}</span>
          </div>
        </div>
      </button>
    </article>`;
}

function filterProjects(query) {
  const term = query.trim().toLowerCase();
  let visible = 0;
  app.querySelectorAll("[data-project-card]").forEach((card) => {
    const match = !term || card.dataset.search.includes(term);
    card.hidden = !match;
    if (match) visible += 1;
  });
  app.querySelector("[data-empty]")?.toggleAttribute("hidden", visible !== 0);
}

function renderNotFound() {
  document.title = `未找到项目 · ${originalTitle}`;
  app.innerHTML = `<main class="vp-error"><div>${icon("film", 32)}</div><h1>没有找到这个视频项目</h1><p>它可能已被移动，或者项目 ID 不正确。</p><button class="vp-button" data-back>返回项目列表</button></main>`;
  app.querySelector("[data-back]")?.addEventListener("click", () => navigate("/projects"));
}

function renderCanvas(project) {
  const subtitle = project.subtitle || "视频创作项目";
  const status = project.status || "创作档案";
  document.title = `${project.title} · 视频项目画布`;
  app.innerHTML = `
    <main class="vp-workspace" style="--project-accent:${escapeHtml(project.accent)}">
      <header class="vp-workspace-header">
        <div class="vp-workspace-leading">
          <button class="vp-icon-button" type="button" data-back-projects aria-label="返回视频项目列表">${icon("arrowLeft", 20)}</button>
          <span class="vp-header-divider"></span>
          <div class="vp-workspace-title"><span class="vp-project-dot"></span><div><p>${escapeHtml(subtitle)}</p><h1>${escapeHtml(project.title)}</h1></div></div>
        </div>
        <div class="vp-workspace-meta">
          <span>${escapeHtml(status)}</span>
          <span>${project.nodes.length} 个节点</span>
        </div>
        <button class="vp-home-button" type="button" data-home>${icon("home", 17)}<span>素材库首页</span></button>
      </header>

      <div class="vp-workspace-body">
        <aside class="vp-scene-panel" aria-label="项目结构">
          <div class="vp-panel-heading"><p>PROJECT MAP</p><h2>项目结构</h2></div>
          <nav class="vp-scene-list">
            ${project.scenes.map((scene, index) => sceneGroup(project, scene, index)).join("")}
          </nav>
        </aside>

        <section class="vp-canvas-wrap" aria-label="${escapeHtml(project.title)}节点画布">
          <div class="vp-canvas-viewport" data-canvas-viewport tabindex="0" aria-label="可拖动和缩放的项目画布">
            <div class="vp-canvas-stage" data-canvas-stage>
              <svg class="vp-edges" data-edges aria-hidden="true"></svg>
              <div data-nodes></div>
            </div>
          </div>
          <div class="vp-canvas-toolbar" role="toolbar" aria-label="画布缩放">
            <button type="button" data-canvas-action="zoom-out" aria-label="缩小画布">${icon("minus", 18)}</button>
            <output data-zoom-output aria-label="当前缩放比例">100%</output>
            <button type="button" data-canvas-action="zoom-in" aria-label="放大画布">${icon("plus", 18)}</button>
            <span></span>
            <button type="button" data-canvas-action="fit" aria-label="适应画布">${icon("fit", 18)}</button>
          </div>
          <div class="vp-canvas-hint">拖动画布 · 滚轮缩放 · 单击看详情 · 双击看提示词</div>
          <div class="vp-minimap" data-minimap aria-label="项目小地图"></div>
        </section>

        <aside class="vp-detail-panel" data-detail-panel aria-live="polite">
          ${emptyDetail()}
        </aside>
      </div>
      <div class="vp-toast" data-toast role="status" aria-live="polite"></div>
    </main>`;

  app.querySelector("[data-back-projects]")?.addEventListener("click", () => navigate("/projects"));
  app.querySelector("[data-home]")?.addEventListener("click", () => navigate("/"));

  buildCanvas(project);
  requestAnimationFrame(() => openCanvasAtStart(project));
}

function sceneGroup(project, scene, index) {
  const nodes = project.nodes.filter((node) => node.scene === scene);
  return `<section class="vp-scene-group"><div class="vp-scene-title"><span>${String(index + 1).padStart(2, "0")}</span><b>${escapeHtml(scene)}</b><small>${nodes.length}</small></div><div>${nodes.map((node) => `<button type="button" data-focus-node="${escapeHtml(node.id)}"><span class="vp-node-type-dot vp-type-${escapeHtml(node.type)}"></span><span>${escapeHtml(node.title)}</span>${node.prompt ? '<span class="vp-prompt-available" title="已导入提示词">词</span>' : ""}</button>`).join("")}</div></section>`;
}

function buildCanvas(project) {
  const nodesHost = app.querySelector("[data-nodes]");
  const edgesHost = app.querySelector("[data-edges]");
  const stage = app.querySelector("[data-canvas-stage]");
  state.nodeById = new Map(project.nodes.map((node) => [node.id, node]));
  state.renderKey = "";
  state.renderMode = "";
  const maxX = Math.max(...project.nodes.map((node) => node.x)) + NODE_WIDTH + 120;
  const maxY = Math.max(...project.nodes.map((node) => node.y)) + NODE_HEIGHT + 120;
  stage.style.width = `${Math.max(maxX, 1200)}px`;
  stage.style.height = `${Math.max(maxY, 760)}px`;
  edgesHost.setAttribute("viewBox", `0 0 ${Math.max(maxX, 1200)} ${Math.max(maxY, 760)}`);
  edgesHost.innerHTML = "";
  nodesHost.innerHTML = "";

  let pendingClick = 0;
  nodesHost.addEventListener("click", (event) => {
    const node = event.target.closest("[data-node]");
    if (!node) return;
    window.clearTimeout(pendingClick);
    if (event.detail > 1) return;
    const id = node.dataset.node;
    pendingClick = window.setTimeout(() => {
      if (state.scale < OVERVIEW_SCALE) focusNode(id);
      else selectNode(id);
    }, 240);
  });
  nodesHost.addEventListener("dblclick", (event) => {
    const node = event.target.closest("[data-node]");
    if (!node) return;
    event.preventDefault();
    window.clearTimeout(pendingClick);
    if (state.scale < OVERVIEW_SCALE) focusNode(node.dataset.node);
    selectNode(node.dataset.node, { promptFirst: true });
  });
  app.querySelector(".vp-scene-list")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-focus-node]");
    if (button) focusNode(button.dataset.focusNode);
  });
  app.querySelectorAll("[data-canvas-action]").forEach((button) => {
    button.addEventListener("click", () => canvasAction(button.dataset.canvasAction));
  });
  setupCanvasGestures();
  renderMinimap(project);
}

function edgePath(edge) {
  const from = state.nodeById.get(edge.from);
  const to = state.nodeById.get(edge.to);
  if (!from || !to) return "";
  const x1 = from.x + NODE_WIDTH;
  const y1 = from.y + NODE_HEIGHT / 2;
  const x2 = to.x;
  const y2 = to.y + NODE_HEIGHT / 2;
  const bend = Math.max(70, Math.abs(x2 - x1) * 0.48);
  return `<path class="vp-edge" data-edge-from="${escapeHtml(edge.from)}" data-edge-to="${escapeHtml(edge.to)}" d="M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}" marker-end="url(#vp-arrow)"/>`;
}

function openCanvasAtStart(project) {
  const viewport = app.querySelector("[data-canvas-viewport]");
  if (!viewport || state.selectedProject !== project) return;
  const first = project.nodes[0];
  state.scale = 0.68;
  state.offsetX = 42 - first.x * state.scale;
  state.offsetY = 42 - first.y * state.scale;
  applyTransform();
}

function scheduleVisibleCanvas() {
  if (state.renderFrame) return;
  state.renderFrame = requestAnimationFrame(() => {
    state.renderFrame = 0;
    renderVisibleCanvas();
    drawMinimap();
  });
}

function renderVisibleCanvas() {
  const project = state.selectedProject;
  const viewport = app.querySelector("[data-canvas-viewport]");
  const nodesHost = app.querySelector("[data-nodes]");
  const edgesHost = app.querySelector("[data-edges]");
  if (!project || !viewport || !nodesHost || !edgesHost || !viewport.clientWidth) return;

  const overview = state.scale < OVERVIEW_SCALE;
  const margin = CANVAS_OVERSCAN / state.scale;
  const left = -state.offsetX / state.scale - margin;
  const top = -state.offsetY / state.scale - margin;
  const right = left + viewport.clientWidth / state.scale + margin * 2;
  const bottom = top + viewport.clientHeight / state.scale + margin * 2;
  const visible = overview ? project.nodes : project.nodes.filter((node) =>
    node.x < right && node.x + NODE_WIDTH > left && node.y < bottom && node.y + NODE_HEIGHT > top
  );
  const key = `${overview ? "overview" : "detail"}:${visible.map((node) => node.id).join(",")}`;
  if (key === state.renderKey) return;
  state.renderKey = key;
  viewport.classList.toggle("vp-overview", overview);
  const mode = overview ? "overview" : "detail";
  if (state.renderMode !== mode) {
    nodesHost.innerHTML = "";
    state.renderMode = mode;
  }
  const visibleIds = new Set(visible.map((node) => node.id));
  for (const element of [...nodesHost.children]) {
    if (!visibleIds.has(element.dataset.node)) element.remove();
  }
  const mountedIds = new Set([...nodesHost.children].map((element) => element.dataset.node));
  const added = visible.filter((node) => !mountedIds.has(node.id));
  if (added.length) nodesHost.insertAdjacentHTML("beforeend", added.map(overview ? overviewNode : nodeCard).join(""));

  if (overview) {
    edgesHost.innerHTML = "";
  } else {
    const paths = project.edges.filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to));
    edgesHost.innerHTML = `<defs><marker id="vp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"></path></marker></defs>${paths.map(edgePath).join("")}`;
  }
  if (state.selectedNode) updateCanvasSelection(state.selectedNode.id);
}

function overviewNode(node) {
  return `<button type="button" class="vp-overview-node vp-type-${escapeHtml(node.type)}" style="left:${node.x}px;top:${node.y}px" data-node="${escapeHtml(node.id)}" title="${escapeHtml(node.title)}" aria-label="查看节点：${escapeHtml(node.title)}"></button>`;
}

function thumbnailUrl(node) {
  if (node.preview?.includes("x-oss-process=image/resize")) {
    return node.preview.replace(/resize,w_\d+/, "resize,w_420");
  }
  if (node.media?.type === "image" && node.media.url.startsWith("https://libtv-res.liblib.art/")) {
    return `${node.media.url.split("?")[0]}?x-oss-process=image/resize,w_420,m_lfit/format,webp/ignore-error,1`;
  }
  if (node.preview?.includes("x-oss-process=video/snapshot")) {
    return node.preview.replace(/w_\d+/, "w_420");
  }
  return node.preview || node.media?.url || "";
}

function nodeCard(node) {
  let preview = "";
  if (node.media?.type === "image") {
    preview = `<div class="vp-node-media"><img src="${escapeHtml(thumbnailUrl(node))}" alt="${escapeHtml(node.title)}" loading="lazy" decoding="async" draggable="false" /></div>`;
  } else if (node.media?.type === "video") {
    const poster = node.preview
      ? `<img src="${escapeHtml(thumbnailUrl(node))}" alt="${escapeHtml(node.title)}" loading="lazy" decoding="async" draggable="false" />`
      : `<video src="${escapeHtml(node.media.url)}" muted playsinline preload="none"></video>`;
    preview = `<div class="vp-node-media vp-node-video">${poster}<span>${icon("play", 17)}</span></div>`;
  } else if (node.type === "audio") {
    preview = `<div class="vp-node-audio-preview"><span>${icon("audio", 30)}</span><small>音色素材</small></div>`;
  } else {
    preview = `<div class="vp-node-text-preview">${escapeHtml(node.prompt || node.description)}</div>`;
  }
  const iconName = node.type === "video" ? "film" : node.type === "audio" ? "audio" : node.type;
  return `<button type="button" class="vp-node vp-type-${escapeHtml(node.type)}" style="left:${node.x}px;top:${node.y}px" data-node="${escapeHtml(node.id)}" aria-label="查看节点：${escapeHtml(node.title)}"><div class="vp-node-top"><span class="vp-node-icon">${icon(iconName, 16)}</span><span>${escapeHtml(nodeTypeLabel(node.type))}</span>${node.prompt ? '<span class="vp-node-prompt-badge">有提示词</span>' : ""}<i></i></div>${preview}<div class="vp-node-body"><h3>${escapeHtml(node.title)}</h3><p>${escapeHtml(displayDescription(node))}</p><div>${(node.tags || []).slice(0, 2).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div></div><span class="vp-port vp-port-in"></span><span class="vp-port vp-port-out"></span></button>`;
}

function nodeTypeLabel(type) {
  return ({ brief: "创作说明", image: "图片素材", prompt: "提示词", video: "视频镜头", audio: "音色素材", output: "最终输出" })[type] || "项目节点";
}

function displayDescription(node) {
  return node.description || "";
}

function emptyDetail() {
  return `<div class="vp-detail-empty"><span>${icon("nodes", 30)}</span><h2>选择一个节点</h2><p>查看对应的素材、提示词和节点信息。</p></div>`;
}

function selectNode(id, { promptFirst = false } = {}) {
  const node = state.nodeById.get(id);
  if (!node) return;
  state.selectedNode = node;
  updateCanvasSelection(id);
  drawMinimap();
  const panel = app.querySelector("[data-detail-panel]");
  panel.innerHTML = detailContent(node, promptFirst);
  panel.classList.add("is-open");
  if (promptFirst) panel.querySelector(".vp-detail-scroll")?.scrollTo(0, 0);
  panel.querySelector("[data-close-detail]")?.addEventListener("click", clearSelection);
  panel.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", () => copyText(button.dataset.copy));
  });
}

function updateCanvasSelection(id) {
  app.querySelectorAll("[data-node]").forEach((element) => element.classList.toggle("is-selected", element.dataset.node === id));
  app.querySelectorAll("[data-focus-node]").forEach((element) => element.classList.toggle("is-selected", element.dataset.focusNode === id));
  app.querySelectorAll(".vp-edge").forEach((edge) => edge.classList.toggle("is-connected", edge.dataset.edgeFrom === id || edge.dataset.edgeTo === id));
}

function detailContent(node, promptFirst = false) {
  const media = node.media?.type === "image"
    ? `<div class="vp-detail-media"><img src="${escapeHtml(node.media.url)}" alt="${escapeHtml(node.title)}" draggable="false" /></div>`
    : node.media?.type === "video"
      ? `<div class="vp-detail-media"><video src="${escapeHtml(node.media.url)}" controls playsinline preload="metadata"></video></div>`
      : node.type === "audio"
        ? `<div class="vp-detail-audio"><span>${icon("audio", 30)}</span><div><b>角色音色节点</b><small>暂无可播放的音频文件</small></div></div>`
        : "";
  const prompt = node.prompt
    ? `<section class="vp-detail-section vp-prompt-section" data-prompt-section><div class="vp-detail-section-head"><h3>对应提示词</h3><button type="button" data-copy="${escapeHtml(node.prompt)}" aria-label="复制提示词">${icon("copy", 16)}复制</button></div><p class="vp-prompt-text">${escapeHtml(node.prompt)}</p></section>`
    : `<section class="vp-detail-section vp-prompt-section vp-prompt-missing" data-prompt-section><h3>暂无对应提示词</h3><p>这个节点暂未录入提示词。</p></section>`;
  const negative = node.negativePrompt ? `<section class="vp-detail-section"><div class="vp-detail-section-head"><h3>负向提示词</h3><button type="button" data-copy="${escapeHtml(node.negativePrompt)}" aria-label="复制负向提示词">${icon("copy", 16)}复制</button></div><p class="vp-prompt-text vp-negative">${escapeHtml(node.negativePrompt)}</p></section>` : "";
  const metadata = node.metadata?.length ? `<section class="vp-detail-section"><h3>节点信息</h3><dl class="vp-metadata">${node.metadata.map((item) => `<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`).join("")}</dl></section>` : "";
  const description = `<p class="vp-detail-description">${escapeHtml(displayDescription(node))}</p><div class="vp-tags">${(node.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>`;
  return `<div class="vp-detail-scroll"><div class="vp-detail-header"><div><p>${escapeHtml(promptFirst ? "节点提示词" : nodeTypeLabel(node.type))}</p><h2>${escapeHtml(node.title)}</h2></div><button type="button" data-close-detail aria-label="关闭节点详情">${icon("close", 19)}</button></div>${promptFirst ? `${prompt}${media}${description}` : `${media}${description}${prompt}`}${negative}${metadata}</div>`;
}

function clearSelection() {
  state.selectedNode = null;
  app.querySelectorAll(".is-selected,.is-connected").forEach((element) => element.classList.remove("is-selected", "is-connected"));
  drawMinimap();
  const panel = app.querySelector("[data-detail-panel]");
  panel.classList.remove("is-open");
  panel.innerHTML = emptyDetail();
}

function focusNode(id) {
  const node = state.nodeById.get(id);
  const viewport = app.querySelector("[data-canvas-viewport]");
  if (!node || !viewport) return;
  state.scale = Math.max(state.scale, 0.72);
  state.offsetX = viewport.clientWidth / 2 - (node.x + NODE_WIDTH / 2) * state.scale;
  state.offsetY = viewport.clientHeight / 2 - (node.y + NODE_HEIGHT / 2) * state.scale;
  applyTransform();
  selectNode(id);
}

function setupCanvasGestures() {
  const viewport = app.querySelector("[data-canvas-viewport]");
  if (!viewport) return;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;
  let activePointer = null;
  let suppressClick = false;

  viewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || !event.isPrimary) return;
    activePointer = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    originX = state.offsetX;
    originY = state.offsetY;
    event.preventDefault();
  });
  viewport.addEventListener("pointermove", (event) => {
    if (activePointer !== event.pointerId) return;
    if (!dragging && Math.hypot(event.clientX - startX, event.clientY - startY) < 5) return;
    if (!dragging) {
      dragging = true;
      viewport.classList.add("is-dragging");
      viewport.setPointerCapture(event.pointerId);
    }
    state.offsetX = originX + event.clientX - startX;
    state.offsetY = originY + event.clientY - startY;
    applyTransform();
  });
  viewport.addEventListener("pointerup", (event) => {
    if (activePointer !== event.pointerId) return;
    activePointer = null;
    if (dragging) {
      suppressClick = true;
      window.setTimeout(() => { suppressClick = false; }, 0);
    }
    dragging = false;
    viewport.classList.remove("is-dragging");
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
  });
  viewport.addEventListener("pointercancel", () => {
    activePointer = null;
    dragging = false;
    viewport.classList.remove("is-dragging");
  });
  viewport.addEventListener("click", (event) => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick = false;
  }, true);
  viewport.addEventListener("dragstart", (event) => event.preventDefault());
  viewport.addEventListener("selectstart", (event) => event.preventDefault());
  viewport.addEventListener("wheel", (event) => {
    event.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const worldX = (mouseX - state.offsetX) / state.scale;
    const worldY = (mouseY - state.offsetY) / state.scale;
    const next = clamp(state.scale * (event.deltaY > 0 ? 0.86 : 1.16), 0.05, 1.45);
    state.offsetX = mouseX - worldX * next;
    state.offsetY = mouseY - worldY * next;
    state.scale = next;
    applyTransform();
  }, { passive: false });
  viewport.addEventListener("keydown", (event) => {
    if (event.key === "+" || event.key === "=") canvasAction("zoom-in");
    if (event.key === "-") canvasAction("zoom-out");
    if (event.key === "0") canvasAction("fit");
    if (event.key === "Escape") clearSelection();
  });
}

function canvasAction(action) {
  if (action === "fit") {
    fitCanvas(true);
    return;
  }
  const viewport = app.querySelector("[data-canvas-viewport]");
  if (!viewport) return;
  const oldScale = state.scale;
  const factor = action === "zoom-in" ? 1.16 : 0.86;
  state.scale = clamp(state.scale * factor, 0.05, 1.45);
  const cx = viewport.clientWidth / 2;
  const cy = viewport.clientHeight / 2;
  state.offsetX = cx - ((cx - state.offsetX) / oldScale) * state.scale;
  state.offsetY = cy - ((cy - state.offsetY) / oldScale) * state.scale;
  applyTransform();
}

function fitCanvas(animate) {
  const viewport = app.querySelector("[data-canvas-viewport]");
  const stage = app.querySelector("[data-canvas-stage]");
  if (!viewport || !stage) return;
  const stageWidth = parseFloat(stage.style.width);
  const stageHeight = parseFloat(stage.style.height);
  const availableWidth = Math.max(320, viewport.clientWidth - 72);
  const availableHeight = Math.max(240, viewport.clientHeight - 72);
  state.scale = clamp(Math.min(availableWidth / stageWidth, availableHeight / stageHeight), 0.05, 1);
  state.offsetX = (viewport.clientWidth - stageWidth * state.scale) / 2;
  state.offsetY = (viewport.clientHeight - stageHeight * state.scale) / 2;
  stage.classList.toggle("is-animating", Boolean(animate));
  applyTransform();
  if (animate) window.setTimeout(() => stage.classList.remove("is-animating"), 260);
}

function applyTransform() {
  const stage = app.querySelector("[data-canvas-stage]");
  if (stage) stage.style.transform = `translate3d(${state.offsetX}px, ${state.offsetY}px, 0) scale(${state.scale})`;
  const viewport = app.querySelector("[data-canvas-viewport]");
  if (viewport) {
    state.viewportWidth = viewport.clientWidth;
    state.viewportHeight = viewport.clientHeight;
  }
  const output = app.querySelector("[data-zoom-output]");
  if (output) output.textContent = `${Math.round(state.scale * 100)}%`;
  scheduleVisibleCanvas();
}

function renderMinimap(project) {
  const host = app.querySelector("[data-minimap]");
  if (!host) return;
  host.innerHTML = '<canvas aria-hidden="true"></canvas>';
  host.title = "点击小地图定位节点，也可用左侧列表定位";
  host.addEventListener("click", (event) => {
    const rect = host.getBoundingClientRect();
    const maxX = Math.max(...project.nodes.map((node) => node.x)) + NODE_WIDTH;
    const maxY = Math.max(...project.nodes.map((node) => node.y)) + NODE_HEIGHT;
    const worldX = ((event.clientX - rect.left - 8) / (rect.width - 16)) * maxX;
    const worldY = ((event.clientY - rect.top - 8) / (rect.height - 16)) * maxY;
    const nearest = project.nodes.reduce((best, node) => {
      const dx = node.x + NODE_WIDTH / 2 - worldX;
      const dy = node.y + NODE_HEIGHT / 2 - worldY;
      const distance = dx * dx + dy * dy;
      return distance < best.distance ? { node, distance } : best;
    }, { node: null, distance: Infinity }).node;
    if (nearest) focusNode(nearest.id);
  });
  drawMinimap();
}

function drawMinimap() {
  const project = state.selectedProject;
  const canvas = app.querySelector("[data-minimap] canvas");
  const viewport = app.querySelector("[data-canvas-viewport]");
  if (!project || !canvas || !viewport) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  const dpr = window.devicePixelRatio || 1;
  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(height * dpr);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const maxX = Math.max(...project.nodes.map((node) => node.x)) + NODE_WIDTH;
  const maxY = Math.max(...project.nodes.map((node) => node.y)) + NODE_HEIGHT;
  const sx = (width - 16) / maxX;
  const sy = (height - 16) / maxY;
  for (const node of project.nodes) {
    ctx.fillStyle = node.id === state.selectedNode?.id ? "#c4b5fd" : node.type === "image" ? "#4ca4b2" : node.type === "video" ? "#be7650" : "#a06592";
    ctx.fillRect(8 + node.x * sx, 8 + node.y * sy, Math.max(2, NODE_WIDTH * sx), Math.max(2, NODE_HEIGHT * sy));
  }
  const viewX = -state.offsetX / state.scale;
  const viewY = -state.offsetY / state.scale;
  ctx.strokeStyle = "#eee8ff";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(8 + viewX * sx, 8 + viewY * sy, viewport.clientWidth / state.scale * sx, viewport.clientHeight / state.scale * sy);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  showToast("已复制到剪贴板");
}

function showToast(message) {
  const toast = app.querySelector("[data-toast]");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

window.addEventListener("popstate", route);
window.addEventListener("resize", () => {
  if (!state.selectedProject || !isProjectRoute()) return;
  const viewport = app.querySelector("[data-canvas-viewport]");
  if (!viewport) return;
  const centerX = ((state.viewportWidth || viewport.clientWidth) / 2 - state.offsetX) / state.scale;
  const centerY = ((state.viewportHeight || viewport.clientHeight) / 2 - state.offsetY) / state.scale;
  state.offsetX = viewport.clientWidth / 2 - centerX * state.scale;
  state.offsetY = viewport.clientHeight / 2 - centerY * state.scale;
  applyTransform();
});

installEntry();
route();
loadData();
