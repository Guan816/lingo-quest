import { Button, StarRow } from './ui';

/** 小游戏通用结算页 */
export function GameResult({
  emoji,
  title,
  score,
  stars,
  detail,
  onAgain,
  onBack,
}: {
  emoji: string;
  title: string;
  score: number;
  stars: number;
  detail: string;
  onAgain: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-5 pt-10">
      <div className="animate-pop-in text-6xl">{emoji}</div>
      <h2 className="text-2xl font-black text-ink">{title}</h2>
      <p className="text-4xl font-black text-brand-600">{score}</p>
      <StarRow count={stars} size={32} animate />
      <p className="max-w-[280px] text-center text-sm text-ink-soft">{detail}</p>
      <div className="w-full space-y-2 pt-2">
        <Button block size="lg" onClick={onAgain}>
          再来一局
        </Button>
        <Button block size="md" variant="outline" onClick={onBack}>
          换个玩法
        </Button>
      </div>
    </div>
  );
}
