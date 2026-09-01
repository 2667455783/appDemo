import type { CarefulItem, ClozeItem, MatchItem } from '@/types'

export const CLOZE_ITEMS: ClozeItem[] = [
  {
    id: 'cloze-1',
    title: '选词填空：可持续校园',
    level: 'cet4',
    passage:
      'Many universities are trying to build a more __1__ campus. They __2__ extra funds to bike lanes and recycling stations. The __3__ is not only environmental. A quieter, greener campus can also __4__ to students’ well-being. Some students were at first __5__ to change old habits, but a recent survey showed a __6__ shift in attitude.',
    blanks: 6,
    bank: [
      'sustainable',
      'allocate',
      'consequence',
      'contribute',
      'reluctant',
      'substantial',
      'innovation',
      'perspective',
      'feasible',
      'emphasize',
    ],
    answers: ['sustainable', 'allocate', 'consequence', 'contribute', 'reluctant', 'substantial'],
    analysis: [
      '空1后 campus，需形容词「可持续的」。',
      '空2搭配 extra funds，allocate 分配经费。',
      '空3 the consequence is... 后果/意义。',
      '空4 contribute to 促成幸福感。',
      '空5 be reluctant to 不情愿改变习惯。',
      '空6 a substantial shift 态度的显著转变。',
    ],
  },
  {
    id: 'cloze-2',
    title: '选词填空：城市与乡村',
    level: 'cet6',
    passage:
      'The gap between city and countryside used to __1__ every year. Young people __2__ to urban jobs, leaving villages to age quietly. Recently the trend has begun to __3__. Remote work and cheaper housing make small towns __4__ again. Yet without good internet, the revival remains __5__. Local governments must __6__ resources to infrastructure before people truly return.',
    blanks: 6,
    bank: [
      'widen',
      'flocked',
      'reverse',
      'feasible',
      'fragile',
      'allocate',
      'diminish',
      'comprehensive',
      'preserve',
      'fluctuate',
    ],
    answers: ['widen', 'flocked', 'reverse', 'feasible', 'fragile', 'allocate'],
    analysis: [
      '空1 used to widen 每年扩大。',
      '空2 flocked to 蜂拥而至。',
      '空3 begin to reverse 开始逆转。',
      '空4 make small towns feasible again 使其再次可行。',
      '空5 remains fragile 仍然脆弱。',
      '空6 allocate resources to 分配资源。',
    ],
  },
]

export const MATCH_ITEMS: MatchItem[] = [
  {
    id: 'match-1',
    title: '信息匹配：数字阅读',
    level: 'cet6',
    paragraphs: [
      {
        key: 'A',
        text: 'Publishers once feared that smartphones would kill long-form reading. Instead, a new kind of reader has appeared: people who consume essays in fragments between classes, yet still finish book-length works over a week.',
      },
      {
        key: 'B',
        text: 'The bigger threat is not the screen itself but the interruption. Notifications break concentration every few minutes, and students report that they reread the same paragraph without taking in the meaning.',
      },
      {
        key: 'C',
        text: 'Some libraries now lend “focus phones” that can only open reading apps. Early data suggest comprehension scores rise when devices are stripped of social media.',
      },
      {
        key: 'D',
        text: 'Critics argue that such experiments are not feasible at scale. They call for teaching students to manage attention rather than confiscating tools they will meet at work.',
      },
      {
        key: 'E',
        text: 'A third path is design. Apps that hide likes and comments, or that reveal only one page at a time, try to recreate the physical book’s quiet constraints.',
      },
    ],
    statements: [
      {
        id: 'm1',
        text: '有人认为与其没收设备，不如教学生管理注意力。',
        answer: 'D',
        analysis: '定位词 feasible at scale / manage attention / confiscating。',
      },
      {
        id: 'm2',
        text: '通知造成的打断比屏幕本身更能破坏理解。',
        answer: 'B',
        analysis: 'The bigger threat is not the screen itself but the interruption。',
      },
      {
        id: 'm3',
        text: '去掉社交功能后，理解成绩有所上升。',
        answer: 'C',
        analysis: 'focus phones / comprehension scores rise。',
      },
    ],
  },
  {
    id: 'match-2',
    title: '信息匹配：终身学习',
    level: 'cet4',
    paragraphs: [
      {
        key: 'A',
        text: 'Lifelong learning was once a slogan for retirees. Today it is a survival skill for almost every worker, as technologies replace tasks faster than schools can update curricula.',
      },
      {
        key: 'B',
        text: 'The biggest barrier is not money but time. Working adults rarely have long uninterrupted blocks, so micro-learning spread across weeks often beats intensive weekend courses.',
      },
      {
        key: 'C',
        text: 'Employers increasingly value evidence of learning over certificates. A portfolio of small projects often weighs more than a fresh diploma.',
      },
      {
        key: 'D',
        text: 'Critics warn that self-directed learning can become an echo chamber. Without feedback, learners may repeat mistakes for years without noticing.',
      },
      {
        key: 'E',
        text: 'A practical fix is to pair learning with teaching. Explaining a new skill to a colleague exposes the gaps that solo study quietly hides.',
      },
    ],
    statements: [
      {
        id: 'm2-1',
        text: '碎片化学习分散在数周内，效果常优于周末集中课程。',
        answer: 'B',
        analysis: 'micro-learning spread across weeks often beats intensive weekend courses。',
      },
      {
        id: 'm2-2',
        text: '作品集有时比新文凭更有分量。',
        answer: 'C',
        analysis: 'A portfolio of small projects often weighs more than a fresh diploma。',
      },
      {
        id: 'm2-3',
        text: '把学习和教学结合，能暴露自学隐藏的盲点。',
        answer: 'E',
        analysis: 'Explaining a new skill to a colleague exposes the gaps。',
      },
    ],
  },
]

export const CAREFUL_ITEMS: CarefulItem[] = [
  {
    id: 'careful-1',
    title: '仔细阅读：实习的价值',
    level: 'cet4',
    passage:
      'Internship programs are often sold as a shortcut to employment. In reality, their value depends less on the brand of the company than on whether students are given real tasks. A study of 1,200 graduates found that those who had drafted reports, spoken with clients, or solved a live problem were twice as likely to receive a return offer. By contrast, students who only shadowed managers or made coffee reported little growth in confidence. Universities can help by requiring a short reflection paper after the internship, forcing students to turn scattered days into a coherent story. Employers, for their part, should allocate a mentor rather than leaving interns at the edge of the office. The most substantial benefit is not a line on a résumé, but a clearer perspective on what kind of work one actually wants.',
    questions: [
      {
        id: 'rq1',
        stem: '作者认为实习真正有价值的前提是？',
        options: [
          'A. 公司品牌足够知名',
          'B. 学生能承担真实任务',
          'C. 实习必须带薪',
          'D. 导师来自名校',
        ],
        answer: 1,
        analysis: 'depends less on the brand... than on whether students are given real tasks。干扰项 A 是作者否定的。',
        cause: 'logic',
      },
      {
        id: 'rq2',
        stem: '关于只做跟班或端咖啡的学生，文中怎么说？',
        options: [
          'A. 更容易拿到 return offer',
          'B. 自信心增长很少',
          'C. 更能看清职业方向',
          'D. 会被要求写反思论文',
        ],
        answer: 1,
        analysis: 'reported little growth in confidence。定位 shadow / coffee。',
        cause: 'locate',
      },
      {
        id: 'rq3',
        stem: '作者认为实习最大的收获是？',
        options: [
          'A. 简历上的一行字',
          'B. 更高的起薪',
          'C. 更清楚自己想做什么工作',
          'D. 与名企建立人脉',
        ],
        answer: 2,
        analysis: '末句：not a line on a résumé, but a clearer perspective... 主旨题看尾段。',
        cause: 'logic',
      },
    ],
  },
  {
    id: 'careful-2',
    title: '仔细阅读：远程办公的代价',
    level: 'cet6',
    passage:
      'Remote work was once praised as the great equalizer. Workers in small towns could reach employers in big cities without leaving home. Yet a quieter consequence has emerged. Without the casual chats of an office, junior employees miss the unwritten lessons that used to pass between desks. They learn the formal tasks but not the tone of disagreement, the rhythm of a meeting, or how a senior colleague frames a risky decision. Some companies try to fix this with mentorship apps, but mentors themselves are stretched thin. The author argues that the real task is not to recreate the office online, but to invent new ways of transmitting the tacit knowledge that remote work has quietly erased.',
    questions: [
      {
        id: 'rq2-1',
        stem: '远程办公被称颂为“平等器”的原因是？',
        options: [
          'A. 提高了薪资',
          'B. 让小城镇的人也能接触大城市的雇主',
          'C. 减少了通勤事故',
          'D. 让所有人都成为管理者',
        ],
        answer: 1,
        analysis: 'Workers in small towns could reach employers in big cities。',
        cause: 'locate',
      },
      {
        id: 'rq2-2',
        stem: '初级员工在远程办公中失去了什么？',
        options: [
          'A. 正式任务的能力',
          'B. 写代码的技巧',
          'C. 办公室里口耳相传的隐性经验',
          'D. 使用软件的权限',
        ],
        answer: 2,
        analysis: 'the unwritten lessons that used to pass between desks / tacit knowledge。',
        cause: 'logic',
      },
      {
        id: 'rq2-3',
        stem: '作者认为真正的任务是？',
        options: [
          'A. 把办公室搬到线上',
          'B. 取消远程办公',
          'C. 发明传递隐性知识的新方式',
          'D. 多办线下团建',
        ],
        answer: 2,
        analysis: '末句：invent new ways of transmitting the tacit knowledge。',
        cause: 'logic',
      },
    ],
  },
]
