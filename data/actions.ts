import { GameAction, GameState, ActionResult } from '@/app/types';
import { auraBlessingAvailable } from '@/data/limits';

// ─── Helpers ──────────────────────────────────────────────────

const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const applyStat = (stats: GameState['stats'], delta: Partial<GameState['stats']>) => {
  const s: Record<string, number> = { ...stats };
  for (const key of Object.keys(delta) as Array<keyof GameState['stats']>) {
    s[key] = clamp(s[key] + (delta[key] ?? 0), 0, 100);
  }
  return s;
};

// ─── Actions ──────────────────────────────────────────────────

export const ACTIONS: GameAction[] = [
  // ── Hustle ──
  {
    id: 'doordash',
    label: 'DoorDash 送餐',
    emoji: '🛵',
    category: 'hustle',
    image: '/actions/doordash.jpg',
    energyCost: 20,
    hungerCost: 5,
    execute: (s) => {
      const streak = (s.hustleStreak['doordash'] || 0) + 1;
      const auraPenalty = streak >= 5 ? -5 : 0;
      const earned = Math.round(rand(45, 80));
      const newStats = applyStat(s.stats, { energy: -20, hunger: -5 });
      if (auraPenalty) newStats.aura = Math.max(0, newStats.aura + auraPenalty);
      return {
        money: earned,
        stats: newStats,
        hustleStreak: { ...s.hustleStreak, doordash: streak },
        message: `DoorDash ${earned}`,
        logText: `🛵 DoorDash 跑单，赚了 $${earned}${auraPenalty ? '（体力活磨损了气质…）' : ''}`,
        logKey: 'log_doordash',
        logParams: { amount: earned, auraNote: auraPenalty ? ' (manual labor wore down her aura...)' : '' },
      };
    },
  },
  {
    id: 'uber',
    label: 'Uber 开车',
    emoji: '🚗',
    category: 'hustle',
    image: '/actions/uber.jpg',
    energyCost: 25,
    execute: (s) => {
      if (s.isHomeless) return {
        message: '没有车',
        logText: '🚗 没有车，无法接单',
        logKey: 'log_uber_nocar',
      };
      const streak = (s.hustleStreak['uber'] || 0) + 1;
      const auraPenalty = streak >= 5 ? -5 : 0;
      const earned = Math.round(rand(60, 120));
      // 15% chance: 405 breakdown
      if (Math.random() < 0.15) {
        const towCost = 150;
        const newStats = applyStat(s.stats, { energy: -25 });
        if (auraPenalty) newStats.aura = Math.max(0, newStats.aura + auraPenalty);
        return {
          money: -towCost,
          stats: newStats,
          hustleStreak: { ...s.hustleStreak, uber: streak },
          message: `405 爆胎！$${towCost}`,
          logText: `🚗 405 高速爆胎！损失 $${towCost}，错过了今晚的出车时段`,
          logKey: 'log_uber_breakdown',
          logParams: { amount: towCost },
        };
      }
      const newStats = applyStat(s.stats, { energy: -25 });
      if (auraPenalty) newStats.aura = Math.max(0, newStats.aura + auraPenalty);
      return {
        money: earned,
        stats: newStats,
        hustleStreak: { ...s.hustleStreak, uber: streak },
        message: `Uber ${earned}`,
        logText: `🚗 Uber 跑单，赚了 $${earned}${auraPenalty ? '（重复的路途磨损了气质…）' : ''}`,
        logKey: 'log_uber_earn',
        logParams: { amount: earned, auraNote: auraPenalty ? ' (repetitive roads ground down her aura...)' : '' },
      };
    },
  },
  {
    id: 'audition',
    label: 'Hollywood 试镜',
    emoji: '🎬',
    category: 'hustle',
    image: '/actions/audition.jpg',
    energyCost: 30,
    execute: (s) => {
      if (s.stats.beauty < 30) {
        return {
          stats: applyStat(s.stats, { energy: -30 }),
          message: '外表不够',
          logText: '🎬 试镜失败——外表不够，连试镜的门都没进',
          logKey: 'log_audition_reject',
        };
      }
      let baseSuccess = 0.30;
      if (s.stats.aura >= 80) baseSuccess += 0.20;
      const succeeded = Math.random() < baseSuccess;
      const newStats = applyStat(s.stats, { energy: -30 });
      if (succeeded) {
        const reward = Math.round(rand(150, 250));
        newStats.mental = clamp(newStats.mental + 15, 0, 100);
        if (s.stats.aura >= 70) {
          newStats.aura = clamp(newStats.aura + 3, 0, 100);
          return {
            money: reward,
            stats: newStats,
            message: `试镜成功 $${reward}`,
            logText: `🎬 试镜成功！导演注意到你身上「某种说不清的东西」，给了你 $${reward}`,
            logKey: 'log_audition_success_aura',
            logParams: { amount: reward },
          };
        }
        return {
          money: reward,
          stats: newStats,
          message: `试镜成功 $${reward}`,
          logText: `🎬 试镜成功！赚了 $${reward}`,
          logKey: 'log_audition_success',
          logParams: { amount: reward },
        };
      }
      newStats.mental = clamp(newStats.mental - 8, 0, 100);
      return {
        stats: newStats,
        message: '试镜失败',
        logText: '🎬 试镜失败，心理 -8',
        logKey: 'log_audition_fail',
      };
    },
  },
  {
    id: 'barista',
    label: '咖啡师排班',
    emoji: '☕',
    category: 'hustle',
    image: '/actions/barista.jpg',
    energyCost: 15,
    execute: (s) => {
      const newStats = applyStat(s.stats, { energy: -15, mental: -5 });
      return {
        money: 55,
        stats: newStats,
        message: '咖啡师 $55',
        logText: '☕ 咖啡店排班，赚了 $55，但有点无聊（心理 -5）',
        logKey: 'log_barista',
      };
    },
  },
  {
    id: 'influencer_assistant',
    label: '网红助理',
    emoji: '📱',
    category: 'hustle',
    image: '/actions/influencer_assistant.jpg',
    energyCost: 20,
    execute: (s) => {
      const newStats = applyStat(s.stats, { energy: -20, mental: -10 });
      // 10% viral boost
      const viral = Math.random() < 0.10;
      if (viral) {
        newStats.mental = clamp(newStats.mental + 10, 0, 100);
        return {
          money: 90,
          stats: newStats,
          message: '网红助理 viral',
          logText: '📱 网红助理赚了 $90，还意外接到了一个 viral 推广（心理 +10）',
          logKey: 'log_influencer_viral',
        };
      }
      return {
        money: 75,
        stats: newStats,
        message: '网红助理 $75',
        logText: '📱 网红助理，赚了 $75，但老板很烦（心理 -10）',
        logKey: 'log_influencer_normal',
      };
    },
  },
  {
    id: 'online_gig',
    label: '线上接单',
    emoji: '💻',
    category: 'hustle',
    image: '/actions/online_gig.jpg',
    energyCost: 10,
    execute: (s) => {
      const earned = Math.round(rand(40, 60));
      const newStats = applyStat(s.stats, { energy: -10 });
      return {
        money: earned,
        stats: newStats,
        message: `线上接单 $${earned}`,
        logText: `💻 在家接了线上单，赚了 $${earned}，最省体力的活`,
        logKey: 'log_online_gig',
        logParams: { amount: earned },
      };
    },
  },
  // ── Beauty ──
  {
    id: 'drugstore_skincare',
    label: '药店护肤',
    emoji: '🧴',
    category: 'beauty',
    image: '/actions/drugstore_skincare.jpg',
    cost: 15,
    execute: (s) => {
      if (s.money < 15) return {
        message: '钱不够',
        logText: '🧴 想去药店护肤，但钱包空空',
        logKey: 'log_skincare_broke',
      };
      const newStats = applyStat(s.stats, { beauty: 15, mental: 5 });
      return {
        money: -15,
        stats: newStats,
        message: '药店护肤完成',
        logText: '🧴 药店买了基础护肤品，外表 +15，心情好了一点',
        logKey: 'log_skincare',
      };
    },
  },
  {
    id: 'ktown_nails',
    label: 'K-Town 美甲',
    emoji: '💅',
    category: 'beauty',
    image: '/actions/ktown_nails.jpg',
    cost: 35,
    execute: (s) => {
      if (s.money < 35) return {
        message: '钱不够',
        logText: '💅 想去 K-Town 做美甲，但余额不足',
        logKey: 'log_nails_broke',
      };
      const newStats = applyStat(s.stats, { beauty: 25, mental: 10 });
      return {
        money: -35,
        stats: newStats,
        message: 'K-Town 美甲完成',
        logText: '💅 K-Town 美甲店，花了 $35，指甲漂亮了（外表 +25，心理 +10）',
        logKey: 'log_nails',
      };
    },
  },
  {
    id: 'gym',
    label: '健身房',
    emoji: '💪',
    category: 'beauty',
    image: '/actions/gym.jpg',
    cost: 25,
    execute: (s) => {
      if (s.money < 25) return {
        message: '钱不够',
        logText: '💪 想健身，但连会员费都付不起',
        logKey: 'log_gym_broke',
      };
      const newStats = applyStat(s.stats, { beauty: 20, energy: -15 });
      return {
        money: -25,
        stats: newStats,
        message: '健身房完成',
        logText: '💪 健身房练了一小时，外表 +20，但累坏了（体力 -15）',
        logKey: 'log_gym',
      };
    },
  },
  {
    id: 'sephora',
    label: 'Sephora 扫货',
    emoji: '✨',
    category: 'beauty',
    image: '/actions/sephora.jpg',
    cost: 80,
    execute: (s) => {
      if (s.money < 80) return {
        message: '钱不够',
        logText: '✨ 想逛 Sephora，但卡里只剩两位数了',
        logKey: 'log_sephora_broke',
      };
      const newStats = applyStat(s.stats, { beauty: 35, mental: 15 });
      // 50% Klarna temptation
      if (Math.random() < 0.50) {
        newStats.beauty = clamp(newStats.beauty + 10, 0, 100);
        return {
          money: -80,
          stats: newStats,
          message: 'Sephora + Klarna',
          logText: '✨ Sephora 扫货 $80，外表 +35。Klarna 弹窗弹出来了…（50%概率陷入分期陷阱）',
          logKey: 'log_sephora_klarna',
        };
      }
      return {
        money: -80,
        stats: newStats,
        message: 'Sephora 扫货完成',
        logText: '✨ Sephora 花了 $80，外表 +35，心情超好',
        logKey: 'log_sephora',
      };
    },
  },
  {
    id: 'erewhon_smoothie',
    label: 'Erewhon 奶昔',
    emoji: '🥤',
    category: 'beauty',
    image: '/actions/erewhon_smoothie.jpg',
    cost: 20,
    execute: (s) => {
      if (s.money < 20) return {
        message: '钱不够',
        logText: '🥤 想喝 Erewhon 奶昔，但 $20 也不便宜',
        logKey: 'log_erewhon_broke',
      };
      const newStats = applyStat(s.stats, { beauty: 5, mental: 10 });
      return {
        money: -20,
        stats: newStats,
        message: 'Erewhon 奶昔',
        logText: '🥤 在 Erewhon 买了杯 $20 奶昔——外表只 +5，但虚荣感爆棚（心理 +10）',
        logKey: 'log_erewhon',
      };
    },
  },
  // ── Social ──
  {
    id: 'hinge_coffee',
    label: 'Hinge 咖啡约会',
    emoji: '☕',
    category: 'social',
    image: '/actions/hinge_coffee.jpg',
    cost: 10,
    execute: (s) => {
      if (s.money < 10) return {
        message: '钱不够',
        logText: '☕ 刷了刷 Hinge，但连咖啡钱都凑不齐',
        logKey: 'log_hinge_coffee_broke',
      };
      // Ghost rate: base 40%, reduced by Aura
      let ghostRate = 0.40;
      if (s.stats.aura >= 80) ghostRate -= 0.15;
      const ghosted = Math.random() < ghostRate;
      const newStats = applyStat(s.stats, {});
      if (ghosted) {
        newStats.mental = clamp(newStats.mental - 20, 0, 100);
        return {
          money: -10,
          stats: newStats,
          message: '被鸽了',
          logText: '☕ Hinge 咖啡约会，被鸽了。心理 -20，盯着手机等了一个下午',
          logKey: 'log_hinge_coffee_ghosted',
        };
      }
      newStats.mental = clamp(newStats.mental + 15, 0, 100);
      return {
        money: -10,
        stats: newStats,
        message: '约会成功',
        logText: '☕ Hinge 咖啡约会，聊得很开心（心理 +15）',
        logKey: 'log_hinge_coffee_ok',
      };
    },
  },
  {
    id: 'hinge_dinner',
    label: 'Hinge 晚餐约会',
    emoji: '🍽️',
    category: 'social',
    image: '/actions/hinge_dinner.jpg',
    cost: 50,
    execute: (s) => {
      if (s.money < 50) return {
        message: '钱不够',
        logText: '🍽️ 想看 Hinge 晚餐约会，但余额不足',
        logKey: 'log_hinge_dinner_broke',
      };
      let ghostRate = 0.35;
      if (s.stats.aura >= 80) ghostRate -= 0.10;
      const ghosted = Math.random() < ghostRate;
      const newStats = applyStat(s.stats, {});
      if (ghosted) {
        newStats.mental = clamp(newStats.mental - 30, 0, 100);
        return {
          money: -50,
          stats: newStats,
          message: '被鸽了',
          logText: '🍽️ Hinge 晚餐约会，被鸽了。心理 -30，花了 $50 吃了空气',
          logKey: 'log_hinge_dinner_ghosted',
        };
      }
      newStats.mental = clamp(newStats.mental + 25, 0, 100);
      return {
        money: -50,
        stats: newStats,
        message: '约会成功',
        logText: '🍽️ Hinge 晚餐约会，气氛很好（心理 +25）',
        logKey: 'log_hinge_dinner_ok',
      };
    },
  },
  {
    id: 'ktown_spring',
    label: 'K-Town 烧酒夜',
    emoji: '🍶',
    category: 'social',
    image: '/actions/ktown_spring.jpg',
    cost: 30,
    execute: (s) => {
      if (s.money < 30) return {
        message: '钱不够',
        logText: '🍶 想和闺蜜去 K-Town 喝烧酒，但余额不足',
        logKey: 'log_ktown_spring_broke',
      };
      const newStats = applyStat(s.stats, { mental: 20, energy: -15, beauty: -5 });
      return {
        money: -30,
        stats: newStats,
        message: 'K-Town 烧酒夜',
        logText: '🍶 K-Town 烧酒夜，和闺蜜吐槽到凌晨（心理 +20，体力 -15，外表 -5）',
        logKey: 'log_ktown_spring',
      };
    },
  },
  {
    id: 'club_bootsy',
    label: 'Bootsy Bellows 夜店',
    emoji: '🍸',
    category: 'social',
    image: '/actions/club_bootsy.jpg',
    cost: 300,
    execute: (s) => {
      if (s.money < 200) return {
        message: '钱不够',
        logText: '🍸 想去 Bootsy Bellows，但门票+酒水不便宜',
        logKey: 'log_club_broke',
      };
      // The bill rolls 200–500, but must never exceed the cash actually on hand.
      // UI advertises cost: 300, so without this cap a $300 wallet could be
      // charged $500 and end up at -$200 (unpayable, unrecoverable cash).
      const cost = Math.min(Math.round(rand(200, 500)), s.money);
      const newStats = applyStat(s.stats, { mental: 40 });
      if (s.stats.beauty >= 50) newStats.beauty = clamp(newStats.beauty + 10, 0, 100);
      // Aura ≥ 70: 15% chance mistaken for European
      if (s.stats.aura >= 70 && Math.random() < 0.15) {
        newStats.aura = clamp(newStats.aura + 5, 0, 100);
        return {
          money: -cost,
          stats: newStats,
          message: '夜店奇遇！',
          logText: `🍸 Bootsy Bellows 夜店，花了 $${cost}。有人用意大利语跟你搭话…（Aura +5）`,
          logKey: 'log_club_european',
          logParams: { amount: cost },
        };
      }
      return {
        money: -cost,
        stats: newStats,
        message: 'Bootsy Bellows',
        logText: `🍸 Bootsy Bellows 夜店，花了 $${cost}，心理 +40`,
        logKey: 'log_club_normal',
        logParams: { amount: cost },
      };
    },
  },
  {
    id: 'girls_night_in',
    label: '闺蜜在家喝酒',
    emoji: '🏠',
    category: 'social',
    image: '/actions/girls_night_in.jpg',
    cost: 15,
    execute: (s) => {
      if (s.money < 15) return {
        message: '钱不够',
        logText: '🏠 想叫闺蜜来家里喝酒，但连零食都买不起',
        logKey: 'log_girls_night_broke',
      };
      const newStats = applyStat(s.stats, { mental: 25, hunger: 10 });
      return {
        money: -15,
        stats: newStats,
        message: '闺蜜在家喝酒',
        logText: '🏠 闺蜜来家里喝酒聊天，性价比最高的恢复方式（心理 +25，饥饿 +10）',
        logKey: 'log_girls_night',
      };
    },
  },
  {
    id: 'venice_sunset',
    label: 'Venice 海滩日落',
    emoji: '🌅',
    category: 'social',
    image: '/actions/venice_sunset.jpg',
    execute: (s) => {
      const newStats = applyStat(s.stats, { mental: 10, beauty: -5 });
      // Aura ≥ 60: solo monologue. The +2 Aura is now gated by the weekly
      // cap switch; the +10 mental / -5 beauty numbers are unchanged.
      if (auraBlessingAvailable(s)) {
        newStats.aura = clamp(newStats.aura + 2, 0, 100);
        return {
          stats: newStats,
          message: '海滩独白',
          logText: '🌅 Venice 海滩看日落。夕阳很美，你忽然想起来了什么…（Aura +2）',
          logKey: 'log_venice_aura',
        };
      }
      return {
        stats: newStats,
        message: 'Venice 海滩日落',
        logText: '🌅 Venice 海滩看日落，免费又治愈（心理 +10，外表 -5 晒伤）',
        logKey: 'log_venice_normal',
      };
    },
  },
  // ── Finance ──
  {
    id: 'earnin_advance',
    label: 'EarnIn 预支工资',
    emoji: '💳',
    category: 'finance',
    image: '/actions/earnin_advance.jpg',
    // Amounts untouched ($200 in / $230 debt). Repetition is capped by
    // EARNIN_DAILY_CAP in data/limits.ts, enforced by the store + ActionHub.
    execute: (s) => {
      return {
        money: 200,
        debt: {
          id: `earnin_${Date.now()}`,
          source: 'EarnIn',
          principal: 230,
          interestRate: 0.15,
          installmentsRemaining: 1,
          installmentAmount: 230,
          createdAt: Date.now(),
        },
        message: 'EarnIn 预支 $200',
        logText: '💳 EarnIn 预支了 $200，下周要还 $230…利息不低',
        logKey: 'log_earnin',
      };
    },
  },
  {
    id: 'klarna_split',
    label: 'Klarna 分期消费',
    emoji: '🛍️',
    category: 'finance',
    image: '/actions/klarna_split.jpg',
    cost: 50,
    execute: (s) => {
      if (s.money < 50) return {
        message: 'Klarna 需要最低 $50',
        logText: '🛍️ 想用 Klarna 分期，但连 $50 的基础消费都没有',
        logKey: 'log_klarna_broke',
      };
      const total = 50;
      const perPayment = Math.round(total / 4) + 5;
      return {
        money: -total,
        debt: {
          id: `klarna_${Date.now()}`,
          source: 'Klarna',
          principal: total,
          interestRate: 0,
          installmentsRemaining: 4,
          installmentAmount: perPayment,
          createdAt: Date.now(),
        },
        message: `Klarna 分期 $${total}`,
        logText: `🛍️ Klarna 分期 $${total}，每期 $${perPayment}，下个月开始还`,
        logKey: 'log_klarna',
        logParams: { amount: total, perPay: perPayment },
      };
    },
  },
  {
    id: 'pay_debt',
    label: '提前还债',
    emoji: '📉',
    category: 'finance',
    image: '/actions/pay_debt.jpg',
    execute: (s) => {
      if (s.debt <= 0) return {
        message: '没有债务',
        logText: '📉 看了一眼账单，没有待还债务',
        logKey: 'log_pay_debt_none',
      };
      const payAmount = Math.min(s.money, Math.min(100, s.debt));
      if (payAmount <= 0) return {
        message: '钱不够还债',
        logText: '📉 想还债，但钱包比脸还干净',
        logKey: 'log_pay_debt_broke',
      };
      // `number` means "amount paid off", NOT the remaining balance.
      // The store does: newDebt = max(0, debt - result.debt).
      // Returning `s.debt - payAmount` here used to subtract twice.
      return {
        money: -payAmount,
        debt: payAmount,
        message: `提前还债 $${payAmount}`,
        logText: `📉 提前还了 $${payAmount} 的债，肩膀轻了一点`,
        logKey: 'log_pay_debt',
        logParams: { amount: payAmount },
      };
    },
  },
];
