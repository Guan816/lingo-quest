import type { CsChapter, CsCourse, CsKind, CsQuestion } from '../types';

/* ============================================================
 *  江苏专转本 · 计算机 题库
 *
 *  专业综合基础理论 150 分 = 课程 A（计算机应用基础）90 分 + 课程 B（信息技术导论）60 分
 *  题型：判断 10×1=10 · 单选 50×2=100 · 多选 10×2=20 · 填空 10空×2=20
 *  难度：较易 30% / 中等 50% / 较难 20%
 *
 *  说明：题目为按考纲原创命制，结构、难度与分值对齐真题，不搬运真题原卷。
 * ============================================================ */

/** 课程元信息 */
export const CS_COURSES: {
  key: CsCourse;
  name: string;
  short: string;
  score: number;
  percent: string;
  hint: string;
}[] = [
  {
    key: 'A',
    name: '计算机应用基础',
    short: '课程 A',
    score: 90,
    percent: '60%',
    hint: '硬件、软件、网络、多媒体四大块。单选占绝对多数，计算类考点（进制、存储量、IP）必须练熟。',
  },
  {
    key: 'B',
    name: '信息技术导论',
    short: '课程 B',
    score: 60,
    percent: '40%',
    hint: '物联网、移动互联网、云计算、大数据、AI、区块链。以概念记忆为主，抓关键词。',
  },
];

/** 章节元信息 */
export const CS_CHAPTERS: {
  key: CsChapter;
  course: CsCourse;
  name: string;
  hint: string;
}[] = [
  // ── 课程 A ──
  { key: 'hardware', course: 'A', name: '计算机硬件', hint: '进制转换、原反补码、存储容量计算、CPU 与总线，是课程 A 的计算题富矿。' },
  { key: 'software', course: 'A', name: '计算机软件', hint: '操作系统功能、程序设计语言、数据结构基础（栈队列/二叉树）、软件工程与 UML。' },
  { key: 'network', course: 'A', name: '计算机网络与互联网', hint: 'IP 地址与子网、TCP/IP、局域网与广域网、信息安全与加密。' },
  { key: 'media', course: 'A', name: '多媒体技术', hint: '图像/声音/视频的数字化与存储量计算，公式题必须会算。' },
  // ── 课程 B ──
  { key: 'infosys', course: 'B', name: '信息和信息系统', hint: '信息特性、信息通信技术、信息系统类型、关系数据库与 SQL 基础。' },
  { key: 'iot', course: 'B', name: '物联网技术', hint: '三层体系结构（感知/网络/应用）、RFID 与 EPC、ZigBee 等。' },
  { key: 'mobile', course: 'B', name: '移动互联网技术', hint: '5G 特点、Android 与 iOS 系统架构、HTML5 与 Web2.0。' },
  { key: 'cloud', course: 'B', name: '云计算技术', hint: '虚拟化与分布式、IaaS/PaaS/SaaS 三层服务模式的区别。' },
  { key: 'bigdata', course: 'B', name: '大数据技术', hint: '4V 特性、Hadoop 与 MapReduce、NoSQL、数据挖掘流程。' },
  { key: 'ai', course: 'B', name: '人工智能技术', hint: '深度学习、自然语言处理、计算机视觉、主流平台。' },
  { key: 'blockchain', course: 'B', name: '区块链', hint: '去中心化、不可篡改、共识机制、以太坊与 Fabric。' },
];

export function csChapterMeta(key: CsChapter) {
  return CS_CHAPTERS.find((c) => c.key === key)!;
}
export function csCourseMeta(key: CsCourse) {
  return CS_COURSES.find((c) => c.key === key)!;
}
export function chaptersOfCourse(course: CsCourse) {
  return CS_CHAPTERS.filter((c) => c.course === course);
}

/** 题型元信息 */
export const CS_KINDS: { key: CsKind; name: string; perScore: number; count: number; hint: string }[] = [
  { key: 'judge', name: '判断题', perScore: 1, count: 10, hint: '10 题 × 1 分 = 10 分' },
  { key: 'single', name: '单项选择题', perScore: 2, count: 50, hint: '50 题 × 2 分 = 100 分，占 2/3，是绝对主力' },
  { key: 'multi', name: '多项选择题', perScore: 2, count: 10, hint: '10 题 × 2 分 = 20 分，多选少选都不得分' },
  { key: 'fill', name: '填空题', perScore: 2, count: 10, hint: '10 空 × 2 分 = 20 分' },
];

export function csKindMeta(kind: CsKind) {
  return CS_KINDS.find((k) => k.key === kind)!;
}

/* ─────────────────────── 课程 A 题库 ─────────────────────── */

export const CS_QUESTIONS: CsQuestion[] = [
  /* ===== A1. 计算机硬件 ===== */
  {
    id: 'c-hw-01', course: 'A', chapter: 'hardware', kind: 'single', difficulty: 'easy',
    stem: '二进制数 1101.101 转换为十进制数是（　）',
    options: ['13.625', '13.5', '11.625', '15.625'],
    answer: 0,
    explain: '整数部分：1×2³+1×2²+0×2¹+1×2⁰ = 8+4+0+1 = 13。小数部分：1×2⁻¹+0×2⁻²+1×2⁻³ = 0.5+0+0.125 = 0.625。合计 13.625。',
    point: '二进制转十进制：按位权展开求和',
  },
  {
    id: 'c-hw-02', course: 'A', chapter: 'hardware', kind: 'single', difficulty: 'easy',
    stem: '十进制数 202 转换为二进制数是（　）',
    options: ['11001010', '11000110', '11101010', '10101010'],
    answer: 0,
    explain: '除 2 取余、逆序排列：202÷2=101余0，101÷2=50余1，50÷2=25余0，25÷2=12余1，12÷2=6余0，6÷2=3余0，3÷2=1余1，1÷2=0余1。余数逆序：11001010。验证：128+64+8+2 = 202 ✓',
    point: '十进制转二进制：除 2 取余、商为 0 止、余数倒排',
  },
  {
    id: 'c-hw-03', course: 'A', chapter: 'hardware', kind: 'judge', difficulty: 'mid',
    stem: '在计算机中，负数通常用补码表示，且 0 的补码表示是唯一的。',
    answer: 1,
    explain: '正确。原码和反码中 0 有 +0 和 −0 两种表示，而补码中 0 只有一种表示（全 0），这也是补码被广泛采用的原因之一。',
    point: '补码的优点是 0 表示唯一、且可把减法变为加法',
  },
  {
    id: 'c-hw-04', course: 'A', chapter: 'hardware', kind: 'single', difficulty: 'mid',
    stem: '8 位补码能表示的整数范围是（　）',
    options: ['−128 ~ +127', '−127 ~ +127', '−128 ~ +128', '0 ~ 255'],
    answer: 0,
    explain: 'n 位补码表示范围为 −2^(n−1) ~ 2^(n−1)−1。n=8 时即 −128 ~ +127。注意负数比正数多一个（因为 0 占用了正半轴的一个编码）。',
    point: 'n 位补码范围：−2^(n−1) ~ 2^(n−1)−1',
  },
  {
    id: 'c-hw-05', course: 'A', chapter: 'hardware', kind: 'fill', difficulty: 'mid',
    stem: '一个 1024×768 分辨率、24 位真彩色的位图图像，未经压缩时占用的存储空间约为 ______ MB（结果保留一位小数）。',
    refAnswer: '2.3',
    explain: '总像素数 = 1024 × 768 = 786432 个。每像素 24 位 = 3 字节，故总字节数 = 786432 × 3 = 2359296 字节。换算：2359296 ÷ 1024 ÷ 1024 ≈ 2.25 MB，保留一位小数为 2.3 MB（若取 2.25 亦可）。',
    point: '图像存储量 = 宽 × 高 × 色深 ÷ 8（字节），再除以 1024² 得 MB',
  },
  {
    id: 'c-hw-06', course: 'A', chapter: 'hardware', kind: 'single', difficulty: 'mid',
    stem: 'CPU 的主要组成部分包括（　）',
    options: ['运算器和控制器', '运算器和内存', '控制器和内存', '寄存器和外存'],
    answer: 0,
    explain: 'CPU（中央处理器）由运算器（ALU，负责算术与逻辑运算）和控制器（CU，负责指令译码与发出控制信号）两大部件构成。内存和外存不属于 CPU。',
    point: 'CPU = 运算器 + 控制器（寄存器组属于 CPU 内部，但不是与二者并列的"两大部件"）',
  },
  {
    id: 'c-hw-07', course: 'A', chapter: 'hardware', kind: 'judge', difficulty: 'easy',
    stem: 'ROM 中的内容在断电后会丢失，因此不能用于长期存储数据。',
    answer: 0,
    explain: '错误。ROM（只读存储器）是非易失性存储器，断电后内容不会丢失，正因如此常用于存放 BIOS 等固件。断电丢失的是 RAM（随机存储器）。',
    point: 'RAM 易失，ROM 非易失——这是两者最本质的区别',
  },
  {
    id: 'c-hw-08', course: 'A', chapter: 'hardware', kind: 'multi', difficulty: 'hard',
    stem: '关于系统总线，下列说法正确的有（　）',
    options: [
      '总线按传送信息类型可分为数据总线、地址总线和控制总线',
      '数据总线的宽度决定了 CPU 一次能并行传送的二进制位数',
      '地址总线的宽度决定了 CPU 能访问的最大内存空间',
      '总线的带宽等于总线宽度乘以总线频率',
    ],
    answer: [0, 1, 2, 3],
    explain: '四项均正确。① 按功能分为数据总线、地址总线、控制总线；② 数据总线宽度 = 字长，决定一次并行传送位数；③ 地址总线宽度 n 决定可寻址空间 2ⁿ；④ 带宽 = 宽度 × 频率，单位通常为 MB/s。',
    point: '数据总线定"宽度"，地址总线定"容量"，带宽 = 宽度 × 频率',
  },
  {
    id: 'c-hw-09', course: 'A', chapter: 'hardware', kind: 'single', difficulty: 'hard',
    stem: '某内存条的数据传输率为 3200 MB/s，若总线宽度为 64 位（8 字节），则其工作频率约为（　）',
    options: ['400 MHz', '200 MHz', '800 MHz', '1600 MHz'],
    answer: 0,
    explain: '带宽 = 总线宽度（字节）× 频率。8 字节 × 频率 = 3200 MB/s，得频率 = 400 MHz。',
    point: '带宽公式：字节宽度 × 频率 = 传输率',
  },
  {
    id: 'c-hw-10', course: 'A', chapter: 'hardware', kind: 'fill', difficulty: 'mid',
    stem: '十六进制数 2F 转换为十进制数是 ______',
    refAnswer: '47',
    explain: '按位权展开：2×16¹ + 15×16⁰ = 32 + 15 = 47。注意 F 代表 15。',
    point: '十六进制 A~F 分别表示 10~15',
  },

  /* ===== A2. 计算机软件 ===== */
  {
    id: 'c-sw-01', course: 'A', chapter: 'software', kind: 'single', difficulty: 'easy',
    stem: '操作系统的功能不包括（　）',
    options: ['编译高级语言源程序', '处理器管理', '存储管理', '文件管理'],
    answer: 0,
    explain: '操作系统的五大管理功能是：处理器管理、存储管理、设备管理、文件管理、作业（用户接口）管理。编译源程序由编译程序（语言处理程序）完成，不属于操作系统功能。',
    point: 'OS 五大管理：处理器、存储、设备、文件、作业',
  },
  {
    id: 'c-sw-02', course: 'A', chapter: 'software', kind: 'single', difficulty: 'mid',
    stem: '栈和队列的主要区别是（　）',
    options: [
      '栈是后进先出，队列是先进先出',
      '栈是先进先出，队列是后进先出',
      '栈只能顺序存储，队列只能链式存储',
      '栈不能删除元素，队列可以',
    ],
    answer: 0,
    explain: '栈（Stack）只允许在栈顶进行插入和删除，遵循后进先出（LIFO）；队列（Queue）在队尾插入、队头删除，遵循先进先出（FIFO）。两者都既可用顺序存储也可用链式存储。',
    point: '栈 LIFO，队列 FIFO',
  },
  {
    id: 'c-sw-03', course: 'A', chapter: 'software', kind: 'judge', difficulty: 'mid',
    stem: '在二叉树的三种遍历方式中，已知中序遍历序列和先序遍历序列即可唯一确定一棵二叉树。',
    answer: 1,
    explain: '正确。中序 + 先序、或中序 + 后序，都能唯一确定一棵二叉树。但仅有先序 + 后序无法唯一确定。',
    point: '确定二叉树必含中序：中+先 或 中+后',
  },
  {
    id: 'c-sw-04', course: 'A', chapter: 'software', kind: 'single', difficulty: 'mid',
    stem: '一棵完全二叉树共有 1000 个结点，则其叶子结点的个数为（　）',
    options: ['500', '499', '501', '498'],
    answer: 0,
    explain: '完全二叉树中，度为 1 的结点数 n₁ 只能是 0 或 1。设叶子数 n₀、度为 2 的结点数 n₂，则 n₀ = n₂ + 1（二叉树性质）。总结点数 n = n₀ + n₁ + n₂ = 1000。当 n 为偶数时 n₁ = 1，代入得 2n₀ − 1 + 1 = 1000，n₀ = 500。',
    point: '二叉树性质 n₀ = n₂ + 1；完全二叉树总结点为偶数时 n₁ = 1',
  },
  {
    id: 'c-sw-05', course: 'A', chapter: 'software', kind: 'single', difficulty: 'easy',
    stem: '计算机能直接识别并执行的语言是（　）',
    options: ['机器语言', '汇编语言', 'C 语言', 'Java'],
    answer: 0,
    explain: '计算机硬件只能直接执行机器语言（二进制指令）。汇编语言需经汇编程序翻译，C/Java 等高级语言需经编译或解释后执行，都不能被硬件直接识别。',
    point: '机器语言是唯一能被硬件直接执行的语言',
  },
  {
    id: 'c-sw-06', course: 'A', chapter: 'software', kind: 'multi', difficulty: 'mid',
    stem: '软件工程中，属于白盒测试方法的有（　）',
    options: ['语句覆盖', '判定覆盖', '条件覆盖', '等价类划分'],
    answer: [0, 1, 2],
    explain: '白盒测试（结构测试）关注程序内部逻辑，常用覆盖率准则：语句覆盖、判定覆盖、条件覆盖、路径覆盖等。等价类划分和边界值分析属于黑盒测试方法（只关注输入输出，不看内部结构）。',
    point: '白盒看内部逻辑（各类覆盖），黑盒看输入输出（等价类、边界值）',
  },
  {
    id: 'c-sw-07', course: 'A', chapter: 'software', kind: 'judge', difficulty: 'easy',
    stem: '算法必须在有穷步之内结束，这体现了算法的"有穷性"特征。',
    answer: 1,
    explain: '正确。算法有五大特征：有穷性（有限步内结束）、确定性（每步含义明确无歧义）、可行性（每步都能有效执行）、输入（零个或多个）、输出（一个或多个）。',
    point: '算法五特征：有穷、确定、可行、输入、输出',
  },
  {
    id: 'c-sw-08', course: 'A', chapter: 'software', kind: 'single', difficulty: 'hard',
    stem: '对长度为 n 的有序表进行二分查找，最多需要比较的次数为（　）',
    options: ['⌊log₂n⌋ + 1', 'n', 'n/2', 'log₂n − 1'],
    answer: 0,
    explain: '二分查找的判定树高度为 ⌈log₂(n+1)⌉，最多比较次数约为 ⌊log₂n⌋ + 1。二分查找的时间复杂度为 O(log₂n)，远优于顺序查找的 O(n)。',
    point: '二分查找 O(log₂n)，但要求表必须有序且顺序存储',
  },
  {
    id: 'c-sw-09', course: 'A', chapter: 'software', kind: 'single', difficulty: 'mid',
    stem: '在 UML 中，用来描述系统中对象之间按时间顺序交互的图是（　）',
    options: ['时序图（顺序图）', '类图', '用例图', '状态图'],
    answer: 0,
    explain: '时序图（Sequence Diagram，也称顺序图）强调消息按时间先后排列的交互过程。类图描述类的静态结构与关系，用例图描述系统与外部参与者的功能需求，状态图描述对象状态的变化。',
    point: '时序图看时间顺序，类图看静态结构，用例图看功能需求',
  },
  {
    id: 'c-sw-10', course: 'A', chapter: 'software', kind: 'fill', difficulty: 'mid',
    stem: '具有 n 个结点的完全二叉树的深度为 ______（用 n 表示，取 ⌊·⌋ 号）',
    refAnswer: '⌊log₂n⌋ + 1',
    explain: '深度为 k 的完全二叉树最多有 2^k − 1 个结点，最少有 2^(k−1) 个结点。由 2^(k−1) ≤ n < 2^k 可得 k − 1 ≤ log₂n < k，故深度 k = ⌊log₂n⌋ + 1。',
    point: '完全二叉树深度 = ⌊log₂n⌋ + 1',
  },

  /* ===== A3. 计算机网络与互联网 ===== */
  {
    id: 'c-net-01', course: 'A', chapter: 'network', kind: 'single', difficulty: 'easy',
    stem: 'IPv4 地址由多少位二进制数组成（　）',
    options: ['32 位', '64 位', '128 位', '16 位'],
    answer: 0,
    explain: 'IPv4 地址为 32 位，通常写成点分十进制形式（如 192.168.1.1），每段 8 位、范围 0~255。IPv6 才是 128 位。',
    point: 'IPv4 = 32 位，IPv6 = 128 位',
  },
  {
    id: 'c-net-02', course: 'A', chapter: 'network', kind: 'single', difficulty: 'mid',
    stem: '下列 IP 地址中属于 C 类地址的是（　）',
    options: ['192.168.1.1', '10.0.0.1', '128.1.1.1', '224.0.0.1'],
    answer: 0,
    explain: 'A 类首字节范围 1~126，B 类 128~191，C 类 192~223，D 类 224~239（组播）。192.168.1.1 首字节 192 落在 C 类范围；10.0.0.1 是 A 类私有地址；128.1.1.1 是 B 类；224.0.0.1 是 D 类组播地址。',
    point: 'A:1~126  B:128~191  C:192~223  D:224~239',
  },
  {
    id: 'c-net-03', course: 'A', chapter: 'network', kind: 'judge', difficulty: 'mid',
    stem: '子网掩码 255.255.255.192 对应的子网前缀长度为 /26。',
    answer: 1,
    explain: '正确。255 对应 8 个 1，共 3 段 = 24 位；192 = 11000000₂，有 2 个 1。总长度 = 24 + 2 = 26，即 /26。该掩码下每个子网有 2⁶ = 64 个地址，可用主机地址 62 个。',
    point: '子网掩码中 1 的个数就是前缀长度；192 = 11000000',
  },
  {
    id: 'c-net-04', course: 'A', chapter: 'network', kind: 'single', difficulty: 'hard',
    stem: 'C 类网络 192.168.10.0/24 划分为子网掩码 255.255.255.224 的子网，可划分的子网个数是（　）',
    options: ['8', '6', '4', '16'],
    answer: 0,
    explain: '/24 到 /27 借用了 3 位主机位作子网号，2³ = 8 个子网。每个子网 2⁵ = 32 个地址，其中可用主机地址 30 个。',
    point: '子网个数 = 2^(借位数)；可用主机数 = 2^(剩余主机位) − 2',
  },
  {
    id: 'c-net-05', course: 'A', chapter: 'network', kind: 'single', difficulty: 'easy',
    stem: '在 OSI 参考模型中，负责端到端可靠传输的层次是（　）',
    options: ['传输层', '网络层', '数据链路层', '会话层'],
    answer: 0,
    explain: '传输层提供端到端（进程到进程）的可靠数据传输，TCP 协议即工作在此层，通过确认、重传、流量控制保证可靠性。网络层负责寻址与路由（IP），数据链路层负责相邻结点间的成帧与差错检测。',
    point: '传输层管"端到端可靠"，网络层管"寻址路由"',
  },
  {
    id: 'c-net-06', course: 'A', chapter: 'network', kind: 'multi', difficulty: 'mid',
    stem: '下列属于网络信息安全防护措施的有（　）',
    options: ['部署防火墙', '数据加密传输', '入侵检测', '定期数据备份'],
    answer: [0, 1, 2, 3],
    explain: '四项都属于常见安全措施。防火墙过滤非法访问；加密保证数据即使被截获也无法解读；入侵检测系统（IDS）监控异常行为；数据备份是应对勒索病毒、硬件故障的最后防线。',
    point: '安全防护是多层次的：边界（防火墙）、数据（加密）、监控（IDS）、兜底（备份）',
  },
  {
    id: 'c-net-07', course: 'A', chapter: 'network', kind: 'judge', difficulty: 'easy',
    stem: '交换机工作在网络层，路由器工作在数据链路层。',
    answer: 0,
    explain: '错误。恰好相反：交换机主要工作在数据链路层（依据 MAC 地址转发），路由器工作在网络层（依据 IP 地址选路）。',
    point: '交换机看 MAC（链路层），路由器看 IP（网络层）',
  },
  {
    id: 'c-net-08', course: 'A', chapter: 'network', kind: 'fill', difficulty: 'mid',
    stem: 'IP 地址 172.16.5.130 与子网掩码 255.255.255.0 进行按位与运算，得到的网络地址是 ______',
    refAnswer: '172.16.5.0',
    explain: '网络地址 = IP 地址 AND 子网掩码。掩码 /24 表示前 24 位为网络号，后 8 位为主机号。前 3 段原样保留（172.16.5），最后一段与 0 相与得 0，故网络地址为 172.16.5.0。',
    point: '网络地址 = IP AND 掩码；主机号全 0 即网络地址',
  },
  {
    id: 'c-net-09', course: 'A', chapter: 'network', kind: 'single', difficulty: 'mid',
    stem: 'DNS 服务的主要作用是（　）',
    options: ['把域名解析为 IP 地址', '为电脑自动分配 IP 地址', '传输网页文件', '加密网络通信'],
    answer: 0,
    explain: 'DNS（域名系统）负责域名与 IP 地址之间的解析转换，使用户无需记忆数字 IP。自动分配 IP 是 DHCP 的功能；传输网页是 HTTP；加密通信是 HTTPS/TLS。',
    point: 'DNS 解析域名，DHCP 分配 IP，两者别混',
  },
  {
    id: 'c-net-10', course: 'A', chapter: 'network', kind: 'single', difficulty: 'hard',
    stem: '关于 TCP 与 UDP，下列说法正确的是（　）',
    options: [
      'TCP 面向连接可靠，UDP 无连接不可靠但开销小',
      'TCP 无连接，UDP 面向连接',
      '两者都是面向连接的',
      '两者都保证数据可靠到达',
    ],
    answer: 0,
    explain: 'TCP 面向连接、提供可靠传输（三次握手建连、确认重传、流量控制），开销较大，适合文件传输、网页访问。UDP 无连接、不保证可靠，但开销小、延迟低，适合实时视频、语音、DNS 查询。',
    point: 'TCP 可靠但慢，UDP 快但不保证可靠',
  },

  /* ===== A4. 多媒体技术 ===== */
  {
    id: 'c-md-01', course: 'A', chapter: 'media', kind: 'single', difficulty: 'mid',
    stem: '采样频率 44.1 kHz、16 位量化、双声道的 CD 音质音频，每秒钟的数据量约为（　）',
    options: ['176.4 KB', '88.2 KB', '44.1 KB', '352.8 KB'],
    answer: 0,
    explain: '公式：数据量 = 采样频率 × 量化位数 ÷ 8 × 声道数。44100 × 16 ÷ 8 × 2 = 44100 × 2 × 2 = 176400 字节 ≈ 176.4 KB/s。',
    point: '声音存储量 = 采样频率 × 量化位数 ÷ 8 × 声道数 × 时间',
  },
  {
    id: 'c-md-02', course: 'A', chapter: 'media', kind: 'judge', difficulty: 'easy',
    stem: '图像的分辨率越高、颜色深度越大，其占用的存储空间就越大。',
    answer: 1,
    explain: '正确。位图图像的存储量 = 宽像素数 × 高像素数 × 颜色深度 ÷ 8。分辨率提高或色深增大会使存储量线性增长。',
    point: '位图存储量 = 宽 × 高 × 色深 ÷ 8',
  },
  {
    id: 'c-md-03', course: 'A', chapter: 'media', kind: 'single', difficulty: 'mid',
    stem: '下列文件格式中，属于无损压缩图像格式的是（　）',
    options: ['PNG', 'JPEG', 'MP3', 'MPEG'],
    answer: 0,
    explain: 'PNG 采用无损压缩，画质不损失且支持透明通道。JPEG 是有损压缩图像格式；MP3 是有损压缩音频格式；MPEG 是视频压缩标准。',
    point: 'PNG 无损、JPEG 有损；MP3/MPEG 属于音视频',
  },
  {
    id: 'c-md-04', course: 'A', chapter: 'media', kind: 'fill', difficulty: 'hard',
    stem: '一段时长为 10 秒、分辨率 640×480、24 位真彩色、帧频 25 fps 的未压缩视频，数据量约为 ______ MB（保留整数）。',
    refAnswer: '220',
    explain: '每帧存储量 = 640 × 480 × 24 ÷ 8 = 921600 字节 = 900 KB。总帧数 = 25 × 10 = 250 帧。总数据量 = 900 KB × 250 = 225000 KB ≈ 219.7 MB，取整数约 220 MB。',
    point: '视频存储量 = 每帧字节数 × 帧频 × 时长',
  },
  {
    id: 'c-md-05', course: 'A', chapter: 'media', kind: 'single', difficulty: 'easy',
    stem: '在多媒体技术中，把模拟信号转换为数字信号的过程称为（　）',
    options: ['模数转换（A/D 转换）', '数模转换（D/A 转换）', '压缩编码', '解压缩'],
    answer: 0,
    explain: 'A/D 转换（Analog to Digital）把连续的模拟信号转为离散的数字信号，包括采样、量化、编码三个步骤。D/A 转换方向相反，用于播放时把数字信号还原为模拟波形。',
    point: '声音数字化三步：采样 → 量化 → 编码',
  },
  {
    id: 'c-md-06', course: 'A', chapter: 'media', kind: 'multi', difficulty: 'mid',
    stem: '关于图像与图形，下列说法正确的有（　）',
    options: [
      '位图放大后会出现马赛克或锯齿',
      '矢量图放大后不会失真',
      '位图由像素点构成，文件通常比矢量图大',
      '矢量图适合表现照片类图像',
    ],
    answer: [0, 1, 2],
    explain: '前三项正确。位图以像素为单位记录，放大后像素被拉伸产生马赛克；矢量图用数学描述图形，缩放不失真且文件小。第四项错误：矢量图不擅长表现色彩层次丰富的照片，照片更适合用位图。',
    point: '位图（像素）适合照片，矢量图（数学描述）适合图形标志',
  },

  /* ===== B1. 信息和信息系统 ===== */
  {
    id: 'c-is-01', course: 'B', chapter: 'infosys', kind: 'single', difficulty: 'easy',
    stem: '信息的"时效性"是指（　）',
    options: [
      '信息随时间推移可能失去价值',
      '信息可以被多人共享',
      '信息必须依附于载体',
      '信息可以脱离数据独立存在',
    ],
    answer: 0,
    explain: '时效性强调信息具有生命周期，过期的信息价值下降甚至无效（如昨天的天气预报）。共享性指信息可被多方同时使用；依附性指信息必须依托载体存在。',
    point: '信息特性：时效性、共享性、依附性、可传递性、可加工性',
  },
  {
    id: 'c-is-02', course: 'B', chapter: 'infosys', kind: 'single', difficulty: 'mid',
    stem: '在关系数据库中，能唯一标识表中每一行记录的是（　）',
    options: ['主键', '外键', '索引', '视图'],
    answer: 0,
    explain: '主键（Primary Key）唯一标识表中的一条记录，不允许重复且不能为空。外键用于建立与其他表的关联；索引用于加速查询；视图是虚拟表。',
    point: '主键独一无二且非空，外键用于表间关联',
  },
  {
    id: 'c-is-03', course: 'B', chapter: 'infosys', kind: 'judge', difficulty: 'easy',
    stem: '关系数据库中，一张表可以有多个主键。',
    answer: 0,
    explain: '错误。一张表只能有一个主键，但主键可以由多个字段组成（称为复合主键）。',
    point: '主键只能有一个，但可以是复合的（多字段组成）',
  },
  {
    id: 'c-is-04', course: 'B', chapter: 'infosys', kind: 'single', difficulty: 'mid',
    stem: 'SQL 语句中，用于查询数据的关键字是（　）',
    options: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
    answer: 0,
    explain: 'SELECT 用于查询数据；INSERT 用于插入新记录；UPDATE 用于修改已有记录；DELETE 用于删除记录。这四条构成 SQL 的数据操作核心（DML）。',
    point: '增 INSERT、删 DELETE、改 UPDATE、查 SELECT',
  },
  {
    id: 'c-is-05', course: 'B', chapter: 'infosys', kind: 'single', difficulty: 'mid',
    stem: '以下不属于典型信息系统的是（　）',
    options: ['编译程序', '电子商务系统', '地理信息系统', '远程医疗系统'],
    answer: 0,
    explain: '编译程序是系统软件工具，属于语言处理程序，不是信息系统。典型信息系统包括制造业信息系统、电子商务、电子政务、GIS 与数字地球、远程教育、远程医疗、数字图书馆等。',
    point: '信息系统的典型类型可记"制造、商务、政务、GIS、教育、医疗、图书馆"',
  },
  {
    id: 'c-is-06', course: 'B', chapter: 'infosys', kind: 'fill', difficulty: 'mid',
    stem: '在信息通信系统中，信息的发送端称为 ______，接收端称为 ______。',
    refAnswer: '信源；信宿',
    explain: '信源（Source）是信息的发送端，产生并发出信息；信宿（Destination）是信息的接收端，接收信息。二者之间的传输通道称为信道（Channel）。',
    point: '通信三要素：信源、信道、信宿',
  },

  /* ===== B2. 物联网技术 ===== */
  {
    id: 'c-iot-01', course: 'B', chapter: 'iot', kind: 'single', difficulty: 'easy',
    stem: '物联网体系结构的三层分别是（　）',
    options: [
      '感知层、网络层、应用层',
      '物理层、传输层、会话层',
      '硬件层、软件层、服务层',
      '采集层、处理层、展示层',
    ],
    answer: 0,
    explain: '物联网标准三层体系：感知层（数据采集，含传感器、RFID）、网络层（数据传输，含 ZigBee、Wi-Fi、蓝牙）、应用层（数据处理与应用，如智慧物流、智慧家居）。',
    point: '物联网三层：感知 → 网络 → 应用',
  },
  {
    id: 'c-iot-02', course: 'B', chapter: 'iot', kind: 'single', difficulty: 'mid',
    stem: 'RFID 技术的中文全称是（　）',
    options: ['射频识别', '红外识别', '光频识别', '声波识别'],
    answer: 0,
    explain: 'RFID（Radio Frequency Identification）即射频识别，通过无线电波非接触地读写电子标签信息，是物联网感知层的核心技术之一。EPC（产品电子代码）常与 RFID 配合使用。',
    point: 'RFID = 射频识别，靠无线电波非接触识别',
  },
  {
    id: 'c-iot-03', course: 'B', chapter: 'iot', kind: 'judge', difficulty: 'mid',
    stem: 'ZigBee 是一种短距离、低功耗的无线通信技术，常用于物联网感知数据的传输。',
    answer: 1,
    explain: '正确。ZigBee 具有低功耗、低速率、低成本、支持自组网（网状拓扑）的特点，适合传感器网络、智能家居等场景。它工作在网络层所属的通信技术范畴，是物联网常用协议之一。',
    point: 'ZigBee 特点：短距离、低功耗、低速率、可自组网',
  },
  {
    id: 'c-iot-04', course: 'B', chapter: 'iot', kind: 'single', difficulty: 'mid',
    stem: '物联网与互联网的主要区别在于（　）',
    options: [
      '物联网实现了物与物之间的信息交互',
      '物联网不使用 IP 协议',
      '物联网只用于工业场景',
      '物联网无法连接互联网',
    ],
    answer: 0,
    explain: '物联网的核心特征是把连接对象从"人与人"扩展到"物与物、人与物"，实现物品的智能识别与信息交互。它依然大量使用 IP 协议并可接入互联网，应用场景也远不止工业。',
    point: '互联网连人，物联网连物，本质是连接对象范围不同',
  },
  {
    id: 'c-iot-05', course: 'B', chapter: 'iot', kind: 'multi', difficulty: 'mid',
    stem: '下列属于物联网应用领域的有（　）',
    options: ['智慧物流', '智慧医疗', '智能家居', '智慧农业'],
    answer: [0, 1, 2, 3],
    explain: '四项都属于物联网典型应用。此外还有智慧制造、智慧交通等。物联网应用的本质是"感知 + 传输 + 智能处理"落地到具体行业。',
    point: '物联网应用可记"物流、医疗、家居、制造、交通、农业"',
  },

  /* ===== B3. 移动互联网技术 ===== */
  {
    id: 'c-mb-01', course: 'B', chapter: 'mobile', kind: 'single', difficulty: 'easy',
    stem: '5G 相比 4G 的主要优势不包括（　）',
    options: ['覆盖范围无限制', '传输速率更高', '延迟更低', '连接设备密度更大'],
    answer: 0,
    explain: '5G 的三大特性是增强移动宽带（eMBB，高速率）、超可靠低时延（uRLLC，低延迟）、海量机器类通信（mMTC，高连接密度）。但 5G 使用更高频段，单基站覆盖范围反而比 4G 小，需要更多基站组网。',
    point: '5G 三大特性：高速率、低时延、大连接；但覆盖范围更小',
  },
  {
    id: 'c-mb-02', course: 'B', chapter: 'mobile', kind: 'single', difficulty: 'mid',
    stem: 'Android 系统架构自上而下依次为（　）',
    options: [
      '应用程序层、应用程序框架层、系统运行库层、Linux 内核层',
      'Linux 内核层、系统运行库层、应用程序框架层、应用程序层',
      '应用程序层、Linux 内核层、框架层、运行库层',
      '系统运行库层、应用程序层、内核层、框架层',
    ],
    answer: 0,
    explain: 'Android 架构自上而下为：① 应用程序层（Applications，各类 App）；② 应用程序框架层（Application Framework，Activity/Service 等 API）；③ 系统运行库层（Libraries + Android Runtime，含 SQLite、WebKit、Dalvik/ART）；④ Linux 内核层（驱动、内存与进程管理）。',
    point: 'Android 四层自上而下：应用 → 框架 → 运行库 → Linux 内核',
  },
  {
    id: 'c-mb-03', course: 'B', chapter: 'mobile', kind: 'judge', difficulty: 'mid',
    stem: 'iOS 系统基于 Darwin 内核，其应用主要通过 Objective-C 或 Swift 语言开发。',
    answer: 1,
    explain: '正确。iOS 基于 Darwin（源于 Unix/BSD）内核，官方主推的开发语言是 Objective-C 与 Swift，配合 Xcode 与 Cocoa Touch 框架进行开发。',
    point: 'iOS 用 Objective-C / Swift，Android 主用 Java / Kotlin',
  },
  {
    id: 'c-mb-04', course: 'B', chapter: 'mobile', kind: 'single', difficulty: 'mid',
    stem: 'HTML5 相比早期 HTML 版本，最突出的新特性是（　）',
    options: [
      '原生支持音视频播放与本地存储',
      '支持更多的字体格式',
      '支持表格布局',
      '支持超链接跳转',
    ],
    answer: 0,
    explain: 'HTML5 的重要新特性包括：<audio>/<video> 标签原生支持多媒体、localStorage/sessionStorage 本地存储、Canvas 绘图、语义化标签、离线应用支持等。表格布局与超链接在早期 HTML 中就已存在。',
    point: 'HTML5 三大亮点：原生音视频、本地存储、Canvas',
  },
  {
    id: 'c-mb-05', course: 'B', chapter: 'mobile', kind: 'fill', difficulty: 'mid',
    stem: '移动互联网中，SOA 的中文全称是 ______，其核心思想是把功能封装为可复用的服务。',
    refAnswer: '面向服务的体系结构（或：面向服务的架构）',
    explain: 'SOA（Service-Oriented Architecture）即面向服务的体系结构，强调将业务功能封装成松耦合、可复用的服务，通过网络对外提供，是移动互联网与云计算中常见的架构思想。',
    point: 'SOA = 面向服务的体系结构，核心是"服务可复用"',
  },

  /* ===== B4. 云计算技术 ===== */
  {
    id: 'c-cl-01', course: 'B', chapter: 'cloud', kind: 'single', difficulty: 'easy',
    stem: '用户直接使用运行在云端的应用程序（如在线文档），这属于哪种服务模式（　）',
    options: ['SaaS', 'PaaS', 'IaaS', 'DaaS'],
    answer: 0,
    explain: 'SaaS（软件即服务）向用户提供可直接使用的应用软件，用户无需关心开发与运维。PaaS 提供开发运行平台（如数据库、中间件），IaaS 提供计算、存储、网络等基础设施。',
    point: 'SaaS 给软件、PaaS 给平台、IaaS 给基础设施',
  },
  {
    id: 'c-cl-02', course: 'B', chapter: 'cloud', kind: 'single', difficulty: 'mid',
    stem: '云计算的三种基本服务模式由底层到高层依次是（　）',
    options: [
      'IaaS → PaaS → SaaS',
      'SaaS → PaaS → IaaS',
      'PaaS → IaaS → SaaS',
      'IaaS → SaaS → PaaS',
    ],
    answer: 0,
    explain: '自底向上：IaaS（基础设施，如虚拟机、存储）→ PaaS（平台，如应用运行环境、数据库服务）→ SaaS（软件，如在线办公）。层次越高，用户管理的内容越少、使用越简单。',
    point: 'IaaS 底层、PaaS 中间、SaaS 顶层；越高层越省心',
  },
  {
    id: 'c-cl-03', course: 'B', chapter: 'cloud', kind: 'judge', difficulty: 'mid',
    stem: '虚拟化技术是云计算的关键支撑技术，它可以把一台物理服务器划分为多个相互隔离的虚拟资源。',
    answer: 1,
    explain: '正确。虚拟化通过 Hypervisor 把物理资源抽象为多个逻辑资源，实现资源隔离、动态分配与高效利用，是云计算（尤其是 IaaS）的核心技术基础。',
    point: '虚拟化是云计算的基石，实现资源池化与隔离',
  },
  {
    id: 'c-cl-04', course: 'B', chapter: 'cloud', kind: 'single', difficulty: 'mid',
    stem: '按部署方式划分，企业自建、仅供内部使用的云属于（　）',
    options: ['私有云', '公有云', '混合云', '行业云'],
    answer: 0,
    explain: '私有云（Private Cloud）为企业或组织独有，数据安全性和可控性高，但成本较高。公有云由第三方服务商向公众提供（如阿里云、AWS）；混合云是两者结合。',
    point: '公有云共享、私有云独占、混合云两者兼用',
  },
  {
    id: 'c-cl-05', course: 'B', chapter: 'cloud', kind: 'multi', difficulty: 'mid',
    stem: '云计算的优势包括（　）',
    options: ['按需付费降低成本', '弹性伸缩应对流量波动', '无需自建机房', '数据永远不会丢失'],
    answer: [0, 1, 2],
    explain: '前三项是云计算的核心优势：按需付费（用多少付多少）、弹性伸缩（流量高峰自动扩容）、免运维（无需自建机房）。第四项绝对化，云服务商也可能发生故障或数据丢失，仍需用户自行备份。',
    point: '云的优势：低成本、弹性、免运维；但"绝对安全/永不丢失"是错误说法',
  },

  /* ===== B5. 大数据技术 ===== */
  {
    id: 'c-bd-01', course: 'B', chapter: 'bigdata', kind: 'single', difficulty: 'easy',
    stem: '大数据的"4V"特征不包括（　）',
    options: ['Value（价值密度高）', 'Volume（体量大）', 'Variety（类型多样）', 'Velocity（速度快）'],
    answer: 0,
    explain: '大数据 4V 指 Volume（体量大）、Variety（类型多样）、Velocity（速度快）、Value（价值密度低但总价值高）。注意大数据的特点恰恰是"价值密度低"，需要从海量数据中挖掘价值。',
    point: '4V 的 Value 是"价值密度低"，不是高',
  },
  {
    id: 'c-bd-02', course: 'B', chapter: 'bigdata', kind: 'single', difficulty: 'mid',
    stem: 'Hadoop 生态中，负责分布式文件存储的组件是（　）',
    options: ['HDFS', 'MapReduce', 'YARN', 'Hive'],
    answer: 0,
    explain: 'HDFS（Hadoop Distributed File System）是分布式文件系统，负责海量数据的分布式存储。MapReduce 负责分布式计算，YARN 负责资源调度，Hive 提供类 SQL 的数据仓库查询能力。',
    point: 'HDFS 管存储，MapReduce 管计算，YARN 管调度',
  },
  {
    id: 'c-bd-03', course: 'B', chapter: 'bigdata', kind: 'judge', difficulty: 'mid',
    stem: 'NoSQL 数据库通常不支持复杂的多表连接查询，但在高并发读写与海量数据场景下具有优势。',
    answer: 1,
    explain: '正确。NoSQL（非关系型数据库）如 Redis、MongoDB、HBase，放弃了严格的关系模型与多表 JOIN，换取高并发、易扩展、灵活的模式，适合海量数据与高吞吐场景。',
    point: 'NoSQL 牺牲强关系换取可扩展性与性能',
  },
  {
    id: 'c-bd-04', course: 'B', chapter: 'bigdata', kind: 'single', difficulty: 'mid',
    stem: '大数据处理流程的正确顺序是（　）',
    options: [
      '数据采集 → 数据清洗 → 数据分析 → 数据可视化',
      '数据分析 → 数据采集 → 数据清洗 → 数据可视化',
      '数据采集 → 数据分析 → 数据清洗 → 数据可视化',
      '数据可视化 → 数据采集 → 数据清洗 → 数据分析',
    ],
    answer: 0,
    explain: '标准流程：① 采集（爬虫、日志、传感器等获取原始数据）；② 清洗（去重、补缺、纠错，提高数据质量）；③ 分析（统计分析、挖掘建模）；④ 可视化（图表呈现结果，辅助决策）。',
    point: '大数据流程：采集 → 清洗 → 分析 → 可视化',
  },
  {
    id: 'c-bd-05', course: 'B', chapter: 'bigdata', kind: 'single', difficulty: 'mid',
    stem: '大数据、云计算与人工智能三者的关系，下列说法正确的是（　）',
    options: [
      '云计算提供算力，大数据提供数据，人工智能提供算法',
      '三者互相独立，没有关联',
      '大数据是云计算的基础，AI 是大数据的替代品',
      '人工智能提供算力，大数据提供算法',
    ],
    answer: 0,
    explain: '三者是互补关系：云计算提供弹性算力与存储支撑；大数据提供海量训练与决策所需的数据；人工智能提供从数据中学习与决策的算法模型。可以概括为"算力 + 数据 + 算法"。',
    point: '云=算力，大数据=数据，AI=算法',
  },

  /* ===== B6. 人工智能技术 ===== */
  {
    id: 'c-ai-01', course: 'B', chapter: 'ai', kind: 'single', difficulty: 'easy',
    stem: '以下属于人工智能应用的是（　）',
    options: ['语音助手', '记事本', '计算器', '压缩软件'],
    answer: 0,
    explain: '语音助手需要语音识别（计算机视觉/自然语言处理的交叉）与语义理解，属于典型 AI 应用。记事本、计算器、压缩软件都是基于确定规则的工具程序，不具备学习与推理能力。',
    point: '判断是否 AI：看是否具备感知、学习或推理能力',
  },
  {
    id: 'c-ai-02', course: 'B', chapter: 'ai', kind: 'single', difficulty: 'mid',
    stem: '深度学习中最基本的网络结构是（　）',
    options: ['人工神经网络', '决策树', '支持向量机', '朴素贝叶斯'],
    answer: 0,
    explain: '深度学习以多层人工神经网络为基础，通过多层非线性变换自动提取特征。决策树、支持向量机、朴素贝叶斯属于传统机器学习算法，不属于"深度"结构。',
    point: '深度学习的"深"指神经网络的层数多',
  },
  {
    id: 'c-ai-03', course: 'B', chapter: 'ai', kind: 'judge', difficulty: 'mid',
    stem: '自然语言处理（NLP）是人工智能的一个分支，研究让计算机理解和生成人类语言。',
    answer: 1,
    explain: '正确。NLP（Natural Language Processing）致力于让计算机理解、生成和处理自然语言，典型任务包括机器翻译、情感分析、问答系统、文本摘要等。',
    point: 'NLP 管语言，计算机视觉管图像，两者常合称感知智能',
  },
  {
    id: 'c-ai-04', course: 'B', chapter: 'ai', kind: 'multi', difficulty: 'mid',
    stem: '下列属于人工智能技术分类的有（　）',
    options: ['深度学习', '自然语言处理', '计算机视觉', '数据挖掘'],
    answer: [0, 1, 2, 3],
    explain: '四项都属于人工智能的技术范畴。深度学习是方法基础；自然语言处理与计算机视觉是两大感知方向；数据挖掘是从数据中发现知识的技术，与 AI 高度交叉。',
    point: 'AI 技术分类：深度学习、NLP、计算机视觉、数据挖掘',
  },
  {
    id: 'c-ai-05', course: 'B', chapter: 'ai', kind: 'single', difficulty: 'mid',
    stem: '计算机视觉技术主要解决的问题是（　）',
    options: [
      '让计算机"看懂"图像和视频内容',
      '让计算机理解人类语言',
      '让计算机进行逻辑推理',
      '让计算机存储海量数据',
    ],
    answer: 0,
    explain: '计算机视觉（Computer Vision）使计算机能够从图像或视频中获取、处理和理解信息，典型任务包括图像分类、目标检测、人脸识别、图像分割等。',
    point: '计算机视觉 = 让机器"看"，NLP = 让机器"懂话"',
  },

  /* ===== B7. 区块链 ===== */
  {
    id: 'c-bc-01', course: 'B', chapter: 'blockchain', kind: 'single', difficulty: 'easy',
    stem: '区块链最核心的特征是（　）',
    options: [
      '去中心化、不可篡改、可追溯',
      '中心化管理、高效修改',
      '数据可任意删除',
      '依赖单一服务器运行',
    ],
    answer: 0,
    explain: '区块链通过分布式账本、密码学哈希链与共识机制，实现去中心化（无单一管理机构）、不可篡改（改动需重算后续所有区块）、可追溯（每笔记录都留有链条痕迹）。',
    point: '区块链三特性：去中心化、不可篡改、可追溯',
  },
  {
    id: 'c-bc-02', course: 'B', chapter: 'blockchain', kind: 'judge', difficulty: 'mid',
    stem: '区块链中的每个区块都包含前一个区块的哈希值，从而形成链式结构。',
    answer: 1,
    explain: '正确。每个区块的区块头中保存了前一区块的哈希值，形成首尾相连的链。一旦某个区块数据被改动，其哈希改变会导致后续所有区块哈希不匹配，从而被发现——这正是"不可篡改"的技术原理。',
    point: '哈希链是区块链不可篡改的技术基础',
  },
  {
    id: 'c-bc-03', course: 'B', chapter: 'blockchain', kind: 'single', difficulty: 'mid',
    stem: '以太坊相比比特币的主要创新是（　）',
    options: [
      '引入了智能合约',
      '交易速度更快',
      '不需要共识机制',
      '完全匿名不可追踪',
    ],
    answer: 0,
    explain: '以太坊的核心创新是引入智能合约（Smart Contract）——可编程的自动执行合约，使区块链从单纯的数字货币扩展到去中心化应用（DApp）平台。',
    point: '比特币是数字货币，以太坊是"可编程区块链"',
  },
  {
    id: 'c-bc-04', course: 'B', chapter: 'blockchain', kind: 'single', difficulty: 'mid',
    stem: '超级账本 Fabric 属于哪一类区块链（　）',
    options: ['联盟链', '公有链', '私有链', '公链与私链的混合'],
    answer: 0,
    explain: 'Hyperledger Fabric 是面向企业级应用的联盟链（Consortium Blockchain）平台，参与结点需经授权，兼顾效率与隐私，适合金融、供应链等商业场景。比特币、以太坊属于公有链。',
    point: 'Fabric 是联盟链，比特币/以太坊是公有链',
  },
  {
    id: 'c-bc-05', course: 'B', chapter: 'blockchain', kind: 'multi', difficulty: 'mid',
    stem: '区块链技术的典型应用领域包括（　）',
    options: ['金融结算', '供应链溯源', '保险理赔', '学历证书存证'],
    answer: [0, 1, 2, 3],
    explain: '四项都是区块链的典型落地场景。区块链适合需要多方互信、信息不可篡改、流程可追溯的业务：金融结算（跨境支付）、供应链溯源（商品来源）、保险（自动理赔）、教育就业（学历证书防伪）。',
    point: '区块链适合"多方互信 + 不可篡改 + 可追溯"的场景',
  },
];

/* ─────────────────────── 工具函数 ─────────────────────── */

export function csQuestionsOfCourse(course: CsCourse): CsQuestion[] {
  return CS_QUESTIONS.filter((q) => q.course === course);
}
export function csQuestionsOfChapter(chapter: CsChapter): CsQuestion[] {
  return CS_QUESTIONS.filter((q) => q.chapter === chapter);
}
export function csQuestionsOf(chapter: CsChapter, kind?: CsKind): CsQuestion[] {
  return CS_QUESTIONS.filter((q) => q.chapter === chapter && (!kind || q.kind === kind));
}

/** 各章题目数 */
export function csChapterCount(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const q of CS_QUESTIONS) out[q.chapter] = (out[q.chapter] ?? 0) + 1;
  return out;
}

export const CS_TOTAL = CS_QUESTIONS.length;
