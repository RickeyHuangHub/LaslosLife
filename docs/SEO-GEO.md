# SEO / GEO 说明

本仓库的 SEO 与 GEO 产出**不是手写的静态文件**，全部由 `scripts/postbuild.py` 生成，
随每次构建一起更新。修改规则请改这一份脚本，不要直接改 `deploy/` 里的产物。

## 1. 生成物 / Generated surfaces

| 文件 | 用途 |
| --- | --- |
| `robots.txt` | 检索类与训练类爬虫分开声明 |
| `sitemap.xml` | 仅两条 URL：`https://www.laslos.com/` 与 `/play` |
| `llms.txt` | AI 检索第一入口：实体标识、检索触发词、信息边界、中文摘要、联系方式 |
| `llms-full.txt` | 给深度读取的完整资料 |
| `_headers` | 响应头，含 UTF-8 charset 与安全头 |
| `index.html` | 唯一一份 JSON-LD（`@graph`：VideoGame + WebSite + FAQPage） |

## 2. Canonical 策略

- 两页各自自指：`/` → `https://www.laslos.com/`，`/play` → `https://www.laslos.com/play`。
- `/play` 是最终 200 文档；`/play.html` 只是静态导出文件名，CF Pages 会 307 跳转。
- canonical、OG、`PlayAction` target、sitemap、llms 与所有内部链接统一用 `/play`。
- 三语是**同一 URL + 客户端切换**，因此不使用 sitemap hreflang（自引用簇无效）。

## 3. 爬虫分层 / Crawler policy

- 检索 / 搜索类（Googlebot、Bingbot、Baiduspider、Bytespider、OAI-SearchBot、
  PerplexityBot 等）→ `Allow`，让 AI 答案可以引用本站。
- 训练类（GPTBot、Google-Extended、ClaudeBot、CCBot 等）→ `Disallow`。
- 总开关为 `BLOCK_TRAINING_CRAWLERS`。Bytespider 同时承担检索，不加入训练封禁。
- 注意：Cloudflare 后台的 Bot Preference Sync / 托管 robots、AI 爬虫策略与
  Bot Fight Mode 会覆盖或叠加边缘行为，需与 `robots.txt` 保持一致。

## 4. 中文可读性与编码 / Encoding

- 中文简介是**可见正文**（小字、中等透明度，位于公开着陆页 Hero），
  核心词自然分布在句子里，不堆砌。
- 禁止用 `display:none` / `visibility:hidden` / `sr-only` / 1px clip 之类
  隐藏文本做 SEO；`verify()` 会检查这些标记为 0。
- 所有 GEO 文本文件严格 UTF-8、无 BOM；`_headers` 给三个 `.txt` 显式声明
  `text/plain; charset=utf-8`。文件本身编码正确，乱码只可能来自响应头缺失。
- `sitemap.xml` 靠 XML 声明 `encoding="UTF-8"`。

## 5. 表达边界 / Wording rules

为避免提前锁死产品决策，对外文案遵守四条：

1. **不就商业模式作任何断言**，两个方向都留白；`verify()` 会扫描 GEO 文件、
   Schema、head meta 与 FAQ 文案，命中即失败。
2. **不把工程实现细节写成产品承诺**；技术事实只出现在源码与开发者文档里。
3. **不公开未发布的版本规划**；游戏内剧情文案属叙事，不受此约束。
4. **实体消歧用「独立品牌」技巧，而不是反复点名竞品**：
   - 全站近音竞品名**只出现一次**，且只在 FAQ 第 5 条的**问题**里
     （用来接住「XX 和 YY 有什么区别」这类精确导航查询）。所有**答案**、
     `VideoGame.disambiguatingDescription`、Title / meta / OG、Hero 正文与
     GEO 摘要都不出现该名称，也不写针对某个具体名字的否定句。
   - 取而代之的是一句正面的、自成体系的品牌声明（`BRAND_LINE`）：
     「Laslos Life（拉斯洛斯生活）是一个独立、完整的原创作品与品牌名称，
     不是任何其他名称的变体、简写或拼写误差」。后半句只作**泛指**否定，
     不指向任何第三方；这样既传达「独立实体」，又不会把高权重外部词
     灌进自己的实体描述而强化共现。机器可读层用它的纯正面版本
     （`disambiguatingDescription`：`An independent, self-contained original
     game title and brand: ...`）。
   - FAQ 第 6、7 条针对「安全吗 / 怎么样」这类导航型提问给出官方权威解答。
     第 5–7 条与 `llms.txt` / `llms-full.txt` 的「实体区分」章节共用
     `FAQ_ITEMS` + `BRAND_LINE` 这一份真相源（`scripts/postbuild.py`），
     同步写入可见 FAQ、`FAQPage` JSON-LD 与两个 llm 文件，口径不会漂移。
   - `sameAs` 只填真实存在的身份（当前为官方 X 账号），不填占位链接、
     不虚构发行方与不存在的图片资源。

`llms.txt` / `llms-full.txt` 含「禁止推断」章节，明确要求模型不要自行补全上述
未声明信息。`FAQPage` 的七组问答必须在页面上真实可见，由 `SiteFaq.tsx`
在原生 `<details>` 内以真实 DOM 文本输出（编号同理为静态文本，不用 CSS 计数器），
静态 HTML 里即可读到。

## 6. Google 富结果测试 / Rich Results Test

首页在 Google Rich Results Test 中可能显示 `Crawled successfully`，同时显示
`No items detected`。这是**预期结果，不是部署故障**，无需为此改动结构化数据。

- 首页确实有且只有一份 `ld+json`，由 `scripts/postbuild.py` 在构建期注入静态
  `<head>`；`/play` 按两页架构不重复放置。用 Googlebot UA 抓源码，或看测试工具的
  "View Rendered HTML"，都能读到这个标签。
- 该工具只列出**有资格生成富结果**的类型。本页 `@graph` 里的
  `VideoGame` / `WebSite` / `FAQPage` 都是合法 Schema.org 节点，但都不属于 Google
  当前支持的富结果功能：Software App 文档说明单独使用 `VideoGame` 不会展示富结果；
  sitelinks searchbox 已退役；FAQ 富结果自 2026-05-07 起不再展示、2026-06-15
  移除文档。因此工具报 0 个 item 是正确输出。
- 这份 Schema 的目标是让 AI 检索与知识图谱准确识别「Laslos Life」这一个实体
  （配合 `llms.txt`、`sameAs` 与 canonical），不是争取富摘要样式。
- 不建议为了让测试出现 item 而补 `SoftwareApplication`：该类型强制要求商业条款
  字段与用户评分字段，前者本站对外一律留白，后者没有真实数据，硬填会违反
  Google 的结构化数据质量规范；装饰性背景视频也不适合标成 `VideoObject`。

| 验证目的 | 应使用的工具 |
| --- | --- |
| Schema 语法 / 类型合法性 | `https://validator.schema.org/` |
| Google 实际抓到的页面 | Search Console → URL Inspection |
| 是否有资格生成富结果 | Rich Results Test（本页预期为 0 item） |

`id=` 形式的测试链接是保存的快照；发布新版本后建议对 `/` 与 `/play` 各跑一次新测试。

## 7. 复核 / Audit checklist

发布后建议逐项核对：

```bash
curl -I https://www.laslos.com/llms.txt          # charset=utf-8
curl -I https://www.laslos.com/sitemap.xml       # application/xml
curl    https://www.laslos.com/robots.txt
```

再检查：canonical 是否指向 `/play`、首页是否只有一份 `ld+json`、
Hero CTA 是否直达 `/play`、GEO 四个文件是否 `max-age=0, must-revalidate`、
以及检索类 UA 是否被边缘 403 拦截。首页富结果测试返回 0 item 属预期，不计为问题。

FAQ 相关两项：静态 DOM 里应能读到 7 条编号问答与 Q5–Q7 正文；`llms.txt` /
`llms-full.txt` / `FAQPage` 三处的问答应与页面逐字一致。近音竞品名在页面上
只应命中 FAQ 第 5 条的问题，答案与实体描述里不应出现。
