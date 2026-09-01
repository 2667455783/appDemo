import type { WritingTopic } from '@/types'

export const WRITING_TOPICS: WritingTopic[] = [
  {
    id: 'w-cet4-1',
    level: 'cet4',
    title: '议论文：线上课程能否取代课堂',
    prompt:
      'For this part, you are allowed 30 minutes to write an essay on whether online courses can replace classroom learning. You should write at least 120 words but no more than 180 words.',
    minutes: 30,
    scaffold: [
      { label: '开头立场', hint: '表明不完全取代，但可互补。' },
      { label: '论证段', hint: '课堂的即时反馈、同伴压力；线上的节奏自由。' },
      { label: '让步段', hint: '承认偏远地区或复习场景下线上更可行。' },
      { label: '结尾', hint: '回到“工具而非替代”，收束到学习者的自律。' },
    ],
    sample:
      'Online courses have become indispensable, yet they can hardly replace the classroom. Face-to-face discussion lets teachers catch confused looks at once, and classmates create a pressure that keeps many students on track. It is true that recorded lectures are more feasible for those who live far from campus or who need to review a difficult point. Even so, learning is not only about information. It is also about being seen and challenged. A sustainable model is to treat online tools as a supplement, while keeping the classroom as the place where thinking is tested.',
    rubric: ['切题：有明确立场', '连贯：段间有让步或衔接', '语言：少基本语法错', '词汇：有 2 个以上课程相关词'],
  },
  {
    id: 'w-cet6-1',
    level: 'cet6',
    title: '名言评述：创新与基础',
    prompt:
      'For this part, you are allowed 30 minutes to write an essay commenting on the saying “Innovation distinguishes between a leader and a follower.” You should write at least 150 words but no more than 200 words.',
    minutes: 30,
    scaffold: [
      { label: '引出名言', hint: '用自己的话转述，避免整句抄题。' },
      { label: '立论', hint: '创新重要，但建立在扎实基础之上。' },
      { label: '例证', hint: '科研、产品或学习方法中的一例。' },
      { label: '收束', hint: '领导者不是只求新，而是把新想法做可行。' },
    ],
    sample:
      'The saying suggests that those who merely copy others will always walk behind. Innovation does distinguish leaders, but only when it is grounded in skill. A student who invents a new note-taking method without understanding the subject produces noise, not progress. Likewise, companies that chase novelty while ignoring users soon undermine their own reputation. A more accurate view is that leaders allocate time both to master the basics and to test feasible new paths. Innovation, in this sense, is less a gift than a disciplined habit of asking whether a better way is possible.',
    rubric: ['切题：回应名言而非跑题', '连贯：有例证与收束', '语言：句式有变化', '词汇：创新/可行等词使用准确'],
  },
  {
    id: 'w-cet4-2',
    level: 'cet4',
    title: '应用文：邀请教授做讲座',
    prompt:
      'For this part, you are allowed 30 minutes to write an email to a professor inviting him/her to give a lecture on academic writing. You should write at least 120 words.',
    minutes: 30,
    scaffold: [
      { label: '称呼与来意', hint: '礼貌说明写信目的。' },
      { label: '讲座信息', hint: '时间、地点、听众、主题。' },
      { label: '理由', hint: '为什么请他/她，对学生的价值。' },
      { label: '结尾', hint: '期待回复，致谢。' },
    ],
    sample:
      'Dear Professor Lin, I am writing on behalf of the English Club to invite you to give a lecture on academic writing. The lecture is planned for next Friday afternoon in the main hall, and the audience will be about two hundred undergraduates preparing for their theses. We chose you because your guide on thesis writing has helped many of us. A talk from you would be far more vivid than any textbook. If the time does not suit you, we are happy to adjust. We would be grateful if you could reply by next Monday. Thank you for considering our invitation. Yours sincerely, Li Hua.',
    rubric: ['格式：称呼落款齐全', '信息：时间地点主题清楚', '语气：礼貌得体', '语言：少基本语法错'],
  },
  {
    id: 'w-cet6-2',
    level: 'cet6',
    title: '图表作文：阅读方式变化',
    prompt:
      'For this part, you are allowed 30 minutes to write an essay based on a chart showing the change in reading habits between 2015 and 2025. You should describe the chart and give your comments, at least 150 words.',
    minutes: 30,
    scaffold: [
      { label: '描述图表', hint: '纸质下降、电子上升、有声增长，挑主要趋势。' },
      { label: '分析原因', hint: '便携、碎片时间、技术普及。' },
      { label: '评论', hint: '形式变化但阅读本质不变。' },
      { label: '收束', hint: '选择适合自己的方式即可。' },
    ],
    sample:
      'The chart shows how reading habits shifted between 2015 and 2025. Paper reading fell sharply, while electronic reading rose to dominate, and audio reading grew steadily from a tiny base. The change is driven by convenience and fragmented time: a phone fits into pockets of the day that a printed book cannot. Yet the decline of paper is not the decline of reading itself. What matters is whether readers still think, not merely scroll. A balanced view is that the form of reading will keep changing, but the discipline of reading deeply must be preserved by choice. Readers should pick the medium that suits the task, rather than letting the medium pick the reader.',
    rubric: ['切题：描述+评论缺一不可', '数据：主要趋势而非全部数字', '连贯：描述到评论过渡', '语言：图表常用句式'],
  },

  // —— 议论文 / 书信模拟题（套用诊断本作文模板）——
  {
    id: 'w-sim-1',
    level: 'cet4',
    title: '模拟1：对立观点（线上 vs 课堂）',
    prompt:
      'Some people like online study, others prefer classroom study. What’s your opinion? Write an essay of at least 120 words.',
    minutes: 30,
    templateId: 'tpl-arg-1',
    scaffold: [
      { label: '引出话题', hint: 'Nowadays, online study has become a hot discussion. Different people hold different opinions.' },
      { label: '观点 A', hint: 'Some people believe that online study is good. For one thing… For another…' },
      { label: '观点 B', hint: 'However, others think that classroom study is better. They argue that… Besides…' },
      { label: '个人立场', hint: 'As far as I am concerned, I prefer (online / classroom) study.' },
    ],
    sample:
      'Nowadays, online study has become a hot discussion. Different people hold different opinions. Some people believe that online study is good. For one thing, it saves our time. For another, we can take courses at home. However, others think that classroom study is better. They argue that teachers can help us in time. Besides, we can communicate with classmates. As far as I am concerned, I prefer classroom study. We should think about the real situation and make a proper choice.',
    rubric: ['结构：对立双方都写到', '衔接：However / As far as I am concerned', '立场：结尾明确选边', '语言：少基本语法错'],
  },
  {
    id: 'w-sim-2',
    level: 'cet4',
    title: '模拟2：利弊分析（手机）',
    prompt:
      'Talk about the advantages and disadvantages of mobile phones. Write an essay of at least 120 words.',
    minutes: 30,
    templateId: 'tpl-arg-2',
    scaffold: [
      { label: '引出主题', hint: 'Nowadays, many people like using mobile phones. It plays an important part in our daily life.' },
      { label: '优点', hint: 'Generally speaking, it has two main advantages. Firstly… Secondly…' },
      { label: '缺点', hint: 'But every coin has two sides. To begin with… In addition…' },
      { label: '个人看法', hint: 'In my opinion, we should make good use of its good points and avoid its bad ones.' },
    ],
    sample:
      'Nowadays, many people like using mobile phones. It plays an important part in our daily life. Generally speaking, it has two main advantages. Firstly, we can talk with others far away. Secondly, we can get much information quickly. But every coin has two sides. It also brings some problems. To begin with, too much phone-time is bad for our health. In addition, it may waste our study time. In my opinion, we should make good use of its good points and avoid its bad ones.',
    rubric: ['结构：优点+缺点齐全', '衔接：But every coin has two sides', '收束：用好避坏', '语言：少基本语法错'],
  },
  {
    id: 'w-sim-3',
    level: 'cet4',
    title: '模拟3：现象‑问题‑解决（缺乏锻炼）',
    prompt:
      'More young people lack exercise. Give your suggestions. Write an essay of at least 120 words.',
    minutes: 30,
    templateId: 'tpl-arg-3',
    scaffold: [
      { label: '引出现象', hint: 'Nowadays, lack of exercise is more and more common in our life, which causes wide concern.' },
      { label: '问题', hint: 'It brings us some trouble. One problem is that… Another problem is that…' },
      { label: '建议', hint: 'There are some ways to change this situation. First of all… What’s more…' },
      { label: '号召收束', hint: 'In short, everyone should take action. Only in this way can we have a better result.' },
    ],
    sample:
      'Nowadays, lack of exercise is more and more common in our life, which causes wide concern. It brings us some trouble. One problem is that our body will become weak. Another problem is that we may feel tired easily. There are some ways to change this situation. First of all, we should take exercise every day. What’s more, we can take a walk after work. In short, everyone should take action. Only in this way can we have a better result.',
    rubric: ['结构：现象→问题→建议', '衔接：First of all / What’s more', '收束：Only in this way...', '语言：少基本语法错'],
  },
  {
    id: 'w-sim-4',
    level: 'cet4',
    title: '模拟4：建议信（学英语）',
    prompt:
      '你的朋友英语不好，请给他一些学习英语的建议。Write a letter of at least 120 words.',
    minutes: 30,
    templateId: 'tpl-letter-1',
    scaffold: [
      { label: '称呼与来意', hint: 'Dear Tom, I’m glad to receive your letter. You asked me for some advice on learning English.' },
      { label: '三条建议', hint: 'First of all… Besides… What’s more…' },
      { label: '祝愿收束', hint: 'I hope my suggestions will be helpful to you. Looking forward to your reply.' },
      { label: '落款', hint: 'Yours sincerely, / Li Hua' },
    ],
    sample:
      'Dear Tom,\nI’m glad to receive your letter. You asked me for some advice on learning English. Here are my suggestions.\nFirst of all, it is a good idea to read English articles every day. Besides, you can keep writing short English notes. What’s more, it helps if you listen to English materials in your free time.\nI hope my suggestions will be helpful to you. Looking forward to your reply.\n\nYours sincerely,\nLi Hua',
    rubric: ['格式：称呼落款齐全', '内容：至少三条建议', '语气：友好得体', '语言：少基本语法错'],
  },
  {
    id: 'w-sim-5',
    level: 'cet4',
    title: '模拟5：感谢信（生病期间）',
    prompt:
      '你生病期间朋友帮助了你，写一封感谢信。Write a letter of at least 120 words.',
    minutes: 30,
    templateId: 'tpl-letter-2',
    scaffold: [
      { label: '致谢开篇', hint: 'Dear Tom, I am writing to express my sincere thanks to you for your help when I was ill.' },
      { label: '具体帮助', hint: 'When I met difficulties in my daily life, you gave me lots of help…' },
      { label: '结果与感激', hint: 'Thanks to your support, I got better soon. I really appreciate your kindness.' },
      { label: '祝福落款', hint: 'I hope I can help you one day. Wish you all the best. / Yours sincerely, Li Hua' },
    ],
    sample:
      'Dear Tom,\nI am writing to express my sincere thanks to you for your help when I was ill.\nWhen I met difficulties in my daily life, you gave me lots of help. You spent time giving me useful advice. Thanks to your support, I got better soon.\nI really appreciate your kindness. I hope I can help you one day. Wish you all the best.\n\nYours sincerely,\nLi Hua',
    rubric: ['格式：称呼落款齐全', '内容：事由+具体帮助+结果', '语气：真诚礼貌', '语言：少基本语法错'],
  },
]
