# Laslos Life · 拉斯洛斯生活

> A browser-based survival & decision-training text game set in Los Angeles.
> 一款以洛杉矶为背景、强调资源统筹与策略博弈的浏览器文字生存游戏。

**Live:** <https://www.laslos.com/> · **Play:** <https://www.laslos.com/play>
**Languages:** 中文 / English / Deutsch · **Stack:** 100% front-end, static export

---

## 这是什么 / What it is

30 天、每天 3 个时段、5 条持续衰减的数值、1 条隐藏的 **Aura**、8 种结局。
每个选择都要算「眼前收益 vs 长远风险」：体力换现金、尊严换机会、这一时段的决定
影响下一时段的容错空间。容错率低，算错一步可能提前终局。

It is a compact **decision-training sandbox**, not a clicker: long-term planning,
marginal returns, asymmetric information and composure under pressure are the
actual mechanics. Every number is there to be reasoned about and replayed.

## 核心循环 / Core Loop

`morning → afternoon → evening` → 每个周日结算 `$450` 房租 → 撑过 30 天 → 结局判定。

| 数值 | 每时段衰减 | 临界效果 |
| --- | --- | --- |
| 饥饿 Hunger | −8 | <20 体力衰减翻倍；=0 强制跳过 |
| 体力 Energy | −5 | <20 收益减半；=0 强制休息 |
| 心理 Mental | −3 | <20 有概率躺平；=0 游戏结束 |
| 外表 Beauty | −2 | <20 收入减半；<10 社交锁定 |
| **Aura** | 不衰减 | 界面不显示，只由尊严抉择改变 |

**Aura** 是隐藏的核心变量：初始 70，高值打开试镜与社交机会，低值关闭特殊事件并
压低收入。连续体力劳动会磨损它，拒绝屈辱选择会抬升它。它让「现金」和「气质」
在关键节点正面相撞。

**内容量：** 20 个行动 · 27 个事件 · 8 种结局 · 15 条广播 · 三语界面。

## 技术栈 / Stack

| 层 | 选择 |
| --- | --- |
| 框架 | Next.js 14（App Router，`output: 'export'`） |
| 语言 | TypeScript |
| 样式 | Tailwind CSS + 自定义 CSS |
| 状态 | Zustand |
| 动效 / 音频 | Framer Motion · Howler.js |
| 构建脚本 | Python 3（`scripts/postbuild.py`） |

**两页架构：** `/` 是公开着陆页，`/play` 是游戏页（静态导出文件名为 `play.html`）。
生产环境没有服务端路由、没有 Server Actions、没有数据库。

## 快速开始 / Quick Start

需要 Node.js 18+、npm、Python 3。

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # 静态导出到 out/，并自动跑 postbuild 校验
python scripts/postbuild.py   # 生成 deploy/ 与交付 ZIP，并执行全量自检
```

`scripts/postbuild.py` 是**交付链的单一真相源**：HTML 修补、JSON-LD、SEO/GEO
文本文件、安全响应头、统计脚本注入、ZIP 打包与自检都在这一份里。

## 目录结构 / Layout

```
app/          两页路由、全局样式、类型定义
components/   UI 组件（状态条、行动卡、事件弹窗、FAQ、联系方式…）
data/         行动、事件、结局、广播、重复上限开关
lib/         i18n 字典、音频、埋点、状态完整性工具
store/       Zustand 游戏状态机
public/      图片、主题曲、Hero 视频
scripts/     postbuild.py（交付链）
docs/        架构、部署、SEO/GEO 说明
```

## 文档 / Docs

| 文档 | 内容 |
| --- | --- |
| [架构与数值](docs/ARCHITECTURE.md) | 状态机、五维数值、Aura、结局、上限开关、i18n |
| [构建与部署](docs/DEPLOYMENT.md) | 构建链、Cloudflare Pages、响应头、自检闸门 |
| [SEO / GEO](docs/SEO-GEO.md) | canonical、llms.txt、robots、Schema、中文编码 |

> 本仓库只包含**源码与文档**。构建产物（`out/`、`deploy/`）、交付 ZIP、
> 本地审计材料与内部记录不纳入版本管理，见 [`.gitignore`](.gitignore)。

## 联系 / Contact

- X: [@LaslosLife](https://x.com/LaslosLife)
- Email: <Laslos.Life@outlook.com>
