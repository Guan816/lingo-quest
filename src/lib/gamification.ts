import { clamp } from './utils';

export interface LevelInfo {
  level: number;
  /** 当前等级内已积累经验 */
  current: number;
  /** 升到下一级所需经验 */
  need: number;
  ratio: number;
  title: string;
}

const RANKS = [
  '萌新开口',
  '单词小兵',
  '句子学徒',
  '对话游侠',
  '口语骑士',
  '流利法师',
  '发音大师',
  '语言王者',
];

function needFor(level: number): number {
  return 120 + (level - 1) * 60;
}

export function levelInfo(totalXp: number): LevelInfo {
  let level = 1;
  let remain = Math.max(0, Math.floor(totalXp));
  let need = needFor(level);
  while (remain >= need && level < 99) {
    remain -= need;
    level++;
    need = needFor(level);
  }
  return {
    level,
    current: remain,
    need,
    ratio: clamp(remain / need, 0, 1),
    title: RANKS[Math.min(RANKS.length - 1, Math.floor((level - 1) / 3))],
  };
}

/** 单句得分能换多少经验（含连击加成） */
export function xpForSentence(score: number, combo: number): number {
  const base = Math.round(score / 10);
  const comboBonus = Math.floor(Math.min(combo, 15) / 3);
  return Math.max(1, base + comboBonus);
}

/** 通关结算经验 */
export function xpForClear(stars: number, isBoss: boolean): number {
  return 30 + stars * 20 + (isBoss ? 50 : 0);
}

/** 连击倍率展示用（1.0 ~ 2.0） */
export function comboMultiplier(combo: number): number {
  return 1 + Math.min(combo, 20) * 0.05;
}

export function comboTag(combo: number): { text: string; emoji: string } | null {
  if (combo >= 15) return { text: '势不可挡', emoji: '🔥' };
  if (combo >= 10) return { text: '手感火热', emoji: '🔥' };
  if (combo >= 5) return { text: '渐入佳境', emoji: '⚡' };
  if (combo >= 3) return { text: '连击中', emoji: '✨' };
  return null;
}
