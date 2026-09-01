import type { TransItem } from '@/types'

export const TRANS_ITEMS: TransItem[] = [
  {
    id: 't-cet4-1',
    level: 'cet4',
    kind: 'zh2en',
    title: '汉译英：创新能力',
    source:
      '近年来，中国大学越来越重视培养学生的创新能力。许多学校为此分配了专项资金，建设实验室和创客空间。然而，创新并非要抛弃基础训练。只有在扎实的知识之上，新想法才是可行的。',
    sample:
      'In recent years, Chinese universities have paid increasing attention to cultivating students’ innovative ability. Many schools have allocated special funds to build laboratories and makerspaces. Innovation, however, does not mean abandoning basic training. Only on the basis of solid knowledge are new ideas feasible.',
    chunks: [
      { cn: '近年来', en: 'In recent years' },
      { cn: '越来越重视', en: 'have paid increasing attention to' },
      { cn: '培养学生的创新能力', en: 'cultivating students’ innovative ability' },
      { cn: '分配了专项资金', en: 'have allocated special funds' },
      { cn: '并非要抛弃基础训练', en: 'does not mean abandoning basic training' },
      { cn: '新想法才是可行的', en: 'new ideas are feasible' },
    ],
    culture: [
      { term: '创客空间', en: 'makerspace' },
      { term: '专项资金', en: 'special funds / earmarked funds' },
    ],
    tips: ['先拆意群再选句式', '「越来越」可用 increasing / growing', '末句可用倒装或 only 开头强调条件'],
  },
  {
    id: 't-cet6-1',
    level: 'cet6',
    kind: 'zh2en',
    title: '汉译英：乡村振兴',
    source:
      '乡村振兴不仅意味着提高农民收入，也关系到文化传承。许多传统村落正在修复古建筑，并把地方戏曲重新带进日常生活。这一做法有助于防止乡村在现代化过程中失去自身特色。',
    sample:
      'Rural revitalization means not only raising farmers’ income but also passing down cultural heritage. Many traditional villages are restoring historic buildings and bringing local opera back into everyday life. This practice helps prevent the countryside from losing its distinctive character in the process of modernization.',
    chunks: [
      { cn: '乡村振兴', en: 'rural revitalization' },
      { cn: '不仅意味着……也', en: 'means not only... but also' },
      { cn: '文化传承', en: 'passing down cultural heritage' },
      { cn: '修复古建筑', en: 'restoring historic buildings' },
      { cn: '地方戏曲', en: 'local opera' },
      { cn: '失去自身特色', en: 'losing its distinctive character' },
    ],
    culture: [
      { term: '乡村振兴', en: 'rural revitalization' },
      { term: '地方戏曲', en: 'local opera / regional opera' },
    ],
    tips: ['专有政策名用约定译法', '「不仅…也」优先 not only... but also', 'prevent... from doing 比 make... not 更自然'],
  },
  {
    id: 't-cet4-2',
    level: 'cet4',
    kind: 'zh2en',
    title: '汉译英：高铁网络',
    source:
      '中国的高铁网络已成为世界上规模最大的铁路系统之一。它不仅缩短了城市之间的距离，也改变了人们的出行方式。许多年轻人现在更愿意坐高铁回家过节，而不是挤长途汽车。',
    sample:
      'China’s high-speed rail network has become one of the largest railway systems in the world. It has not only shortened the distance between cities but also changed the way people travel. Many young people now prefer to take the high-speed train home for the holidays rather than squeeze into long-distance buses.',
    chunks: [
      { cn: '高铁网络', en: 'high-speed rail network' },
      { cn: '已成为世界上规模最大的铁路系统之一', en: 'has become one of the largest railway systems in the world' },
      { cn: '不仅缩短了城市之间的距离', en: 'has not only shortened the distance between cities' },
      { cn: '改变了人们的出行方式', en: 'changed the way people travel' },
      { cn: '更愿意坐高铁回家过节', en: 'prefer to take the high-speed train home for the holidays' },
      { cn: '而不是挤长途汽车', en: 'rather than squeeze into long-distance buses' },
    ],
    culture: [
      { term: '高铁', en: 'high-speed rail' },
      { term: '过节', en: 'for the holidays' },
    ],
    tips: ['「而不是」用 rather than', 'prefer to do A rather than do B', 'one of the + 最高级 + 复数'],
  },
  {
    id: 't-cet6-2',
    level: 'cet6',
    kind: 'zh2en',
    title: '汉译英：非遗保护',
    source:
      '非物质文化遗产的保护近年来受到越来越多关注。许多传统手艺面临失传的风险，年轻一代对它们的兴趣不足。为此，一些地方将传统工艺引入校园课程，让学生在实践中感受文化的价值。',
    sample:
      'The protection of intangible cultural heritage has drawn increasing attention in recent years. Many traditional crafts risk being lost, as the younger generation shows insufficient interest in them. To address this, some regions have introduced traditional crafts into school curricula, allowing students to experience the value of culture through practice.',
    chunks: [
      { cn: '非物质文化遗产', en: 'intangible cultural heritage' },
      { cn: '受到越来越多关注', en: 'has drawn increasing attention' },
      { cn: '面临失传的风险', en: 'risk being lost' },
      { cn: '兴趣不足', en: 'shows insufficient interest' },
      { cn: '引入校园课程', en: 'introduced into school curricula' },
      { cn: '在实践中感受文化的价值', en: 'experience the value of culture through practice' },
    ],
    culture: [
      { term: '非物质文化遗产', en: 'intangible cultural heritage' },
      { term: '传统工艺', en: 'traditional crafts' },
    ],
    tips: ['risk being done 表“面临被…的风险”', 'allow sb to do 通过做某事', 'intangible = 无形的'],
  },

  // —— 类型一：段落内划线句（英→中，只译【】内）——
  {
    id: 't-ul-1',
    level: 'cet4',
    kind: 'underline',
    title: '划线句 1：旅行',
    source:
      'Nowadays travel becomes popular among young people. 【①Travel can broaden our mind and give us new experiences.】 When we visit new places, we meet different people and local cultures. 【②We may meet some difficulties during the trip, but we can learn from those problems.】 Travel does not always need much money. 【③What really matters is our attitude towards life.】 Many people choose short-distance travel on weekends. 【④It helps them relax after busy work.】 【⑤We should make reasonable plans before we start our journey.】',
    sample:
      '①旅行可以开阔我们的眼界，带给我们全新的体验。\n②我们在旅途中或许会遇到一些困难，但可以从这些问题当中有所收获。\n③真正重要的是我们对待生活的态度。\n④这有助于他们在忙碌的工作之后放松身心。\n⑤开启旅程之前，我们应当制定合理的计划。',
    sentences: [
      { no: 1, en: 'Travel can broaden our mind and give us new experiences.', cn: '旅行可以开阔我们的眼界，带给我们全新的体验。' },
      { no: 2, en: 'We may meet some difficulties during the trip, but we can learn from those problems.', cn: '我们在旅途中或许会遇到一些困难，但可以从这些问题当中有所收获。' },
      { no: 3, en: 'What really matters is our attitude towards life.', cn: '真正重要的是我们对待生活的态度。' },
      { no: 4, en: 'It helps them relax after busy work.', cn: '这有助于他们在忙碌的工作之后放松身心。' },
      { no: 5, en: 'We should make reasonable plans before we start our journey.', cn: '开启旅程之前，我们应当制定合理的计划。' },
    ],
    chunks: [],
    culture: [],
    tips: ['只翻译【】内句子', '注意 broaden / attitude / reasonable 等词的自然译法'],
  },
  {
    id: 't-ul-2',
    level: 'cet4',
    kind: 'underline',
    title: '划线句 2：阅读',
    source:
      'Reading is a good habit for everyone. 【①Books provide us with knowledge that we cannot get in daily life.】 We do not need to go out to know the whole world. 【②If we keep reading every day, we will make slow but steady progress.】 Many people give up reading because of busy work. 【③However, we can make use of our spare time for simple reading.】 Reading is not only for study. 【④It also helps us calm down when we feel anxious.】 【⑤A good book can be our best friend at any time.】',
    sample:
      '①书籍为我们提供日常生活中无法获得的知识。\n②如果我们坚持每天阅读，就会取得缓慢但稳定的进步。\n③不过，我们可以利用空余时间做简单阅读。\n④当我们感到焦虑时，它还能帮助我们平静下来。\n⑤一本好书在任何时候都可以成为我们最好的朋友。',
    sentences: [
      { no: 1, en: 'Books provide us with knowledge that we cannot get in daily life.', cn: '书籍为我们提供日常生活中无法获得的知识。' },
      { no: 2, en: 'If we keep reading every day, we will make slow but steady progress.', cn: '如果我们坚持每天阅读，就会取得缓慢但稳定的进步。' },
      { no: 3, en: 'However, we can make use of our spare time for simple reading.', cn: '不过，我们可以利用空余时间做简单阅读。' },
      { no: 4, en: 'It also helps us calm down when we feel anxious.', cn: '当我们感到焦虑时，它还能帮助我们平静下来。' },
      { no: 5, en: 'A good book can be our best friend at any time.', cn: '一本好书在任何时候都可以成为我们最好的朋友。' },
    ],
    chunks: [],
    culture: [],
    tips: ['只翻译【】内句子', 'slow but steady / make use of / calm down 注意搭配'],
  },
  {
    id: 't-ul-3',
    level: 'cet4',
    kind: 'underline',
    title: '划线句 3：运动',
    source:
      'Exercise plays an important role in our life. 【①Regular exercise is helpful to both our body and mood.】 Many office workers spend long hours sitting in front of computers. 【②This bad habit will gradually cause health trouble.】 You do not have to do hard sports. 【③Even a thirty-minute walk can bring good results.】 【④What matters is to keep doing it for a long time.】 【⑤More people should realize the value of physical activity.】',
    sample:
      '①规律运动对我们的身体和情绪都有益处。\n②这个坏习惯会慢慢引发健康问题。\n③即便是三十分钟的散步也能带来不错的效果。\n④重要的是能够长期坚持下去。\n⑤更多人应当意识到体育锻炼的价值。',
    sentences: [
      { no: 1, en: 'Regular exercise is helpful to both our body and mood.', cn: '规律运动对我们的身体和情绪都有益处。' },
      { no: 2, en: 'This bad habit will gradually cause health trouble.', cn: '这个坏习惯会慢慢引发健康问题。' },
      { no: 3, en: 'Even a thirty-minute walk can bring good results.', cn: '即便是三十分钟的散步也能带来不错的效果。' },
      { no: 4, en: 'What matters is to keep doing it for a long time.', cn: '重要的是能够长期坚持下去。' },
      { no: 5, en: 'More people should realize the value of physical activity.', cn: '更多人应当意识到体育锻炼的价值。' },
    ],
    chunks: [],
    culture: [],
    tips: ['只翻译【】内句子', 'gradually / What matters is / physical activity'],
  },
  {
    id: 't-ul-4',
    level: 'cet4',
    kind: 'underline',
    title: '划线句 4：网购',
    source:
      'Online shopping has changed people’s buying habits. 【①It saves us much time that we would spend in physical shops.】 We can compare prices and choose goods at home. 【②But online shopping also has some clear disadvantages.】 Sometimes the real product is different from the pictures on the screen. 【③We may waste money on something we do not really need.】 【④We should stay reasonable when we shop on the Internet.】 【⑤Think twice before you pay for your order.】',
    sample:
      '①它帮我们省下原本要耗费在实体店里的大量时间。\n②但是网购也存在一些明显的缺点。\n③我们可能会把钱浪费在自己并不真正需要的东西上面。\n④网上购物时我们应当保持理性。\n⑤下单付款之前要三思。',
    sentences: [
      { no: 1, en: 'It saves us much time that we would spend in physical shops.', cn: '它帮我们省下原本要耗费在实体店里的大量时间。' },
      { no: 2, en: 'But online shopping also has some clear disadvantages.', cn: '但是网购也存在一些明显的缺点。' },
      { no: 3, en: 'We may waste money on something we do not really need.', cn: '我们可能会把钱浪费在自己并不真正需要的东西上面。' },
      { no: 4, en: 'We should stay reasonable when we shop on the Internet.', cn: '网上购物时我们应当保持理性。' },
      { no: 5, en: 'Think twice before you pay for your order.', cn: '下单付款之前要三思。' },
    ],
    chunks: [],
    culture: [],
    tips: ['只翻译【】内句子', 'physical shops → 实体店；Think twice → 三思'],
  },
  {
    id: 't-ul-5',
    level: 'cet4',
    kind: 'underline',
    title: '划线句 5：沟通',
    source:
      'Communication is necessary in human society. 【①Good communication helps us build better relationships with others.】 When we talk with people, we should also learn to listen. 【②Listening patiently shows our respect for the speaker.】 Some conflicts happen just because of misunderstanding. 【③If we express our thoughts clearly, many troubles can be avoided.】 【④We need to learn communication skills little by little.】 【⑤No one is born with perfect communicating ability.】',
    sample:
      '①良好的沟通有助于我们和他人建立更好的人际关系。\n②耐心倾听代表着我们对说话人的尊重。\n③如果我们清晰表达自己的想法，很多麻烦是可以避免的。\n④我们需要一点点学习沟通的技巧。\n⑤没有人天生就拥有完美的沟通能力。',
    sentences: [
      { no: 1, en: 'Good communication helps us build better relationships with others.', cn: '良好的沟通有助于我们和他人建立更好的人际关系。' },
      { no: 2, en: 'Listening patiently shows our respect for the speaker.', cn: '耐心倾听代表着我们对说话人的尊重。' },
      { no: 3, en: 'If we express our thoughts clearly, many troubles can be avoided.', cn: '如果我们清晰表达自己的想法，很多麻烦是可以避免的。' },
      { no: 4, en: 'We need to learn communication skills little by little.', cn: '我们需要一点点学习沟通的技巧。' },
      { no: 5, en: 'No one is born with perfect communicating ability.', cn: '没有人天生就拥有完美的沟通能力。' },
    ],
    chunks: [],
    culture: [],
    tips: ['只翻译【】内句子', 'little by little / be born with'],
  },
  {
    id: 't-ul-6',
    level: 'cet4',
    kind: 'underline',
    title: '划线句 6：时间',
    source:
      'Time is very valuable for every person. 【①Once time passes away, it will never come back again.】 Many people often put things off till tomorrow. 【②This habit will make our work pile up day by day.】 We do not need to finish everything in one day. 【③But we should try our best to complete today’s tasks.】 【④Making a simple plan can improve our time efficiency.】 【⑤Do not waste your limited time on meaningless things.】',
    sample:
      '①时间一旦流逝，就再也不会回来。\n②这个习惯会让我们的工作一天天堆积起来。\n③但是我们应当尽力完成当日的任务。\n④制定简单计划可以提升我们的时间利用效率。\n⑤不要把有限的时间浪费在毫无意义的事情上。',
    sentences: [
      { no: 1, en: 'Once time passes away, it will never come back again.', cn: '时间一旦流逝，就再也不会回来。' },
      { no: 2, en: 'This habit will make our work pile up day by day.', cn: '这个习惯会让我们的工作一天天堆积起来。' },
      { no: 3, en: 'But we should try our best to complete today’s tasks.', cn: '但是我们应当尽力完成当日的任务。' },
      { no: 4, en: 'Making a simple plan can improve our time efficiency.', cn: '制定简单计划可以提升我们的时间利用效率。' },
      { no: 5, en: 'Do not waste your limited time on meaningless things.', cn: '不要把有限的时间浪费在毫无意义的事情上。' },
    ],
    chunks: [],
    culture: [],
    tips: ['只翻译【】内句子', 'put off / pile up / time efficiency'],
  },
  {
    id: 't-ul-7',
    level: 'cet4',
    kind: 'underline',
    title: '划线句 7：居家办公',
    source:
      'Working from home becomes more common now. 【①It gives workers more freedom to arrange their daily life.】 People can save the time spent on commuting. 【②At the same time, it requires stronger self-control.】 Without supervision, some people cannot focus on their work. 【③It is easy for them to mix work time and rest time.】 【④Setting a fixed working rule is quite useful.】 【⑤Self-discipline decides your final work result.】',
    sample:
      '①它给予打工人更多自由去安排日常生活。\n②与此同时，这也要求更强的自我约束力。\n③他们很容易把工作时间和休息时间混在一起。\n④设定固定的工作规则会十分有用。\n⑤自律决定了你最终的工作成果。',
    sentences: [
      { no: 1, en: 'It gives workers more freedom to arrange their daily life.', cn: '它给予打工人更多自由去安排日常生活。' },
      { no: 2, en: 'At the same time, it requires stronger self-control.', cn: '与此同时，这也要求更强的自我约束力。' },
      { no: 3, en: 'It is easy for them to mix work time and rest time.', cn: '他们很容易把工作时间和休息时间混在一起。' },
      { no: 4, en: 'Setting a fixed working rule is quite useful.', cn: '设定固定的工作规则会十分有用。' },
      { no: 5, en: 'Self-discipline decides your final work result.', cn: '自律决定了你最终的工作成果。' },
    ],
    chunks: [],
    culture: [],
    tips: ['只翻译【】内句子', 'commuting / self-control / Self-discipline'],
  },
  {
    id: 't-ul-8',
    level: 'cet4',
    kind: 'underline',
    title: '划线句 8：失败',
    source:
      'Failure is a common experience for everybody. 【①Almost no one can succeed without meeting any failure.】 Some people feel upset and give up after failure. 【②Others treat failure as a chance to learn lessons.】 Failure tells us where our weakness lies. 【③We can adjust our methods and try once more.】 【④Do not be afraid of making mistakes.】 【⑤Valuable experience often comes from previous failures.】',
    sample:
      '①几乎没有人不经历失败就获得成功。\n②另一些人把失败当作吸取教训的机会。\n③我们可以调整方法，重新再试一次。\n④不要害怕犯错。\n⑤宝贵的经验往往来自过往的失败。',
    sentences: [
      { no: 1, en: 'Almost no one can succeed without meeting any failure.', cn: '几乎没有人不经历失败就获得成功。' },
      { no: 2, en: 'Others treat failure as a chance to learn lessons.', cn: '另一些人把失败当作吸取教训的机会。' },
      { no: 3, en: 'We can adjust our methods and try once more.', cn: '我们可以调整方法，重新再试一次。' },
      { no: 4, en: 'Do not be afraid of making mistakes.', cn: '不要害怕犯错。' },
      { no: 5, en: 'Valuable experience often comes from previous failures.', cn: '宝贵的经验往往来自过往的失败。' },
    ],
    chunks: [],
    culture: [],
    tips: ['只翻译【】内句子', 'treat…as… / previous failures'],
  },
  {
    id: 't-ul-9',
    level: 'cet4',
    kind: 'underline',
    title: '划线句 9：友谊',
    source:
      'Friendship brings warmth to our life. 【①A real friend will support you when you are in trouble.】 True friendship does not depend on money or social position. 【②What we need is mutual understanding and respect.】 We cannot always agree with each other. 【③Even good friends may have different opinions.】 【④We should learn to accept each other’s differences.】 【⑤Good friendship needs long-term care from both sides.】',
    sample:
      '①真正的朋友会在你身处困境时支持你。\n②我们所需要的是相互理解与尊重。\n③即便是要好的朋友也可能拥有不同的看法。\n④我们应当学会接纳彼此之间的差异。\n⑤美好的友谊需要双方长久用心维护。',
    sentences: [
      { no: 1, en: 'A real friend will support you when you are in trouble.', cn: '真正的朋友会在你身处困境时支持你。' },
      { no: 2, en: 'What we need is mutual understanding and respect.', cn: '我们所需要的是相互理解与尊重。' },
      { no: 3, en: 'Even good friends may have different opinions.', cn: '即便是要好的朋友也可能拥有不同的看法。' },
      { no: 4, en: 'We should learn to accept each other’s differences.', cn: '我们应当学会接纳彼此之间的差异。' },
      { no: 5, en: 'Good friendship needs long-term care from both sides.', cn: '美好的友谊需要双方长久用心维护。' },
    ],
    chunks: [],
    culture: [],
    tips: ['只翻译【】内句子', 'mutual / long-term care'],
  },
  {
    id: 't-ul-10',
    level: 'cet4',
    kind: 'underline',
    title: '划线句 10：现代媒体',
    source:
      'Modern media influences our opinions greatly. 【①We receive large amounts of information every single day.】 Not all the online news is completely true. 【②We should learn to judge information with our own mind.】 Do not accept everything you read on the Internet. 【③Think carefully before you believe a piece of news.】 【④Blind following will bring us wrong ideas.】 【⑤Independent thinking is an important ability for modern people.】',
    sample:
      '①我们每一天都会接收海量的信息。\n②我们应当学会用自己的头脑去判断信息。\n③在相信一条消息之前要仔细思考。\n④盲目跟从会带给我们错误的观念。\n⑤独立思考是现代人一项重要的能力。',
    sentences: [
      { no: 1, en: 'We receive large amounts of information every single day.', cn: '我们每一天都会接收海量的信息。' },
      { no: 2, en: 'We should learn to judge information with our own mind.', cn: '我们应当学会用自己的头脑去判断信息。' },
      { no: 3, en: 'Think carefully before you believe a piece of news.', cn: '在相信一条消息之前要仔细思考。' },
      { no: 4, en: 'Blind following will bring us wrong ideas.', cn: '盲目跟从会带给我们错误的观念。' },
      { no: 5, en: 'Independent thinking is an important ability for modern people.', cn: '独立思考是现代人一项重要的能力。' },
    ],
    chunks: [],
    culture: [],
    tips: ['只翻译【】内句子', 'Blind following / Independent thinking'],
  },

  // —— 类型二：完整小段落翻译（英→中，整篇）——
  {
    id: 't-pg-1',
    level: 'cet4',
    kind: 'paragraph',
    title: '整段 1：自信',
    source:
      'Confidence is very important for our growth. If you believe yourself, you will have more courage to face challenges. Many people lose chances just because they are afraid of themselves. Confidence does not mean you are always perfect. It means you dare to try even though you may fail. We can build up confidence through small success in daily life. Every little progress will make us become better little by little.',
    sample:
      '自信对我们的成长十分重要。如果你相信自己，就会拥有更多勇气去面对挑战。很多人仅仅因为自我胆怯而错失机会。自信并不代表你永远完美无缺，而是即便有可能失败，你也敢于尝试。我们可以通过日常生活里小小的成功建立自信，每一点进步，都会让我们一点点变得更好。',
    chunks: [],
    culture: [],
    tips: ['整篇翻译，建议 20–25 分钟', 'believe in yourself 语感；little by little'],
  },
  {
    id: 't-pg-2',
    level: 'cet4',
    kind: 'paragraph',
    title: '整段 2：健康饮食',
    source:
      'Now more and more people pay attention to a healthy diet. Good eating habits can protect us from many kinds of illness. It is not wise to eat too much high-fat food. We should eat more fresh fruit and vegetables every day. Besides, keeping regular meal time is also meaningful. Many young people skip breakfast because they get up late. This bad habit will produce bad influence on their bodies in the long run.',
    sample:
      '现在越来越多的人开始重视健康饮食。良好的饮食习惯可以帮助我们远离多种疾病。吃太多高脂肪食物是不可取的。我们每天应当多吃新鲜果蔬。除此之外，保持规律的吃饭时间同样很重要。不少年轻人因为起得晚不吃早饭，从长远来看，这个坏习惯会对身体造成不良影响。',
    chunks: [],
    culture: [],
    tips: ['整篇翻译，建议 20–25 分钟', 'in the long run / skip breakfast'],
  },
  {
    id: 't-pg-3',
    level: 'cet4',
    kind: 'paragraph',
    title: '整段 3：终身学习',
    source:
      'The development of science and technology changes our society fast. Many jobs that existed years ago are disappearing. At the same time, many new kinds of work appear. Under such conditions, lifelong learning becomes necessary for ordinary people. We cannot stop learning after we finish school. If we refuse new knowledge, we may fall behind the times. Learning new skills helps us keep competitive in the job market.',
    sample:
      '科技的发展快速改变着我们的社会。许多多年前存在的工作正在消失，与此同时，大量新型工作不断涌现。在这样的环境下，终身学习对普通人而言变得十分必要。我们不能离开学校之后就停止学习。如果拒绝学习新知识，我们就可能落后于时代。学习新技能可以帮助我们在职场保持竞争力。',
    chunks: [],
    culture: [],
    tips: ['整篇翻译，建议 20–25 分钟', 'lifelong learning / fall behind the times'],
  },
  {
    id: 't-pg-4',
    level: 'cet4',
    kind: 'paragraph',
    title: '整段 4：爱好',
    source:
      'Hobbies can enrich our spare-time life. Different people have different hobbies. Some people enjoy music, while others love painting or sports. A good hobby can reduce our pressure from work and study. It gives us joy when we feel tired. However, we should not spend too much time on hobbies. Hobbies are for relaxation, and they cannot take the place of our main tasks in life.',
    sample:
      '爱好可以丰富我们的业余生活。每个人的爱好各不相同，有的人热爱音乐，还有的人喜欢绘画或者运动。一个好的爱好能够缓解来自工作和学习的压力，当我们疲惫的时候，爱好可以带给我们快乐。但是我们不可以在爱好上面投入过多时间。爱好是用来放松的，不能替代我们生活当中的主要任务。',
    chunks: [],
    culture: [],
    tips: ['整篇翻译，建议 20–25 分钟', 'take the place of / spare-time'],
  },
  {
    id: 't-pg-5',
    level: 'cet4',
    kind: 'paragraph',
    title: '整段 5：礼貌',
    source:
      'Being polite is a basic quality for everyone. Politeness does not mean empty words. It shows our respect for people around us. Simple words such as “thank you” and “sorry” can improve our communication effect. Even when we disagree with others, we should keep polite. Rude words may hurt other people’s feelings and cause unnecessary conflict. Good manners will bring us better interpersonal relationships.',
    sample:
      '懂礼貌是每个人的基本素养。礼貌并不是空洞的客套话，它代表着我们对身边人的尊重。像 “谢谢”“对不起” 这类简单话语，就可以改善沟通效果。即便我们和别人意见不一致，也应当保持礼貌。粗鲁的言语会伤害他人感情，引发不必要的矛盾。良好的举止能够帮我们收获更好的人际关系。',
    chunks: [],
    culture: [],
    tips: ['整篇翻译，建议 20–25 分钟', 'empty words / interpersonal relationships'],
  },
  {
    id: 't-pg-6',
    level: 'cet4',
    kind: 'paragraph',
    title: '整段 6：社交媒体',
    source:
      'Every coin has two sides, and so is social media. It helps us keep in touch with distant friends. We can share our daily life and know what happens in the world quickly. But staying on social media for long time also has shortcomings. Some people care too much about others’ comments. They feel upset because of online opinions. We ought to treat social media as a tool instead of letting it control our mood.',
    sample:
      '凡事都有两面性，社交媒体也是如此。它帮助我们和远方的朋友保持联系，我们可以分享日常生活，快速了解天下发生的事。但长时间刷社交媒体同样存在弊端。部分人过度在意别人的评论，会因为网络上的言论而情绪低落。我们应当把社交媒体当作工具，而不是让它左右自己的情绪。',
    chunks: [],
    culture: [],
    tips: ['整篇翻译，建议 20–25 分钟', 'Every coin has two sides / treat…as a tool'],
  },
  {
    id: 't-pg-7',
    level: 'cet4',
    kind: 'paragraph',
    title: '整段 7：设定目标',
    source:
      'Setting goals plays an important part in our progress. A clear goal tells us where we are going. Without goals, people are easy to feel confused in daily life. Your goal should not be too hard to reach. It is better to divide a big aim into several small steps. When you finish one small step, you will get encouragement. Step by step, you will finally get close to your final dream.',
    sample:
      '设定目标对我们取得进步十分关键。清晰的目标指引我们前进的方向。没有目标，人们在生活中很容易感到迷茫。你的目标不应当设定得高不可攀。最好把大目标拆解成若干小步骤。完成每一小步，你就能获得鼓舞。一步一步坚持下去，最终就会慢慢靠近自己的梦想。',
    chunks: [],
    culture: [],
    tips: ['整篇翻译，建议 20–25 分钟', 'divide…into… / Step by step'],
  },
  {
    id: 't-pg-8',
    level: 'cet4',
    kind: 'paragraph',
    title: '整段 8：大城市生活',
    source:
      'Living in big cities brings us many convenient conditions. We can enjoy rich public resources such as hospitals and libraries. There are more job chances for young people. But city life also has its troubles. House prices and living cost are relatively high. Many people face heavy pressure from daily living. Therefore, some people choose smaller cities to seek a more relaxing lifestyle.',
    sample:
      '生活在大城市能带给我们诸多便利。我们可以享受医院、图书馆等丰富的公共资源，年轻人会拥有更多就业机会。但城市生活同样也有烦恼，房价与生活成本相对较高，很多人要面对沉重的生活压力。因此一部分人选择去到小城市，去追求更加轻松的生活方式。',
    chunks: [],
    culture: [],
    tips: ['整篇翻译，建议 20–25 分钟', 'living cost / lifestyle'],
  },
  {
    id: 't-pg-9',
    level: 'cet4',
    kind: 'paragraph',
    title: '整段 9：坚持',
    source:
      'Persistence is one key to success. Many people fail not because they have no ability, but because they give up too early. It is normal to meet difficulties on the way towards aims. Things will not always go as we wish. If you stop trying after several setbacks, you will never see good results. Only those who keep moving forward can get the reward they expect.',
    sample:
      '坚持是通往成功的一把钥匙。很多人失败不是因为没有能力，而是过早选择了放弃。追逐目标的路上遭遇困难是很正常的，事情不会永远按照我们的想法发展。如果经历几次挫折就停止努力，就永远看不到好结果。只有持续向前的人，才能够收获自己期待的回报。',
    chunks: [],
    culture: [],
    tips: ['整篇翻译，建议 20–25 分钟', 'not because…but because… / setbacks'],
  },
  {
    id: 't-pg-10',
    level: 'cet4',
    kind: 'paragraph',
    title: '整段 10：珍惜身边的人',
    source:
      'We should learn to value the people beside us. In our busy modern life, we often ignore family members and close friends. We take their care for granted and seldom express our thanks to them. Time will never wait for anybody. Do not wait until you lose them to realize their importance. Spend more time communicating with your family and show your love to them in daily life.',
    sample:
      '我们应当学会珍惜身边的人。忙碌的现代生活当中，我们常常忽略家人与挚友。我们把他们的关心视作理所当然，很少向他们表达谢意。时间不会等待任何人。不要等到失去之后，才明白他们的重要。多花时间和家人沟通，在日常生活当中向他们表达你的爱意。',
    chunks: [],
    culture: [],
    tips: ['整篇翻译，建议 20–25 分钟', 'take…for granted / value'],
  },
]
