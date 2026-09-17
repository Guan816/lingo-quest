import type { Cet4Kind, Cet4Question, Cet4Writing } from '../types';

/**
 * 大学英语四级（CET-4）题库。
 *
 * 说明：以下题目均按四级真题的**题型与难度**原创编写（含中文解析），
 * 覆盖听力 35% / 阅读 35% / 翻译 15% / 写作 15% 的完整结构。
 * 真题原卷受版权保护，不宜整卷转载；若你想加入自己的真题，
 * 直接按下面的数据格式往数组里追加即可，界面会自动打乱顺序。
 */

/* ─────────────────────── 题型元信息 ─────────────────────── */

export interface Cet4KindMeta {
  kind: Cet4Kind;
  name: string;
  emoji: string;
  desc: string;
  /** 在真实考卷中的分值占比 */
  weight: string;
  /** tailwind 渐变 */
  tone: string;
  group: '听力' | '阅读' | '基础' | '输出';
  /** 主观题（翻译/写作）用另一套作答界面 */
  subjective?: boolean;
}

export const CET4_KINDS: Cet4KindMeta[] = [
  {
    kind: 'news',
    name: '短篇新闻',
    emoji: '📰',
    desc: '首句就是主旨，抓关键信息',
    weight: '7%',
    tone: 'from-brand-400 to-brand-600',
    group: '听力',
  },
  {
    kind: 'conversation',
    name: '长对话',
    emoji: '💬',
    desc: '答案常在回答者那句话里',
    weight: '8%',
    tone: 'from-mint-400 to-mint-600',
    group: '听力',
  },
  {
    kind: 'passage',
    name: '听力篇章',
    emoji: '🎧',
    desc: '单题分值最高，考主旨与推断',
    weight: '20%',
    tone: 'from-grape-400 to-grape-600',
    group: '听力',
  },
  {
    kind: 'banked',
    name: '选词填空',
    emoji: '🧩',
    desc: '先判词性，再选意思',
    weight: '5%',
    tone: 'from-sun-400 to-sun-600',
    group: '阅读',
  },
  {
    kind: 'matching',
    name: '长篇阅读匹配',
    emoji: '🔗',
    desc: '划关键词，回原文定位',
    weight: '10%',
    tone: 'from-coral-400 to-coral-600',
    group: '阅读',
  },
  {
    kind: 'careful',
    name: '仔细阅读',
    emoji: '🔍',
    desc: '单题分值最高，优先保证',
    weight: '20%',
    tone: 'from-brand-500 to-grape-600',
    group: '阅读',
  },
  {
    kind: 'vocab',
    name: '核心词汇',
    emoji: '📚',
    desc: '四级高频词，语境里记',
    weight: '贯穿全卷',
    tone: 'from-mint-500 to-brand-500',
    group: '基础',
  },
  {
    kind: 'translation',
    name: '段落翻译',
    emoji: '✍️',
    desc: '中国文化题材，汉译英',
    weight: '15%',
    tone: 'from-sun-500 to-coral-500',
    group: '输出',
    subjective: true,
  },
  {
    kind: 'writing',
    name: '短文写作',
    emoji: '📝',
    desc: '120-180 词，三段式最稳',
    weight: '15%',
    tone: 'from-grape-500 to-brand-600',
    group: '输出',
    subjective: true,
  },
];

export function kindMeta(kind: Cet4Kind): Cet4KindMeta {
  return CET4_KINDS.find((k) => k.kind === kind) ?? CET4_KINDS[0];
}

/* ─────────────────────── 客观题题库 ─────────────────────── */

export const CET4_QUESTIONS: Cet4Question[] = [
  /* ---------- 短篇新闻 ---------- */
  {
    id: 'c4-news-1',
    kind: 'news',
    tag: '新闻风格',
    material:
      'A powerful storm swept through a coastal city on Tuesday night, forcing more than two thousand residents to leave their homes. Local officials said the wind speed reached 120 kilometers per hour. No deaths have been reported so far, but dozens of buildings were damaged.',
    materialZh: '周二夜间，一场强风暴袭击了一座沿海城市。',
    stem: 'What happened in the coastal city on Tuesday night?',
    options: [
      'A storm forced thousands of people to leave home',
      'A fire destroyed dozens of buildings',
      'A new hospital opened to the public',
      'A factory was closed by local officials',
    ],
    answer: 0,
    explain:
      '新闻首句即主旨：风暴迫使两千多名居民离家（forcing more than two thousand residents to leave their homes）。其余选项文中均未提及。',
  },
  {
    id: 'c4-news-2',
    kind: 'news',
    tag: '新闻风格',
    material:
      'The city library announced that it will extend its opening hours to 10 p.m. starting next month. The move is aimed at serving students who are preparing for exams. Free coffee will also be provided on weekends.',
    materialZh: '市图书馆宣布下月起延长开放时间。',
    stem: 'Why will the library extend its opening hours?',
    options: [
      'To host a book fair',
      'To serve students preparing for exams',
      'To reduce its electricity costs',
      'To train new staff members',
    ],
    answer: 1,
    explain: '原文直接给出目的：The move is aimed at serving students who are preparing for exams。',
  },
  {
    id: 'c4-news-3',
    kind: 'news',
    tag: '新闻风格',
    material:
      'A study of 1,200 office workers found that those who took a ten-minute walk every two hours reported better focus in the afternoon. Researchers suggest that short walks are a simple way to fight tiredness.',
    materialZh: '一项针对 1200 名上班族的研究发现短时间散步有帮助。',
    stem: 'What is the finding of the study?',
    options: [
      'Long meetings reduce productivity',
      'Coffee works better than walking',
      'Short walks help improve afternoon focus',
      'Office workers sleep too little',
    ],
    answer: 2,
    explain: '研究发现：每两小时散步十分钟的人下午专注力更好（reported better focus in the afternoon）。',
  },
  {
    id: 'c4-news-4',
    kind: 'news',
    tag: '新闻风格',
    material:
      'The national railway will add 40 high-speed trains during the holiday season to meet the growing travel demand. Tickets will go on sale online three days earlier than usual.',
    materialZh: '铁路部门将增开高铁应对假期出行需求。',
    stem: 'What will the railway do during the holiday season?',
    options: [
      'Raise ticket prices',
      'Close some small stations',
      'Cancel all night trains',
      'Add more high-speed trains',
    ],
    answer: 3,
    explain: 'will add 40 high-speed trains 即"增开高铁"。',
  },

  /* ---------- 长对话 ---------- */
  {
    id: 'c4-conv-1',
    kind: 'conversation',
    tag: '校园场景',
    material:
      'M: Hi Lisa, are you still coming to the study group tonight?\nW: I would love to, but I have to finish my report first. It is due tomorrow morning.\nM: How about we start at eight instead of seven?\nW: That works. I should be done by then.',
    materialZh: '关于今晚学习小组时间的对话。',
    stem: 'What time will the study group probably start?',
    options: ['At seven', 'At nine', 'At eight', 'At ten'],
    answer: 2,
    explain:
      '男士提议把时间从七点（seven）改到八点（eight），女士回答 That works（可以），因此答案是八点。听力题要特别注意"改口"的信息。',
  },
  {
    id: 'c4-conv-2',
    kind: 'conversation',
    tag: '服务场景',
    material:
      'W: Excuse me, I would like to return this jacket. It is a bit too small.\nM: Do you have the receipt with you?\nW: Yes, here it is. Could I exchange it for a larger one?\nM: Sure, let me check our stock.',
    materialZh: '顾客在商店退换外套。',
    stem: 'What does the woman want to do?',
    options: [
      'Get her money back',
      'Complain about the quality',
      'Buy a second jacket',
      'Exchange it for a larger one',
    ],
    answer: 3,
    explain: '女士明确说 Could I exchange it for a larger one?（能换一件大一点的吗）。',
  },
  {
    id: 'c4-conv-3',
    kind: 'conversation',
    tag: '日常场景',
    material:
      'M: You look tired, Anna. Late night again?\nW: Yeah, I was up until two finishing the slides for today\u2019s meeting.\nM: Why don\u2019t you take a break after lunch? I can handle the calls.\nW: Thanks, that would really help.',
    materialZh: '同事之间关心状态的对话。',
    stem: 'What will the woman probably do after lunch?',
    options: ['Take a break', 'Finish her slides', 'Make phone calls', 'Attend another meeting'],
    answer: 0,
    explain: '男士建议 Why don\u2019t you take a break after lunch，女士回答 That would really help，表示接受。',
  },
  {
    id: 'c4-conv-4',
    kind: 'conversation',
    tag: '师生场景',
    material:
      'W: Professor Lee, I am worried about the deadline for the term paper.\nM: How much have you written so far?\nW: Only the introduction. I have been ill for a week.\nM: In that case, I can give you three more days.',
    materialZh: '学生因生病向老师申请延期。',
    stem: 'What does the man offer to do?',
    options: ['Change the topic', 'Give extra time', 'Lower the grade', 'Write a reference letter'],
    answer: 1,
    explain: 'I can give you three more days 即"多给三天时间"。',
  },

  /* ---------- 听力篇章 ---------- */
  {
    id: 'c4-passage-1',
    kind: 'passage',
    tag: '校园话题',
    material:
      'Getting enough sleep is more important than many students realize. Research shows that students who sleep fewer than six hours a night score lower in memory tests. One simple habit helps a lot: keep your phone outside the bedroom. Another is to go to bed at the same time every day, even on weekends.',
    materialZh: '关于睡眠习惯的短文。',
    stem: 'What is the passage mainly about?',
    options: [
      'How to prepare for memory tests',
      'Why weekends are important',
      'How to improve sleep habits',
      'Why phones are useful at night',
    ],
    answer: 2,
    explain: '主旨题。全篇围绕"如何改善睡眠习惯"给出建议（手机放卧室外、每天固定时间睡）。',
  },
  {
    id: 'c4-passage-2',
    kind: 'passage',
    tag: '社会话题',
    material:
      'Volunteering is a great way to learn new skills. When you help at a community kitchen, you practice communication and teamwork. Many employers say they value such experience even more than grades. Best of all, volunteering often leads to new friendships.',
    materialZh: '参加志愿服务的价值。',
    stem: 'According to the passage, what do many employers value?',
    options: [
      'Foreign language certificates',
      'Working in big cities',
      'High grades only',
      'Volunteer experience',
    ],
    answer: 3,
    explain: '原文说 Many employers say they value such experience even more than grades，such experience 指前文的志愿服务经历。',
  },
  {
    id: 'c4-passage-3',
    kind: 'passage',
    tag: '职场话题',
    material:
      'The number of people who work from home has grown quickly in recent years. For companies, this means lower office costs. For workers, it means no commuting. However, some workers say it is harder to separate work from personal life.',
    materialZh: '居家办公的数量增长及其利弊。',
    stem: 'What problem do some home workers mention?',
    options: [
      'Difficulty separating work and personal life',
      'Longer commuting time',
      'Less communication with family',
      'Higher office costs',
    ],
    answer: 0,
    explain: '转折词 However 之后是考点：harder to separate work from personal life。',
  },
  {
    id: 'c4-passage-4',
    kind: 'passage',
    tag: '教育话题',
    material:
      'Reading aloud to children has long been advised by teachers. A new study adds that it also helps parents. Parents who read aloud reported feeling closer to their children and less stressed after a long day.',
    materialZh: '给孩子朗读的新好处。',
    stem: 'What extra benefit does the new study mention?',
    options: [
      'It raises test scores in maths',
      'It helps parents feel closer to their children',
      'It saves money on books',
      'It makes children sleep earlier',
    ],
    answer: 1,
    explain: '新研究的额外发现是：对家长也有好处——feeling closer to their children and less stressed。',
  },

  /* ---------- 选词填空 ---------- */
  {
    id: 'c4-banked-1',
    kind: 'banked',
    tag: '选词填空',
    material:
      'Learning a new language takes time, but a few habits help. First, practice a little every day rather than a lot once a week; daily practice keeps the words (1)____ in your memory. Second, do not worry about making mistakes, because mistakes (2)____ you what to fix. Third, use the language in real situations, which makes the learning (3)____ and more fun.',
    materialZh: '学外语的三个有效习惯。',
    stem: '第 (1) 空应填：',
    options: ['absent', 'alive', 'asleep', 'angry'],
    answer: 1,
    explain: 'keep sth. alive 是固定搭配，意为"使…保持鲜活"，此处指让单词留在记忆里。',
  },
  {
    id: 'c4-banked-2',
    kind: 'banked',
    tag: '选词填空',
    material:
      'Learning a new language takes time, but a few habits help. First, practice a little every day rather than a lot once a week; daily practice keeps the words (1)____ in your memory. Second, do not worry about making mistakes, because mistakes (2)____ you what to fix. Third, use the language in real situations, which makes the learning (3)____ and more fun.',
    materialZh: '学外语的三个有效习惯。',
    stem: '第 (2) 空应填：',
    options: ['cost', 'hide', 'teach', 'forget'],
    answer: 2,
    explain: '空后是 you what to fix（双宾语结构），只有及物动词 teach 能这样用：mistakes teach you what to fix。',
  },
  {
    id: 'c4-banked-3',
    kind: 'banked',
    tag: '选词填空',
    material:
      'Learning a new language takes time, but a few habits help. First, practice a little every day rather than a lot once a week; daily practice keeps the words (1)____ in your memory. Second, do not worry about making mistakes, because mistakes (2)____ you what to fix. Third, use the language in real situations, which makes the learning (3)____ and more fun.',
    materialZh: '学外语的三个有效习惯。',
    stem: '第 (3) 空应填：',
    options: ['difficult', 'expensive', 'similar', 'meaningful'],
    answer: 3,
    explain: '空格与 and more fun 并列，需要一个褒义形容词；meaningful（有意义的）最贴合。',
  },
  {
    id: 'c4-banked-4',
    kind: 'banked',
    tag: '选词填空',
    material:
      'When you apply for a job, your resume is your first (1)____ with the company. Keep it short — one page is usually enough. Most importantly, (2)____ the resume for each position you apply for. A generic resume is easily (3)____ by busy managers.',
    materialZh: '关于简历撰写的建议。',
    stem: '第 (1) 空应填：',
    options: ['salary', 'contact', 'mistake', 'holiday'],
    answer: 1,
    explain: 'your first contact with the company（与公司的第一次接触）符合语义；contact 在此为名词。',
  },
  {
    id: 'c4-banked-5',
    kind: 'banked',
    tag: '选词填空',
    material:
      'When you apply for a job, your resume is your first (1)____ with the company. Keep it short — one page is usually enough. Most importantly, (2)____ the resume for each position you apply for. A generic resume is easily (3)____ by busy managers.',
    materialZh: '关于简历撰写的建议。',
    stem: '第 (2) 空应填：',
    options: ['tailor', 'delay', 'print', 'copy'],
    answer: 0,
    explain: 'tailor sth. for sth. 意为"为…量身定制"，与后文 for each position 呼应。',
  },
  {
    id: 'c4-banked-6',
    kind: 'banked',
    tag: '选词填空',
    material:
      'When you apply for a job, your resume is your first (1)____ with the company. Keep it short — one page is usually enough. Most importantly, (2)____ the resume for each position you apply for. A generic resume is easily (3)____ by busy managers.',
    materialZh: '关于简历撰写的建议。',
    stem: '第 (3) 空应填：',
    options: ['praised', 'paid', 'ignored', 'hired'],
    answer: 2,
    explain: 'is easily ignored by busy managers（容易被忙碌的招聘经理忽略），是被动语态 + 副词 easily，语义通顺。',
  },

  /* ---------- 长篇阅读匹配 ---------- */
  {
    id: 'c4-match-1',
    kind: 'matching',
    tag: '信息匹配',
    material:
      'A. Many students choose to live on campus because it saves the time they would otherwise spend on commuting.\nB. Living off campus gives students more freedom and more space of their own.\nC. Cost is often the deciding factor: rent in the city center can be twice as high as dormitory fees.\nD. Safety and convenience also matter; students often prefer buildings with security and shops nearby.',
    materialZh: '关于住宿选择的四段文字。',
    stem: '「居住成本常常是决定因素，市中心房租可能是宿舍费用的两倍。」这一信息对应哪一段？',
    options: ['A 段', 'B 段', 'C 段', 'D 段'],
    answer: 2,
    explain: '关键词 Cost、deciding factor、rent、twice as high as dormitory fees 全部出现在 C 段。定位题先划数字与专有名词。',
  },
  {
    id: 'c4-match-2',
    kind: 'matching',
    tag: '信息匹配',
    material:
      'A. Many students choose to live on campus because it saves the time they would otherwise spend on commuting.\nB. Living off campus gives students more freedom and more space of their own.\nC. Cost is often the deciding factor: rent in the city center can be twice as high as dormitory fees.\nD. Safety and convenience also matter; students often prefer buildings with security and shops nearby.',
    materialZh: '关于住宿选择的四段文字。',
    stem: '「住校外能让大学生拥有更多自由和属于自己的空间。」这一信息对应哪一段？',
    options: ['A 段', 'B 段', 'C 段', 'D 段'],
    answer: 1,
    explain: 'B 段的 more freedom and more space of their own 与题干"更多自由和空间"完全对应。',
  },
  {
    id: 'c4-match-3',
    kind: 'matching',
    tag: '信息匹配',
    material:
      'A. Many students choose to live on campus because it saves the time they would otherwise spend on commuting.\nB. Living off campus gives students more freedom and more space of their own.\nC. Cost is often the deciding factor: rent in the city center can be twice as high as dormitory fees.\nD. Safety and convenience also matter; students often prefer buildings with security and shops nearby.',
    materialZh: '关于住宿选择的四段文字。',
    stem: '「安全与便利同样是考虑因素，学生更倾向于有安保、附近有商店的住所。」这一信息对应哪一段？',
    options: ['A 段', 'B 段', 'C 段', 'D 段'],
    answer: 3,
    explain: 'D 段出现 Safety、convenience、security、shops nearby，与题干逐一对应。',
  },
  {
    id: 'c4-match-4',
    kind: 'matching',
    tag: '信息匹配',
    material:
      'A. Many students choose to live on campus because it saves the time they would otherwise spend on commuting.\nB. Living off campus gives students more freedom and more space of their own.\nC. Cost is often the deciding factor: rent in the city center can be twice as high as dormitory fees.\nD. Safety and convenience also matter; students often prefer buildings with security and shops nearby.',
    materialZh: '关于住宿选择的四段文字。',
    stem: '「许多学生选择住校，是为了省下通勤时间。」这一信息对应哪一段？',
    options: ['A 段', 'B 段', 'C 段', 'D 段'],
    answer: 0,
    explain: 'A 段 saves the time they would otherwise spend on commuting 正是"节省通勤时间"。',
  },

  /* ---------- 仔细阅读 ---------- */
  {
    id: 'c4-careful-1',
    kind: 'careful',
    tag: '仔细阅读',
    material:
      'Working from home was once seen as a privilege. Today, for millions of office workers, it is simply normal. Supporters point out that it saves hours of commuting and gives people more control over their day. Critics, however, warn about the loss of casual conversations that often produce new ideas. A recent survey of 3,000 employees found that 62 percent preferred a mixed model: two or three days at home and the rest in the office. The reason was not only flexibility — many said they missed their colleagues. For companies, the lesson is clear: the question is no longer whether remote work exists, but how to make the mix work.',
    materialZh: '关于居家办公与混合办公模式的讨论。',
    stem: 'What is the passage mainly about?',
    options: [
      'The debate over remote work and the rise of mixed models',
      'How to save commuting time in big cities',
      'Why traditional offices are becoming larger',
      'The history of teamwork in companies',
    ],
    answer: 0,
    explain: '主旨题。全篇从"支持/反对居家办公"讲到"调查显示多数人偏爱混合模式"，最后落到 how to make the mix work。',
  },
  {
    id: 'c4-careful-2',
    kind: 'careful',
    tag: '仔细阅读',
    material:
      'Working from home was once seen as a privilege. Today, for millions of office workers, it is simply normal. Supporters point out that it saves hours of commuting and gives people more control over their day. Critics, however, warn about the loss of casual conversations that often produce new ideas. A recent survey of 3,000 employees found that 62 percent preferred a mixed model: two or three days at home and the rest in the office. The reason was not only flexibility — many said they missed their colleagues. For companies, the lesson is clear: the question is no longer whether remote work exists, but how to make the mix work.',
    materialZh: '关于居家办公与混合办公模式的讨论。',
    stem: 'According to critics, what is a disadvantage of working from home?',
    options: [
      'Paying more for electricity at home',
      'Losing casual conversations that spark new ideas',
      'Working much longer hours every day',
      'Spending more money on commuting',
    ],
    answer: 1,
    explain: '由 Critics 定位：warn about the loss of casual conversations that often produce new ideas。',
  },
  {
    id: 'c4-careful-3',
    kind: 'careful',
    tag: '仔细阅读',
    material:
      'Working from home was once seen as a privilege. Today, for millions of office workers, it is simply normal. Supporters point out that it saves hours of commuting and gives people more control over their day. Critics, however, warn about the loss of casual conversations that often produce new ideas. A recent survey of 3,000 employees found that 62 percent preferred a mixed model: two or three days at home and the rest in the office. The reason was not only flexibility — many said they missed their colleagues. For companies, the lesson is clear: the question is no longer whether remote work exists, but how to make the mix work.',
    materialZh: '关于居家办公与混合办公模式的讨论。',
    stem: 'What did the survey of 3,000 employees find?',
    options: [
      'Most of them had no clear opinion',
      'Most of them wanted to work fully remotely',
      'Most of them preferred a mixed model',
      'Most of them wanted to return to the office full-time',
    ],
    answer: 2,
    explain: '62 percent preferred a mixed model 即"多数人偏爱混合模式"。数字是重要定位词。',
  },
  {
    id: 'c4-careful-4',
    kind: 'careful',
    tag: '仔细阅读',
    material:
      'Working from home was once seen as a privilege. Today, for millions of office workers, it is simply normal. Supporters point out that it saves hours of commuting and gives people more control over their day. Critics, however, warn about the loss of casual conversations that often produce new ideas. A recent survey of 3,000 employees found that 62 percent preferred a mixed model: two or three days at home and the rest in the office. The reason was not only flexibility — many said they missed their colleagues. For companies, the lesson is clear: the question is no longer whether remote work exists, but how to make the mix work.',
    materialZh: '关于居家办公与混合办公模式的讨论。',
    stem: 'Why did many employees prefer the mixed model?',
    options: [
      'They wanted higher pay',
      'They missed their colleagues',
      'They disliked their managers',
      'They could not work at home',
    ],
    answer: 1,
    explain: '破折号后是解释：many said they missed their colleagues。破折号、冒号后常是答案所在。',
  },
  {
    id: 'c4-careful-5',
    kind: 'careful',
    tag: '仔细阅读',
    material:
      'Plastic waste is a global problem, but some cities are finding creative answers. In one coastal town, old fishing nets are collected and turned into skateboards. The project began as an art experiment and now employs 30 local people. The founder says the goal is not to compete with big factories but to show that waste has value. Still, experts caution that recycling alone cannot solve the problem. The real answer, they say, is to use less plastic in the first place.',
    materialZh: '把废弃渔网变成滑板的小镇项目。',
    stem: 'What is the passage mainly about?',
    options: [
      'The history of the plastic industry',
      'Why fishing is declining in coastal towns',
      'A creative project that turns plastic waste into products',
      'How to build a skateboard factory',
    ],
    answer: 2,
    explain: '首句点题：Plastic waste is a global problem, but some cities are finding creative answers，随后举例。',
  },
  {
    id: 'c4-careful-6',
    kind: 'careful',
    tag: '仔细阅读',
    material:
      'Plastic waste is a global problem, but some cities are finding creative answers. In one coastal town, old fishing nets are collected and turned into skateboards. The project began as an art experiment and now employs 30 local people. The founder says the goal is not to compete with big factories but to show that waste has value. Still, experts caution that recycling alone cannot solve the problem. The real answer, they say, is to use less plastic in the first place.',
    materialZh: '把废弃渔网变成滑板的小镇项目。',
    stem: 'What can be learned about the project?',
    options: [
      'It started as an art experiment and now employs local people',
      'It was started by the local government',
      'It is competing with big factories',
      'It has been losing money since it began',
    ],
    answer: 0,
    explain: '原文：The project began as an art experiment and now employs 30 local people。',
  },
  {
    id: 'c4-careful-7',
    kind: 'careful',
    tag: '仔细阅读',
    material:
      'Plastic waste is a global problem, but some cities are finding creative answers. In one coastal town, old fishing nets are collected and turned into skateboards. The project began as an art experiment and now employs 30 local people. The founder says the goal is not to compete with big factories but to show that waste has value. Still, experts caution that recycling alone cannot solve the problem. The real answer, they say, is to use less plastic in the first place.',
    materialZh: '把废弃渔网变成滑板的小镇项目。',
    stem: 'What do experts emphasize?',
    options: [
      'Recycling is completely useless',
      'Skateboards should be made of wood',
      'Fishing nets are too expensive to collect',
      'Using less plastic matters more than recycling',
    ],
    answer: 3,
    explain: 'The real answer, they say, is to use less plastic in the first place —— 减少使用才是根本。',
  },
  {
    id: 'c4-careful-8',
    kind: 'careful',
    tag: '仔细阅读',
    material:
      'Plastic waste is a global problem, but some cities are finding creative answers. In one coastal town, old fishing nets are collected and turned into skateboards. The project began as an art experiment and now employs 30 local people. The founder says the goal is not to compete with big factories but to show that waste has value. Still, experts caution that recycling alone cannot solve the problem. The real answer, they say, is to use less plastic in the first place.',
    materialZh: '把废弃渔网变成滑板的小镇项目。',
    stem: 'What is the founder\u2019s goal?',
    options: [
      'To sell fishing nets abroad',
      'To become the largest factory in town',
      'To show that waste has value',
      'To stop local people from fishing',
    ],
    answer: 2,
    explain: 'the goal is not to compete with big factories but to show that waste has value —— but 后面才是真正的目的。',
  },

  /* ---------- 仔细阅读 · 科普题材 ---------- */
  {
    id: 'c4-careful-9',
    kind: 'careful',
    tag: '科普题材',
    material:
      'City birds sing at a higher pitch than their country relatives, and scientists believe noise is the reason. In a five-year study, researchers recorded the songs of great tits in ten cities and ten forests. City birds sang nearly 200 hertz higher on average. Higher sounds are easier to hear above the low rumble of traffic. The change is not only behavioral: the study also found that city birds have slightly different genes related to hearing. What remains unclear is whether the shift helps or harms the birds in the long run.',
    materialZh: '科普：城市鸟类为什么叫得更高。',
    stem: 'What is the passage mainly about?',
    options: [
      'Why city birds sing at a higher pitch',
      'How to record birdsong in forests',
      'Why great tits are disappearing from cities',
      'How traffic noise damages human hearing',
    ],
    answer: 0,
    explain: '首句点题：城市鸟叫得更高，科学家认为原因是噪音；后文展开研究与结论。',
  },
  {
    id: 'c4-careful-10',
    kind: 'careful',
    tag: '科普题材',
    material:
      'City birds sing at a higher pitch than their country relatives, and scientists believe noise is the reason. In a five-year study, researchers recorded the songs of great tits in ten cities and ten forests. City birds sang nearly 200 hertz higher on average. Higher sounds are easier to hear above the low rumble of traffic. The change is not only behavioral: the study also found that city birds have slightly different genes related to hearing. What remains unclear is whether the shift helps or harms the birds in the long run.',
    materialZh: '科普：城市鸟类为什么叫得更高。',
    stem: 'According to the passage, why do city birds sing higher?',
    options: [
      'Because their bodies are smaller in cities',
      'To be heard above the low noise of traffic',
      'Because they are looking for more food',
      'To copy the songs of other city birds',
    ],
    answer: 1,
    explain: 'Higher sounds are easier to hear above the low rumble of traffic —— 为了盖过交通的低频轰鸣。',
  },
  {
    id: 'c4-careful-11',
    kind: 'careful',
    tag: '科普题材',
    material:
      'City birds sing at a higher pitch than their country relatives, and scientists believe noise is the reason. In a five-year study, researchers recorded the songs of great tits in ten cities and ten forests. City birds sang nearly 200 hertz higher on average. Higher sounds are easier to hear above the low rumble of traffic. The change is not only behavioral: the study also found that city birds have slightly different genes related to hearing. What remains unclear is whether the shift helps or harms the birds in the long run.',
    materialZh: '科普：城市鸟类为什么叫得更高。',
    stem: 'What does the last sentence suggest?',
    options: [
      'The effect of the change is still uncertain',
      'The birds will soon move back to forests',
      'The research has been proved wrong',
      'Traffic noise is getting quieter',
    ],
    answer: 0,
    explain: 'What remains unclear is whether…（尚不清楚…）即"影响仍不确定"，是典型的推断题考法。',
  },

  /* ---------- 核心词汇 ---------- */
  {
    id: 'c4-vocab-1',
    kind: 'vocab',
    tag: '高频动词',
    stem: 'The manager asked us to ____ the report before Friday.',
    options: ['submit', 'permit', 'omit', 'commit'],
    answer: 0,
    explain: 'submit the report（提交报告）。permit 允许；omit 省略；commit 犯（错）/承诺。',
  },
  {
    id: 'c4-vocab-2',
    kind: 'vocab',
    tag: '高频动词',
    stem: 'Regular exercise can ____ the risk of heart disease.',
    options: ['refuse', 'reduce', 'remind', 'replace'],
    answer: 1,
    explain: 'reduce the risk（降低风险）是固定搭配。',
  },
  {
    id: 'c4-vocab-3',
    kind: 'vocab',
    tag: '高频形容词',
    stem: 'Her explanation was so ____ that everyone understood it immediately.',
    options: ['clever', 'close', 'clear', 'careful'],
    answer: 2,
    explain: 'so clear that…（如此清楚以至于…）。clever 聪明，与"听得懂"不搭。',
  },
  {
    id: 'c4-vocab-4',
    kind: 'vocab',
    tag: '高频形容词',
    stem: 'We should take ____ action to protect the environment.',
    options: ['identical', 'immediate', 'impossible', 'informal'],
    answer: 1,
    explain: 'take immediate action（立即采取行动）为固定搭配。',
  },
  {
    id: 'c4-vocab-5',
    kind: 'vocab',
    tag: '高频动词',
    stem: 'The company plans to ____ a new product next month.',
    options: ['lend', 'last', 'launch', 'lunch'],
    answer: 2,
    explain: 'launch a product（发布新产品）。注意 launch 与 lunch（午餐）拼写相近。',
  },
  {
    id: 'c4-vocab-6',
    kind: 'vocab',
    tag: '高频动词',
    stem: 'He was ____ by his manager for the excellent performance.',
    options: ['pressed', 'practiced', 'prevented', 'praised'],
    answer: 3,
    explain: 'be praised for（因…受到表扬）。prevent sb. from doing 才是"阻止"。',
  },
  {
    id: 'c4-vocab-7',
    kind: 'vocab',
    tag: '高频名词',
    stem: 'This medicine may have side ____ such as sleepiness.',
    options: ['effects', 'affects', 'efforts', 'offers'],
    answer: 0,
    explain: 'side effect（副作用）。affect 是动词，此处需要名词 effects。',
  },
  {
    id: 'c4-vocab-8',
    kind: 'vocab',
    tag: '高频动词',
    stem: 'The two sides agreed to ____ their differences peacefully.',
    options: ['separate', 'settle', 'select', 'serve'],
    answer: 1,
    explain: 'settle differences（解决分歧）为固定搭配。',
  },
  {
    id: 'c4-vocab-9',
    kind: 'vocab',
    tag: '高频名词',
    stem: 'She has a strong ____ to travel around the world.',
    options: ['degree', 'design', 'desire', 'detail'],
    answer: 2,
    explain: 'a strong desire to do sth.（强烈的愿望）。',
  },
  {
    id: 'c4-vocab-10',
    kind: 'vocab',
    tag: '高频动词',
    stem: 'The sports meeting was ____ because of the heavy rain.',
    options: ['proposed', 'promoted', 'postponed', 'produced'],
    answer: 2,
    explain: 'postpone（推迟）符合"因为大雨"的语境。',
  },
  {
    id: 'c4-vocab-11',
    kind: 'vocab',
    tag: '高频搭配',
    stem: 'We must ____ the deadline; there is no time to waste.',
    options: ['miss', 'make', 'mend', 'meet'],
    answer: 3,
    explain: 'meet the deadline（赶上截止时间）。miss the deadline 是"错过"，与后文矛盾。',
  },
  {
    id: 'c4-vocab-12',
    kind: 'vocab',
    tag: '高频动词',
    stem: 'Please ____ your seat belt before the plane takes off.',
    options: ['frighten', 'flatten', 'fasten', 'forget'],
    answer: 2,
    explain: 'fasten the seat belt（系好安全带），是乘机广播的高频表达。',
  },
];

/* ─────────────────────── 主观题：翻译 / 写作 ─────────────────────── */

export const CET4_WRITINGS: Cet4Writing[] = [
  {
    id: 'c4-tr-1',
    kind: 'translation',
    tag: '文化题材',
    prompt:
      '中国的传统节日大多与农业有关。春节是最重要的节日，无论离家多远，家人都会赶回来团聚。人们贴春联、放鞭炮、吃年夜饭，以此表达对新一年的美好祝愿。',
    sample:
      'Most traditional Chinese festivals are related to agriculture. The Spring Festival is the most important one, when family members will come back for a reunion no matter how far away they are from home. People put up Spring Festival couplets, set off firecrackers and enjoy the New Year\u2019s Eve dinner to express their good wishes for the coming year.',
    points: [
      '「大多与…有关」译作 be related to / have something to do with',
      '「无论离家多远」用 no matter how far… 或 however far…',
      '「赶回来团聚」可译 come back for a reunion / get together',
      '「以此表达」用 to express… 表目的，避免逐字译',
    ],
    phrases: [
      { en: 'be related to', zh: '与…有关' },
      { en: 'no matter how far', zh: '无论多远' },
      { en: 'set off firecrackers', zh: '放鞭炮' },
      { en: 'express good wishes', zh: '表达美好祝愿' },
    ],
  },
  {
    id: 'c4-tr-2',
    kind: 'translation',
    tag: '社会题材',
    prompt:
      '高铁改变了中国人的出行方式。如今从北京到上海只需要大约四个半小时。高铁不仅速度快，而且准点率高，因此成为许多人出行的首选。',
    sample:
      'High-speed trains have changed the way Chinese people travel. Today it takes only about four and a half hours to go from Beijing to Shanghai. High-speed trains are not only fast but also highly punctual, which makes them the first choice for many travelers.',
    points: [
      '「改变了…的方式」译 have changed the way (that) sb. do sth.',
      '「只需要大约四个半小时」用 it takes only about four and a half hours to…',
      '「不仅…而且…」用 not only… but also…，注意倒装与否',
      '「准点率高」译 be highly punctual / have a high on-time rate',
    ],
    phrases: [
      { en: 'the way people travel', zh: '人们的出行方式' },
      { en: 'it takes… to do', zh: '做…需要花费（时间）' },
      { en: 'not only… but also…', zh: '不仅…而且…' },
      { en: 'the first choice', zh: '首选' },
    ],
  },
  {
    id: 'c4-tr-3',
    kind: 'translation',
    tag: '文化题材',
    prompt:
      '越来越多的年轻人开始重视传统文化。他们学习书法和古筝，也愿意为传统手工艺品付费。这股潮流让一些老手艺重新回到人们的视野中。',
    sample:
      'More and more young people are beginning to value traditional culture. They learn calligraphy and the guzheng, and they are willing to pay for traditional handicrafts. This trend has brought some old crafts back into the public eye.',
    points: [
      '「越来越…」用 more and more / an increasing number of',
      '「重视」可译 value / attach importance to',
      '「愿意付费」用 be willing to pay for',
      '「重新回到…视野」译 bring… back into the public eye',
    ],
    phrases: [
      { en: 'attach importance to', zh: '重视' },
      { en: 'be willing to do', zh: '愿意做' },
      { en: 'traditional handicrafts', zh: '传统手工艺品' },
      { en: 'back into the public eye', zh: '重回公众视野' },
    ],
  },
  {
    id: 'c4-tr-4',
    kind: 'translation',
    tag: '科技题材',
    prompt:
      '移动支付在中国非常普及。无论是在大城市还是小镇，人们出门几乎不用带现金。这极大地提高了生活的便利性。',
    sample:
      'Mobile payment is extremely popular in China. Whether in big cities or small towns, people hardly need to carry cash when they go out. This has greatly improved the convenience of daily life.',
    points: [
      '「非常普及」译 be extremely popular / be widely used',
      '「无论…还是…」用 whether… or…',
      '「几乎不用」用 hardly need to',
      '「极大提高」用 greatly improve',
    ],
    phrases: [
      { en: 'mobile payment', zh: '移动支付' },
      { en: 'whether… or…', zh: '无论…还是…' },
      { en: 'hardly need to', zh: '几乎不需要' },
      { en: 'the convenience of daily life', zh: '生活便利性' },
    ],
  },
  {
    id: 'c4-wr-1',
    kind: 'writing',
    tag: '议论文',
    prompt:
      'Directions: For this part, you are allowed 30 minutes to write a short essay on the importance of learning to work in a team. You should write at least 120 words but no more than 180 words.',
    promptZh: '题目：论述团队合作能力的重要性（120-180 词）。',
    sample:
      'The Importance of Teamwork\n\nIn today\u2019s workplace, few tasks can be finished by one person alone. That is why learning to work in a team has become an essential ability for college students.\n\nTo begin with, teamwork makes hard problems easier. When a group of people share their ideas, solutions that no individual could find alone often appear. In addition, working with others teaches us to listen and to express ourselves clearly, which is exactly what employers look for. Finally, a good team offers support when we feel discouraged, so we are more likely to finish what we start.\n\nTherefore, students should not only study knowledge from books but also take part in group projects and volunteer activities. Only in this way can we become the kind of person who is both capable and easy to work with.',
    points: [
      '结构：开头点题 → 2-3 个理由（To begin with / In addition / Finally）→ 结尾总结',
      '理由要具体，最好给出"为什么"而不是口号',
      '开头结尾各一句即可，把篇幅留给中间论证',
      '注意主谓一致与第三人称单数',
    ],
    phrases: [
      { en: 'essential ability', zh: '必备能力' },
      { en: 'To begin with / In addition / Finally', zh: '首先 / 此外 / 最后' },
      { en: 'which is exactly what…', zh: '这恰恰是…' },
      { en: 'Only in this way can we…', zh: '只有这样我们才能…（倒装）' },
    ],
  },
  {
    id: 'c4-wr-2',
    kind: 'writing',
    tag: '议论文',
    prompt:
      'Directions: For this part, you are allowed 30 minutes to write a short essay on whether college students should take part-time jobs. You should write at least 120 words but no more than 180 words.',
    promptZh: '题目：大学生是否应该做兼职（120-180 词）。',
    sample:
      'Should College Students Take Part-time Jobs?\n\nOpinions differ when it comes to part-time jobs for college students. Personally, I believe they are helpful if time is managed well.\n\nThe biggest benefit is experience. A part-time job allows students to see how a real workplace runs and to learn how to deal with customers and colleagues. Besides, earning their own money helps students understand the value of hard work and manage their spending more carefully. However, the danger is obvious: if a student works too many hours, classes and sleep will suffer, and grades may drop.\n\nIn conclusion, taking a part-time job is a good choice as long as it serves study rather than replaces it. A balance between work and study is the key.',
    points: [
      '观点类作文用"两面看 + 我倾向"最稳，避免绝对化',
      '用一个 However 引出反方风险，体现思辨',
      '末尾用 as long as / as long as 结构给出条件结论',
      '字数不足时补一个具体例子',
    ],
    phrases: [
      { en: 'Opinions differ when it comes to…', zh: '在…问题上人们看法不一' },
      { en: 'the biggest benefit is…', zh: '最大的好处是…' },
      { en: 'as long as', zh: '只要' },
      { en: 'strike a balance between…', zh: '在…之间取得平衡' },
    ],
  },
  {
    id: 'c4-wr-3',
    kind: 'writing',
    tag: '应用文',
    prompt:
      'Directions: For this part, you are allowed 30 minutes to write a notice to inform students of a lecture on English learning. You should write at least 120 words but no more than 180 words.',
    promptZh: '题目：为一场"英语学习讲座"写一则通知（120-180 词）。',
    sample:
      'Notice\n\nA lecture on English learning will be held by the Students\u2019 Union in order to help first-year students improve their listening and speaking skills.\n\nThe lecture will take place in Room 305 of the Teaching Building from 7:00 p.m. to 8:30 p.m. this Friday. Our guest speaker is Professor Smith, who has taught English for over twenty years. He will share practical methods for practicing listening every day and explain how to get ready for the College English Test in a short time. There will also be a question-and-answer section at the end.\n\nAll students are welcome to attend. Please arrive five minutes early and bring your notebook. If you have any questions, contact Li Ming at 12345678.\n\nThe Students\u2019 Union',
    points: [
      '通知五要素：标题、对象（All students）、时间地点、内容、落款',
      '时间地点务必写清（from… to…, in Room…）',
      '结尾留联系方式，格式上更规范',
      '落款右对齐，署名 + 日期',
    ],
    phrases: [
      { en: 'in order to', zh: '为了' },
      { en: 'take place', zh: '举行（不及物）' },
      { en: 'a question-and-answer section', zh: '问答环节' },
      { en: 'All students are welcome to attend.', zh: '欢迎全体学生参加。' },
    ],
  },
];

/* ─────────────────────── 高频词卡片 ─────────────────────── */

export const CET4_HOT_WORDS: { en: string; zh: string }[] = [
  { en: 'submit', zh: '提交，呈交' },
  { en: 'reduce', zh: '减少，降低' },
  { en: 'launch', zh: '发起，发布' },
  { en: 'settle', zh: '解决；定居' },
  { en: 'postpone', zh: '推迟' },
  { en: 'fasten', zh: '系紧，扣住' },
  { en: 'praise', zh: '表扬' },
  { en: 'affect', zh: '影响（动词）' },
  { en: 'effect', zh: '影响，效果（名词）' },
  { en: 'tend to', zh: '往往会' },
  { en: 'be related to', zh: '与…有关' },
  { en: 'attach importance to', zh: '重视' },
  { en: 'be willing to do', zh: '愿意做' },
  { en: 'take part in', zh: '参加' },
  { en: 'in terms of', zh: '在…方面' },
  { en: 'as a result', zh: '结果，因此' },
  { en: 'contribute to', zh: '有助于，促成' },
  { en: 'make up for', zh: '弥补' },
  { en: 'be exposed to', zh: '接触到' },
  { en: 'put off', zh: '推迟' },
  { en: 'come up with', zh: '想出，提出' },
  { en: 'be responsible for', zh: '对…负责' },
  { en: 'deal with', zh: '处理，应对' },
  { en: 'pay attention to', zh: '注意' },
  { en: 'take advantage of', zh: '利用' },
  { en: 'on behalf of', zh: '代表' },
  { en: 'in addition', zh: '此外' },
  { en: 'in conclusion', zh: '总之' },
  { en: 'regardless of', zh: '不管，无论' },
  { en: 'play a key role in', zh: '在…中起关键作用' },
];

/** 各题型可练习的客观题数量 */
export function questionsOfKind(kind: Cet4Kind): Cet4Question[] {
  return CET4_QUESTIONS.filter((q) => q.kind === kind);
}

export function writingsOfKind(kind: Cet4Kind): Cet4Writing[] {
  return CET4_WRITINGS.filter((w) => w.kind === kind);
}
