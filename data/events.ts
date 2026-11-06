import { GameEvent } from '@/app/types';

export const LA_EVENTS: GameEvent[] = [
  // ── 5 Flagship Events (Aura Dignity Tension) ──
  {
    id: 'event_405_traffic',
    title: '405 号高速上的绝对静止',
    description: '你的破旧二手车在 405 号高速的晚高峰中抛锚了。身后的劳斯莱斯疯狂按喇叭，前方的加州夕阳把整条公路染成一片金色。你看了看空空如也的油箱，又看了看手里的旧书。',
    location: '405 Freeway',
    weight: 10,
    condition: (s) => s.hustleStreak.uber >= 1,
    choices: [
      {
        text: '放下车窗，旁若无人地开始认真读书，无视所有噪音（Aura +5, 体力 -15）',
        effect: { aura: 5, energy: -15, mental: 10 },
        log: '你在喧嚣的车流中保持了绝对的优雅，后车司机甚至停止了鸣笛，惊疑不定地看着你。',
        logKey: 'log_event_405_traffic_0',
      },
      {
        text: '厚着脸皮向隔壁车位的精英男求助，换取 $50 拖车费（金钱 +$50, Aura -10）',
        effect: { aura: -10, money: 50, mental: -5 },
        log: '你拿到了钱，但对方眼神里一闪而过的轻蔑让你感到一丝内心的失守。',
        logKey: 'log_event_405_traffic_1',
      },
    ],
  },
  {
    id: 'event_erewhon_smoothie',
    title: 'Erewhon 的海藻与冰沙',
    description: '在主打有机和中产阶级的 Erewhon 超市门口，一个时尚博主正拿着 $20 的 Hailey Bieber 联名草莓奶昔拍照。她顺手将一杯刚做好的样品递给你，笑得有些居高临下："亲爱的，你看起来需要补充点能量。"',
    location: 'Erewhon Market, Silver Lake',
    weight: 5,
    condition: (s) => s.money >= 0,
    choices: [
      {
        text: '微微颔首微笑，优雅地谢绝："谢谢，我对人工添加的排毒成分不感兴趣。"（Aura +8）',
        effect: { aura: 8, hunger: -5, mental: 5 },
        log: '你的眼神平静而疏离，对方反而在你的气场下尴尬地收回了手。',
        logKey: 'log_event_erewhon_smoothie_0',
      },
      {
        text: '接过奶昔一饮而尽，并在社交软件上假装定位打卡（饥饿+20, Aura -5）',
        effect: { aura: -5, hunger: 20, mental: 10 },
        log: '你获得了短暂的社交点赞，但你深知这不过是消费主义的又一次胜利。',
        logKey: 'log_event_erewhon_smoothie_1',
      },
    ],
  },
  {
    id: 'event_old_money_bar',
    title: '西好莱坞的无名金戒',
    description: '在 Sunset Boulevard 一家不对外公开的私人老钱酒吧，酒保在擦拭杯子时，无意间瞥见了你手腕上那枚磨损严重、却刻着古老欧洲纹章的旧戒指。他的动作瞬间停滞了。',
    location: 'Private Lounge, West Hollywood',
    weight: 4,
    condition: (s) => s.hasSignetRing && s.stats.aura >= 60,
    choices: [
      {
        text: '淡定地收回手，用流利的法语低声说："有些东西，看看就好。"（Aura +10）',
        effect: { aura: 10, mental: 15 },
        log: '酒保当场倒了一杯店里最昂贵的陈年威士忌推给你，全程再未多问一句。',
        logKey: 'log_event_old_money_bar_0',
      },
      {
        text: '顺势试探对方是否愿意高价收购这枚戒指换房租（金钱 +$800, 失去戒指, Aura -25）',
        effect: { aura: -25, money: 800, mental: -20, loseRing: true },
        log: '你拿到了救命的现金，但当戒指离手的那一刻，你感觉生命中某块最重要的底牌碎了。',
        logKey: 'log_event_old_money_bar_1',
      },
    ],
  },
  {
    id: 'event_hinge_crypto_bro',
    title: 'Hinge 约会：虚假的比弗利山庄',
    description: '网约的约会对象开着一辆租来的保时捷，试图在高级餐厅里用加密货币和区块链宏图对你进行精神压榨，顺便暗示今晚可以去他的海景公寓。',
    location: 'Nobu, Malibu',
    weight: 12,
    condition: (s) => (s.hustleStreak['hinge_coffee'] || 0) + (s.hustleStreak['hinge_dinner'] || 0) >= 1,
    choices: [
      {
        text: '优雅地切完最后一块三文鱼，买单离席："和您共进晚餐很无聊，再见。"（Aura +6）',
        effect: { aura: 6, money: -20, mental: 10 },
        log: '你把自己的那份餐费拍在桌上扬长而去，留他在原地目瞪口呆。',
        logKey: 'log_event_hinge_crypto_bro_0',
      },
      {
        text: '顺着他的虚荣心恭维，希望能蹭到一张免费的头等舱机票或名包（金钱 +$100, Aura -12）',
        effect: { aura: -12, money: 100, mental: -15 },
        log: '你得到了想要的物质甜头，但回租住房子的路上，镜子里的自己让你感到陌生。',
        logKey: 'log_event_hinge_crypto_bro_1',
      },
    ],
  },
  {
    id: 'event_ktown_landlord',
    title: '韩国城房东的最后通牒',
    description: '周五深夜，K-Town 公寓的房东用力砸着你的木门，大声警告："明晚 12 点前拿不出 $450 房租，就把你的行李全扔到大街上！"走廊里弥漫着廉价泡菜和霉味。',
    location: 'Koreatown Basement Apartment',
    weight: 15,
    condition: (s) => s.day % 7 === 0,
    choices: [
      {
        text: '隔着门用极其平静、不容置喙的语调说："明天傍晚前准时转账。"（Aura +5）',
        effect: { aura: 5, mental: -5 },
        log: '你的语气里有一种莫名的压迫感，房东嘟囔了两句竟然真的转身下楼了。',
        logKey: 'log_event_ktown_landlord_0',
      },
      {
        text: '立刻打开手机小贷 App，咬牙选择高息预支（负债 +$520, Aura -8）',
        effect: { aura: -8, money: 450, debt: 520, mental: -10 },
        log: '危机暂时解除，但看着飙升的利息账单，你知道自己离深渊又近了一步。',
        logKey: 'log_event_ktown_landlord_1',
      },
    ],
  },
  // ── Support Events ──
  {
    id: 'freeway_broken',
    title: '405 爆胎事故',
    description: '你驾车在 405 号高速公路上，突然听见砰的一声——左后轮爆胎了。身后的车流开始烦躁地鸣笛。',
    location: '405 Freeway',
    weight: 10,
    condition: (s) => s.hustleStreak.uber >= 1,
    choices: [
      {
        text: '叫拖车，自掏腰包 $150（金钱 -$150）',
        effect: { money: -150 },
        log: '🚗 405 高速爆胎，叫了拖车。损失 $150。',
        logKey: 'log_freeway_broken_0',
      },
      {
        text: '放弃今天的出车，坐在路边等救援（放弃收入机会）',
        effect: { mental: -5 },
        log: '🚗 405 爆胎，你只能放弃出车，坐在路边看着夕阳，心理 -5',
        logKey: 'log_freeway_broken_1',
      },
    ],
  },
  {
    id: 'date_ghost',
    title: 'Hinge 被鸽了',
    description: '你精心打扮准备赴约，等了一小时，对方没有回复消息。手机屏幕亮了一次——是他给别人的点赞。',
    location: 'West Hollywood',
    weight: 12,
    condition: (s) => (s.hustleStreak['hinge_coffee'] || 0) + (s.hustleStreak['hinge_dinner'] || 0) >= 1,
    choices: [
      {
        text: '哭一场，允许自己难过（心理 -15）',
        effect: { mental: -15 },
        log: '😭 Hinge 约会被鸽了，哭了一整晚。心理 -15',
        logKey: 'log_date_ghost_0',
      },
      {
        text: '化悲愤为动力，明天加倍工作（体力 -10，下次打工 +$30）',
        effect: { energy: -10 },
        log: '💪 被鸽了？行，明天更拼。体力 -10，但斗志拉满了',
        logKey: 'log_date_ghost_1',
      },
    ],
  },
  {
    id: 'wildfire_heat',
    title: '野火高温预警',
    description: '洛杉矶连续三天高温预警，空气里有股焦糊味。电费账单跳出来——$80 的附加费。',
    location: 'Koreatown Apartment',
    weight: 8,
    condition: (s) => s.day > 5,
    choices: [
      {
        text: '支付电费（金钱 -$80）',
        effect: { money: -80 },
        log: '🔥 野火高温预警，电费账单 +$80。交了就交了吧。',
        logKey: 'log_wildfire_heat_0',
      },
      {
        text: '不开空调硬扛两天（体力 -20/天 × 2）',
        effect: { energy: -20 },
        log: '🔥 高温预警，你选择不空调硬扛。体力大降。',
        logKey: 'log_wildfire_heat_1',
      },
    ],
  },
  {
    id: 'crystal_healing',
    title: 'Venice 水晶疗愈',
    description: '在 Venice Beach，一个穿白亚麻衣服的人拦住你："你能量场有点乱，要不要试试水晶疗愈？只要 $50。"',
    location: 'Venice Beach',
    weight: 6,
    condition: (s) => !s.isHomeless,
    choices: [
      {
        text: '付 $50 做水晶疗愈（心理 +10）',
        effect: { money: -50, mental: 10 },
        log: '🔮 Venice Beach 水晶疗愈，花了 $50，心里确实平静了一点',
        logKey: 'log_crystal_healing_0',
      },
      {
        text: '礼貌拒绝，继续走（心理 -5）',
        effect: { mental: -5 },
        log: '🔮 拒绝了水晶疗愈，但那个人盯着你看的眼神让你有点不舒服',
        logKey: 'log_crystal_healing_1',
      },
    ],
  },
  {
    id: 'viral_tiktok',
    title: 'TikTok 爆火！',
    description: '你随手拍的一段视频在 TikTok 上火了，已经有 10 万点赞。有人在评论区问你是什么牌子。',
    location: 'Los Angeles',
    weight: 4,
    condition: (s) => true,
    choices: [
      {
        text: '发一条回应视频（viralFame +3, 心理 +20）',
        effect: { mental: 20 },
        log: '📱 TikTok 爆了！10万赞，全网都在问你是谁',
        logKey: 'log_viral_tiktok_0',
      },
      {
        text: '删掉，不想被关注（什么都没发生）',
        effect: {},
        log: '📱 删除了视频。虽然有点可惜，但不想被盯着看',
        logKey: 'log_viral_tiktok_1',
      },
    ],
  },
  {
    id: 'taco_stomach',
    title: 'Taco Truck 吃坏肚子',
    description: '街角那家 Taco Truck 的 taco 只要 $2.5，但你开始后悔刚才吃的第三个了。',
    location: 'East Hollywood',
    weight: 5,
    condition: (s) => true,
    choices: [
      {
        text: '硬扛过去（饥饿 -30, 体力 -10）',
        effect: { hunger: -30, energy: -10 },
        log: '🌮 Taco Truck 的 taco 没扛住，肚子疼了一整天',
        logKey: 'log_taco_stomach_0',
      },
      {
        text: '去药店买药（花 $5，饥饿 -10）',
        effect: { money: -5, hunger: -10 },
        log: '🌮 去药店买了止痛药，花了 $5，但总比硬扛强',
        logKey: 'log_taco_stomach_1',
      },
    ],
  },
  {
    id: 'landlord_text',
    title: '房东催租短信',
    description: '周六早上，手机震了一下。房东发来短信："别忘了周六付房租。"',
    location: 'Koreatown Apartment',
    weight: 15,
    condition: (s) => s.day % 7 === 0,
    choices: [],
  },
  {
    id: 'influencer_boss',
    title: '网红老板暴走',
    description: '你在网红公司当助理，老板突然在直播中途暴怒，把所有东西摔了，指着你的鼻子骂。',
    location: 'Studio City',
    weight: 8,
    condition: (s) => s.hustleStreak['influencer_assistant'] >= 1,
    choices: [
      {
        text: '忍了，接受 $20 额外补偿（心理 -15, 金钱 +$20, Aura -5）',
        effect: { mental: -15, money: 20, aura: -5 },
        log: '😤 网红老板暴走，你忍了。拿了 $20 补偿，但心里的自尊碎了一角',
        logKey: 'log_influencer_boss_0',
      },
      {
        text: '辞职不干了（心理 +5）',
        effect: { mental: 5 },
        log: '👋 辞掉了网红助理的工作，虽然收入没了，但心情轻松了',
        logKey: 'log_influencer_boss_1',
      },
    ],
  },
  {
    id: 'klarna_popup',
    title: 'Klarna 弹窗广告',
    description: '你正在刷 Instagram，突然弹出一条 Klarna 广告："想买的那条裙子，每期只要 $30。"',
    location: 'Your Phone',
    weight: 10,
    condition: (s) => s.stats.beauty < 50,
    choices: [
      {
        text: '用 Klarna 分期买（外表 +30, 新债务 $120/4期）',
        effect: { beauty: 30 },
        log: '🛍️ 买了裙子，Klarna 分期 $120。外表好看很多了，但下个月账单更痛',
        logKey: 'log_klarna_popup_0',
      },
      {
        text: '关掉广告，继续刷（心理 -5）',
        effect: { mental: -5 },
        log: '✋ 关掉了 Klarna 广告，但那种"我也想要"的感觉还在',
        logKey: 'log_klarna_popup_1',
      },
    ],
  },
  {
    id: 'uber_passenger',
    title: '奇葩 Uber 乘客',
    description: '你的 Uber 来了个难缠的乘客，一路抱怨温度、音乐、路线，还试图少给小费。',
    location: 'Downtown LA',
    weight: 8,
    condition: (s) => s.hustleStreak.uber >= 1,
    choices: [
      {
        text: '听完他的故事，安慰他（心理 +5）',
        effect: { mental: 5 },
        log: '🚗 奇葩乘客讲了一路的人生，你听完了。没想到他最后给了你 $20 小费',
        logKey: 'log_uber_passenger_0',
      },
      {
        text: '冷漠打断，让他下车（心理 -3, 金钱 +$5）',
        effect: { mental: -3, money: 5 },
        log: '🚗 打断了他，他悻悻下车。小费少了 $5，但你也没心情了',
        logKey: 'log_uber_passenger_1',
      },
    ],
  },
  {
    id: 'gym_crush',
    title: '健身房 Crush',
    description: '你在健身房锻炼时，注意到一个让你心跳加速的人。对方也在看你。',
    location: 'Gold\'s Gym, Venice',
    weight: 6,
    condition: (s) => s.stats.beauty >= 50,
    choices: [
      {
        text: '去搭话（心理 +15，可能约会）',
        effect: { mental: 15 },
        log: '💪 去搭话了！聊得很投机，约了下次见面',
        logKey: 'log_gym_crush_0',
      },
      {
        text: '尴尬地盯，不敢行动（心理 -5）',
        effect: { mental: -5 },
        log: '💪 尴尬地盯了一会儿，没敢上去。心里有点后悔',
        logKey: 'log_gym_crush_1',
      },
    ],
  },
  {
    id: 'erewhon_run',
    title: 'Erewhon 采购冲动',
    description: '路过 Erewhon，里面飘出烘焙面包的香气。你想要那杯 $20 的草莓奶昔。',
    location: 'Erewhon, Silver Lake',
    weight: 5,
    condition: (s) => s.money >= 20,
    choices: [
      {
        text: '进去买（花钱 $20）',
        effect: { money: -20 },
        log: '🥤 进了 Erewhon，买了 $20 的草莓奶昔',
        logKey: 'log_erewhon_run_0',
      },
      {
        text: '忍住，绕路走（什么都不发生）',
        effect: {},
        log: '🥤 绕过了 Erewhon。省钱了，但香味还在鼻尖萦绕',
        logKey: 'log_erewhon_run_1',
      },
    ],
  },
  {
    id: 'roommate_drama',
    title: '室友矛盾',
    description: '合租室友今天又把厨房弄得一团糟，还说是你的错。你们在客厅对峙。',
    location: 'Koreatown Apartment',
    weight: 10,
    condition: (s) => !s.isHomeless,
    choices: [
      {
        text: '正面冲突（心理 -10）',
        effect: { mental: -10 },
        log: '🏠 和室友吵了一架，虽然解气但心情很差',
        logKey: 'log_roommate_drama_0',
      },
      {
        text: '回避，默默收拾（心理 -5, 饥饿 -10）',
        effect: { mental: -5, hunger: -10 },
        log: '🏠 默默收拾了厨房，没说话。但胃有点空',
        logKey: 'log_roommate_drama_1',
      },
    ],
  },
  {
    id: 'raya_match',
    title: 'Raya 匹配成功！',
    description: '你的手机震了——Raya 匹配通知。一个看起来很有钱的人给你发了消息。',
    location: 'Beverly Hills (virtually)',
    weight: 3,
    condition: (s) => s.stats.beauty >= 60,
    choices: [
      {
        text: '回消息聊聊（潜在约会机会）',
        effect: { mental: 10 },
        log: '💬 Raya 匹配，回复了消息。聊得不错，可能有戏',
        logKey: 'log_raya_match_0',
      },
      {
        text: '不感兴趣，关掉（什么都没有）',
        effect: {},
        log: '💬 关掉 Raya 通知。这种局不是你想要的',
        logKey: 'log_raya_match_1',
      },
    ],
  },
  {
    id: 'parking_ticket',
    title: '停车罚单',
    description: '你开车去上班，回来发现车窗上贴了一张罚单。$75。',
    location: 'Downtown LA',
    weight: 7,
    condition: (s) => !s.isHomeless,
    choices: [
      {
        text: '认栽交钱（金钱 -$75）',
        effect: { money: -75 },
        log: '🚗 停车罚单 $75。LA 的生活就是这么"贴心"',
        logKey: 'log_parking_ticket_0',
      },
      {
        text: '申诉试试（50% 赢，否则 $150）',
        effect: { money: -75 }, // simplified: 50% chance handled in event engine
        log: '🚗 停车罚单，你决定申诉。运气好的话能省一笔',
        logKey: 'log_parking_ticket_1',
      },
    ],
  },
  {
    id: 'compliment_stranger',
    title: '路人夸你',
    description: '在 Starbucks 排队时，一个陌生人走过来夸你："你的气质很特别。"',
    location: 'Starbucks, West Hollywood',
    weight: 5,
    condition: (s) => true,
    choices: [
      {
        text: '微笑感谢（心理 +8）',
        effect: { mental: 8 },
        log: '😊 陌生人夸你有气质，一整天心情都变好了',
        logKey: 'log_compliment_stranger_0',
      },
    ],
  },
  {
    id: 'instagram_envy',
    title: 'Instagram 焦虑',
    description: '你打开 Instagram，满屏都是朋友们的奢华生活照：Malibu 度假、Private Jet、NFT 赚翻了。',
    location: 'Your Phone',
    weight: 8,
    condition: (s) => s.stats.mental < 40,
    choices: [
      {
        text: '卸载 Instagram（心理 +10）',
        effect: { mental: 10 },
        log: '📵 卸载了 Instagram。世界清净了',
        logKey: 'log_instagram_envy_0',
      },
      {
        text: '继续刷，比较下去（心理 -10）',
        effect: { mental: -10 },
        log: '📱 继续刷 Instagram，越看越觉得自己一无是处',
        logKey: 'log_instagram_envy_1',
      },
    ],
  },
  {
    id: 'trader_joes',
    title: 'Trader Joe\'s 试吃',
    description: '路过 Trader Joe\'s，门口的试吃阿姨热情地塞给你一块有机饼干。',
    location: 'Trader Joe\'s, Los Feliz',
    weight: 5,
    condition: (s) => true,
    choices: [
      {
        text: '拿一块（饥饿 +15，免费）',
        effect: { hunger: 15 },
        log: '🥨 Trader Joe\'s 免费试吃，填了半饱',
        logKey: 'log_trader_joes_0',
      },
    ],
  },
  {
    id: 'lie_flat',
    title: '什么都不想做',
    description: '你今天只想躺在床上刷短视频。房租怎么办？工作怎么办？不管了。',
    location: 'Koreatown Apartment',
    weight: 7,
    condition: (s) => s.stats.mental < 20,
    choices: [],
  },
  {
    id: 'director_notice',
    title: '导演注目',
    description: '试镜结束后，导演叫住你："你身上有种…特别的东西。下次有个更大的角色，联系我。"',
    location: 'Hollywood Studio',
    weight: 6,
    condition: (s) => s.stats.aura >= 70,
    choices: [
      {
        text: '接受联系，保持联系（Aura +3, 心理 +15）',
        effect: { aura: 3, mental: 15 },
        log: '🎬 导演主动联系你，说你有"特别的东西"。希望是真正的机会',
        logKey: 'log_director_notice_0',
      },
      {
        text: '礼貌婉拒，保持距离（Aura +2）',
        effect: { aura: 2, mental: 5 },
        log: '🎬 婉拒了导演的邀请。你的边界感让导演反而更尊重你',
        logKey: 'log_director_notice_1',
      },
    ],
  },
  {
    id: 'european_mistaken',
    title: '被认成欧洲人',
    description: '在 Bootsy Bellows 夜店，有人过来搭话，一口流利意大利语，问你来自哪里。',
    location: 'Bootsy Bellows, LA',
    weight: 5,
    condition: (s) => s.stats.aura >= 70,
    choices: [
      {
        text: '顺水推舟（心理 +20, Aura +5）',
        effect: { mental: 20, aura: 5 },
        log: '🍸 被人用意大利语搭话，你接上了。氛围正好，没人拆穿',
        logKey: 'log_european_mistaken_0',
      },
      {
        text: '诚实纠正（心理 +10, Aura +3）',
        effect: { mental: 10, aura: 3 },
        log: '🍸 解释了自己不是欧洲人。对方反而觉得你"真实得很特别"',
        logKey: 'log_european_mistaken_1',
      },
    ],
  },
  {
    id: 'old_photo',
    title: '旧照片',
    description: '你在合租公寓的抽屉里翻到一张旧照片——你穿着不属于这条街区的衣服，站在一个认不出的房子前。照片背面有一行法文。',
    location: 'Koreatown Apartment',
    weight: 4,
    condition: (s) => s.day > 10 && s.stats.aura >= 60,
    choices: [
      {
        text: '收起来，不深想（心理 -5, Aura +2）',
        effect: { mental: -5, aura: 2 },
        log: '📷 把旧照片收进抽屉。法文是什么意思？你不知道，也不想知道',
        logKey: 'log_old_photo_0',
      },
      {
        text: '盯着看了很久（心理 -10, Aura +5, 饥饿 -5）',
        effect: { mental: -10, aura: 5, hunger: -5 },
        log: '📷 盯着那张照片看了很久。某些记忆碎片正在浮出水面…',
        logKey: 'log_old_photo_1',
      },
    ],
  },
];

// Helper to get effective weight with condition
export function getAvailableEvents(state: {
  stats: { aura: number; beauty: number; mental: number; hunger: number; energy: number };
  hustleStreak: Record<string, number>;
  day: number;
  isHomeless: boolean;
  money: number;
  debt: number;
  hasSignetRing: boolean;
}): GameEvent[] {
  return LA_EVENTS.filter((e) => !e.condition || e.condition(state)).map((e) => ({
    ...e,
    weight: e.weight || 1,
  }));
}

export function rollEvent(events: GameEvent[]): GameEvent | null {
  const totalWeight = events.reduce((sum, e) => sum + (e.weight || 1), 0);
  let roll = Math.random() * totalWeight;
  for (const event of events) {
    roll -= event.weight || 1;
    if (roll <= 0) return event;
  }
  return events[events.length - 1] || null;
}
