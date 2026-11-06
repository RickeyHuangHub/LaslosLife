# 架构与数值 / Architecture & Balance

一份可读的源码地图。所有数值以 `data/`、`store/` 中的定义为准；本文只解释设计意图。

## 1. 状态机 / State machine

```
CharacterCreation ──▶ morning ──▶ afternoon ──▶ evening ──▶ day+1
                          │            │            │
                          └──── 行动 / 事件 / 衰减 ────┘
                                      │
                      day 7 / 14 / 21 / 28 evening → 房租结算
                                      │
                              day > 30 或触发终局条件 → Ending
```

- `store/useGameStore.ts` 是唯一的状态机，Zustand 驱动。
- `advanceTime()` **先提交** `day / timeSlot / stats` 再触发结算；顺序颠倒会把游戏锁在同一时段。
- `rentDueWeek(day, slot, lastSettledWeek)` 判定应收租周，`lastSettledWeek` 保证**一周只扣一次**；
  「躺平」可能跨过周六，因此日历越过某一周时同样补结算。
- 房租 `$450 / 周`，初始现金 `$50`。

## 2. 五维数值 / Five stats

初始值：饥饿 65 · 体力 70 · 心理 55 · 外表 45 · Aura 70。

| 数值 | 每时段 | 低值阈值 | 归零 |
| --- | --- | --- | --- |
| 饥饿 hunger | −8 | <20 体力衰减 ×2 | 强制跳过时段 |
| 体力 energy | −5 | <20 收益减半 | 强制休息 |
| 心理 mental | −3 | <20 进入躺平分支（概率） | 游戏结束 |
| 外表 beauty | −2 | <20 收入 −50%；<10 社交锁定 | — |
| Aura | 不衰减 | <40 收入 −10%，特殊事件不再触发 | — |

Aura 不显示在 UI 上，只由**尊严抉择**改变：≥80 提升试镜成功率并降低约会被鸽概率；
连续 5 次体力活 −5；拒绝屈辱选择 +3~10。设计上它负责让短期现金与长期身份正面对撞。

## 3. 经济与债务 / Cash & debt

- `ActionResult.debt` 是**双语义**，最容易读错：
  - `DebtEntry` 对象 = 新增一笔债（`newDebt += principal`）
  - `number` = **本次还掉的金额**（`newDebt = max(0, debt − amount)`，不是剩余余额）
- `ChoiceEffect.debt`（事件选项）是另一套口径：纯加算。
- 现金恒有下限 `0`，行动与事件两条路径都做了钳制，避免随机花费造成负现金。
- 债务 > 500 触发 `bankrupt` 终局。

## 4. 重复上限 / Repeat caps

`data/limits.ts` 是**频率开关的单一真相源**，只限制次数、不改任何既有数值：

| 开关 | 默认 | 作用 |
| --- | --- | --- |
| `REPEAT_CAPS_ENABLED` | `true` | 总开关；置 `false` 立即恢复原始无限重复 |
| `EARNIN_DAILY_CAP` | `1` | EarnIn 垫资每个游戏日 1 次（`earninUsesToday`，每日 morning 重置） |
| `VENICE_WEEKLY_AURA_CAP` | `1` | Venice 的 +2 Aura 每周 1 次（`weeklyAuraBlessingUsed`，结算时重置） |

store 前置拦截 + `ActionHub` 禁用卡片，双层防御。Venice 本身仍可用（+10 心理 / −5 外表），
只封顶 Aura 祝福。若要把周上限调到 >1，需先把布尔字段换成计数器。

## 5. 内容 / Content

| 模块 | 数量 | 说明 |
| --- | --- | --- |
| `data/actions.ts` | 20 | 行动卡，含配图、能量成本、结果函数 |
| `data/events.ts` | 27 | 叙事事件，旗舰事件带 Aura 抉择 |
| `data/endings.ts` | 8 | 见下表 |
| `data/broadcasts.ts` | 15 | 环境广播文案 |

| 结局 id | 触发方向 |
| --- | --- |
| `la_queen` | 撑过 30 天，现金 > 500 且 Aura ≥ 60 |
| `survivor` | 撑过 30 天，现金 ≤ 500 |
| `faded_aura` | 撑过 30 天但 Aura < 30 |
| `mystery` | 撑过 30 天，Aura ≥ 85 且身世事件 ≥ 2（隐藏结局） |
| `evicted` | 驱逐警告累计 2 次 |
| `breakdown` | 心理归零 |
| `bankrupt` | 债务 > 500 |
| `starved` | 饥饿归零 |

## 6. 三语 / i18n

`lib/i18n.ts` 提供 `en / zh / de` 三语字典，`components/I18n.tsx` 的 `useI18n()` 提供 `t()`。
约定：

- 新增 action：`data/actions.ts` 加 `id`，三语字典各加 `action_<id>` 与 `action_<id>_desc`。
- 新增事件：在 `components/EventModal.tsx` 的 `EVENT_I18N_MAP` 与 `EVENT_CHOICE_KEYS` 登记。
- 动态文案用 `logKey` + `logParams` 的 `{param}` 占位符，不要把变量拼进 `text`。
- 面向玩家的文案一律走 `t()`，不硬编码。
- `I18nProvider` 服务端与客户端首帧统一 `en`，语言偏好只在 mount 后读取，避免 hydration 错误。

## 7. 状态完整性 / State integrity

`lib/checksum.ts` 对结果相关的字段生成全状态校验和，`lib/secureStorage.ts` 负责序列化，
`onRehydrateStorage()` 做结构校验、类型与范围钳制、日志裁剪，并把旧格式平滑升级。
这是**客户端的混淆与防误写措施，不是安全边界**：任何前端状态都可被本地改写。
`SAVE_VERSION` 保持 `2`，升级版本号会清掉既有进度。

## 8. 模块速查 / File map

| 路径 | 职责 |
| --- | --- |
| `store/useGameStore.ts` | 状态机、结算、终局判定、持久化 |
| `store/useAchievementStore.ts` | 成就记录 |
| `components/ActionHub.tsx` | 行动卡、可负担性与上限锁定 |
| `components/EventModal.tsx` | 事件与选项 |
| `components/RentCountdown.tsx` | 与结算同口径的房租倒数 |
| `app/page.tsx` / `app/play/page.tsx` | 着陆页 / 游戏页 |
| `lib/analytics.ts` | 埋点事件（派发 `laslos:stats-*`） |
| `scripts/postbuild.py` | 交付链与自检，见 [DEPLOYMENT.md](DEPLOYMENT.md) |
