import type { VocabWord } from '@/types'

export type VocabSense = {
  pos: string
  gloss: string
}

export type VocabPattern = {
  pattern: string
  gloss: string
  example?: string
  exampleCn?: string
}

export type UsageSource = 'curated' | 'mixed' | 'pos'

export type VocabUsageDetail = {
  senses: VocabSense[]
  patterns: VocabPattern[]
  tip?: string
  seeAlso: string[]
  source: UsageSource
}

type CuratedUsage = {
  tip?: string
  seeAlso?: string[]
  patterns: VocabPattern[]
}

function ps(
  rows: Array<[string, string, string?, string?]>,
  tip?: string,
  seeAlso?: string[],
): CuratedUsage {
  return {
    tip,
    seeAlso,
    patterns: rows.map(([pattern, gloss, example, exampleCn]) => ({
      pattern,
      gloss,
      example,
      exampleCn,
    })),
  }
}

const CURATED: Record<string, CuratedUsage> = {
  as: ps(
    [
      ['as far as I know', '据我所知', 'As far as I know, the library closes at nine.', '据我所知，图书馆九点关门。'],
      ['as far as sb / sth is concerned', '就某人 / 某事而言', 'As far as I am concerned, health comes first.', '就我而言，健康最重要。'],
      ['as ... as', '和……一样', 'This plan is as practical as that one.', '这个计划和那个一样可行。'],
      ['as soon as', '一……就……', 'Call me as soon as you arrive.', '你一到就给我打电话。'],
      ['as if / as though', '好像，仿佛', 'He talks as if he knew everything.', '他说话的样子好像什么都知道。'],
      ['as long as', '只要；长达', 'You can stay as long as you keep quiet.', '只要你保持安静，就可以留下。'],
      ['such as', '例如', 'I like outdoor sports such as hiking.', '我喜欢徒步之类的户外运动。'],
      ['as well as', '以及；和……一样好', 'She speaks French as well as English.', '她既会英语，也会法语。'],
      ['regard / see / treat sb as', '把某人看作', 'We regard her as a close friend.', '我们把她当作密友。'],
      ['as + 名词', '作为（介词）', 'She works as a volunteer on weekends.', '她周末当志愿者。'],
    ],
    'as 可以连接从句，也可以作介词接名词。比较时用 as ... as，否定常用 not as / so ... as。',
  ),
  if: ps(
    [
      ['if + 从句', '如果', 'If it rains, we will stay inside.', '如果下雨，我们就待在室内。'],
      ['If I were you, ...', '如果我是你（虚拟）', 'If I were you, I would start earlier.', '如果我是你，我会早点开始。'],
      ['even if', '即使', 'Even if it rains, the match will go on.', '即使下雨，比赛也会继续。'],
      ['if only', '要是……就好了', 'If only I had more time.', '要是我有更多时间就好了。'],
      ['as if', '好像', 'It looks as if it is going to snow.', '看起来好像要下雪了。'],
    ],
    'if 引导条件。与现在事实相反时，从句用 were / 过去式，主句用 would do。',
    ['whether', 'unless'],
  ),
  when: ps(
    [
      ['when + 从句', '当……时', 'When I got home, everyone was asleep.', '我到家时，大家都睡了。'],
      ['when it comes to sth / doing', '一谈到……', 'When it comes to writing, practice matters most.', '一谈到写作，练习最重要。'],
      ['hardly ... when ...', '一……就……', 'I had hardly sat down when the phone rang.', '我刚坐下电话就响了。'],
    ],
  ),
  while: ps(
    [
      ['while + 从句', '在……期间；然而', 'While I understand your point, I disagree.', '我理解你的观点，但我不同意。'],
      ['while doing', '在做某事时（主语一致）', 'She listened to music while walking.', '她一边走路一边听音乐。'],
    ],
    'while 除了“当……时”，还常表示转折，相当于“然而”。',
  ),
  since: ps(
    [
      ['since + 时间点', '自从（主句多用完成时）', 'I have lived here since 2020.', '我从 2020 年起就住在这里。'],
      ['since + 从句', '因为', 'Since you are here, let us begin.', '既然你来了，我们就开始吧。'],
      ['It has been + 时间 + since ...', '自从……已经多久', 'It has been three years since we last met.', '我们上次见面已经三年了。'],
    ],
    '表示“自从”时，since 后面是起点，不是一段时间。一段时间用 for。',
    ['because'],
  ),
  though: ps(
    [
      ['though + 从句', '虽然', 'Though he was tired, he finished the work.', '他虽然累，还是把工作做完了。'],
      ['even though', '即使', 'Even though it was late, she kept reading.', '即使很晚了，她还在读。'],
      ['句末 though', '不过（副词）', 'The room is small. It is bright, though.', '房间很小，不过很亮。'],
    ],
    'although / though 不与 but 连用，可以和 yet、still 一起用。',
    ['although'],
  ),
  although: ps(
    [
      ['although + 从句', '虽然', 'Although the task is hard, it is worth doing.', '任务虽然难，但值得做。'],
      ['even though', '即使', 'Even though he failed, he did not give up.', '即使失败了，他也没有放弃。'],
    ],
    'although 比 though 更正式，一般不放在句末。不与 but 连用。',
    ['though'],
  ),
  because: ps(
    [
      ['because + 从句', '因为（回答 why）', 'I stayed home because I was ill.', '我因为生病待在家里。'],
      ['because of + 名词 / doing', '因为（后面不接句子）', 'The flight was delayed because of the fog.', '航班因大雾延误了。'],
    ],
    'because 接从句；because of 接名词或动名词。',
    ['since'],
  ),
  whether: ps(
    [
      ['whether + 从句', '是否', 'I wonder whether she will come.', '我不知道她会不会来。'],
      ['whether ... or ...', '无论……还是……', 'Whether you agree or not, the rule stays.', '不管你同不同意，规定都不变。'],
      ['whether to do sth', '是否做某事', 'She cannot decide whether to accept the offer.', '她决定不了要不要接受这个提议。'],
      ['whether or not', '是否', 'Tell me whether or not you need help.', '告诉我你是否需要帮助。'],
    ],
    '正式写法里，句首、介词后、以及 or not 紧挨着时，用 whether，不用 if。',
    ['if'],
  ),
  until: ps(
    [
      ['until + 时间 / 从句', '直到……为止', 'Wait here until I come back.', '在这儿等到我回来。'],
      ['not ... until ...', '直到……才……', 'He did not leave until the rain stopped.', '直到雨停他才离开。'],
    ],
  ),
  than: ps(
    [
      ['比较级 + than', '比……更', 'This method is safer than that one.', '这种方法比那种更安全。'],
      ['rather than', '而不是', 'I prefer walking rather than driving.', '我宁愿走路，而不是开车。'],
      ['other than', '除了', 'There is nobody here other than me.', '除了我，这里没有别人。'],
      ['no sooner ... than ...', '一……就……', 'No sooner had she left than the bus arrived.', '她刚离开，公交车就到了。'],
    ],
  ),
  so: ps(
    [
      ['so + adj. / adv. + that', '如此……以至于', 'The text was so difficult that few finished it.', '这篇文章难到没什么人读完。'],
      ['so that', '以便；结果', 'She spoke slowly so that everyone could follow.', '她说得很慢，好让每个人都能跟上。'],
      ['so as to do', '为了做某事', 'He got up early so as to catch the first train.', '他早起是为了赶上首班车。'],
      ['so ... as to do', '到了做某事的程度', 'Would you be so kind as to open the door?', '请你把门打开好吗？'],
    ],
  ),
  once: ps(
    [
      ['once + 从句', '一旦', 'Once you start, do not stop halfway.', '一旦开始，就不要半途而废。'],
      ['once', '曾经（副词）', 'This building was once a library.', '这栋楼曾经是图书馆。'],
      ['at once', '立刻；同时', 'The doctor asked him to sit down at once.', '医生让他立刻坐下。'],
    ],
  ),
  before: ps(
    [
      ['before + 从句 / 名词 / doing', '在……之前', 'Check the facts before you share them.', '分享之前先核对事实。'],
      ['It will be + 时间 + before ...', '要过……才……', 'It will be years before the trees grow tall.', '这些树要过很多年才会长高。'],
    ],
    undefined,
    ['after'],
  ),
  after: ps(
    [
      ['after + 名词 / doing / 从句', '在……之后', 'After finishing the draft, she revised it.', '写完初稿后，她又改了一遍。'],
    ],
    undefined,
    ['before'],
  ),
  unless: ps(
    [
      ['unless + 从句', '除非，如果不', 'You will miss the bus unless you leave now.', '你现在不走就会错过公交车。'],
    ],
    'unless 本身含有否定，不要再写成 unless ... not。',
    ['if'],
  ),
  despite: ps(
    [
      ['despite + 名词 / doing', '尽管', 'Despite the noise, he fell asleep.', '尽管很吵，他还是睡着了。'],
      ['in spite of + 名词 / doing', '尽管（despite 本身不加 of）', 'In spite of the delay, we arrived on time.', '尽管耽搁了，我们还是准时到了。'],
    ],
    'despite 后面不接句子，也不加 of。接句子用 although。',
    ['although'],
  ),
  advice: ps(
    [
      ['a piece of advice', '一条建议（advice 不可数）', 'Let me give you a piece of advice.', '我给你一条建议。'],
      ['advice on / about sth', '关于某事的建议', 'Could you give me some advice on writing?', '你能给我一些写作建议吗？'],
      ['give sb advice', '给某人建议', 'Teachers often give students advice.', '老师经常给学生建议。'],
      ['take / follow sb\'s advice', '听从某人的建议', 'I took her advice and left earlier.', '我听从她的建议，提前离开了。'],
    ],
    'advice 是名词，不能说 advice sb to do。要说“建议某人做某事”，用动词 advise sb to do sth。也不说 an advice 或 advices。',
    ['advise'],
  ),
  advise: ps(
    [
      ['advise sb to do sth', '建议某人做某事', 'The doctor advised me to take a rest.', '医生建议我休息。'],
      ['advise doing sth', '建议做某事', 'I advise leaving before the rush hour.', '我建议在高峰前出发。'],
      ['advise sb against doing sth', '建议某人不要做某事', 'They advised her against signing the contract.', '他们建议她不要签这份合同。'],
      ['advise that sb (should) do', '建议……（从句用 should 或动词原形）', 'I advise that he (should) see a doctor.', '我建议他去看医生。'],
    ],
    '动词是 advise，名词是 advice。advise 可以接 sb to do；suggest 不能写成 suggest sb to do。',
    ['advice', 'suggest'],
  ),
  suggest: ps(
    [
      ['suggest doing sth', '建议做某事', 'She suggested taking a short break.', '她建议稍作休息。'],
      ['suggest that sb (should) do', '建议某人做某事', 'I suggest that we (should) start now.', '我建议我们现在就开始。'],
      ['suggest sth to sb', '向某人提出某建议', 'He suggested a new plan to the team.', '他向团队提出了一个新计划。'],
    ],
    '不要写成 suggest sb to do。表示“建议某人做某事”时，用 suggest that sb (should) do，或改用 advise sb to do。',
    ['advise'],
  ),
  recommend: ps(
    [
      ['recommend doing sth', '建议做某事', 'The guide recommended visiting the museum early.', '导游建议早点去博物馆。'],
      ['recommend that sb (should) do', '建议某人做某事', 'I recommend that she (should) apply soon.', '我建议她尽快申请。'],
      ['recommend sth to sb', '向某人推荐某物', 'Can you recommend a book to me?', '你能给我推荐一本书吗？'],
      ['recommend sb to do sth', '建议某人做某事', 'They recommended us to book in advance.', '他们建议我们提前预订。'],
    ],
    '更稳妥的书面说法是 recommend doing 或 recommend that sb (should) do。',
  ),
  allow: ps(
    [
      ['allow sb to do sth', '允许某人做某事', 'The school allows students to use the lab.', '学校允许学生使用实验室。'],
      ['allow doing sth', '允许做某事', 'They do not allow smoking here.', '这里不允许吸烟。'],
      ['be allowed to do', '被允许做某事', 'Visitors are allowed to take photos.', '参观者可以拍照。'],
    ],
  ),
  enable: ps(
    [
      ['enable sb to do sth', '使某人能够做某事', 'The app enables users to learn on the bus.', '这个应用让用户能在公交上学习。'],
    ],
  ),
  encourage: ps(
    [
      ['encourage sb to do sth', '鼓励某人做某事', 'Parents should encourage children to ask questions.', '父母应鼓励孩子提问。'],
    ],
  ),
  persuade: ps(
    [
      ['persuade sb to do sth', '说服某人做某事', 'I persuaded him to join the club.', '我说服他加入了社团。'],
      ['persuade sb into doing sth', '说服某人做某事', 'She persuaded me into trying again.', '她说服我再试一次。'],
      ['persuade sb out of doing sth', '说服某人不要做某事', 'We persuaded him out of quitting.', '我们说服他不要放弃。'],
    ],
  ),
  remind: ps(
    [
      ['remind sb to do sth', '提醒某人做某事', 'Please remind me to send the file.', '请提醒我把文件发出去。'],
      ['remind sb of sth', '使某人想起某事', 'This song reminds me of my hometown.', '这首歌让我想起家乡。'],
      ['remind sb that ...', '提醒某人……', 'She reminded us that the gate closes at six.', '她提醒我们六点关门。'],
    ],
  ),
  warn: ps(
    [
      ['warn sb to do sth', '警告某人去做某事', 'The sign warns drivers to slow down.', '标牌警告司机减速。'],
      ['warn sb not to do sth', '警告某人不要做某事', 'I warned him not to be late.', '我警告他不要迟到。'],
      ['warn sb against doing sth', '警告某人不要做某事', 'Doctors warn people against skipping breakfast.', '医生告诫人们不要不吃早餐。'],
      ['warn sb of / about sth', '警告某人提防某事', 'They warned us of the coming storm.', '他们警告我们风暴要来了。'],
    ],
  ),
  refuse: ps(
    [
      ['refuse to do sth', '拒绝做某事', 'He refused to answer the question.', '他拒绝回答这个问题。'],
      ['refuse sb sth', '拒绝把某物给某人', 'The bank refused him a loan.', '银行拒绝给他贷款。'],
    ],
  ),
  tend: ps(
    [
      ['tend to do sth', '往往会；倾向于', 'People tend to forget names quickly.', '人们往往很快忘掉名字。'],
    ],
  ),
  manage: ps(
    [
      ['manage to do sth', '设法做成某事', 'She managed to finish the paper on time.', '她设法按时写完了论文。'],
      ['manage sb / sth', '管理', 'He manages a team of ten people.', '他管理一个十人团队。'],
    ],
    'manage to do 强调“做成了”。try to do 只表示“试图”，不一定成功。',
  ),
  afford: ps(
    [
      ['can / could afford to do sth', '负担得起做某事', 'I cannot afford to waste any more time.', '我再浪费不起时间了。'],
      ['can / could afford sth', '买得起；承担得起', 'Few families can afford such fees.', '很少有家庭负担得起这样的费用。'],
    ],
    'afford 前通常有 can 或 could。',
  ),
  promise: ps(
    [
      ['promise to do sth', '答应做某事', 'He promised to call back tonight.', '他答应今晚回电话。'],
      ['promise sb sth', '答应给某人某物', 'Mom promised me a new dictionary.', '妈妈答应给我一本新词典。'],
      ['promise (sb) that ...', '承诺……', 'I promise that I will be careful.', '我保证我会小心。'],
    ],
  ),
  offer: ps(
    [
      ['offer to do sth', '主动提出做某事', 'She offered to help with the luggage.', '她主动提出帮忙拿行李。'],
      ['offer sb sth', '向某人提供某物', 'They offered him a full scholarship.', '他们给他提供了全额奖学金。'],
    ],
  ),
  prevent: ps(
    [
      ['prevent sb / sth from doing sth', '阻止……做某事', 'The rain prevented us from going out.', '雨让我们没法出门。'],
      ['prevent sth', '防止某事发生', 'Regular exercise can prevent some diseases.', '经常锻炼能预防一些疾病。'],
    ],
  ),
  avoid: ps(
    [
      ['avoid doing sth', '避免做某事', 'He avoided answering the question directly.', '他避免直接回答这个问题。'],
      ['avoid sb / sth', '避开', 'She avoids crowded places.', '她避开拥挤的地方。'],
    ],
    'avoid 后面接 doing，不说 avoid to do。',
  ),
  consider: ps(
    [
      ['consider doing sth', '考虑做某事', 'I am considering changing my major.', '我在考虑换专业。'],
      ['consider sb / sth (as / to be) ...', '认为……是', 'We consider the plan to be realistic.', '我们认为这个计划是可行的。'],
    ],
    '表示“考虑做”时接 doing，不说 consider to do。',
  ),
  practise: ps(
    [
      ['practise doing sth', '练习做某事', 'Practise reading the passage aloud.', '练习大声读这篇文章。'],
      ['practise sth', '练习某项技能', 'She practises the piano every evening.', '她每天晚上练钢琴。'],
    ],
    'practise 后接 doing。美式拼写 practice 也可作动词，接法相同。',
  ),
  risk: ps(
    [
      ['risk doing sth', '冒险做某事', 'He risked losing his job to tell the truth.', '他为了说实话，冒着丢掉工作的风险。'],
      ['at the risk of', '冒着……的风险', 'At the risk of sounding rude, I have to disagree.', '恕我直言，我没法同意。'],
    ],
    'risk 后接 doing，不说 risk to do。',
  ),
  admit: ps(
    [
      ['admit doing sth', '承认做过某事', 'He admitted breaking the window.', '他承认打破了窗户。'],
      ['admit that ...', '承认……', 'She admitted that she was wrong.', '她承认自己错了。'],
      ['admit sb to / into', '准许进入', 'The college admitted her to the program.', '学院录取她进入该项目。'],
    ],
  ),
  deny: ps(
    [
      ['deny doing sth', '否认做过某事', 'He denied taking the money.', '他否认拿了钱。'],
      ['deny that ...', '否认……', 'She denied that she had seen the file.', '她否认见过这份文件。'],
      ['deny sb sth', '拒绝把某物给某人', 'The rules deny visitors access after dark.', '规定不允许访客天黑后进入。'],
    ],
  ),
  appreciate: ps(
    [
      ['appreciate doing sth', '感激 / 乐意做某事', 'I would appreciate hearing from you soon.', '如果能尽快收到你的回复，我会很感激。'],
      ['appreciate sth', '欣赏；感激', 'I appreciate your help.', '谢谢你的帮助。'],
    ],
    'appreciate 后接 doing 或名词，不说 appreciate to do。',
  ),
  delay: ps(
    [
      ['delay doing sth', '推迟做某事', 'We cannot delay making a decision.', '我们不能推迟做决定。'],
      ['delay sth', '延误某事', 'The storm delayed the flight.', '风暴延误了航班。'],
    ],
  ),
  imagine: ps(
    [
      ['imagine doing sth', '想象做某事', 'Imagine living without the Internet.', '想象一下没有互联网的生活。'],
      ['imagine that ...', '料想……', 'I imagine that the talk will be useful.', '我想这次讲座会有用。'],
    ],
  ),
  involve: ps(
    [
      ['involve doing sth', '涉及 / 意味着要做某事', 'The job involves travelling twice a month.', '这份工作每个月要出差两次。'],
      ['involve sb in sth', '使某人卷入', 'Do not involve me in the argument.', '别把我卷进这场争论。'],
    ],
  ),
  resist: ps(
    [
      ['resist doing sth', '忍住不做；抵制做某事', 'She could not resist checking her phone.', '她忍不住看手机。'],
      ['resist sth', '抵抗', 'It is hard to resist the temptation.', '这种诱惑很难抵挡。'],
    ],
  ),
  tolerate: ps(
    [
      ['tolerate doing sth', '容忍做某事', 'I will not tolerate being treated like that.', '我不会容忍被那样对待。'],
      ['tolerate sth', '忍受', 'Few people can tolerate such noise.', '很少有人受得了这种噪音。'],
    ],
  ),
  depend: ps(
    [
      ['depend on / upon sb / sth', '依靠；取决于', 'Success depends on steady practice.', '成功取决于持续练习。'],
      ['depend on sb to do sth', '指望某人做某事', 'You can depend on her to keep the secret.', '你可以指望她保密。'],
      ['It depends.', '视情况而定', 'Will you join us? It depends.', '你会来吗？看情况。'],
    ],
  ),
  rely: ps(
    [
      ['rely on sb / sth', '依赖', 'Do not rely on memory alone.', '不要只靠记忆。'],
      ['rely on sb to do sth', '信赖某人会做某事', 'I rely on you to lock the door.', '我指望你锁门。'],
    ],
  ),
  result: ps(
    [
      ['result in', '导致', 'The delay resulted in a lower score.', '耽搁导致了更低的分数。'],
      ['result from', '由……引起', 'His illness resulted from overwork.', '他的病是劳累过度引起的。'],
      ['as a result', '因此', 'He missed the bus. As a result, he was late.', '他没赶上公交，因此迟到了。'],
      ['as a result of', '由于', 'As a result of the rain, the match was cancelled.', '由于下雨，比赛取消了。'],
    ],
    'result in 是“造成结果”；result from 是“原因来自”。',
  ),
  consist: ps(
    [
      ['consist of', '由……组成', 'The team consists of six students.', '这个团队由六名学生组成。'],
      ['consist in', '在于', 'Happiness consists in being content.', '幸福在于知足。'],
    ],
    'consist of 没有被动语态，不说 is consisted of。',
  ),
  insist: ps(
    [
      ['insist on doing sth', '坚持做某事', 'She insisted on paying for the meal.', '她坚持要付这顿饭的钱。'],
      ['insist that sb (should) do', '坚持要某人做某事', 'He insisted that the report (should) be rewritten.', '他坚持报告要重写。'],
    ],
  ),
  persist: ps(
    [
      ['persist in doing sth', '坚持做某事（有时含固执）', 'He persisted in asking the same question.', '他一个劲地问同一个问题。'],
    ],
  ),
  object: ps(
    [
      ['object to sth / doing', '反对', 'Many residents object to building a factory here.', '许多居民反对在这里建工厂。'],
    ],
    'object to 的 to 是介词，后面接名词或 doing，不接动词原形。',
  ),
  prefer: ps(
    [
      ['prefer to do sth', '更愿意做某事', 'I prefer to walk when the weather is fine.', '天气好的时候我更愿意走路。'],
      ['prefer doing sth', '更喜欢做某事', 'She prefers reading in the morning.', '她更喜欢在早上阅读。'],
      ['prefer A to B', '比起 B 更喜欢 A', 'I prefer tea to coffee.', '比起咖啡，我更喜欢茶。'],
      ['prefer to do rather than do', '宁愿做……而不愿做……', 'I prefer to stay home rather than go out.', '我宁愿待在家里，也不愿出去。'],
    ],
  ),
  require: ps(
    [
      ['require sb to do sth', '要求某人做某事', 'The course requires students to write a report.', '这门课要求学生写一份报告。'],
      ['require doing / to be done', '需要被……', 'The bike requires repairing.', '这辆自行车需要修理。'],
      ['require that sb (should) do', '要求……', 'The school requires that every student (should) attend.', '学校要求每个学生都参加。'],
    ],
  ),
  demand: ps(
    [
      ['demand to do sth', '要求做某事', 'He demanded to see the manager.', '他要求见经理。'],
      ['demand that sb (should) do', '要求某人做某事', 'They demanded that the rule (should) be changed.', '他们要求修改这条规则。'],
      ['demand sth of / from sb', '向某人要求某物', 'The job demands patience of you.', '这份工作需要你有耐心。'],
    ],
    'demand 后面不说 demand sb to do。用 demand to do 或 demand that。',
  ),
  deserve: ps(
    [
      ['deserve to do sth', '应该 / 值得', 'She deserves to win the prize.', '她应该获奖。'],
      ['deserve doing / to be done', '值得被……', 'The old bridge deserves protecting.', '这座老桥值得保护。'],
    ],
  ),
  intend: ps(
    [
      ['intend to do sth', '打算做某事', 'I intend to finish the book this week.', '我打算这周读完这本书。'],
      ['intend sb to do sth', '打算让某人做某事', 'The exercise intends students to compare the two texts.', '这道练习是让学生比较两篇文章。'],
    ],
  ),
  attempt: ps(
    [
      ['attempt to do sth', '试图做某事', 'He attempted to explain the diagram.', '他试图解释这张图。'],
      ['an attempt to do sth', '一次尝试', 'It was her first attempt to give a speech.', '这是她第一次尝试演讲。'],
    ],
  ),
  cause: ps(
    [
      ['cause sb to do sth', '导致某人做某事', 'The noise caused me to wake up.', '噪音把我吵醒了。'],
      ['cause sth', '引起', 'Smoking can cause serious illness.', '吸烟会引发严重疾病。'],
    ],
  ),
  force: ps(
    [
      ['force sb to do sth', '强迫某人做某事', 'Nobody can force you to agree.', '没有人能强迫你同意。'],
    ],
  ),
  compel: ps(
    [
      ['compel sb to do sth', '迫使某人做某事', 'The storm compelled them to turn back.', '风暴迫使他们返回。'],
    ],
  ),
  urge: ps(
    [
      ['urge sb to do sth', '敦促某人做某事', 'Doctors urge people to sleep enough.', '医生敦促人们保证睡眠。'],
    ],
  ),
  invite: ps(
    [
      ['invite sb to do sth', '邀请某人做某事', 'They invited me to give a short talk.', '他们邀请我做一次短讲。'],
      ['invite sb to sth', '邀请某人参加', 'She invited us to the opening ceremony.', '她邀请我们参加开幕式。'],
    ],
  ),
  abandon: ps(
    [
      ['abandon sb / sth', '抛弃；放弃', 'They abandoned the original plan.', '他们放弃了原计划。'],
      ['abandon oneself to sth', '沉溺于', 'Do not abandon yourself to despair.', '不要沉溺于绝望。'],
    ],
  ),
  adapt: ps(
    [
      ['adapt to sth', '适应', 'Students must adapt to a new timetable.', '学生必须适应新的时间表。'],
      ['adapt sth for sb / to sth', '改编；使适应', 'The story was adapted for television.', '这个故事被改编成了电视剧。'],
    ],
  ),
  contribute: ps(
    [
      ['contribute to sth', '有助于；促成；投稿给', 'Exercise contributes to better sleep.', '锻炼有助于睡眠。'],
      ['contribute sth to sb / sth', '把……贡献给', 'She contributed an article to the magazine.', '她给杂志投了一篇文章。'],
    ],
  ),
  distinguish: ps(
    [
      ['distinguish A from B', '把 A 和 B 区分开', 'Children learn to distinguish right from wrong.', '孩子学会区分对错。'],
      ['distinguish between A and B', '区分 A 与 B', 'It is hard to distinguish between the twins.', '这对双胞胎很难区分。'],
    ],
  ),
  compensate: ps(
    [
      ['compensate for sth', '弥补', 'Nothing can compensate for the loss of time.', '失去的时间无法弥补。'],
      ['compensate sb for sth', '因某事补偿某人', 'The company compensated workers for the delay.', '公司因耽搁补偿了工人。'],
    ],
  ),
  elaborate: ps(
    [
      ['elaborate on sth', '详细说明', 'Could you elaborate on your last point?', '你能详细说说最后一点吗？'],
      ['an elaborate + 名词', '精细的；复杂的', 'They made an elaborate plan.', '他们制订了一个周密的计划。'],
    ],
  ),
  compromise: ps(
    [
      ['compromise on sth', '在某事上妥协', 'Neither side would compromise on safety.', '双方都不愿在安全上让步。'],
      ['reach a compromise', '达成妥协', 'The two teams reached a compromise.', '两队达成了妥协。'],
    ],
  ),
  allocate: ps(
    [
      ['allocate sth to sb / sth', '把……分配给', 'The school allocated more funds to the library.', '学校给图书馆拨了更多经费。'],
    ],
  ),
  emphasize: ps(
    [
      ['emphasize sth', '强调某事', 'The speaker emphasized the need for practice.', '演讲者强调了练习的必要。'],
      ['emphasize that ...', '强调……', 'She emphasized that notes must be handed in today.', '她强调笔记今天必须交。'],
    ],
  ),
  implement: ps(
    [
      ['implement sth', '实施；落实', 'The school will implement the new rule next month.', '学校下月将实施新规定。'],
    ],
  ),
  reluctant: ps(
    [
      ['be reluctant to do sth', '不情愿做某事', 'She was reluctant to admit the mistake.', '她不愿承认这个错误。'],
    ],
  ),
  vulnerable: ps(
    [
      ['be vulnerable to sth', '易受……影响 / 伤害', 'Older people are more vulnerable to extreme heat.', '老年人更容易受极端高温影响。'],
    ],
  ),
  aware: ps(
    [
      ['be aware of sth', '意识到；知道', 'Are you aware of the change?', '你知道这项变动吗？'],
      ['be aware that ...', '知道……', 'I am aware that the deadline is Friday.', '我知道截止日期是周五。'],
    ],
  ),
  capable: ps(
    [
      ['be capable of doing sth', '能够做某事', 'She is capable of finishing it alone.', '她能独立完成。'],
    ],
    'capable 后接 of doing，不说 capable to do。able 才接 to do。',
  ),
  familiar: ps(
    [
      ['be familiar with sth', '熟悉某事物（人作主语）', 'I am familiar with this software.', '我熟悉这个软件。'],
      ['be familiar to sb', '为某人所熟悉（事物作主语）', 'The song is familiar to almost everyone.', '这首歌几乎人人都熟。'],
    ],
  ),
  responsible: ps(
    [
      ['be responsible for sth / doing', '对……负责', 'Who is responsible for locking the lab?', '谁负责锁实验室？'],
    ],
  ),
  likely: ps(
    [
      ['be likely to do sth', '很可能做某事', 'It is likely to rain this afternoon.', '今天下午很可能下雨。'],
      ['It is likely that ...', '很可能……', 'It is likely that the price will rise.', '价格很可能会上涨。'],
    ],
  ),
  essential: ps(
    [
      ['be essential to / for sth', '对……必不可少', 'Sleep is essential to memory.', '睡眠对记忆必不可少。'],
      ['It is essential that sb (should) do', '必须……', 'It is essential that every student (should) attend.', '每个学生都必须参加。'],
    ],
  ),
  accustomed: ps(
    [
      ['be accustomed to sth / doing', '习惯于', 'She is accustomed to getting up early.', '她习惯早起。'],
    ],
    'to 是介词，后面接名词或 doing。',
    ['used'],
  ),
  used: ps(
    [
      ['used to do sth', '过去常常（现在不再这样）', 'I used to walk to school.', '我以前走路去学校。'],
      ['be used to sth / doing', '习惯于', 'He is used to living alone.', '他习惯了一个人住。'],
      ['be used to do sth', '被用来做某事', 'This tool is used to cut paper.', '这个工具是用来裁纸的。'],
    ],
    'used to do 表示过去习惯；be used to doing 表示现在习惯，这里的 to 是介词。',
    ['accustomed'],
  ),
  confident: ps(
    [
      ['be confident of / about sth', '对……有信心', 'She is confident of passing the exam.', '她有信心通过考试。'],
      ['be confident that ...', '确信……', 'I am confident that we can finish today.', '我有把握我们今天能做完。'],
    ],
  ),
  anxious: ps(
    [
      ['be anxious about sth', '为……担忧', 'Parents are anxious about online safety.', '家长担心网络安全。'],
      ['be anxious to do sth', '渴望做某事', 'He is anxious to hear the result.', '他急着想听结果。'],
    ],
  ),
  eager: ps(
    [
      ['be eager to do sth', '渴望做某事', 'Students are eager to try the new lab.', '学生们渴望试用新实验室。'],
      ['be eager for sth', '渴望得到', 'She is eager for a chance to speak.', '她渴望有机会发言。'],
    ],
  ),
  willing: ps(
    [
      ['be willing to do sth', '愿意做某事', 'Are you willing to share your notes?', '你愿意分享笔记吗？'],
    ],
  ),
  unable: ps(
    [
      ['be unable to do sth', '不能做某事', 'He was unable to attend the meeting.', '他没能参加会议。'],
    ],
  ),
  worthy: ps(
    [
      ['be worthy of sth', '值得；配得上', 'The film is worthy of attention.', '这部电影值得关注。'],
      ['be worthy to do sth', '值得做某事', 'She is worthy to receive the award.', '她配得上这个奖。'],
    ],
  ),
  fond: ps(
    [
      ['be fond of sth / doing', '喜欢', 'He is fond of collecting old maps.', '他喜欢收集旧地图。'],
    ],
  ),
  proud: ps(
    [
      ['be proud of sth / doing', '为……自豪', 'She is proud of finishing the race.', '她为自己跑完比赛而自豪。'],
    ],
  ),
  ashamed: ps(
    [
      ['be ashamed of sth / doing', '为……感到羞愧', 'He was ashamed of having lied.', '他为自己说过谎感到羞愧。'],
    ],
  ),
  certain: ps(
    [
      ['be certain to do sth', '一定会', 'The plan is certain to change.', '计划一定会变。'],
      ['be certain of / about sth', '对……有把握', 'I am not certain about the date.', '我不确定日期。'],
      ['It is certain that ...', '肯定……', 'It is certain that prices have risen.', '价格肯定上涨了。'],
    ],
  ),
  impossible: ps(
    [
      ['It is impossible (for sb) to do', '（某人）不可能做某事', 'It is impossible for me to finish it tonight.', '我今晚不可能做完。'],
      ['It is impossible that ...', '不可能……', 'It is impossible that he forgot the meeting.', '他不可能忘了这次会。'],
    ],
  ),
  probable: ps(
    [
      ['It is probable that ...', '很可能……', 'It is probable that the train will be late.', '火车很可能会晚点。'],
    ],
  ),
  vital: ps(
    [
      ['be vital to / for sth', '对……极为重要', 'Water is vital to life.', '水对生命极为重要。'],
      ['It is vital that sb (should) do', '必须……', 'It is vital that the data (should) be accurate.', '数据必须准确。'],
    ],
  ),
  crucial: ps(
    [
      ['be crucial to / for sth', '对……至关重要', 'Timing is crucial to the experiment.', '时机对这项实验至关重要。'],
    ],
  ),
  typical: ps(
    [
      ['be typical of sb / sth', '是……的典型特征', 'This mistake is typical of beginners.', '这种错误是初学者的典型问题。'],
    ],
  ),
  sensitive: ps(
    [
      ['be sensitive to sth', '对……敏感', 'Her skin is sensitive to sunlight.', '她的皮肤对阳光敏感。'],
    ],
  ),
  senior: ps(
    [
      ['be senior to sb', '比某人年长 / 级别高', 'She is three years senior to me.', '她比我大三岁。'],
    ],
    'senior / junior 用 to，不用 than。',
    ['junior'],
  ),
  junior: ps(
    [
      ['be junior to sb', '比某人年少 / 级别低', 'He is junior to the other editors.', '他比其他编辑级别低。'],
    ],
    'junior 用 to，不用 than。',
    ['senior'],
  ),
  substantial: ps(
    [
      ['a substantial amount / increase / number', '大量的；大幅度的', 'There has been a substantial increase in applications.', '申请数量大幅增加。'],
    ],
  ),
  consequence: ps(
    [
      ['as a consequence', '因此', 'He overslept. As a consequence, he missed the talk.', '他睡过了头，因此错过了讲座。'],
      ['as a consequence of', '由于', 'As a consequence of the strike, classes were cancelled.', '由于罢工，课程取消了。'],
      ['take / face the consequences', '承担后果', 'You have to face the consequences of the choice.', '你得承担这个选择的后果。'],
    ],
  ),
  perspective: ps(
    [
      ['from the perspective of', '从……的角度', 'From the perspective of students, the rule is too strict.', '从学生的角度看，这条规则太严了。'],
      ['a new perspective on', '对……的新看法', 'The book offers a new perspective on city life.', '这本书为城市生活提供了新视角。'],
    ],
  ),
  apply: ps(
    [
      ['apply for sth', '申请', 'She applied for a scholarship.', '她申请了奖学金。'],
      ['apply to sb / sth', '适用于', 'The rule applies to every student.', '这条规则适用于每个学生。'],
      ['apply sth to sth', '把……应用于', 'Apply the theory to a real case.', '把这个理论用到真实案例上。'],
    ],
  ),
  succeed: ps(
    [
      ['succeed in doing sth', '成功做成某事', 'He succeeded in solving the problem.', '他成功解决了这个问题。'],
    ],
    'succeed 后接 in doing，不说 succeed to do。',
  ),
  accuse: ps(
    [
      ['accuse sb of sth / doing', '指责 / 控告某人做了某事', 'They accused him of cheating.', '他们指责他作弊。'],
    ],
  ),
  approve: ps(
    [
      ['approve of sth / doing', '赞成', 'Her parents approve of her decision.', '她父母赞成她的决定。'],
      ['approve sth', '批准', 'The committee approved the budget.', '委员会批准了预算。'],
    ],
  ),
  belong: ps(
    [
      ['belong to sb / sth', '属于', 'This seat belongs to no one.', '这个座位不属于任何人。'],
    ],
    'belong to 没有被动语态。',
  ),
  compare: ps(
    [
      ['compare A with / to B', '把 A 与 B 比较', 'Compare your answer with the key.', '把你的答案和参考答案比较一下。'],
      ['compared with / to', '与……相比', 'Compared with last year, costs are lower.', '与去年相比，成本更低了。'],
    ],
  ),
  concentrate: ps(
    [
      ['concentrate on sth / doing', '集中精力于', 'Concentrate on one task at a time.', '一次专注一件事。'],
    ],
  ),
  cope: ps(
    [
      ['cope with sth', '应对；处理', 'She can cope with pressure.', '她能应对压力。'],
    ],
  ),
  deal: ps(
    [
      ['deal with sb / sth', '处理；对付', 'We must deal with the problem now.', '我们必须现在处理这个问题。'],
      ['a great deal of + 不可数名词', '大量', 'The project takes a great deal of time.', '这个项目要花大量时间。'],
    ],
  ),
  differ: ps(
    [
      ['differ from', '与……不同', 'His view differs from mine.', '他的看法和我的不同。'],
      ['differ in', '在某方面不同', 'The two plans differ in cost.', '两个计划的成本不同。'],
    ],
  ),
  focus: ps(
    [
      ['focus on sth / doing', '专注于', 'Focus on the question being asked.', '专注于正在问的问题。'],
    ],
  ),
  refer: ps(
    [
      ['refer to sth', '提到；查阅；指的是', 'The figures refer to last year.', '这些数字指的是去年。'],
      ['refer sb to sth', '让某人去查阅 / 参考', 'The teacher referred us to chapter three.', '老师让我们去看第三章。'],
    ],
  ),
  respond: ps(
    [
      ['respond to sth', '回应；对……作出反应', 'She did not respond to the email.', '她没有回复那封邮件。'],
    ],
  ),
  attribute: ps(
    [
      ['attribute sth to sb / sth', '把……归因于', 'She attributed her progress to daily practice.', '她把进步归因于每天练习。'],
    ],
  ),
  devote: ps(
    [
      ['devote sth to sth / doing', '把……用于', 'He devotes two hours a day to reading.', '他每天花两小时阅读。'],
      ['be devoted to', '致力于；深爱', 'She is devoted to her research.', '她全身心投入研究。'],
    ],
  ),
  lead: ps(
    [
      ['lead to sth', '导致', 'Careless notes can lead to mistakes.', '笔记马虎会导致错误。'],
      ['lead sb to do sth', '导致某人做某事', 'The evidence led us to change the plan.', '这些证据让我们改变了计划。'],
    ],
  ),
  wait: ps(
    [
      ['wait for sb / sth', '等待', 'We are waiting for the result.', '我们在等结果。'],
      ['wait for sb / sth to do', '等某人 / 某事去做', 'Wait for the page to load.', '等页面加载完。'],
    ],
  ),
}

const POS_RE =
  /^(?:\[.*?\]\s*)?((?:vt|vi|aux|adj|adv|prep|conj|pron|num|art|int|n|v|a|ad)\.(?:\s*\/\s*(?:vt|vi|aux|adj|adv|prep|conj|pron|num|art|int|n|v|a|ad)\.)*)\s+(.+)$/i

function headword(id: string, word: string, phonetic: string, pos: string, meaning: string): VocabWord {
  const first = CURATED[word]?.patterns.find((item) => item.example)
  return {
    id,
    word,
    phonetic,
    pos,
    meaning,
    example: first?.example || '',
    exampleCn: first?.exampleCn || '',
    level: 'both',
    freq: 'must',
    collocation: CURATED[word]?.patterns[0]?.pattern,
  }
}

/** 词表里没有、但用法题极常考的功能词。只进词典，不进背词抽题。 */
export const USAGE_HEADWORDS: VocabWord[] = [
  headword('ux-as', 'as', '/æz; əz/', 'conj. / prep.', '当……时；因为；正如；作为'),
  headword('ux-if', 'if', '/ɪf/', 'conj.', '如果；是否'),
  headword('ux-when', 'when', '/wen/', 'conj. / adv.', '当……时；何时'),
  headword('ux-while', 'while', '/waɪl/', 'conj.', '当……时；然而'),
  headword('ux-since', 'since', '/sɪns/', 'conj. / prep.', '自从；因为'),
  headword('ux-though', 'though', '/ðəʊ/', 'conj. / adv.', '虽然；不过'),
  headword('ux-because', 'because', '/bɪˈkɒz/', 'conj.', '因为'),
  headword('ux-whether', 'whether', '/ˈweðə(r)/', 'conj.', '是否；无论'),
  headword('ux-until', 'until', '/ənˈtɪl/', 'conj. / prep.', '直到'),
  headword('ux-than', 'than', '/ðən; ðæn/', 'conj.', '比'),
  headword('ux-so', 'so', '/səʊ/', 'conj. / adv.', '因此；如此'),
  headword('ux-once', 'once', '/wʌns/', 'conj. / adv.', '一旦；曾经'),
  headword('ux-before', 'before', '/bɪˈfɔː(r)/', 'conj. / prep.', '在……之前'),
  headword('ux-after', 'after', '/ˈɑːftə(r)/', 'conj. / prep.', '在……之后'),
  headword('ux-suggest', 'suggest', '/səˈdʒest/', 'v.', '建议；表明'),
  headword('ux-wait', 'wait', '/weɪt/', 'v.', '等待'),
]

function displayPos(pos: string): string {
  return pos.replace(/\s+/g, ' ').trim()
}

export function parseSenses(word: VocabWord): VocabSense[] {
  const raw = word.meaning.trim()
  if (!raw) return [{ pos: displayPos(word.pos), gloss: '（暂无释义）' }]
  const parts = raw.split(/[；;]/).map((item) => item.trim()).filter(Boolean)
  const senses: VocabSense[] = []
  for (const part of parts) {
    const matched = part.match(POS_RE)
    if (matched) {
      senses.push({ pos: matched[1].replace(/\s+/g, ''), gloss: matched[2].trim() })
    } else if (senses.length) {
      senses[senses.length - 1]!.gloss += `；${part}`
    }
  }
  if (senses.length) return senses
  return [{ pos: displayPos(word.pos), gloss: raw }]
}

function posKind(pos: string): string {
  const p = pos.toLowerCase().replace(/\s+/g, '')
  if (p.startsWith('vt')) return 'vt'
  if (p.startsWith('vi')) return 'vi'
  if (p === 'v.' || p === 'v') return 'v'
  if (p.startsWith('n')) return 'n'
  if (p.startsWith('adj') || p === 'a.' || p === 'a') return 'adj'
  if (p.startsWith('adv') || p === 'ad.' || p === 'ad') return 'adv'
  if (p.startsWith('prep')) return 'prep'
  if (p.startsWith('conj')) return 'conj'
  if (p.startsWith('pron')) return 'pron'
  if (p.startsWith('num')) return 'num'
  if (p.startsWith('art')) return 'art'
  return 'other'
}

function expandKinds(pos: string): string[] {
  const bits = pos.split(/[/／]/).map((item) => item.trim()).filter(Boolean)
  const kinds = (bits.length ? bits : [pos]).map(posKind)
  const uniq = [...new Set(kinds)]
  return uniq.length ? uniq : ['other']
}

function shortGloss(gloss: string): string {
  const clean = gloss.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim()
  const firstClause = clean.split(/[；;]/)[0]?.trim() || clean
  const brief = firstClause
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join('，')
  return brief || firstClause || gloss
}

function templates(word: string, kind: string, gloss: string): VocabPattern[] {
  switch (kind) {
    case 'vt':
      return [{ pattern: `${word} sb / sth`, gloss: `及物动词，后直接接人或事物：${gloss}` }]
    case 'vi':
      return [{ pattern: `${word} (+ 介词 + sth)`, gloss: `不及物动词，通常不直接带宾语：${gloss}` }]
    case 'v':
      return [{ pattern: `${word} sb / sth`, gloss: `动词，后接所作用的人或事物：${gloss}` }]
    case 'n':
      return [{ pattern: `a / the ${word}`, gloss: `名词，表示：${gloss}` }]
    case 'adj':
      return [
        { pattern: `be ${word}`, gloss: `作表语：${gloss}` },
        { pattern: `${word} + 名词`, gloss: '放在名词前，修饰该名词' },
      ]
    case 'adv':
      return [{ pattern: `${word} + 动词 / 形容词`, gloss: `副词，修饰动词或形容词：${gloss}` }]
    case 'prep':
      return [{ pattern: `${word} + 名词 / 代词 / doing`, gloss: `介词，后面接名词性成分：${gloss}` }]
    case 'conj':
      return [{ pattern: `… ${word} …`, gloss: `连词，用来连接句子或短语：${gloss}` }]
    case 'pron':
      return [{ pattern: word, gloss: `代词：${gloss}` }]
    case 'num':
      return [{ pattern: word, gloss: `数词：${gloss}` }]
    case 'art':
      return [{ pattern: `${word} + 名词`, gloss: `冠词，用在名词前：${gloss}` }]
    default:
      return [{ pattern: word, gloss }]
  }
}

function patternsFromSenses(word: string, senses: VocabSense[]): VocabPattern[] {
  const grouped = new Map<string, string[]>()
  for (const sense of senses) {
    const gloss = shortGloss(sense.gloss)
    for (const kind of expandKinds(sense.pos)) {
      const list = grouped.get(kind) ?? []
      if (gloss && !list.includes(gloss)) list.push(gloss)
      grouped.set(kind, list)
    }
  }
  const out: VocabPattern[] = []
  for (const [kind, glosses] of grouped) {
    out.push(...templates(word, kind, glosses.slice(0, 3).join('；')))
  }
  return out
}

function fromCollocation(word: VocabWord, senses: VocabSense[]): VocabPattern[] {
  if (!word.collocation) return []
  const gloss = senses.map((sense) => shortGloss(sense.gloss)).filter(Boolean).slice(0, 2).join('；') || word.meaning
  return word.collocation
    .split(/\s*\/\s*/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((pattern, index) => ({
      pattern,
      gloss,
      example: index === 0 ? word.example || undefined : undefined,
      exampleCn: index === 0 ? word.exampleCn || undefined : undefined,
    }))
}

function dedupe(list: VocabPattern[]): VocabPattern[] {
  const seen = new Set<string>()
  const out: VocabPattern[] = []
  for (const item of list) {
    const key = item.pattern.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

export function usageDetail(word: VocabWord): VocabUsageDetail {
  const senses = parseSenses(word)
  const curated = CURATED[word.word.toLowerCase()]
  if (curated) {
    return {
      senses,
      patterns: curated.patterns,
      tip: curated.tip,
      seeAlso: curated.seeAlso ?? [],
      source: 'curated',
    }
  }
  const collocations = fromCollocation(word, senses)
  const patterns = dedupe([...collocations, ...patternsFromSenses(word.word, senses)]).slice(0, 6)
  return {
    senses,
    patterns,
    seeAlso: [],
    source: collocations.length ? 'mixed' : 'pos',
  }
}

export function usageSourceLabel(source: UsageSource): string {
  if (source === 'curated') return '考试里常见的句型与搭配'
  if (source === 'mixed') return '词条中的搭配，并按词性补充了接法'
  return '按词性整理的常用接法'
}
