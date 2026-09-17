import type { MathChapter, MathKind, MathQuestion } from '../types';

/* ============================================================
 *  江苏专转本 · 高等数学 + 线性代数 题库
 *
 *  结构对齐官方考纲（省教育考试院 2022 年起实施）：
 *    微积分 80% + 线性代数 20%，满分 150 / 120 分钟
 *    单选 8×4=32 · 填空 6×4=24 · 计算 8×8=64 · 证明 1×10=10 · 综合 2×10=20
 *    难度结构：较易 30% / 中等 50% / 较难 20%
 *
 *  说明：题目为按考纲原创命制，结构、难度与分值对齐真题，不搬运真题原卷。
 * ============================================================ */

/** 章节元信息（顺序严格按官方大纲的「考查内容」排列） */
export const MATH_CHAPTERS: {
  key: MathChapter;
  name: string;
  short: string;
  /** 是否属于线性代数（占 20%） */
  linear: boolean;
  /** 该章在卷面中的大致权重（百分比，用于展示） */
  weight: number;
  hint: string;
}[] = [
  // ────── 第一部分 微积分（约 80%）──────
  { key: 'limit', name: '函数、极限与连续', short: '极限', linear: false, weight: 14, hint: '两个重要极限、等价无穷小、间断点分类是必考点。' },
  { key: 'deriv', name: '一元函数微分学', short: '微分学', linear: false, weight: 18, hint: '中值定理证明题几乎年年有，洛必达与单调性极值是计算主力。' },
  { key: 'integral', name: '一元函数积分学', short: '积分学', linear: false, weight: 20, hint: '分值最重的一章：换元、分部、变上限积分、面积与旋转体体积都要熟。' },
  { key: 'multivar', name: '多元函数微积分学', short: '多元', linear: false, weight: 12, hint: '偏导与全微分、复合与隐函数求导、二重积分（直角坐标与极坐标）是重点。' },
  { key: 'series', name: '无穷级数', short: '级数', linear: false, weight: 8, hint: '比较与比值审敛法、莱布尼茨定理、幂级数收敛半径与收敛域，套路固定。' },
  { key: 'ode', name: '常微分方程', short: '微分方程', linear: false, weight: 8, hint: '可分离变量、齐次、一阶线性，以及二阶常系数齐次与非齐次，属送分题。' },
  // ────── 第二部分 线性代数（约 20%）──────
  { key: 'detmat', name: '行列式与矩阵', short: '行列式矩阵', linear: true, weight: 12, hint: '行列式性质与展开、矩阵运算求逆、初等变换求秩，是线性代数的地基。' },
  { key: 'linalg', name: '向量与线性方程组', short: '方程组', linear: true, weight: 8, hint: '线性相关性判定、极大无关组、基础解系与通解结构，常与矩阵秩联合出题。' },
];

export function chapterMeta(key: MathChapter) {
  return MATH_CHAPTERS.find((c) => c.key === key)!;
}

/** 题型元信息 */
export const MATH_KINDS: { key: MathKind; name: string; perScore: number; count: number; hint: string }[] = [
  { key: 'choice', name: '单项选择题', perScore: 4, count: 8, hint: '8 题 × 4 分 = 32 分，占 21%' },
  { key: 'blank', name: '填空题', perScore: 4, count: 6, hint: '6 题 × 4 分 = 24 分，占 16%' },
  { key: 'calc', name: '计算题', perScore: 8, count: 8, hint: '8 题 × 8 分 = 64 分，占 43%，是拉开差距的地方' },
  { key: 'proof', name: '证明题', perScore: 10, count: 1, hint: '1 题 × 10 分，多用中值定理' },
  { key: 'synthetic', name: '综合题', perScore: 10, count: 2, hint: '2 题 × 10 分，跨章节综合，难度最高' },
];

export function kindMeta(kind: MathKind) {
  return MATH_KINDS.find((k) => k.key === kind)!;
}

/* ─────────────────────── 题库 ─────────────────────── */

export const MATH_QUESTIONS: MathQuestion[] = [
  /* ========== 微积分 (一) 函数、极限与连续 ========== */
  {
    id: 'm-lim-01', chapter: 'limit', kind: 'choice', difficulty: 'easy',
    stem: '当 x → 0 时，下列无穷小量与 x 是等价无穷小的是（　）',
    options: ['sin 3x', '1 − cos x', 'ln(1 + x)', 'tan x − x'],
    answer: 2,
    refAnswer: 'C',
    steps: [
      '常用等价无穷小：x→0 时 sin x ~ x，tan x ~ x，ln(1+x) ~ x，eˣ−1 ~ x，1−cos x ~ x²/2。',
      '逐项判断：sin 3x ~ 3x，是 x 的同阶但非等价无穷小（比值 3）；1−cos x ~ x²/2，是 x 的高阶无穷小。',
      'ln(1+x) ~ x，与 x 的比值趋于 1，是等价无穷小。',
      'tan x − x ~ x³/3，是 x 的高阶无穷小。',
    ],
    point: '等价无穷小替换只适用于乘除，加减法要慎用',
    formula: 'x→0: sin x ~ x, ln(1+x) ~ x, 1−cos x ~ x²/2',
  },
  {
    id: 'm-lim-02', chapter: 'limit', kind: 'choice', difficulty: 'mid',
    stem: 'lim(x→0) (1 + 2x)^(1/x) 的值为（　）',
    options: ['1', 'e', 'e²', 'e^(1/2)'],
    answer: 2,
    refAnswer: 'C',
    steps: [
      '这是 1^∞ 型未定式，标准处理方法是凑第二重要极限 lim(1+u)^(1/u) = e。',
      '令 u = 2x，则 1/x = 2/u，原式 = [ (1+u)^(1/u) ]² 。',
      '括号内趋于 e，因此极限为 e²。',
    ],
    point: '第二重要极限：1^∞ 型先凑 (1+u)^(1/u) 的结构',
    formula: 'lim(1+u)^(1/u) = e (u→0)',
  },
  {
    id: 'm-lim-03', chapter: 'limit', kind: 'blank', difficulty: 'easy',
    stem: 'lim(x→∞) (3x² − 2x + 1) / (2x² + 5) = ______',
    refAnswer: '3/2',
    steps: [
      'x→∞ 时的有理函数极限，分子分母同除以最高次幂 x²。',
      '得 (3 − 2/x + 1/x²) / (2 + 5/x²)。',
      'x→∞ 时含 1/x 的项都趋于 0，故极限为 3/2。',
    ],
    point: '有理函数 x→∞ 的极限只看最高次项系数之比',
  },
  {
    id: 'm-lim-04', chapter: 'limit', kind: 'calc', difficulty: 'mid',
    stem: '求 lim(x→0) (e^x − 1 − x) / x²。',
    refAnswer: '1/2',
    steps: [
      '代入 x=0 得 0/0 型未定式。',
      '方法一（洛必达）：分子求导 e^x − 1，分母求导 2x，仍为 0/0；再求导得 e^x / 2，代入 x=0 得 1/2。',
      '方法二（泰勒）：e^x = 1 + x + x²/2 + o(x²)，分子 = x²/2 + o(x²)，除以 x² 后极限为 1/2。',
      '两种方法结果一致，答案 1/2。',
    ],
    point: '洛必达可连续使用，但每次都需确认仍是未定式',
    formula: 'e^x = 1 + x + x²/2! + ⋯',
  },
  {
    id: 'm-lim-05', chapter: 'limit', kind: 'calc', difficulty: 'hard',
    stem: '设 f(x) = (x² − 1)/(x − 1) 在 x = 1 处无定义，问 x = 1 是 f 的哪类间断点？如何补充定义使其连续？',
    refAnswer: '可去间断点；补充 f(1) = 2',
    steps: [
      '先化简：x ≠ 1 时 f(x) = (x−1)(x+1)/(x−1) = x + 1。',
      '求极限 lim(x→1) f(x) = lim(x→1) (x+1) = 2，极限存在。',
      '极限存在但函数在该点无定义，属于第一类间断点中的可去间断点。',
      '只要补充定义 f(1) = 2，函数在 x = 1 处即连续。',
    ],
    point: '间断点分类：极限存在=可去；左右极限存在不等=跳跃',
  },
  {
    id: 'm-lim-06', chapter: 'limit', kind: 'choice', difficulty: 'mid',
    stem: '设 f(x) 在 [a, b] 上连续，则下列说法正确的是（　）',
    options: [
      'f(x) 在 [a, b] 上必可取到最大值和最小值',
      'f(x) 在 [a, b] 上必可导',
      'f(x) 在 [a, b] 上必单调',
      'f(x) 在 (a, b) 内必有零点',
    ],
    answer: 0,
    refAnswer: 'A',
    steps: [
      '闭区间上连续函数的性质有四条：有界性、最值性、介值性、零点存在性。',
      '「必可取到最大值和最小值」即最值定理，闭区间连续必有最大最小值，这个结论成立。',
      '连续推不出可导（如 |x| 在 x = 0 处连续但不可导），所以「必可导」错。',
      '连续也推不出单调（如 y = x² 在 [−1,1] 上先减后增），所以「必单调」错。',
      '「必有零点」需要 f(a)·f(b) < 0 才能保证，仅凭连续不足，所以这个选项也错。',
    ],
    point: '闭区间连续函数的四条性质要能逐条对应',
  },

  /* ========== 微积分 (二) 一元函数微分学 ========== */
  {
    id: 'm-dev-01', chapter: 'deriv', kind: 'choice', difficulty: 'easy',
    stem: '设 y = x³ ln x，则 y′ = （　）',
    options: ['3x² ln x', '3x² ln x + x²', 'x²', '3x² ln x + x³'],
    answer: 1,
    refAnswer: 'B',
    steps: [
      '这是乘积形式，用乘法求导法则 (uv)′ = u′v + uv′。',
      '取 u = x³，v = ln x，则 u′ = 3x²，v′ = 1/x。',
      'y′ = 3x² · ln x + x³ · (1/x) = 3x² ln x + x²。',
      '注意 x³ · (1/x) = x²，不要漏掉这一项。',
    ],
    point: '乘积求导别漏第二项',
    formula: '(uv)′ = u′v + uv′',
  },
  {
    id: 'm-dev-02', chapter: 'deriv', kind: 'blank', difficulty: 'mid',
    stem: '设 y = arctan(x²)，则 dy/dx = ______',
    refAnswer: '2x / (1 + x⁴)',
    steps: [
      '这是一个复合函数，外层是 arctan u，内层 u = x²。',
      '(arctan u)′ = 1 / (1 + u²)，代入 u = x² 得 1/(1 + x⁴)。',
      '再乘内层导数 (x²)′ = 2x。',
      '故 dy/dx = 2x / (1 + x⁴)。',
    ],
    point: '复合求导要一层层「由外向内」乘到底',
    formula: '(arctan u)′ = u′ / (1 + u²)',
  },
  {
    id: 'm-dev-03', chapter: 'deriv', kind: 'calc', difficulty: 'mid',
    stem: '求函数 y = x³ − 3x² + 2 的单调区间、极值，并指出凹凸区间与拐点。',
    refAnswer: '增区间 (−∞,0)∪(2,+∞)，减区间 (0,2)；极大值 y(0)=2，极小值 y(2)=−2；拐点 (1, 0)',
    steps: [
      '求一阶导：y′ = 3x² − 6x = 3x(x − 2)，令 y′ = 0 得驻点 x = 0, 2。',
      '列表判号：x<0 时 y′>0 增；0<x<2 时 y′<0 减；x>2 时 y′>0 增。',
      '故 x=0 处取极大值 y(0)=2，x=2 处取极小值 y(2)=8−12+2=−2。',
      '求二阶导：y″ = 6x − 6，令 y″=0 得 x=1。',
      'x<1 时 y″<0 为凸（上凸），x>1 时 y″>0 为凹，x=1 是拐点，y(1)=1−3+2=0，即 (1, 0)。',
    ],
    point: '一阶导定单调与极值，二阶导定凹凸与拐点，用列表法最稳',
    formula: 'y′>0 增；y″>0 凹',
  },
  {
    id: 'm-dev-04', chapter: 'deriv', kind: 'proof', difficulty: 'hard',
    stem: '设 f(x) 在 [0, 1] 上连续，在 (0, 1) 内可导，且 f(0) = f(1) = 0。证明：存在 ξ ∈ (0, 1)，使得 f′(ξ) = f(ξ)。',
    refAnswer: '构造辅助函数 F(x) = e^(−x) f(x)，用罗尔定理',
    steps: [
      '目标是 f′(ξ) = f(ξ)，即 f′(ξ) − f(ξ) = 0，这是一阶线性齐次式。',
      '构造辅助函数：把式子整理成 f′ − f = 0，乘以积分因子 e^(−x)，得 e^(−x)(f′ − f) = 0，即 (e^(−x) f(x))′ = 0。',
      '令 F(x) = e^(−x) f(x)。由 f 在 [0,1] 连续、在 (0,1) 可导，知 F 同样满足条件。',
      '验证端点：F(0) = e⁰·f(0) = 0，F(1) = e^(−1)·f(1) = 0，即 F(0) = F(1)。',
      '由罗尔定理，存在 ξ ∈ (0,1) 使 F′(ξ) = 0。',
      '而 F′(x) = e^(−x)(f′(x) − f(x))，因 e^(−x) ≠ 0，故 f′(ξ) − f(ξ) = 0，即 f′(ξ) = f(ξ)。证毕。',
    ],
    point: '证明 f′ = kf 型结论的标准套路：乘积分因子构造辅助函数',
    formula: 'F(x) = e^(−x) f(x)',
  },
  {
    id: 'm-dev-05', chapter: 'deriv', kind: 'calc', difficulty: 'easy',
    stem: '用洛必达法则求 lim(x→1) (x³ − 1) / (x² − 1)。',
    refAnswer: '3/2',
    steps: [
      '代入 x=1 得 0/0 型，可用洛必达法则。',
      '分子分母分别求导：分子 → 3x²，分母 → 2x。',
      '得 lim(x→1) 3x²/(2x) = 3x/2，代入 x=1 得 3/2。',
      '（验证：因式分解法 (x−1)(x²+x+1)/(x−1)(x+1) = (x²+x+1)/(x+1) → 3/2，结果一致。）',
    ],
    point: '0/0 与 ∞/∞ 是洛必达的适用条件，先验证再使用',
  },
  {
    id: 'm-dev-06', chapter: 'deriv', kind: 'choice', difficulty: 'mid',
    stem: '设 f(x) = x e^x，则 f 的极小值点为（　）',
    options: ['x = −1', 'x = 0', 'x = 1', '无极小值'],
    answer: 0,
    refAnswer: 'A',
    steps: [
      '求导：f′(x) = e^x + x e^x = e^x(1 + x)。',
      '令 f′(x) = 0，因 e^x > 0 恒成立，故 1 + x = 0，得 x = −1。',
      '判号：x < −1 时 f′ < 0 递减；x > −1 时 f′ > 0 递增。',
      '先减后增，x = −1 为极小值点，极小值 f(−1) = −e^(−1) = −1/e。',
    ],
    point: 'e^x 恒正，判断导数符号时可以直接约掉',
  },

  /* ========== 微积分 (三) 一元函数积分学 ========== */
  {
    id: 'm-int-01', chapter: 'integral', kind: 'blank', difficulty: 'easy',
    stem: '∫ (2x + 3) dx = ______（结果加常数 C）',
    refAnswer: 'x² + 3x + C',
    steps: [
      '利用积分的线性性质，逐项积分。',
      '∫ 2x dx = x²，∫ 3 dx = 3x。',
      '合并并加上任意常数 C：x² + 3x + C。',
    ],
    point: '不定积分结果千万别漏掉 +C',
    formula: '∫xⁿdx = x^(n+1)/(n+1) + C',
  },
  {
    id: 'm-int-02', chapter: 'integral', kind: 'calc', difficulty: 'mid',
    stem: '求 ∫ x e^x dx。',
    refAnswer: 'e^x(x − 1) + C',
    steps: [
      '被积函数是幂函数与指数函数的乘积，用分部积分法。',
      '设 u = x，dv = e^x dx，则 du = dx，v = e^x。',
      '∫ x e^x dx = x e^x − ∫ e^x dx。',
      '= x e^x − e^x + C = e^x(x − 1) + C。',
    ],
    point: '分部积分选 u 的口诀：反、对、幂、指、三（排在前面的做 u）',
    formula: '∫u dv = uv − ∫v du',
  },
  {
    id: 'm-int-03', chapter: 'integral', kind: 'calc', difficulty: 'mid',
    stem: '计算定积分 ∫₀¹ x² dx，并说明其几何意义。',
    refAnswer: '1/3；表示曲线 y = x² 与 x 轴、直线 x = 1 围成的曲边梯形面积',
    steps: [
      '用牛顿—莱布尼茨公式：先求原函数 F(x) = x³/3。',
      '代入上下限：F(1) − F(0) = 1/3 − 0 = 1/3。',
      '几何意义：当被积函数非负时，定积分等于曲线 y = x²、x 轴与直线 x = 1 所围曲边梯形的面积。',
      '所以该定积分表示面积为 1/3 的曲边三角形。',
    ],
    point: '定积分计算三步：求原函数 → 代上限 → 减下限',
    formula: '∫ₐᵇ f(x)dx = F(b) − F(a)',
  },
  {
    id: 'm-int-04', chapter: 'integral', kind: 'calc', difficulty: 'hard',
    stem: '设 F(x) = ∫₀ˣ sin t² dt，求 F′(x)。',
    refAnswer: 'sin x²',
    steps: [
      '这是变上限积分函数，直接用变上限积分求导公式。',
      '公式：d/dx ∫ₐˣ f(t) dt = f(x)，把上限直接代回被积函数中的 t。',
      '此处被积函数为 sin t²，将 t 换成 x 得 F′(x) = sin x²。',
      '注意不需要对 sin x² 再求导（那是上限为 x² 时才需要链式法则）。',
    ],
    point: '变上限积分求导：上限直接代入被积函数',
    formula: 'd/dx ∫ₐˣ f(t)dt = f(x)',
  },
  {
    id: 'm-int-05', chapter: 'integral', kind: 'calc', difficulty: 'mid',
    stem: '求 ∫ 1/(x² + 4) dx。',
    refAnswer: '(1/2) arctan(x/2) + C',
    steps: [
      '这是 ∫ dx/(x² + a²) 的标准型，其中 a² = 4，a = 2。',
      '标准公式：∫ dx/(x² + a²) = (1/a) arctan(x/a) + C。',
      '代入 a = 2，得 (1/2) arctan(x/2) + C。',
      '也可用换元 x = 2tanθ 验证，结果相同。',
    ],
    point: '见到 x² + a² 结构，先想反三角函数的积分公式',
    formula: '∫dx/(x²+a²) = (1/a)arctan(x/a) + C',
  },
  {
    id: 'm-int-06', chapter: 'integral', kind: 'synthetic', difficulty: 'hard',
    stem: '设曲线 y = x² 与直线 y = 2x 围成一平面图形。求：(1) 交点；(2) 该图形的面积；(3) 该图形绕 x 轴旋转所得旋转体的体积。',
    refAnswer: '交点 (0,0) 与 (2,4)；面积 4/3；体积 64π/15',
    steps: [
      '(1) 求交：令 x² = 2x，即 x² − 2x = 0，x(x−2) = 0，得 x = 0 或 2，对应点 (0,0) 和 (2,4)。',
      '(2) 面积：在 [0,2] 上 2x ≥ x²（因 2x − x² = x(2−x) ≥ 0），用上减下积分。',
      'A = ∫₀² (2x − x²) dx = [x² − x³/3]₀² = (4 − 8/3) = 4/3。',
      '(3) 体积：绕 x 轴旋转，用圆环法 V = π∫₀² [(2x)² − (x²)²] dx。',
      'V = π∫₀² (4x² − x⁴) dx = π[4x³/3 − x⁵/5]₀² = π(32/3 − 32/5)。',
      '通分：32/3 − 32/5 = (160 − 96)/15 = 64/15，故 V = 64π/15。',
    ],
    point: '面积用「上减下」，旋转体用「外半径²减内半径²」',
    formula: 'A = ∫ₐᵇ|上−下|dx；V = π∫ₐᵇ(y₁²−y₂²)dx',
  },

  /* ========== 微积分 (六) 常微分方程 ========== */
  {
    id: 'm-ode-01', chapter: 'ode', kind: 'blank', difficulty: 'easy',
    stem: '微分方程 y′ = 2xy 的通解为 y = ______',
    refAnswer: 'C e^(x²)',
    steps: [
      '这是可分离变量方程，把 y 和 x 分别移到两边。',
      'dy/y = 2x dx。',
      '两边积分：ln|y| = x² + C₁。',
      '取指数得 |y| = e^(x²+C₁) = e^(C₁) e^(x²)，把 e^(C₁) 记为任意常数 C，得 y = C e^(x²)。',
    ],
    point: '可分离变量方程：先分离 → 两边积分 → 化简常数',
    formula: 'dy/y = 2x dx',
  },
  {
    id: 'm-ode-02', chapter: 'ode', kind: 'calc', difficulty: 'mid',
    stem: '求微分方程 y′ + 2y = 4x 的通解。',
    refAnswer: 'y = 2x − 1 + C e^(−2x)',
    steps: [
      '这是一阶线性微分方程，标准形式 y′ + P(x)y = Q(x)，其中 P = 2，Q = 4x。',
      '套通解公式 y = e^(−∫P dx)[ ∫Q·e^(∫P dx)dx + C ]。',
      '∫P dx = ∫2dx = 2x，故 e^(∫P dx) = e^(2x)，e^(−∫P dx) = e^(−2x)。',
      '计算 ∫ 4x·e^(2x) dx（分部积分）：设 u = 4x, dv = e^(2x)dx，得 2x e^(2x) − ∫2e^(2x)dx = 2x e^(2x) − e^(2x) = e^(2x)(2x − 1)。',
      '代回：y = e^(−2x)[ e^(2x)(2x − 1) + C ] = (2x − 1) + C e^(−2x)。',
    ],
    point: '一阶线性方程直接背通解公式，别现场推导',
    formula: 'y = e^(−∫Pdx)[∫Q e^(∫Pdx)dx + C]',
  },
  {
    id: 'm-ode-03', chapter: 'ode', kind: 'calc', difficulty: 'mid',
    stem: '求微分方程 y″ − 3y′ + 2y = 0 的通解。',
    refAnswer: 'y = C₁eˣ + C₂e^(2x)',
    steps: [
      '这是二阶常系数线性齐次方程，写出特征方程。',
      '特征方程：r² − 3r + 2 = 0。',
      '因式分解 (r − 1)(r − 2) = 0，得两个相异实根 r₁ = 1，r₂ = 2。',
      '相异实根情形通解为 y = C₁e^(r₁x) + C₂e^(r₂x)，故 y = C₁eˣ + C₂e^(2x)。',
    ],
    point: '二阶常系数齐次方程：特征根三种情形（相异实根/重根/共轭复根）',
    formula: 'r² − 3r + 2 = 0',
  },
  {
    id: 'm-ode-04', chapter: 'ode', kind: 'choice', difficulty: 'mid',
    stem: '微分方程 y″ + 4y = 0 的通解是（　）',
    options: [
      'y = C₁e^(2x) + C₂e^(−2x)',
      'y = C₁cos 2x + C₂sin 2x',
      'y = e^x(C₁cos 2x + C₂sin 2x)',
      'y = C₁ + C₂x',
    ],
    answer: 1,
    refAnswer: 'B',
    steps: [
      '特征方程：r² + 4 = 0，得 r² = −4，r = ±2i。',
      '这是一对共轭纯虚根，形如 α ± βi，此处 α = 0，β = 2。',
      '共轭复根情形通解 y = e^(αx)(C₁cos βx + C₂sin βx)。',
      '代入 α = 0, β = 2，得 y = C₁cos 2x + C₂sin 2x。',
    ],
    point: '特征根为 ±βi 时通解是纯三角函数，没有指数因子',
  },
  {
    id: 'm-ode-05', chapter: 'ode', kind: 'synthetic', difficulty: 'hard',
    stem: '求微分方程 y″ − 4y′ + 3y = 6e^(2x) 的通解。',
    refAnswer: 'y = C₁eˣ + C₂e^(3x) − 6e^(2x)',
    steps: [
      '这是二阶常系数非齐次方程，通解 = 齐次通解 + 一个特解。',
      '第一步求齐次通解：特征方程 r² − 4r + 3 = 0，即 (r−1)(r−3) = 0，得 r₁=1, r₂=3，故 y_h = C₁eˣ + C₂e^(3x)。',
      '第二步设特解：右端是 6e^(2x)，λ = 2 不是特征根，故设 y* = A e^(2x)。',
      '求导代入：y*′ = 2A e^(2x)，y*″ = 4A e^(2x)。',
      '代入原方程：4A e^(2x) − 4·2A e^(2x) + 3A e^(2x) = 6e^(2x)，即 (4 − 8 + 3)A e^(2x) = 6e^(2x)。',
      '得 −A = 6，A = −6，即 y* = −6e^(2x)。',
      '合并：y = C₁eˣ + C₂e^(3x) − 6e^(2x)。',
    ],
    point: '非齐次方程：先解齐次，再按右端形式设特解（注意 λ 是否为特征根）',
    formula: 'y = y_h + y*',
  },

  /* ========== 微积分 (四) 多元函数微积分学 ========== */
  {
    id: 'm-mul-01', chapter: 'multivar', kind: 'blank', difficulty: 'easy',
    stem: '设 z = x²y + y³，则 ∂z/∂x = ______',
    refAnswer: '2xy',
    steps: [
      '求对 x 的偏导数时，把 y 当作常数。',
      '对 x²y 求 x 的偏导：y 是常数，得 2xy。',
      '对 y³ 求 x 的偏导：y³ 与 x 无关，导数为 0。',
      '故 ∂z/∂x = 2xy。',
    ],
    point: '偏导数就是把其他变量当常数，用一元求导法则即可',
  },
  {
    id: 'm-mul-02', chapter: 'multivar', kind: 'calc', difficulty: 'mid',
    stem: '设 z = e^(xy)，求 ∂z/∂x、∂z/∂y 及全微分 dz。',
    refAnswer: '∂z/∂x = y e^(xy)，∂z/∂y = x e^(xy)，dz = e^(xy)(y dx + x dy)',
    steps: [
      '求 ∂z/∂x：把 y 视为常数，e^(xy) 对 x 求导需用链式法则，指数对 x 的导数是 y。',
      '故 ∂z/∂x = y e^(xy)。',
      '同理求 ∂z/∂y：把 x 视为常数，指数对 y 的导数是 x，得 ∂z/∂y = x e^(xy)。',
      '全微分公式 dz = (∂z/∂x)dx + (∂z/∂y)dy。',
      '代入得 dz = y e^(xy) dx + x e^(xy) dy = e^(xy)(y dx + x dy)。',
    ],
    point: '全微分 = 各偏导数分别乘对应微分再相加',
    formula: 'dz = (∂z/∂x)dx + (∂z/∂y)dy',
  },
  {
    id: 'm-mul-03', chapter: 'multivar', kind: 'calc', difficulty: 'hard',
    stem: '计算二重积分 ∬_D x dxdy，其中 D 是由直线 y = x、y = 0 与 x = 1 围成的三角形区域。',
    refAnswer: '1/6',
    steps: [
      '先画区域 D：由 y = 0（x 轴）、y = x、x = 1 围成的三角形，顶点为 (0,0)、(1,0)、(1,1)。',
      '选择积分次序（按 x 型区域）：0 ≤ x ≤ 1，0 ≤ y ≤ x。',
      '化为累次积分：∬_D x dxdy = ∫₀¹ dx ∫₀ˣ x dy。',
      '先对 y 积分（此时 x 视为常数）：∫₀ˣ x dy = x · y |₀ˣ = x · x = x²。',
      '再对 x 积分：∫₀¹ x² dx = [x³/3]₀¹ = 1/3。',
      '若改用 y 型区域（0 ≤ y ≤ 1，y ≤ x ≤ 1）：∫₀¹ dy ∫_y¹ x dx = ∫₀¹ (1 − y²)/2 dy = (1/2)(1 − 1/3) = 1/3。两种次序结果一致。',
      '故积分值为 1/3。',
    ],
    point: '二重积分先画区域图，再选积分次序，内层积分时外层变量视为常数',
    formula: '∬_D f dxdy = ∫ₐᵇdx∫_{y₁(x)}^{y₂(x)} f dy',
  },
  {
    id: 'm-mul-04', chapter: 'multivar', kind: 'choice', difficulty: 'mid',
    stem: '函数 z = x² + y² − 2x − 4y 的极小值点是（　）',
    options: ['(1, 2)', '(0, 0)', '(2, 4)', '(−1, −2)'],
    answer: 0,
    refAnswer: 'A',
    steps: [
      '二元函数求极值先求偏导并令其为零，解驻点。',
      '∂z/∂x = 2x − 2 = 0 → x = 1。',
      '∂z/∂y = 2y − 4 = 0 → y = 2。',
      '得唯一驻点 (1, 2)。',
      '用二阶偏导判别：A = z_xx = 2，B = z_xy = 0，C = z_yy = 2。',
      'AC − B² = 4 − 0 = 4 > 0 且 A = 2 > 0，故为极小值点，极小值 z(1,2) = 1+4−2−8 = −5。',
    ],
    point: '二元极值判别：AC − B² > 0 且 A > 0 为极小，A < 0 为极大',
    formula: 'AC − B² > 0 且 A>0 → 极小',
  },
  {
    id: 'm-mul-05', chapter: 'multivar', kind: 'synthetic', difficulty: 'hard',
    stem: '求函数 z = xy 在约束条件 x + y = 1（x > 0, y > 0）下的最大值。',
    refAnswer: '最大值 1/4，在 x = y = 1/2 处取得',
    steps: [
      '这是条件极值问题，可用拉格朗日乘数法，也可直接代入消元。',
      '方法一（消元）：由 x + y = 1 得 y = 1 − x，代入 z = x(1 − x) = x − x²。',
      '对 x 求导：z′ = 1 − 2x = 0，得 x = 1/2，此时 y = 1/2。',
      'z″ = −2 < 0，故为极大值，最大值 z = 1/2 × 1/2 = 1/4。',
      '方法二（拉格朗日）：构造 L = xy + λ(x + y − 1)，令 L_x = y + λ = 0，L_y = x + λ = 0，得 x = y，结合约束得 x = y = 1/2，同样得到 1/4。',
    ],
    point: '条件极值两种解法：能消元就消元，不能消元用拉格朗日乘数法',
    formula: 'L = f(x,y) + λφ(x,y)',
  },

  /* ========== 微积分 (五) 无穷级数 ========== */
  {
    id: 'm-ser-01', chapter: 'series', kind: 'choice', difficulty: 'easy',
    stem: '级数 Σ(n=1→∞) 1/n² 的敛散性是（　）',
    options: ['发散', '收敛', '条件收敛', '无法判定'],
    answer: 1,
    refAnswer: 'B',
    steps: [
      '这是 p 级数 Σ 1/n^p 的形式，此处 p = 2。',
      'p 级数收敛的判别准则：p > 1 时收敛，p ≤ 1 时发散。',
      '因 p = 2 > 1，故级数收敛。',
      '（补充：p = 1 时即调和级数 Σ1/n，是发散的典型例子。）',
    ],
    point: 'p 级数：p > 1 收敛，p ≤ 1 发散，是判别法的基准',
    formula: 'Σ1/n^p: p>1 收敛',
  },
  {
    id: 'm-ser-02', chapter: 'series', kind: 'blank', difficulty: 'mid',
    stem: '幂级数 Σ(n=0→∞) xⁿ 的收敛半径为 ______，收敛域为 ______',
    refAnswer: 'R = 1；收敛域 (−1, 1)',
    steps: [
      '这是等比级数，公比为 x，系数 aₙ = 1。',
      '用比值法求收敛半径：R = lim |aₙ/aₙ₊₁| = lim 1/1 = 1。',
      '当 |x| < 1 时级数收敛；|x| > 1 时通项不趋于 0，发散。',
      '端点检验：x = 1 时化为 Σ1，通项为 1 不趋于 0，发散；x = −1 时化为 Σ(−1)ⁿ，通项不趋于 0，发散。',
      '故收敛域为开区间 (−1, 1)。',
    ],
    point: '求收敛半径后必须单独检验两个端点',
    formula: 'R = lim|aₙ/aₙ₊₁|',
  },
  {
    id: 'm-ser-03', chapter: 'series', kind: 'calc', difficulty: 'mid',
    stem: '判别级数 Σ(n=1→∞) n/2ⁿ 的敛散性。',
    refAnswer: '收敛',
    steps: [
      '通项含 n 次幂，优先用比值判别法（达朗贝尔判别法）。',
      '设 uₙ = n/2ⁿ，则 uₙ₊₁ = (n+1)/2^(n+1)。',
      '求比值：uₙ₊₁/uₙ = [(n+1)/2^(n+1)] / [n/2ⁿ] = (n+1)/(2n)。',
      '取极限：lim (n+1)/(2n) = 1/2 < 1。',
      '因比值极限小于 1，故级数收敛。',
    ],
    point: '通项含 n! 或 n 次幂时用比值法最有效',
    formula: 'lim uₙ₊₁/uₙ < 1 → 收敛',
  },
  {
    id: 'm-ser-04', chapter: 'series', kind: 'calc', difficulty: 'hard',
    stem: '判别级数 Σ(n=1→∞) (−1)^(n−1)/n 的敛散性，并指出是绝对收敛还是条件收敛。',
    refAnswer: '收敛，且为条件收敛',
    steps: [
      '这是交错级数，先用莱布尼茨判别法判断收敛性。',
      '莱布尼茨两个条件：① uₙ = 1/n 单调递减；② lim 1/n = 0。两条件均满足。',
      '故交错级数 Σ(−1)^(n−1)/n 收敛。',
      '再看绝对值级数：Σ|(−1)^(n−1)/n| = Σ1/n，这是调和级数（p = 1），发散。',
      '级数本身收敛但绝对值级数发散，属于条件收敛。',
    ],
    point: '条件收敛 = 原级数收敛 + 绝对值级数发散，两者缺一不可',
    formula: '莱布尼茨：uₙ ↓ 且 → 0',
  },

  /* ========== 线性代数 (一) 行列式与矩阵 ========== */
  {
    id: 'm-det-01', chapter: 'detmat', kind: 'blank', difficulty: 'easy',
    stem: '二阶行列式 |1 2; 3 4| = ______',
    refAnswer: '−2',
    steps: [
      '二阶行列式的计算规则：主对角线元素之积 减 副对角线元素之积。',
      '主对角线：1 × 4 = 4。',
      '副对角线：2 × 3 = 6。',
      '故行列式值 = 4 − 6 = −2。',
    ],
    point: '二阶行列式「主对角积 − 副对角积」',
    formula: '|a b; c d| = ad − bc',
  },
  {
    id: 'm-det-02', chapter: 'detmat', kind: 'calc', difficulty: 'mid',
    stem: '计算三阶行列式 |2 0 1; 1 3 −1; 0 2 4| 的值。',
    refAnswer: '30',
    steps: [
      '方法一（对角线法则）：主对角线方向三组乘积之和 减 副对角线方向三组乘积之和。',
      '主方向：a₁₁a₂₂a₃₃ + a₁₂a₂₃a₃₁ + a₁₃a₂₁a₃₂ = 2·3·4 + 0·(−1)·0 + 1·1·2 = 24 + 0 + 2 = 26。',
      '副方向：a₁₃a₂₂a₃₁ + a₁₁a₂₃a₃₂ + a₁₂a₂₁a₃₃ = 1·3·0 + 2·(−1)·2 + 0·1·4 = 0 − 4 + 0 = −4。',
      '行列式 = 26 − (−4) = 30。',
      '方法二（按第一行展开）：2 × |3 −1; 2 4| − 0 × |1 −1; 0 4| + 1 × |1 3; 0 2|。',
      '= 2 × (3·4 − (−1)·2) + 1 × (1·2 − 3·0) = 2 × 14 + 2 = 28 + 2 = 30。两种方法一致。',
    ],
    point: '三阶行列式可用对角线法则，也可按行（列）展开降阶',
    formula: '|A| = 主对角三组和 − 副对角三组和',
  },
  {
    id: 'm-det-03', chapter: 'detmat', kind: 'calc', difficulty: 'mid',
    stem: '设 A = [2 1; 1 1]，求 A 的逆矩阵 A⁻¹。',
    refAnswer: 'A⁻¹ = [1 −1; −1 2]',
    steps: [
      '先算行列式：|A| = 2×1 − 1×1 = 1，不为零，故 A 可逆。',
      '二阶矩阵求逆公式：A = [a b; c d] 的逆为 (1/|A|)[d −b; −c a]。',
      '代入 a=2, b=1, c=1, d=1：伴随部分为 [1 −1; −1 2]。',
      '因 |A| = 1，故 A⁻¹ = [1 −1; −1 2]。',
      '验证：A·A⁻¹ = [2·1+1·(−1)  2·(−1)+1·2; 1·1+1·(−1)  1·(−1)+1·2] = [1 0; 0 1]，正确。',
    ],
    point: '二阶求逆有速记公式：主对角互换、副对角变号、除以行列式',
    formula: 'A⁻¹ = (1/|A|) · A*',
  },
  {
    id: 'm-det-04', chapter: 'detmat', kind: 'choice', difficulty: 'mid',
    stem: '设 A 为 3 阶方阵，|A| = 2，则 |2A| = （　）',
    options: ['4', '8', '16', '32'],
    answer: 2,
    refAnswer: 'C',
    steps: [
      '用行列式的数乘性质：|kA| = kⁿ|A|，其中 n 为方阵的阶数。',
      '此处 k = 2，n = 3（3 阶方阵）。',
      '|2A| = 2³ × |A| = 8 × 2 = 16。',
      '常见错误：误以为 |2A| = 2|A| = 4，忽略了数乘要乘到每一行（列）。',
    ],
    point: '|kA| = kⁿ|A|，n 是阶数，不是 1',
    formula: '|kA| = kⁿ|A|',
  },
  {
    id: 'm-det-05', chapter: 'detmat', kind: 'synthetic', difficulty: 'hard',
    stem: '求矩阵 A = [1 2 3; 2 4 6; 1 1 1] 的秩。',
    refAnswer: 'r(A) = 2',
    steps: [
      '求秩的标准方法：初等行变换化行阶梯形，数非零行数。',
      '第 2 行减去第 1 行的 2 倍：r₂ → r₂ − 2r₁，得 [0 0 0]。',
      '第 3 行减去第 1 行：r₃ → r₃ − r₁，得 [0 −1 −2]。',
      '此时矩阵变为 [1 2 3; 0 0 0; 0 −1 −2]。',
      '交换第 2、3 行：[1 2 3; 0 −1 −2; 0 0 0]。',
      '非零行有 2 行，故秩 r(A) = 2。',
      '（另解：第 2 行 = 2 × 第 1 行，说明第 1、2 行线性相关，秩小于 3；而二阶子式 |1 2; 1 1| = 1×1 − 2×1 = −1 ≠ 0，说明秩至少为 2，故秩恰为 2。）',
    ],
    point: '求秩用行变换化阶梯形，非零行数就是秩',
    formula: 'r(A) = 行阶梯形中非零行的个数',
  },

  /* ========== 线性代数 (二) 向量与线性方程组 ========== */
  {
    id: 'm-lin-01', chapter: 'linalg', kind: 'choice', difficulty: 'easy',
    stem: '向量组 α₁ = (1, 0, 0)，α₂ = (0, 1, 0)，α₃ = (0, 0, 1) 的线性相关性是（　）',
    options: ['线性相关', '线性无关', '部分相关', '无法判定'],
    answer: 1,
    refAnswer: 'B',
    steps: [
      '设有 k₁α₁ + k₂α₂ + k₃α₃ = 0，即 (k₁, k₂, k₃) = (0, 0, 0)。',
      '由此直接得 k₁ = k₂ = k₃ = 0。',
      '只有零解，故向量组线性无关。',
      '一般结论：n 维单位向量组一定线性无关。',
    ],
    point: '线性无关 ⇔ 只有零解；含零向量的向量组必相关',
    formula: 'k₁α₁ + ⋯ + kₙαₙ = 0 只有零解',
  },
  {
    id: 'm-lin-02', chapter: 'linalg', kind: 'blank', difficulty: 'mid',
    stem: '齐次线性方程组 x₁ + x₂ + x₃ = 0 的基础解系含 ______ 个解向量，通解为 ______',
    refAnswer: '2 个；通解 x = k₁(−1,1,0)ᵀ + k₂(−1,0,1)ᵀ',
    steps: [
      '系数矩阵为一行 [1 1 1]，秩 r(A) = 1。',
      '未知数个数 n = 3，基础解系所含向量个数 = n − r = 3 − 1 = 2。',
      '取 x₂、x₃ 为自由未知量：令 x₂ = 1, x₃ = 0 得 x₁ = −1，得解向量 (−1, 1, 0)ᵀ。',
      '令 x₂ = 0, x₃ = 1 得 x₁ = −1，得解向量 (−1, 0, 1)ᵀ。',
      '通解为两个解向量的任意线性组合：x = k₁(−1,1,0)ᵀ + k₂(−1,0,1)ᵀ，k₁、k₂ 为任意常数。',
    ],
    point: '基础解系个数 = n − r(A)，这是必考公式',
    formula: '基础解系个数 = n − r(A)',
  },
  {
    id: 'm-lin-03', chapter: 'linalg', kind: 'calc', difficulty: 'hard',
    stem: '求解线性方程组：x₁ + 2x₂ + x₃ = 3；2x₁ + 3x₂ + x₃ = 5；x₁ + x₂ = 2。',
    refAnswer: '有无穷多解，通解 x = (1, 1, 0)ᵀ + t(1, −1, 1)ᵀ',
    steps: [
      '写出增广矩阵并做初等行变换。',
      '增广矩阵：(1 2 1 | 3; 2 3 1 | 5; 1 1 0 | 2)。',
      'r₂ → r₂ − 2r₁：(0 −1 −1 | −1)；r₃ → r₃ − r₁：(0 −1 −1 | −1)。',
      '此时 r₂ 与 r₃ 完全相同，说明第三个方程是多余的，实际只有两个独立方程。',
      '由 r₂：(0 −1 −1 | −1)，即 −x₂ − x₃ = −1，得 x₂ + x₃ = 1。',
      '由 r₁：x₁ + 2x₂ + x₃ = 3，代入 x₂ + x₃ = 1 得 x₁ + (x₂ + x₃) + x₂ = 3，即 x₁ + 1 + x₂ = 3，得 x₁ + x₂ = 2。',
      '这与原第 3 个方程一致，说明有无穷多解（秩 r(A) = r(A|b) = 2 < 3）。',
      '取 x₃ 为自由未知量：令 x₃ = t，则 x₂ = 1 − t，x₁ = 2 − x₂ = 1 + t。',
      '通解：x = (1, 1, 0)ᵀ + t(1, −1, 1)ᵀ。当 t = 0 时得特解 (1, 1, 0)。',
    ],
    point: '先比秩：r(A) < r(A|b) 无解；两者相等且小于 n 有无穷多解',
    formula: 'r(A) = r(A|b) = n → 唯一解',
  },
  {
    id: 'm-lin-04', chapter: 'linalg', kind: 'choice', difficulty: 'mid',
    stem: '设 3 元非齐次线性方程组 Ax = b 的系数矩阵秩 r(A) = 2，增广矩阵秩 r(A|b) = 3，则该方程组（　）',
    options: ['有唯一解', '有无穷多解', '无解', '解的情况无法确定'],
    answer: 2,
    refAnswer: 'C',
    steps: [
      '线性方程组有解的必要条件是 r(A) = r(A|b)。',
      '本题 r(A) = 2，而 r(A|b) = 3，两者不相等。',
      '由判别定理：r(A) < r(A|b) 时方程组无解。',
      '直观理解：增广矩阵秩更大，说明出现了形如 (0 0 0 | c)（c ≠ 0）的矛盾方程。',
    ],
    point: '记住三条：r(A)≠r(A|b) 无解；相等且 = n 唯一解；相等且 < n 无穷多解',
    formula: 'r(A) < r(A|b) → 无解',
  },
  {
    id: 'm-lin-05', chapter: 'linalg', kind: 'synthetic', difficulty: 'hard',
    stem: '判别向量组 α₁ = (1, 1, 1)，α₂ = (1, 2, 3)，α₃ = (1, 3, 5) 的线性相关性；若相关，求其最大无关组。',
    refAnswer: '线性相关；最大无关组为 {α₁, α₂}',
    steps: [
      '把三个向量按行排成矩阵，做行变换求秩。',
      '矩阵：(1 1 1; 1 2 3; 1 3 5)。',
      'r₂ → r₂ − r₁：(0 1 2)；r₃ → r₃ − r₁：(0 2 4)。',
      'r₃ → r₃ − 2r₂：(0 0 0)，出现零行。',
      '非零行数为 2，故秩 r = 2 < 3（向量个数），向量组线性相关。',
      '最大无关组含 2 个向量，取前两个非零行对应的 α₁ = (1,1,1) 与 α₂ = (1,2,3)。',
      '验证 α₃ 可由它们表示：由行变换关系 α₃ = 2α₂ − α₁ = 2(1,2,3) − (1,1,1) = (1, 3, 5) ✓。',
    ],
    point: '向量个数 > 秩 ⇒ 线性相关；最大无关组取非零行对应的原向量',
    formula: '向量组秩 r < 向量个数 ⇒ 线性相关',
  },
];

/* ─────────────────────── 工具函数 ─────────────────────── */

/** 按章节取题 */
export function questionsOfChapter(chapter: MathChapter): MathQuestion[] {
  return MATH_QUESTIONS.filter((q) => q.chapter === chapter);
}

/** 按章节 + 题型取题 */
export function questionsOf(chapter: MathChapter, kind?: MathKind): MathQuestion[] {
  return MATH_QUESTIONS.filter((q) => q.chapter === chapter && (!kind || q.kind === kind));
}

/** 统计各章题目数 */
export function chapterCount(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const q of MATH_QUESTIONS) out[q.chapter] = (out[q.chapter] ?? 0) + 1;
  return out;
}

export const MATH_TOTAL = MATH_QUESTIONS.length;
