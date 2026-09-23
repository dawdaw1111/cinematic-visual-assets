# 电影级视觉资产提示词库（本地复刻）

这是目标公开站点的本地化复刻版本，保留首页、9 个分类页、搜索、横向内容轨道、详情弹层、复制提示词、键盘切换、响应式布局与本地内容管理页。管理页的新增、编辑、删除、CSV 导入和素材上传都写入本地项目，不会改动原站数据。

## 运行

```powershell
npm start
```

浏览器打开 `http://localhost:4173`。

在线版本：<https://dawdaw1111.github.io/cinematic-visual-assets/>

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
