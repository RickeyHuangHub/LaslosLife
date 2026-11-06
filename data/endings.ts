import { GameState, Ending } from '@/app/types';

export const ENDINGS: Ending[] = [
  {
    id: 'la_queen',
    title: 'LA Queen',
    emoji: '👑',
    condition: (s) => s.day > 30 && s.money > 500 && s.stats.aura >= 60,
    text: '她站在 Erewhon 门口，阳光打在脸上。有人回头看了她很久。她到底是什么人？没人知道。但这个月她赢了。',
  },
  {
    id: 'survivor',
    title: 'Survivor',
    emoji: '🌴',
    condition: (s) => s.day > 30 && s.money <= 500,
    text: '30天。她还在这儿。冰箱里只有半盒 Taco。但她眼神没变。那种东西还在。',
  },
  {
    id: 'faded_aura',
    title: 'Faded',
    emoji: '🥀',
    condition: (s) => s.day > 30 && s.stats.aura < 30,
    text: '她完成了30天，但镜子里的那个人……和刚来时不一样了。那层说不清的东西，被这30天磨掉了。她还记得自己是谁吗？',
  },
  {
    id: 'evicted',
    title: 'Evicted',
    emoji: '📦',
    condition: (s) => s.evictionWarnings >= 2,
    text: '她的东西在人行道上。路人经过时多看了她一眼——不像看一个被驱逐的租客，像看一个走错片场的人。',
  },
  {
    id: 'breakdown',
    title: 'Breakdown',
    emoji: '💔',
    condition: (s) => s.stats.mental <= 0,
    text: '她坐在 Koreatown 的楼梯上，哭得很安静。路过的人觉得她哭的姿势不太对——像是在某个很远的地方学会的。',
  },
  {
    id: 'bankrupt',
    title: 'Bankrupt',
    emoji: '💸',
    condition: (s) => s.debt > 500,
    text: '催收电话响了第七次。她没接。她看着窗外的棕榈树，表情平静得不像一个破产的人。',
  },
  {
    id: 'starved',
    title: 'Fainted',
    emoji: '😵',
    condition: (s) => s.stats.hunger <= 0,
    text: '她晕倒在 Sunset Blvd。急救人员扶起她时嘀咕了一句："她的手不像干粗活的。"',
  },
  {
    id: 'mystery',
    title: '???',
    emoji: '🌊',
    condition: (s) => s.day > 30 && s.stats.aura >= 85 && s.auraEventsTriggered >= 2,
    text: '她站在太平洋边。手机响了——一个不认识的国际号码。她看着屏幕很久，然后关了机。风吹过来，她笑了。游戏结束。她是什么人？永远没有答案。',
  },
];

export function getEnding(state: GameState): Ending | null {
  return ENDINGS.find((e) => e.condition(state)) ?? null;
}
