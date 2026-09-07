import type { WorldDef } from '../types';

/** 闯关地图：5 个世界 × 5 关。每一关都有明确的一小步目标。 */
export const WORLDS: WorldDef[] = [
  {
    id: 'w1',
    name: '破冰村',
    emoji: '👋',
    subtitle: '开口第一句，其实最难',
    gradient: 'from-brand-400 to-brand-600',
    accent: 'brand',
    levels: [
      {
        id: 'w1-l1',
        worldId: 'w1',
        order: 1,
        title: '第一声 Hello',
        kind: 'phrase',
        phrases: [
          { id: 'w1l1p1', en: 'Good morning, how are you today?', zh: '早上好，今天怎么样？', tip: 'how are you 常连读成 /haʊwɑːjuː/' },
          { id: 'w1l1p2', en: 'Hi, I do not think we have met.', zh: '嗨，我们好像还没见过。' },
          { id: 'w1l1p3', en: 'It is nice to finally meet you.', zh: '很高兴终于见到你。', tip: '注意 finally 三个音节 fi-nal-ly' },
          { id: 'w1l1p4', en: 'How is everything going?', zh: '一切都还顺利吗？' },
          { id: 'w1l1p5', en: 'Long time no see, you look great.', zh: '好久不见，你看起来气色很好。' },
        ],
      },
      {
        id: 'w1-l2',
        worldId: 'w1',
        order: 2,
        title: '介绍我自己',
        kind: 'phrase',
        phrases: [
          { id: 'w1l2p1', en: 'Let me introduce myself, my name is Chen.', zh: '让我自我介绍一下，我叫 Chen。' },
          { id: 'w1l2p2', en: 'I work as a software engineer in Shanghai.', zh: '我在上海做软件工程师。' },
          { id: 'w1l2p3', en: 'I have been learning English for three years.', zh: '我学英语三年了。', tip: 'have been 连读时 often 弱读成 been' },
          { id: 'w1l2p4', en: 'In my free time I like hiking and cooking.', zh: '空闲时我喜欢徒步和做饭。' },
          { id: 'w1l2p5', en: 'Please call me Jay, everyone does.', zh: '叫我 Jay 就行，大家都这么叫。' },
        ],
      },
      {
        id: 'w1-l3',
        worldId: 'w1',
        order: 3,
        title: '画室搭讪',
        kind: 'scenario',
        scenarioId: 'sc-friends',
      },
      {
        id: 'w1-l4',
        worldId: 'w1',
        order: 4,
        title: '礼貌收尾',
        kind: 'phrase',
        phrases: [
          { id: 'w1l4p1', en: 'It was really nice talking with you.', zh: '和你聊天很开心。' },
          { id: 'w1l4p2', en: 'I should get going, it is getting late.', zh: '我该走了，天晚了。' },
          { id: 'w1l4p3', en: 'Let us keep in touch on WeChat.', zh: '我们用微信保持联系吧。' },
          { id: 'w1l4p4', en: 'Take care, and see you soon.', zh: '保重，回头见。' },
        ],
      },
      {
        id: 'w1-l5',
        worldId: 'w1',
        order: 5,
        title: 'BOSS · 自由破冰',
        kind: 'boss',
        boss: {
          npcName: 'Alex',
          npcEmoji: '🧑‍🎨',
          systemPrompt:
            'You are Alex, a friendly painter at a community art studio. You are talking to a beginner English learner. Keep replies to 1-2 short sentences, use simple everyday words, and always ask one follow-up question to keep the conversation going. Never write more than 25 words.',
          opener: "Hey! You made it. How was your day?",
          openerZh: '嘿！你来啦。今天过得怎么样？',
          targetTurns: 6,
        },
      },
    ],
  },
  {
    id: 'w2',
    name: '咖啡馆',
    emoji: '☕',
    subtitle: '点单、加料、结账一气呵成',
    gradient: 'from-sun-300 to-sun-600',
    accent: 'sun',
    levels: [
      {
        id: 'w2-l1',
        worldId: 'w2',
        order: 1,
        title: '开口点单',
        kind: 'phrase',
        phrases: [
          { id: 'w2l1p1', en: 'Could I have a large latte, please?', zh: '可以给我一杯大杯拿铁吗？', tip: 'could I 连读，语气比 can I 更礼貌' },
          { id: 'w2l1p2', en: 'I would like a cappuccino to go.', zh: '我想要一杯卡布奇诺外带。' },
          { id: 'w2l1p3', en: 'Can I get an iced americano?', zh: '能来一杯冰美式吗？' },
          { id: 'w2l1p4', en: 'What do you recommend for a first timer?', zh: '对第一次来的人你推荐什么？' },
        ],
      },
      {
        id: 'w2-l2',
        worldId: 'w2',
        order: 2,
        title: '完整点单演练',
        kind: 'scenario',
        scenarioId: 'sc-cafe',
      },
      {
        id: 'w2-l3',
        worldId: 'w2',
        order: 3,
        title: '提出特殊要求',
        kind: 'phrase',
        phrases: [
          { id: 'w2l3p1', en: 'Could you make it less sweet, please?', zh: '可以做得不那么甜吗？' },
          { id: 'w2l3p2', en: 'Can I swap the milk for oat milk?', zh: '能把牛奶换成燕麦奶吗？' },
          { id: 'w2l3p3', en: 'No sugar for me, I am watching my sugar intake.', zh: '我不要糖，我在控糖。' },
          { id: 'w2l3p4', en: 'Is it possible to get it extra hot?', zh: '可以做得特别烫一点吗？' },
          { id: 'w2l3p5', en: 'Could I get that with a shot of espresso?', zh: '能加一份浓缩吗？' },
        ],
      },
      {
        id: 'w2-l4',
        worldId: 'w2',
        order: 4,
        title: '结账与询问',
        kind: 'phrase',
        phrases: [
          { id: 'w2l4p1', en: 'How much do I owe you?', zh: '我该付多少钱？' },
          { id: 'w2l4p2', en: 'Can I pay by card?', zh: '可以刷卡吗？' },
          { id: 'w2l4p3', en: 'Could I get a receipt, please?', zh: '能给我一张收据吗？', tip: 'receipt 的 p 不发音，读 /rɪˈsiːt/' },
          { id: 'w2l4p4', en: 'Is there free Wi-Fi here?', zh: '这里有免费 Wi-Fi 吗？' },
        ],
      },
      {
        id: 'w2-l5',
        worldId: 'w2',
        order: 5,
        title: 'BOSS · 挑剔的客人',
        kind: 'boss',
        boss: {
          npcName: 'Barista Mia',
          npcEmoji: '🧑‍🍳',
          systemPrompt:
            'You are Mia, a busy but cheerful barista. A customer is placing an order. Keep replies to 1-2 short sentences, ask about size, temperature, or payment, and gently upsell a pastry. Keep every reply under 25 words and use simple words.',
          opener: 'Morning! Busy one today. What can I get started for you?',
          openerZh: '早上好！今天很忙哦，先给您来点什么？',
          targetTurns: 6,
        },
      },
    ],
  },
  {
    id: 'w3',
    name: '城市漫游',
    emoji: '🧭',
    subtitle: '问路、换乘、估算时间',
    gradient: 'from-mint-300 to-mint-600',
    accent: 'mint',
    levels: [
      {
        id: 'w3-l1',
        worldId: 'w3',
        order: 1,
        title: '开口问路',
        kind: 'phrase',
        phrases: [
          { id: 'w3l1p1', en: 'Excuse me, how do I get to the station?', zh: '打扰一下，车站怎么走？' },
          { id: 'w3l1p2', en: 'Is the museum within walking distance?', zh: '博物馆走路能到吗？' },
          { id: 'w3l1p3', en: 'Am I going the right way?', zh: '我走的方向对吗？' },
          { id: 'w3l1p4', en: 'Could you point me to the nearest subway?', zh: '能指一下最近的地铁吗？' },
        ],
      },
      {
        id: 'w3-l2',
        worldId: 'w3',
        order: 2,
        title: '街头问路演练',
        kind: 'scenario',
        scenarioId: 'sc-directions',
      },
      {
        id: 'w3-l3',
        worldId: 'w3',
        order: 3,
        title: '听懂指引',
        kind: 'phrase',
        phrases: [
          { id: 'w3l3p1', en: 'Go straight for two blocks, then turn left.', zh: '直走两个街区，然后左转。' },
          { id: 'w3l3p2', en: 'It is right next to the bakery.', zh: '就在面包店旁边。' },
          { id: 'w3l3p3', en: 'You cannot miss it, it is a red building.', zh: '你不会错过的，是一栋红楼。' },
          { id: 'w3l3p4', en: 'Take bus number twelve and get off at Oak Street.', zh: '坐 12 路公交，在 Oak 街下车。' },
          { id: 'w3l3p5', en: 'It is about a fifteen minute walk.', zh: '走路大约十五分钟。' },
        ],
      },
      {
        id: 'w3-l4',
        worldId: 'w3',
        order: 4,
        title: '时间与距离',
        kind: 'phrase',
        phrases: [
          { id: 'w3l4p1', en: 'How long does it take to get there?', zh: '到那里要多久？' },
          { id: 'w3l4p2', en: 'Is it faster to walk or take the bus?', zh: '走路快还是坐公交快？' },
          { id: 'w3l4p3', en: 'What time does the last train leave?', zh: '末班车几点开？' },
          { id: 'w3l4p4', en: 'Sorry, could you say that again a bit slower?', zh: '抱歉，能再说慢一点吗？' },
        ],
      },
      {
        id: 'w3-l5',
        worldId: 'w3',
        order: 5,
        title: 'BOSS · 迷路的游客',
        kind: 'boss',
        boss: {
          npcName: 'Local Leo',
          npcEmoji: '🚶',
          systemPrompt:
            'You are Leo, a helpful local who knows the city well. A tourist asks you for directions. Give short, clear directions one step at a time. Reply in 1-2 sentences under 25 words, use simple words, and ask if they need more detail.',
          opener: 'You look a bit lost. Where are you heading?',
          openerZh: '你看起来有点迷路。你要去哪儿？',
          targetTurns: 6,
        },
      },
    ],
  },
  {
    id: 'w4',
    name: '职场初体验',
    emoji: '💼',
    subtitle: '会议、面试、表达观点',
    gradient: 'from-grape-300 to-grape-600',
    accent: 'grape',
    levels: [
      {
        id: 'w4-l1',
        worldId: 'w4',
        order: 1,
        title: '会议开场',
        kind: 'phrase',
        phrases: [
          { id: 'w4l1p1', en: 'Thanks for joining, shall we get started?', zh: '感谢参加，我们开始吧？' },
          { id: 'w4l1p2', en: 'Let me walk you through the agenda.', zh: '我来过一遍议程。' },
          { id: 'w4l1p3', en: 'Before we begin, any questions?', zh: '开始前有什么问题吗？' },
          { id: 'w4l1p4', en: 'I would like to share a quick update.', zh: '我想快速同步一下进展。' },
        ],
      },
      {
        id: 'w4-l2',
        worldId: 'w4',
        order: 2,
        title: '英文面试演练',
        kind: 'scenario',
        scenarioId: 'sc-interview',
      },
      {
        id: 'w4-l3',
        worldId: 'w4',
        order: 3,
        title: '团队周会演练',
        kind: 'scenario',
        scenarioId: 'sc-meeting',
      },
      {
        id: 'w4-l4',
        worldId: 'w4',
        order: 4,
        title: '表达观点',
        kind: 'phrase',
        phrases: [
          { id: 'w4l4p1', en: 'In my opinion, we should ship it first.', zh: '我认为我们应该先发布。' },
          { id: 'w4l4p2', en: 'I see your point, but I have a concern.', zh: '我明白你的意思，但我有个顾虑。', tip: 'but 前面稍作停顿，语气更自然' },
          { id: 'w4l4p3', en: 'Could you clarify what you mean by that?', zh: '能具体说明一下你的意思吗？' },
          { id: 'w4l4p4', en: 'That is a fair point, I had not thought of it.', zh: '说得有道理，我没想到这点。' },
          { id: 'w4l4p5', en: 'Let me think about it and get back to you.', zh: '我想想再回复你。' },
        ],
      },
      {
        id: 'w4-l5',
        worldId: 'w4',
        order: 5,
        title: 'BOSS · 压力面试',
        kind: 'boss',
        boss: {
          npcName: 'Manager Ruth',
          npcEmoji: '🧑‍💼',
          systemPrompt:
            'You are Ruth, a hiring manager running a friendly but probing interview. Ask one question at a time about experience, strengths, or handling pressure. Keep each reply to 1-2 sentences under 25 words with simple words.',
          opener: 'Thanks for making time today. Tell me about a recent challenge you solved.',
          openerZh: '感谢今天抽空前来。讲讲你最近解决的一个难题。',
          targetTurns: 6,
        },
      },
    ],
  },
  {
    id: 'w5',
    name: '旅行达人',
    emoji: '✈️',
    subtitle: '机场、酒店、突发状况',
    gradient: 'from-coral-300 to-coral-600',
    accent: 'coral',
    levels: [
      {
        id: 'w5-l1',
        worldId: 'w5',
        order: 1,
        title: '机场值机',
        kind: 'phrase',
        phrases: [
          { id: 'w5l1p1', en: 'Here is my passport and booking reference.', zh: '这是我的护照和订单号。' },
          { id: 'w5l1p2', en: 'I have one suitcase to check in.', zh: '我有一个行李箱要托运。' },
          { id: 'w5l1p3', en: 'This backpack is my carry-on.', zh: '这个背包是我的随身行李。' },
          { id: 'w5l1p4', en: 'Is the flight on time?', zh: '航班准点吗？' },
        ],
      },
      {
        id: 'w5-l2',
        worldId: 'w5',
        order: 2,
        title: '值机柜台演练',
        kind: 'scenario',
        scenarioId: 'sc-airport',
      },
      {
        id: 'w5-l3',
        worldId: 'w5',
        order: 3,
        title: '酒店入住演练',
        kind: 'scenario',
        scenarioId: 'sc-hotel',
      },
      {
        id: 'w5-l4',
        worldId: 'w5',
        order: 4,
        title: '突发状况',
        kind: 'phrase',
        phrases: [
          { id: 'w5l4p1', en: 'My luggage did not arrive, can you help?', zh: '我的行李没到，能帮忙吗？' },
          { id: 'w5l4p2', en: 'I think I left my wallet in the taxi.', zh: '我好像把钱包落在出租车上了。' },
          { id: 'w5l4p3', en: 'Is there a pharmacy nearby?', zh: '附近有药店吗？' },
          { id: 'w5l4p4', en: 'Could you speak a little slower, please?', zh: '能说慢一点吗？' },
          { id: 'w5l4p5', en: 'I am not feeling well, do you have a doctor?', zh: '我不太舒服，你们有医生吗？' },
        ],
      },
      {
        id: 'w5-l5',
        worldId: 'w5',
        order: 5,
        title: 'BOSS · 深夜诊所',
        kind: 'boss',
        boss: {
          npcName: 'Dr. Nora',
          npcEmoji: '👩‍⚕️',
          systemPrompt:
            'You are Dr. Nora, a calm and kind clinic doctor. Ask about symptoms one question at a time, then give simple advice. Reply in 1-2 short sentences under 25 words using plain everyday language.',
          opener: 'Hello, what brings you in today?',
          openerZh: '你好，今天哪里不舒服？',
          targetTurns: 6,
        },
      },
    ],
  },
];

export function getLevel(levelId: string) {
  for (const w of WORLDS) {
    const lv = w.levels.find((l) => l.id === levelId);
    if (lv) return { world: w, level: lv };
  }
  return undefined;
}

/** 打平后的关卡顺序，用于「下一关」跳转 */
export const ALL_LEVELS = WORLDS.flatMap((w) => w.levels);

/** 所有跟读句，小游戏共用 */
export const ALL_PHRASES = WORLDS.flatMap((w) => w.levels.flatMap((l) => l.phrases ?? []));

export function nextLevelOf(levelId: string) {
  const idx = ALL_LEVELS.findIndex((l) => l.id === levelId);
  if (idx < 0 || idx + 1 >= ALL_LEVELS.length) return undefined;
  return ALL_LEVELS[idx + 1];
}
