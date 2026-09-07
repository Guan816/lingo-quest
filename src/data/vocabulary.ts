import type { VocabItem } from '../types';

/** 小游戏（听音选词 / 拼句）共用的词库，按主题分组 */
export const VOCAB: VocabItem[] = [
  // ── Greetings 打招呼 ──────────────────────────────
  { id: 'v-g1', en: 'hello', zh: '你好', ipa: '/həˈloʊ/', topic: 'greetings' },
  { id: 'v-g2', en: 'morning', zh: '早晨', ipa: '/ˈmɔːrnɪŋ/', topic: 'greetings' },
  { id: 'v-g3', en: 'evening', zh: '傍晚', ipa: '/ˈiːvnɪŋ/', topic: 'greetings' },
  { id: 'v-g4', en: 'pleasure', zh: '荣幸', ipa: '/ˈpleʒər/', topic: 'greetings' },
  { id: 'v-g5', en: 'welcome', zh: '欢迎', ipa: '/ˈwelkəm/', topic: 'greetings' },
  { id: 'v-g6', en: 'farewell', zh: '再见', ipa: '/ˌferˈwel/', topic: 'greetings' },
  { id: 'v-g7', en: 'introduce', zh: '介绍', ipa: '/ˌɪntrəˈduːs/', topic: 'greetings' },
  { id: 'v-g8', en: 'nickname', zh: '昵称', ipa: '/ˈnɪkneɪm/', topic: 'greetings' },

  // ── Cafe 咖啡馆 ───────────────────────────────────
  { id: 'v-c1', en: 'coffee', zh: '咖啡', ipa: '/ˈkɔːfi/', topic: 'cafe' },
  { id: 'v-c2', en: 'latte', zh: '拿铁', ipa: '/ˈlɑːteɪ/', topic: 'cafe' },
  { id: 'v-c3', en: 'espresso', zh: '浓缩咖啡', ipa: '/eˈspresoʊ/', topic: 'cafe' },
  { id: 'v-c4', en: 'sandwich', zh: '三明治', ipa: '/ˈsænwɪtʃ/', topic: 'cafe' },
  { id: 'v-c5', en: 'receipt', zh: '收据', ipa: '/rɪˈsiːt/', topic: 'cafe' },
  { id: 'v-c6', en: 'refill', zh: '续杯', ipa: '/ˈriːfɪl/', topic: 'cafe' },
  { id: 'v-c7', en: 'pastry', zh: '糕点', ipa: '/ˈpeɪstri/', topic: 'cafe' },
  { id: 'v-c8', en: 'takeaway', zh: '外带', ipa: '/ˈteɪkəweɪ/', topic: 'cafe' },

  // ── Directions 问路 ───────────────────────────────
  { id: 'v-d1', en: 'corner', zh: '拐角', ipa: '/ˈkɔːrnər/', topic: 'direction' },
  { id: 'v-d2', en: 'subway', zh: '地铁', ipa: '/ˈsʌbweɪ/', topic: 'direction' },
  { id: 'v-d3', en: 'crossroad', zh: '十字路口', ipa: '/ˈkrɔːsroʊd/', topic: 'direction' },
  { id: 'v-d4', en: 'landmark', zh: '地标', ipa: '/ˈlændmɑːrk/', topic: 'direction' },
  { id: 'v-d5', en: 'straight', zh: '直的', ipa: '/streɪt/', topic: 'direction' },
  { id: 'v-d6', en: 'distance', zh: '距离', ipa: '/ˈdɪstəns/', topic: 'direction' },
  { id: 'v-d7', en: 'entrance', zh: '入口', ipa: '/ˈentrəns/', topic: 'direction' },
  { id: 'v-d8', en: 'neighbourhood', zh: '街区', ipa: '/ˈneɪbərhʊd/', topic: 'direction' },

  // ── Work 职场 ─────────────────────────────────────
  { id: 'v-w1', en: 'meeting', zh: '会议', ipa: '/ˈmiːtɪŋ/', topic: 'work' },
  { id: 'v-w2', en: 'deadline', zh: '截止日期', ipa: '/ˈdedlaɪn/', topic: 'work' },
  { id: 'v-w3', en: 'feedback', zh: '反馈', ipa: '/ˈfiːdbæk/', topic: 'work' },
  { id: 'v-w4', en: 'proposal', zh: '提案', ipa: '/prəˈpoʊzl/', topic: 'work' },
  { id: 'v-w5', en: 'schedule', zh: '日程', ipa: '/ˈskedʒuːl/', topic: 'work' },
  { id: 'v-w6', en: 'colleague', zh: '同事', ipa: '/ˈkɑːliːɡ/', topic: 'work' },
  { id: 'v-w7', en: 'workflow', zh: '工作流', ipa: '/ˈwɜːrkfloʊ/', topic: 'work' },
  { id: 'v-w8', en: 'promotion', zh: '晋升', ipa: '/prəˈmoʊʃn/', topic: 'work' },

  // ── Travel 旅行 ───────────────────────────────────
  { id: 'v-t1', en: 'luggage', zh: '行李', ipa: '/ˈlʌɡɪdʒ/', topic: 'travel' },
  { id: 'v-t2', en: 'boarding', zh: '登机', ipa: '/ˈbɔːrdɪŋ/', topic: 'travel' },
  { id: 'v-t3', en: 'reservation', zh: '预订', ipa: '/ˌrezərˈveɪʃn/', topic: 'travel' },
  { id: 'v-t4', en: 'itinerary', zh: '行程单', ipa: '/aɪˈtɪnəreri/', topic: 'travel' },
  { id: 'v-t5', en: 'souvenir', zh: '纪念品', ipa: '/ˌsuːvəˈnɪr/', topic: 'travel' },
  { id: 'v-t6', en: 'passport', zh: '护照', ipa: '/ˈpæspɔːrt/', topic: 'travel' },
  { id: 'v-t7', en: 'detour', zh: '绕道', ipa: '/ˈdiːtʊr/', topic: 'travel' },
  { id: 'v-t8', en: 'scenery', zh: '风景', ipa: '/ˈsiːnəri/', topic: 'travel' },

  // ── Daily 日常 ────────────────────────────────────
  { id: 'v-l1', en: 'weather', zh: '天气', ipa: '/ˈweðər/', topic: 'daily' },
  { id: 'v-l2', en: 'grocery', zh: '食品杂货', ipa: '/ˈɡroʊsəri/', topic: 'daily' },
  { id: 'v-l3', en: 'laundry', zh: '洗衣', ipa: '/ˈlɔːndri/', topic: 'daily' },
  { id: 'v-l4', en: 'neighbour', zh: '邻居', ipa: '/ˈneɪbər/', topic: 'daily' },
  { id: 'v-l5', en: 'hobby', zh: '爱好', ipa: '/ˈhɑːbi/', topic: 'daily' },
  { id: 'v-l6', en: 'weekend', zh: '周末', ipa: '/ˈwiːkend/', topic: 'daily' },
  { id: 'v-l7', en: 'routine', zh: '日常惯例', ipa: '/ruːˈtiːn/', topic: 'daily' },
  { id: 'v-l8', en: 'errand', zh: '跑腿差事', ipa: '/ˈerənd/', topic: 'daily' },
];

export const TOPICS = [
  { id: 'greetings', name: '打招呼', emoji: '👋' },
  { id: 'cafe', name: '咖啡馆', emoji: '☕' },
  { id: 'direction', name: '问路', emoji: '🧭' },
  { id: 'work', name: '职场', emoji: '💼' },
  { id: 'travel', name: '旅行', emoji: '✈️' },
  { id: 'daily', name: '日常', emoji: '🏡' },
] as const;

export function vocabByTopic(topic: string): VocabItem[] {
  return VOCAB.filter((v) => v.topic === topic);
}
