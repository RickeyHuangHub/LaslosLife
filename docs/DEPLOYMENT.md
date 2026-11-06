# 构建与部署 / Build & Deploy

目标平台：**Cloudflare Pages（Direct Upload）**，站点 `https://www.laslos.com/`。

## 1. 环境 / Prerequisites

- Node.js 18+ 与 npm
- Python 3（`scripts/postbuild.py` 需要，无第三方依赖）
- 一个 Cloudflare Pages 项目与已绑定的自定义域名

## 2. 构建链 / Build chain

```bash
npm install
npm run build                    # next build → out/，并自动执行 postbuild 钩子
python scripts/postbuild.py      # 重建 deploy/、生成交付 ZIP、执行全量自检
```

`package.json` 的 `postbuild` 钩子会先跑 `python scripts/postbuild.py --postbuild`
（只校验已生成的 HTML）。**完整交付**需要再跑一次不带参数的 `postbuild.py`。

`scripts/postbuild.py` 是交付链的**单一真相源**，一次完成：

1. 修补 `out/index.html` / `out/play.html`：canonical、OG、Schema、统计脚本、资源路径；
2. 生成 `robots.txt`、`sitemap.xml`、`llms.txt`、`llms-full.txt`、`_headers`；
3. 由 `public/` 与 `out/_next/static/` 重建 `deploy/`（自动排除开发期素材）；
4. 打包 `Laslos-Deploy-FINAL.zip`；
5. `verify()` 全量自检，失败即报错。

产物布局：`static/` 位于站点根目录（不是 `/_next/static/`），由 HTML 中的路径替换保证。

## 3. 发布 / Publish

1. Cloudflare Pages → **Create a project → Direct Upload**；
2. 上传 `Laslos-Deploy-FINAL.zip`；
3. 绑定 `www.laslos.com`；
4. 上传后用浏览器与 `curl -I` 复核 canonical、响应头与 GEO 文本。

路由约定：

| URL | 说明 |
| --- | --- |
| `/` | 着陆页 `index.html` |
| `/play` | **最终 200 文档**，canonical / OG / sitemap / 内部链接统一指向它 |
| `/play.html` | 静态导出文件名，CF Pages 会 307 跳转到 `/play`，不要作为 canonical |

两页各自自指 canonical；`/play` 不能指向会跳转的 `.html`，`verify()` 会拒绝
任何残留在交付 HTML 中的 `href="/play.html"`。

## 4. 响应头 / `_headers`

`_headers` 由 `postbuild.py` 生成，覆盖：

- 安全头：CSP、HSTS、`X-Content-Type-Options`、`X-Frame-Options`、
  `Referrer-Policy`、`Permissions-Policy`、COOP / CORP；
- CSP 的 `connect-src` 显式放行统计 Worker 源；
- `/llms.txt`、`/llms-full.txt`、`/robots.txt` 强制
  `Content-Type: text/plain; charset=utf-8`（CF Pages 默认不带 charset，
  浏览器会按 Windows-1252 解码导致中文乱码）；
- HTML 与四个 GEO 文本文件 `max-age=0, must-revalidate`，避免边缘缓存旧版本。

> 这些规则写在版本化的 `_headers` 里，随每次部署生效，不依赖后台手工配置。

## 5. 自检闸门 / Verification gates

`verify()` 会检查：唯一 `ld+json`（只在着陆页）、三节点 Schema、canonical 与
无斜杠根 URL、统计脚本与端点、可见中文简介、FAQ 编号、无隐藏文本、
游戏页无重复 Schema、Hero CTA 直达 `/play`、3/3 charset 规则、
GEO 文件严格 UTF-8 且无 BOM、所有本地资源引用可解析、无开发期素材混入包内。

交付前请确认输出为 `RESULT: PASS`。

## 6. 常见问题 / Troubleshooting

- **导出 `/404.html` 报 `EPERM`**：这是构建环境的写文件竞态，`/404` 不属交付面。
  确认 `out/index.html`、`out/play.html`、`out/_next/static/` 已完整生成后，
  直接运行完整 `python scripts/postbuild.py` 即可完成补丁与打包。
- **静态导出目录被清理工具拦截**：用改名归档（例如把 `out/`、`.next/`、`deploy/`
  移到备份目录）代替递归删除，再重新构建。
- **本地静态服务器访问 `/play` 返回 404**：`python -m http.server` 不实现
  Cloudflare Pages 的无扩展名映射，用 `/play.html` 本地预览即可。

## 7. 不纳入版本管理 / Not committed

`out/`、`deploy/`、`.next/`、`node_modules/`、交付 ZIP、本地审计与截图、
内部工作记录均不上传。详见仓库根目录 `.gitignore`。
