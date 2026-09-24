# 电影级视觉资产提示词库（本地复刻）

这是目标公开站点的本地化复刻版本，保留首页、9 个分类页、搜索、横向内容轨道、详情弹层、复制提示词、键盘切换、响应式布局与本地内容管理页。管理页的新增、编辑、删除、CSV 导入和素材上传都写入本地项目，不会改动原站数据。

## 运行

```powershell
npm start
```

浏览器打开 `http://localhost:4173`。

## 视频项目画布

- 项目列表：`http://localhost:4173/projects`
- 《回魂》画布：`http://localhost:4173/projects/huihun`
- 项目、节点和连线数据：`public/data/video-projects.json`
- LibTV 原始导出：`data/liblib-project-export.json`

当前画布已替换为 LibTV 项目“微恐短片《回魂》- 副本”的真实内容：291 个内容节点，按分镜图、人物/场景/资产、生成视频三个分组展示。图片和视频使用 LibTV 原项目资源地址。目前已从原画布逐节点核对并导入 15 条真实提示词，其余提示词仍在提取中；没有原文的节点不会伪造内容。单击节点查看详情，双击优先查看该节点的提示词或缺失说明；画布支持拖动、滚轮缩放、适应屏幕、小地图和项目结构定位。导入脚本支持从每个原始节点的 `prompt`、`negativePrompt` 字段补充提示词。

如需重新转换已经导出的 LibTV 数据：

在 `data/liblib-project-export.json` 的对应 `groups[].items[]` 中保留原节点 `id`，并补充原文 `prompt`（可选 `negativePrompt`），然后运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/import-liblib-clipboard.ps1
```

在线版本：<https://dawdaw1111.github.io/cinematic-visual-assets/>

GitHub Pages 发布的是静态浏览版本，不包含本地 Node 接口和提示词导入工具。素材仍引用 LibTV 原项目地址，能否播放取决于源站资源的可访问性。

## 重新同步公开内容

```powershell
npm run sync
```

同步脚本会重新获取公开页面构建产物、167 条内容数据，以及页面使用的图片和视频素材。

## 项目结构

- `public/`：网页、样式、脚本和本地媒体素材
- `data/category_items.json`：供本地接口读取的内容数据
- `data/category_items.original.json`：原始公开接口数据快照
- `server.mjs`：零依赖本地静态服务器与兼容接口
- `scripts/sync-source.mjs`：公开资源同步脚本
- `scripts/build-pages.mjs`：生成 GitHub Pages 静态版本

原始参考地址：<https://vibex.runninghub.cn/p/app-512109a8895f48c0b1ac4afc6ed12385/>
