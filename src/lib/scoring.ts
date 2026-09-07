import type { ScoreResult } from '../types';
import { clamp } from './utils';

/** 常见缩写展开，避免 "don't" 与 "do not" 被判成完全不同的句子 */
const CONTRACTIONS: Record<string, string> = {
  "i'm": 'i am',
  "i've": 'i have',
  "i'd": 'i would',
  "i'll": 'i will',
  "you're": 'you are',
  "you've": 'you have',
  "you'll": 'you will',
  "we're": 'we are',
  "we've": 'we have',
  "we'll": 'we will',
  "they're": 'they are',
  "they've": 'they have',
  "they'll": 'they will',
  "he's": 'he is',
  "she's": 'she is',
  "it's": 'it is',
  "that's": 'that is',
  "what's": 'what is',
  "who's": 'who is',
  "let's": 'let us',
  "there's": 'there is',
  "here's": 'here is',
  "how's": 'how is',
  "don't": 'do not',
  "doesn't": 'does not',
  "didn't": 'did not',
  "can't": 'cannot',
  "couldn't": 'could not',
  "won't": 'will not',
  "wouldn't": 'would not',
  "shouldn't": 'should not',
  "isn't": 'is not',
  "aren't": 'are not',
  "wasn't": 'was not',
  "weren't": 'were not',
  "haven't": 'have not',
  "hasn't": 'has not',
  "hadn't": 'had not',
};

export function normalize(text: string): string {
  let t = (text || '').toLowerCase().trim();
  t = t.replace(/[’`]/g, "'");
  for (const [k, v] of Object.entries(CONTRACTIONS)) {
    t = t.replace(new RegExp(k.replace(/'/g, "['’]"), 'g'), v);
  }
  t = t.replace(/[^a-z0-9\s']/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

export function tokenize(text: string): string[] {
  const n = normalize(text);
  return n ? n.split(' ') : [];
}

/** 编辑距离（词级或字符级通用） */
export function levenshtein(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let cur = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

/** 最长公共子序列，返回 target 侧被匹配到的下标集合 */
function lcsMatchIdx(target: string[], heard: string[]): Set<number> {
  const m = target.length;
  const n = heard.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        target[i - 1] === heard[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const matched = new Set<number>();
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (target[i - 1] === heard[j - 1]) {
      matched.add(i - 1);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return matched;
}

/** 近似匹配：编辑距离 <= 1 且长度 >= 4 时算「基本读对」 */
function nearMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  const chars = (s: string) => s.split('');
  return levenshtein(chars(a), chars(b)) <= 1;
}

/**
 * 给一次跟读打分。
 * target 是目标句，heard 是识别（或手打）出来的内容。
 */
export function scoreSpeech(target: string, heard: string): ScoreResult {
  const tw = tokenize(target);
  const hw = tokenize(heard);

  if (!tw.length) {
    return { score: 0, words: [], transcript: heard, missing: [], extra: [] };
  }
  if (!hw.length) {
    return {
      score: 0,
      words: tw.map((w) => ({ text: w, ok: false })),
      transcript: heard,
      missing: tw,
      extra: [],
    };
  }

  // 先用精确 LCS 对齐
  const matched = lcsMatchIdx(tw, hw);
  // 未命中的 target 词，尝试与未命中的 heard 词做近似匹配
  const heardUsed = new Set<number>();
  for (let ti = 0; ti < tw.length; ti++) {
    if (matched.has(ti)) continue;
    for (let hi = 0; hi < hw.length; hi++) {
      if (heardUsed.has(hi)) continue;
      if (nearMatch(tw[ti], hw[hi])) {
        matched.add(ti);
        heardUsed.add(hi);
        break;
      }
    }
  }

  const denom = Math.max(tw.length, hw.length);
  const wordAcc = matched.size / denom;
  const joinedT = tw.join(' ');
  const joinedH = hw.join(' ');
  const charSim = 1 - levenshtein(joinedT.split(''), joinedH.split('')) / Math.max(joinedT.length, joinedH.length, 1);

  const score = clamp(Math.round(100 * (0.72 * wordAcc + 0.28 * charSim)), 0, 100);

  const words = tw.map((w, i) => ({ text: w, ok: matched.has(i) }));
  const missing = tw.filter((_, i) => !matched.has(i));
  const extra = hw.filter((_, i) => !heardUsed.has(i) && !matched.has(i));

  return { score, words, transcript: heard, missing, extra };
}

/**
 * 自由发言打分：没有标准答案，按「开口了没、说得多不多」给鼓励分。
 * Boss 战的重点是敢说、说得长，而不是和标准答案一模一样。
 */
export function freeScore(text: string): number {
  const n = tokenize(text).length;
  if (!n) return 55;
  if (n >= 9) return 96;
  if (n >= 6) return 90;
  if (n >= 4) return 83;
  if (n >= 2) return 75;
  return 66;
}

export function scoreLabel(score: number): { text: string; emoji: string; tone: string } {
  if (score >= 92) return { text: '完美发音', emoji: '🎯', tone: 'mint' };
  if (score >= 80) return { text: '相当不错', emoji: '🎉', tone: 'brand' };
  if (score >= 65) return { text: '接近了', emoji: '🙂', tone: 'sun' };
  if (score >= 45) return { text: '再练一遍', emoji: '💪', tone: 'sun' };
  return { text: '慢慢来', emoji: '🐣', tone: 'coral' };
}

/** 关卡评分 → 星星数（1 星保底，通关就有） */
export function starsForScore(avg: number): number {
  if (avg >= 88) return 3;
  if (avg >= 72) return 2;
  return 1;
}
