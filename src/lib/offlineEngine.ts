import type { ScenarioLine } from '../types';

/**
 * 离线对话引擎。
 * 没有 API Key、或网络不可用时，Boss 战与剧本关依然能玩：
 * 剧本走状态机，自由对话走关键词 + 话题库轮换。
 */

export class ScenarioRunner {
  private p = 0;

  constructor(private lines: ScenarioLine[]) {}

  get finished(): boolean {
    return this.p >= this.lines.length;
  }

  /** 已消费的行数，供 UI 切片渲染 */
  get index(): number {
    return this.p;
  }

  get progress(): number {
    if (!this.lines.length) return 1;
    return Math.min(1, this.p / this.lines.length);
  }

  /** 当前轮到 NPC 说的话（可能连续多句），不推进指针 */
  pendingNpc(): ScenarioLine[] {
    const out: ScenarioLine[] = [];
    let i = this.p;
    while (i < this.lines.length && this.lines[i].role === 'npc') {
      out.push(this.lines[i]);
      i++;
    }
    return out;
  }

  /** 玩家接下来应该说的那句 */
  nextUserTarget(): ScenarioLine | null {
    let i = this.p;
    while (i < this.lines.length && this.lines[i].role === 'npc') i++;
    const line = this.lines[i];
    return line && line.role === 'user' ? line : null;
  }

  /** 玩家说完后推进 */
  commitUser() {
    let i = this.p;
    while (i < this.lines.length && this.lines[i].role === 'npc') i++;
    if (this.lines[i]?.role === 'user') i++;
    this.p = i;
  }
}

/* ────────────── 自由对话（Boss 战）离线回复 ────────────── */

interface Rule {
  test: RegExp;
  en: string;
  zh: string;
}

const RULES: Rule[] = [
  {
    test: /\b(hello|hi|hey|good morning|good evening)\b/i,
    en: 'Hey there! Great to hear your voice. What shall we talk about?',
    zh: '嘿！很高兴听到你的声音。我们聊点什么？',
  },
  {
    test: /\b(how are you|how is it going|how do you do)\b/i,
    en: "I am doing well, thanks for asking. How about you?",
    zh: '我很好，谢谢关心。你呢？',
  },
  {
    test: /\b(i am|i'm|my name is|call me)\b/i,
    en: 'Nice to meet you! Where are you from?',
    zh: '很高兴认识你！你来自哪里？',
  },
  {
    test: /\b(i am from|i come from|i live in)\b/i,
    en: 'That sounds like a lovely place. What do you do there?',
    zh: '听起来是个好地方。你在那里做什么？',
  },
  {
    test: /\b(thank you|thanks|appreciate)\b/i,
    en: 'You are very welcome! Is there anything else you want to practise?',
    zh: '不客气！还想练点别的吗？',
  },
  {
    test: /\b(sorry|pardon|repeat|again|slower|understand)\b/i,
    en: 'No problem, let me say it more simply. Try: "Could you say that again, please?"',
    zh: '没问题，我说简单点。试试说：能再说一遍吗？',
  },
  {
    test: /\b(coffee|latte|tea|order|menu|drink)\b/i,
    en: 'Good choice! Would you like it hot or iced?',
    zh: '不错的选择！要热的还是冰的？',
  },
  {
    test: /\b(where|direction|station|way|street|bus|train)\b/i,
    en: 'Sure. Go straight for two blocks, then turn left. Can you repeat that back?',
    zh: '好的。直走两个街区然后左转。你能复述一遍吗？',
  },
  {
    test: /\b(work|job|engineer|designer|teacher|company|meeting)\b/i,
    en: 'That sounds interesting. What do you enjoy most about it?',
    zh: '听起来很有意思。你最喜欢其中的哪一点？',
  },
  {
    test: /\b(like|enjoy|hobby|weekend|free time)\b/i,
    en: 'Nice! How long have you been into that?',
    zh: '不错！你做这个多久了？',
  },
  {
    test: /\b(weather|rain|sunny|cold|hot|snow)\b/i,
    en: 'The weather really changes everything, does it not? Do you prefer sunny days?',
    zh: '天气确实影响心情。你更喜欢晴天吗？',
  },
  {
    test: /\b(bye|goodbye|see you|later)\b/i,
    en: 'Take care! It was great talking with you.',
    zh: '保重！和你聊天很开心。',
  },
  {
    test: /\b(yes|yeah|sure|of course|okay|ok)\b/i,
    en: 'Great! Tell me a bit more about that.',
    zh: '太好了！再多说一点吧。',
  },
  {
    test: /\b(no|not really|never|do not|don't)\b/i,
    en: 'No problem at all. What would you rather talk about?',
    zh: '完全没问题。你想换个什么话题？',
  },
];

/** 备选追问，避免离线对话重复卡住 */
const FOLLOW_UPS: { en: string; zh: string }[] = [
  { en: 'Interesting. Why do you say that?', zh: '有意思。为什么这么说？' },
  { en: 'Could you tell me more about it?', zh: '能再多讲讲吗？' },
  { en: 'That is a good point. What happened next?', zh: '说得对。后来呢？' },
  { en: 'I see. How did that make you feel?', zh: '我明白了。你当时什么感受？' },
  { en: 'Sounds fun! Who were you with?', zh: '听起来好玩！你和谁一起？' },
  { en: 'Nice one. Would you do it again?', zh: '不错。你还会再做一次吗？' },
  { en: 'Got it. What do you usually do instead?', zh: '明白了。那你平时会做什么？' },
];

export interface OfflineReply {
  en: string;
  zh: string;
  /** 给玩家的下一句建议，帮助他说下去 */
  hint?: string;
}

const HINTS = [
  'I think it is really useful for my daily life.',
  'Could you say that again a bit slower, please?',
  'Let me think about it for a second.',
  'That is a great question. In my opinion...',
  'I am not sure, but I would say yes.',
];

export function offlineReply(userText: string, turn: number): OfflineReply {
  const rule = RULES.find((r) => r.test.test(userText || ''));
  if (rule) {
    return { en: rule.en, zh: rule.zh, hint: HINTS[turn % HINTS.length] };
  }
  const fu = FOLLOW_UPS[turn % FOLLOW_UPS.length];
  return { en: fu.en, zh: fu.zh, hint: HINTS[turn % HINTS.length] };
}

/** 「不会说」时给出的参考答案（用于剧本关） */
export function sampleAnswer(targetEn: string): string {
  return targetEn;
}
