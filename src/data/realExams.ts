import type { CarefulItem, ClozeItem, MatchItem, TransItem, WritingTopic } from '@/types'

// 真题来源：wamich/english-exem-md (GPL v2)，2023.12 第1套
// 答案字段全部留空，等用户提供官方答案后填入
// 听力部分因无原文音频，暂未收录

export type RealPaper = {
  id: string
  level: 'cet4' | 'cet6'
  title: string
  year: string
  source: string
  writing: WritingTopic
  cloze: ClozeItem
  match: MatchItem
  careful1: CarefulItem
  careful2: CarefulItem
  translation: TransItem
  answerPending: true
}

const writing4: WritingTopic = {
  id: 'real-w-cet4-202312-1',
  level: 'cet4',
  title: '四级真题写作 · 印象最深的校园活动',
  prompt:
    'Suppose the university newspaper is inviting submissions from the students for its coming edition on a campus event that has impressed them most. You are now to write an essay for submission. You should write at least 120 words but no more than 180 words.',
  minutes: 30,
  scaffold: [
    { label: '开头', hint: '点明是哪场活动、何时何地。' },
    { label: '印象', hint: '为什么印象最深（一个细节）。' },
    { label: '影响', hint: '对自己或同学的影响。' },
    { label: '结尾', hint: '呼应投稿主题。' },
  ],
  sample: '（真题范文待补）',
  rubric: ['切题', '连贯', '语言', '词汇'],
}

const cloze4: ClozeItem = {
  id: 'real-cloze-cet4-202312-1',
  title: '四级真题选词填空 · 运动与长寿',
  level: 'cet4',
  passage:
    'Exercising for just 10 minutes a week is linked to a longer life, according to a new study published in The British Journal of Sports Medicine. Several recent studies have found that even low-intensity exercise, done for a short amount of time, can have a meaningful 26 on health. Still, the idea that exercising for just 10 minutes a week may be enough to increase your lifespan is novel. It is also somewhat 27, since the federal physical activity guidelines recommend getting at least 75 minutes of vigorous exercise or 150 minutes of 28 exercise each week. The study was based on data from more than 88,000 U.S. adults who 29 in the National Health Interview Survey between 1997 and 2008. Contrary to some research that has found an 30 limit to the amount of exercise that is healthy, the researchers found that there was 31 no limit to the longevity benefits of exercise. Even the small group of people who got 10 times the amount of exercise recommended by the federal government had a 46% lower 32 of death than the least active group. Still, observational studies like this one cannot prove cause and effect; they can only find 33. The researchers also were not able to 34 for certain lifestyle factors that could affect lifespan, including dietary habits and changes in physical activity over time. Despite these 35, the study results are yet another indication of the power of physical activity, even in small amounts.',
  blanks: 10,
  bank: [
    'adjust', 'alter', 'approximately', 'controversial', 'coordinates',
    'impact', 'limitations', 'moderate', 'participated', 'patterns',
    'populated', 'risk', 'seemingly', 'type', 'upper',
  ],
  answers: [],
  analysis: [],
}

const match4: MatchItem = {
  id: 'real-match-cet4-202312-1',
  title: '四级真题信息匹配 · 气候变化与食物',
  level: 'cet4',
  paragraphs: [
    { key: 'A', text: 'Earlier this year, scientists warned that one in six animal species could go extinct due to climate change. Could the same thing happen to our crops and other foodstuffs too?' },
    { key: 'B', text: 'It is clear that farmers in many parts of the world are going to find things harder in the coming decades. Last week, BBC Future explored one scientist efforts to help crops cope with the increased probability of droughts. By using the genes from resurrection plants, Jill Farrant of the University of Cape Town is exploring whether she can design crops to survive for much longer periods without water.' },
    { key: 'C', text: 'But if we cannot find ways to protect other foods, will they survive climate change? Fortunately, there is some good news on this front. Despite alarmist headlines about foods that are going extinct, there is no evidence that major food types like beans, chocolate, wine, corn or wheat will cease to exist.' },
    { key: 'D', text: 'But that does not mean it is all good news for future food. We will probably have to change where we grow certain crops, as some regions get too hot. The disadvantage, obviously, is that local farmers will suffer under this situation. And some people may struggle to get the same access to certain foods. Even if overall food production may be unaffected, food security can still be impacted, says Margaret Walsh.' },
    { key: 'E', text: 'Overall, the yields of many foods, from staples to life-enhancing extras such as coffee and chocolate, will likely be impacted by climate change too. How those decreases will be felt will depend on the degree of warming and the crop in question, but in general, anything over about 30 degrees is very bad for crops, says Wolfram Schlenker.' },
    { key: 'F', text: 'In the U.S. — the world largest producer of corn and soybeans — farms can move north to some degree, Schlenker says. But eventually, yields will likely suffer because the soil north of Iowa declines in quality. Other studies also found that there is a threshold above which yields sharply decline: crops can adapt and move, but only to a point.' },
    { key: 'G', text: 'Under current conditions, about 4% of the world croplands experience drought in any given year, but by the end of the century those conditions are forecasted to jump to about 18% per year. Researcher Andrew Jarvis and his colleagues found that 80% of coffee-growing zones in Central America and Brazil could become unsuitable by 2050.' },
    { key: 'H', text: 'This means that, for those who can afford it, some foods will simply cost them more in the future. But for poorer people, those same price jumps will likely cause certain foods to go extinct from their diets.' },
    { key: 'I', text: 'Another potential climate change-induced problem is our dependence on commodity crops — wheat, soybeans, corn and rice — which currently provide humanity with 75% of its calories. The world has seen an increasing standardisation of diets; homogeneity and overdependence on a handful of staples leaves us vulnerable to threats such as drought, disease and pests.' },
    { key: 'J', text: 'There are ways we could soften the coming blow to the global food supply, however. A number of companies, organisations and researchers are aiming to create drought- and temperature-resistant crops through genetic engineering and conventional breeding. For now, the jury is still out as to how successful those endeavours will be.' },
    { key: 'K', text: 'Until genetic engineering comes to fruition, other strategies might also help in some places, including applying more fertiliser, implementing better irrigation, using machinery that gets crops out of the field faster or installing storage facilities to delay spoilage.' },
    { key: 'L', text: 'Finally, diversifying our diet away from heat-sensitive wheat, corn, rice and other crops could also help. Depending on a greater number of plant species creates a more vigorous and less risky food system, and one that provides a broader range of nutritional requirements, Jarvis says.' },
  ],
  statements: [
    { id: 'r4m-36', text: 'One consequence of climate change is that some people may not have adequate access to certain foods.', answer: '', analysis: '' },
    { id: 'r4m-37', text: 'People around the world are eating foods more similar than what they used to eat.', answer: '', analysis: '' },
    { id: 'r4m-38', text: 'A recent news report talked about scientific efforts to help crops survive droughts through genetic engineering.', answer: '', analysis: '' },
    { id: 'r4m-39', text: 'It is predicted that climate change will affect the availability and price of quality chocolate.', answer: '', analysis: '' },
    { id: 'r4m-40', text: 'People wonder if certain crops and foodstuffs could disappear like some animal species due to climate change.', answer: '', analysis: '' },
    { id: 'r4m-41', text: 'Although farms in the U.S. can move a bit northward, crop yields may decrease.', answer: '', analysis: '' },
    { id: 'r4m-42', text: 'One possible solution to the food security problem is diversification of diet.', answer: '', analysis: '' },
    { id: 'r4m-43', text: 'It remains unsettled whether the global food supply problem can be solved by creating heat-tolerant crops through genetic engineering.', answer: '', analysis: '' },
    { id: 'r4m-44', text: 'Poor people may have to give up eating certain foods because of their high prices.', answer: '', analysis: '' },
    { id: 'r4m-45', text: 'A number of existing farming technologies could be used to reduce the negative effect of climate change on food production.', answer: '', analysis: '' },
  ],
}

const careful4a: CarefulItem = {
  id: 'real-careful-cet4-202312-1a',
  title: '四级真题仔细阅读一 · “忙碌”文化',
  level: 'cet4',
  passage:
    'One of my bad habits is saying busy when people ask me how I am doing. Sometimes it is because I actually am busy, but other times it is because that is what I think I am supposed to say. That is what important people say. That is what people who get promoted say. But working long hours does not drive better results. Never taking a vacation will not lead to a promotion. So why are we so proud to talk about how busy we are all the time?\nIn 2016, researchers from Columbia, Harvard, and Georgetown conducted a study to figure it out. They found busy people are perceived to be of high status, and interestingly, these status attributions are heavily influenced by our own beliefs about social mobility. In other words, the more we believe that one has the opportunity for success based on hard work, the more we tend to think that people who skip leisure and work all the time are of higher standing.\nThat is why we feel like we have to appear busy, and there is a real perception that if someone is knee-deep in meetings, emails and stress, then they are probably a big deal. This culture of busyness is making it hard for employees to find work-life balance. According to a recent study, one in five highly engaged employees are at risk of burnout.\nPersonally, I am going to stop saying busy when people ask me how I am. It sounds self-righteous and sets the wrong tone. Phrases like I have limited access to email and I will respond as soon as I get back sound like you are being held against your will from working as opposed to making the most of your time off.\nThat is why we recently launched the Out of Office Email Generator, a free tool you can use before your next long weekend or trip. You can share loud and proud that you will not be checking email until you are back. Managers need to think twice about emailing their teams on the weekend and talking about how busy they are. Leaders should take time off themselves and encourage employees to do the same.',
  questions: [
    { id: 'r4c1-46', stem: 'What is a reason for the author to be in the habit of saying busy when asked how he is doing?', options: ['A) He just follows successful people example.', 'B) He is actually proud to be fully occupied.', 'C) He thinks everyone should be devoted to work.', 'D) He believes busyness ensures accomplishments.'], answer: -1, analysis: '', cause: 'logic' },
    { id: 'r4c1-47', stem: 'Why do we tend to think that busy people are of high status?', options: ['A) Our status can be attributed to our social mobility.', 'B) We hold the belief that hard work leads to success.', 'C) Our own opportunity for success never comes easily.', 'D) We find few people of high status have time for leisure.'], answer: -1, analysis: '', cause: 'logic' },
    { id: 'r4c1-48', stem: 'What do we learn about the culture of busyness from a recent study?', options: ['A) It places employees in endless meetings, emails and stress.', 'B) It compels some 20% of employees to appear always busy.', 'C) It distorts many employees belief of what a satisfying life is.', 'D) It does much harm to many busy employees well-being.'], answer: -1, analysis: '', cause: 'logic' },
    { id: 'r4c1-49', stem: 'What do such utterances as I have limited access to email sound like according to the author?', options: ['A) One is too busy to check all emails in time.', 'B) One is opposed to the prevailing work culture.', 'C) One is forced by circumstances to stop working.', 'D) One is simply enjoying their time off work.'], answer: -1, analysis: '', cause: 'logic' },
    { id: 'r4c1-50', stem: 'Why did the author and his colleagues launch the Out of Office Email Generator?', options: ['A) To enable busy employees to spend less time checking emails.', 'B) To ensure employees as well as employers truly have time off.', 'C) To stop managers from talking about how busy their teams usually are.', 'D) To encourage both employers and employees to answer emails promptly.'], answer: -1, analysis: '', cause: 'logic' },
  ],
}

const careful4b: CarefulItem = {
  id: 'real-careful-cet4-202312-1b',
  title: '四级真题仔细阅读二 · 男女机票差价',
  level: 'cet4',
  passage:
    'Female employees consistently pay lower airfares than men do for the same flights because they tend to book earlier.\nWe compared the airfare paid by employees in the same position within a company for the same class of travel and used a common statistical technique to account for other factors that might affect differences in airfares. We found that women paid on average $18 less per ticket than their male colleagues. Further investigation allowed us to conclude that this gap is largely explained by the fact that women tended to book earlier than men, 1.8 days on average.\nWe wanted to determine what was causing these gender differences in booking business trips so we tested a variety of possible explanations, such as women choosing to plan ahead or male frequent travelers being inclined to book late. None of these explained away the gender gap, so we applied data collected from surveys that express consumer preferences that play a central role in economic decisions, such as patience and risk avoidance.\nWe found that only the concept of negative reciprocity — in which an employee who feels unfairly treated engages in negative behaviors, such as spending their company money less carefully — explains these differences. The surveys showed men tend to exhibit more of these negative behaviors than women.\nThis is not to say that all men engage in these behaviors — or that booking relatively late is a sign of abnormal behavior. It only means that the gender gap disappears when we plug in the negative reciprocity variable.\nPrior research on negative reciprocity among workers found that it can result in lower employee motivation, business performance and workplace morale and culture.\nOur results show another way these negative behaviors can manifest themselves, like in airline bookings, and add to evidence that women are less likely to engage in them.\nCompanies spend significant sums of money on business travel. While that $18 difference per ticket may seem small, it adds up. Our analysis suggests early booking by women can translate into savings of $1 million a year for a large multinational company with 20,000 regular travelers.',
  questions: [
    { id: 'r4c2-51', stem: 'What did the author team conclude about the gender difference in airfares from their further investigation?', options: ['A) It is largely attributed to women booking earlier than men.', 'B) It is largely explained by women choosing cheaper flights.', 'C) It is mainly accounted for by male employees readiness to pay more.', 'D) It is due to the fact that women care more about their company money.'], answer: -1, analysis: '', cause: 'logic' },
    { id: 'r4c2-52', stem: 'What did the researchers want to determine by testing a variety of possible explanations?', options: ['A) What made male frequent travelers book air tickets late.', 'B) What caused women to plan ahead in booking business trips.', 'C) What motivated women to book cheaper flights.', 'D) What accounted for the gender gap in airfares.'], answer: -1, analysis: '', cause: 'logic' },
    { id: 'r4c2-53', stem: 'What happened when the negative reciprocity variable was taken into account?', options: ['A) Both men and women were found to engage in negative behaviors.', 'B) Neither men nor women viewed booking late as a bad behavior.', 'C) The gender difference in airfare expenses no longer existed.', 'D) The gender gap tended to narrow to a significant degree.'], answer: -1, analysis: '', cause: 'logic' },
    { id: 'r4c2-54', stem: 'What did prior research on negative reciprocity among workers find?', options: ['A) It can do more harm to the workplace than to employees.', 'B) It contributes to the male-female divide in the workplace.', 'C) It proves to be counterproductive in a number of ways.', 'D) It can result in increasing labor-management conflicts.'], answer: -1, analysis: '', cause: 'logic' },
    { id: 'r4c2-55', stem: 'What does the author emphasize about their analysis in the last paragraph?', options: ['A) It can help companies increase their savings significantly.', 'B) It can duly contribute to companies business performance.', 'C) It can translate women booking practice into men behavior.', 'D) It can enhance large multinational companies competitiveness.'], answer: -1, analysis: '', cause: 'logic' },
  ],
}

const trans4: TransItem = {
  id: 'real-t-cet4-202312-1',
  level: 'cet4',
  source:
    '中国政府十分重视人民的健康饮食。通过大力提倡健康饮食，人们对合理营养增进健康的重要性有了更加深刻的认识。“吃得安全、吃得营养、吃得健康”是人民对美好生活的基本需要，是提升人民幸福感的必然要求，也为食品产业的发展提供了新机遇。目前，各级政府都在采取多种举措确保人民饮食健康，推进健康中国的建设。',
  sample: '（真题参考译文待补）',
  chunks: [],
  culture: [],
  tips: [],
}

const writing6: WritingTopic = {
  id: 'real-w-cet6-202312-1',
  level: 'cet6',
  title: '六级真题写作 · 扎实基础的重要性',
  prompt:
    'For this part, you are allowed 30 minutes to write an essay that begins with the sentence: As is known to all, gaining a sound knowledge of the basics is of vital importance for students to master an academic subject. You can make comments, cite examples, or use your personal experiences to develop your essay. You should write at least 150 words but no more than 200 words (not including the sentence given).',
  minutes: 30,
  scaffold: [
    { label: '引出名句', hint: '用自己的话转述，避免整句抄题。' },
    { label: '立论', hint: '基础是深入研究和创新的前提。' },
    { label: '例证', hint: '学习、科研或技能训练中的一例。' },
    { label: '收束', hint: '基础与创新并不矛盾。' },
  ],
  sample: '（真题范文待补）',
  rubric: ['切题', '连贯', '语言', '词汇'],
}

const cloze6: ClozeItem = {
  id: 'real-cloze-cet6-202312-1',
  title: '六级真题选词填空 · 莫哈韦沙漠',
  level: 'cet6',
  passage:
    'The desert is deceiving. At first glance it looks lifeless, barren, and bone-dry. For most passersby humming through the Mojave on their way to try their luck in Las Vegas or heading towards the Grand Canyon, it is just a 26 stretch of land with some mountains in the distance and more 27 to be a setting for a movie that takes place on Mars. The desert, however, is 28 with life, mystery, and magic. The Mojave desert sees less than two inches of rain a year, and like most deserts, is a land of 29. Temperature fluctuations vary from freezing to 30 hot, not only between seasons, but even within the same day. At the heart of this vast, 25,000-square-mile desert is Mojave National Preserve. The folks managing and working there wear the wide-brimmed hats that have become 31 with places like Yosemite. The preserve is rich with history, culture, biodiversity, and endless opportunities to 32 your interest, especially for anyone who loves the outdoors. For a photographer, it requires patience and 33 a few spare tires to maneuver the network of unpaved roads, but the rewards are plenty. Photographing here requires a good, 34 pair of shoes and a lot of preparation. Plenty of water, spare tires, and a full tank of gas are needed to explore this unit of the national park system, which is the third largest in the country. Like all deserts, though, if you are patient, you will be rewarded, as they often reveal their secrets slowly. During my last outing, I was surprised to see how much of the area was shaped by ancient volcanoes and geological forces, much of which remains today, giving the area a 35 feel and painting a colorful background for great photographs.',
  blanks: 10,
  bank: [
    'apt', 'burning', 'extremes', 'flat', 'fractions',
    'overflowing', 'parasites', 'probably', 'sparingly', 'sprinkle',
    'steer', 'stimulate', 'sturdy', 'synonymous', 'unique',
  ],
  answers: [],
  analysis: [],
}

const match6: MatchItem = {
  id: 'real-match-cet6-202312-1',
  title: '六级真题信息匹配 · 非洲农业',
  level: 'cet6',
  paragraphs: [
    { key: 'A', text: 'On the hills of central Kenya, almost lime-green with the sparkle of tea bushes in the sunlight, farmers know all about climate change. The rainy season is no longer predictable, says one. When it is supposed to rain it does not, then it all comes at once. Climate change is an issue that will affect everyone on the planet. For Africans its consequences will be particularly bitter: whereas other regions were able to grow rich by burning coal and oil, Africa will pay much of the human price without having enjoyed the benefits. Africa only represents 2% of global greenhouse-gas emissions but it is the continent that is expected to suffer the most from climate impacts, says Mafalda Duarte, who runs the World Bank 8bn Climate Investment Funds.' },
    { key: 'B', text: 'Although there are huge uncertainties as to the precise impacts of climate change, enough is known to say that global warming represents one of the main threats to Africa prosperity. Parts of the continent are already warming much more quickly than the average: temperatures in southern Africa have increased by about twice the global rate over the past 50 years. Even if the world were to cut emissions enough to keep global warming below 1.5 degrees, heatwaves would intensify in Africa and diseases would spread to areas not currently affected. Farming would also be hit hard. About 40% of the land now used to grow maize would no longer be suitable for it. Overall, it is estimated that maize yields would fall by 18-22%.' },
    { key: 'C', text: 'Africa is particularly vulnerable, in part because it is already struggling to feed itself and it will have to vastly increase yields and productivity if it is to put food on the plates of a fast-growing population, even without climate change. The UN Food and Agriculture Organisation reckons that by 2050 global food production would have to rise by about 70% over its level of 2009 to meet demand from a population that is growing in numbers and appetite. Much of this new demand will be in Africa. Yet the continent already imports about 50bn-worth of food a year and that figure is expected to more than double over the next five years.' },
    { key: 'D', text: 'Finding out why is not hard. Most farms are tiny, ploughed by hand and reliant on rain. More than half of Africa people make their living from farming. Although its total harvest has climbed over the past few decades, this is mainly because there are more people farming more land. But in many places there is no spare land to farm. Plots in Rwanda are so small that you could fit 250 of them onto the average American farm. And although output per worker has improved by more than half over the past 30 years in Africa, that is still far behind the 2.5 times improvement in Asia. Yields of maize are generally less than two tonnes per hectare, a fifth the level in America.' },
    { key: 'E', text: 'The low productivity of African farmers is reflected in national economic statistics — despite absorbing so much labour, farming generates just 15% of GDP. They can not even feed their families, says Jennifer Blanke, a vice-president of the African Development Bank in charge of agriculture. Farm productivity has not improved in many parts of Africa for 100 years.' },
    { key: 'F', text: 'One reason is that in the first few decades of independence, many African governments neglected farming as they focused on industrialising their economies. Others damaged it by pushing down the prices that state monopolies paid for their crops in order to subsidise workers in cities with cheap food. Ghana taxed cocoa exports so heavily that production collapsed by half between the 1960s and 1980s, despite a jump in the global price of cocoa. Yet over the past two decades or so governments and donors have begun to look again at farming as a way of providing jobs for the 13 million young people entering the workforce each year. Much of the focus has been on getting small farmers to use fertiliser and, more important, better seeds. The results can be impressive. Improved varieties of sorghum, for instance, can produce a crop that is 40% larger than the usual variety. Infrastructure is important. A World Bank irrigation project in Ethiopia helped farmers increase their potato harvest from about 8 tonnes per hectare to 35 tonnes.' },
    { key: 'G', text: 'Better techniques help, too. Small coffee farmers in Kenya are able to increase their incomes by 40% by following a few simple guidelines on caring for their bushes, such as trimming all but three of their stems. Many of their neighbours do not follow the advice, because it seems counter-intuitive. More stems ought to lead to more coffee beans, they say. Yet after seeing those following the advice get bigger harvests for a season or two, many others start doing the same.' },
    { key: 'H', text: 'One way of spreading knowledge is to link farms to big buyers of their harvests. When Diageo, a British drinks giant, built a brewery in western Kenya, it wanted to use local crops to make a beer cheap enough to compete with illicit home brew. It organised farmers into groups, improved supply chains for them to get seeds and fertiliser and then agreed to buy their grain. It now provides a market to about 17,000 farmers. Across the region it has doubled its use of local raw material to about 80% over five years, says John O Keeffe who runs its Africa business.' },
    { key: 'I', text: 'An even more important change is the move from traditional farming to building businesses that can profitably bring technology and investment to small farmers. Taita Ngetich, a young Kenyan, was studying engineering when he wanted to earn a little money on the side. He scraped together 20,000 Kenyan shillings (about $200) to plant tomatoes. Everything went wrong. The crop was attacked by pests. Then there was a massive flood that swallowed all our capital, he says. Mr Ngetich persevered by looking into buying a greenhouse to protect his plants from bugs and rain. The cheapest ones cost more than $2,500 each, so he designed his own for half the price. Soon neighbouring farmers started placing orders with him, and now his firm, Illuminum Greenhouses, has sold more than 1,400 greenhouses that provide livelihoods to about 6,000 people.' },
    { key: 'J', text: 'Illuminum success shows how technology can help even small farms become more productive. Because such a large share of Africa population earns a living from agriculture, even small improvements in productivity can lift the incomes of millions of people. But over the longer run small-scale farming can go only so far, especially in the face of climate change and population pressure.' },
    { key: 'K', text: 'If we really want to lift people out of poverty we have to finance projects that will get them an income of at least $100 a month so that they can pay for health care and education, says Mr Ngetich. Projects that give them an extra $2 a month from growing beans or maize are not going to get them there. Getting those big jumps will need better jobs in factories and cities.' },
  ],
  statements: [
    { id: 'r6m-36', text: 'It is said that agricultural productivity in many African countries has remained low for a century.', answer: '', analysis: '' },
    { id: 'r6m-37', text: 'Building connections between farms and major purchasers of their produce can promote African farmers use of advanced farming techniques.', answer: '', analysis: '' },
    { id: 'r6m-38', text: 'Parts of Africa are getting warmer much faster than the average, with southern Africa witnessing roughly twice the global warming rate over the last half century.', answer: '', analysis: '' },
    { id: 'r6m-39', text: 'Improved farming practices have enabled Kenyan farmers to increase farm production remarkably.', answer: '', analysis: '' },
    { id: 'r6m-40', text: 'Africa is especially susceptible to the effects of global warming partly because it has difficulty feeding its increasing population even without climate change.', answer: '', analysis: '' },
    { id: 'r6m-41', text: 'The use of fertiliser and improved seeds can help Africa small farmers impressively increase crop yields.', answer: '', analysis: '' },
    { id: 'r6m-42', text: 'It has proved even more important to shift from traditional farming to setting up businesses that can bring technology and investment to small farmers in Africa.', answer: '', analysis: '' },
    { id: 'r6m-43', text: 'Everyone in the world will have to bear the consequences of climate change, especially Africans.', answer: '', analysis: '' },
    { id: 'r6m-44', text: 'Improvement in farm output per worker in Africa falls far short of that in Asia.', answer: '', analysis: '' },
    { id: 'r6m-45', text: 'In the long term, the potential for small farms in Africa to increase productivity is quite limited, especially owing to the warming climate and a growing population.', answer: '', analysis: '' },
  ],
}

const careful6a: CarefulItem = {
  id: 'real-careful-cet6-202312-1a',
  title: '六级真题仔细阅读一 · 减税与涨薪',
  level: 'cet6',
  passage:
    'One of the great successes of the Republican Party in recent decades is the relentless propagation of a simple formula for economic growth: tax cuts. The formula does not work, but that has not affected its popularity. And while the cult of tax cuts has attracted many critics, it lacks for obvious rivals. Democratic politicians have tended to campaign on helping people left behind by economic growth. When Democrats do talk about encouraging economic growth, they often sound like Republicans. This is not just a political problem for Democrats; it is an economic problem for the United States. The nation needs a better story about the drivers of economic growth. The painful lessons of recent decades point to a promising candidate: higher wages. Raising the wages of American workers ought to be the priority of economic policymakers. We would all be better off paying less attention to quarterly updates on the growth of the nation gross domestic product (GDP) and focusing instead on the growth of workers paychecks. Set aside, for the moment, the familiar argument for higher wages: fairness. The argument here is that higher wages can fuel the engine of economic growth. Perhaps the most famous illustration of the benefits is the story of Henry Ford decision in 1914 to pay $5 a day to workers on his Model T assembly lines. He did it to increase production — he was paying a premium to maintain a reliable workforce. The unexpected benefit was that Ford factory workers became Ford customers, too. The same logic still holds: Consumption drives the American economy, and workers who are paid more can spend more. Mainstream economists insist that it is impossible to order up a sustainable increase in wages because compensation levels reflect the unerring judgment of market forces. The conventional wisdom held that productivity growth was the only route to higher wages. Through that lens, efforts to negotiate higher wages were counterproductive. Minimum-wage laws would raise unemployment because there was only so much money in the wage pool, and if some people got more, others would get none. It was in the context of this worldview that it became popular to argue that tax cuts would drive prosperity. Rich people would invest, productivity would increase, wages would rise. In the real world, things are more complicated. Wages are influenced by a tug of war between employers and workers, and employers have been winning. One clear piece of evidence is the widening gap between productivity growth and wage growth since roughly 1970. Productivity has more than doubled; wages have lagged far behind. A focus on wage growth would provide an antidote to the attractive simplicity of the belief in the magical power of tax cuts.',
  questions: [
    { id: 'r6c1-46', stem: 'Why does the formula of tax cuts remain popular though ineffective?', options: ['A) Its critics voice has not been heard throughout the country.', 'B) There seem to be no other options available to replace it.', 'C) The cult of tax cuts has been relentlessly propagated by all policymakers.', 'D) There appears to be a misunderstanding of the formula among the public.'], answer: -1, analysis: '', cause: 'logic' },
    { id: 'r6c1-47', stem: 'What does the author think is a more effective measure for driving economic growth in the U.S.?', options: ['A) Aiding people left behind by economic growth.', 'B) Prioritizing the growth of the nation GDP.', 'C) Increasing the compensation for labor.', 'D) Introducing even more extensive tax cuts.'], answer: -1, analysis: '', cause: 'logic' },
    { id: 'r6c1-48', stem: 'What is the logic underlying the author viewpoint?', options: ['A) The growth of workers paychecks ultimately boosts the nation economy.', 'B) Paying a premium to maintain a reliable workforce attracts more customers.', 'C) Consumption stimulates the desire for higher wages.', 'D) Familiar arguments for higher wages are outdated.'], answer: -1, analysis: '', cause: 'logic' },
    { id: 'r6c1-49', stem: 'What is the basis for higher wages according to the conventional wisdom?', options: ['A) Fairness in distribution.', 'B) Increase in productivity.', 'C) The priority of economic policymakers.', 'D) The unerring judgment of market forces.'], answer: -1, analysis: '', cause: 'locate' },
    { id: 'r6c1-50', stem: 'What do we learn about things in the real world in America for the past 50 years or so?', options: ['A) People have failed to see a corresponding increase in wages and in productivity.', 'B) People have been disheartened by the widening gap between the haves and have-nots.', 'C) People have witnessed a tug of war between Republicans and Democrats over tax cuts.', 'D) People have seen the link disappearing between productivity and workers well-being.'], answer: -1, analysis: '', cause: 'logic' },
  ],
}

const careful6b: CarefulItem = {
  id: 'real-careful-cet6-202312-1b',
  title: '六级真题仔细阅读二 · 期刊编辑的性别',
  level: 'cet6',
  passage:
    'Journal editors decide what gets published and what does not, affecting the careers of other academics and influencing the direction that a field takes. You would hope, then, that journals would do everything they can to establish a diverse editorial board, reflecting a variety of voices, experiences, and identities. Unfortunately, a new study in Nature Neuroscience makes for disheartening reading. The team finds that the majority of editors in top psychology and neuroscience journals are male and based in the United States: a situation that may be amplifying existing gender inequalities in the field and influencing the kind of research that gets published. Men were found to account for 60% of the editors of psychology journals. There were significantly more male than female editors at each level of seniority, and men made up the majority of editors in over three quarters of the journals. Crucially, the proportion of female editors was significantly lower than the overall proportion of women psychology researchers. The differences were even starker in the neuroscience journals: 70% of editors were male, and men held the majority of editorial positions in 88% of journals. In this case, the proportion of female editors was not significantly lower than the proportion of female researchers working in neuroscience — a finding that reveals enduring gender disparities in the field more broadly. Based on their results, the team concludes that the ideas, values, and decision-making biases of men are overrepresented in the editorial positions of the most recognized academic journals in psychology and neuroscience. Gender inequality in science is often attributed to the fact that senior academics are more likely to be male, because historically science was male-dominated: it is argued that as time goes on and more women rise to senior roles, the field will become more equal. Yet this study showed that even the junior roles in psychology journals tended to be held disproportionately by men, despite the fact that there are actually more female than male junior psychology faculty. This implies that a lack of female academics is not the problem. Instead, there are structural reasons that women are disadvantaged in science. Women receive lower salaries and face greater childcare demands, for instance, which can result in fewer publications and grants — the kinds of things that journals look for when deciding who to appoint. Rather than simply blaming the inequality of editorial boards on tradition, we should be actively breaking down these existing barriers. A lack of diversity among journal editors also likely contributes to psychology WEIRD problem. If journal editors are largely men from the United States, then they will probably place higher value on papers that are relevant to Western, male populations, whether consciously or not.',
  questions: [
    { id: 'r6c2-51', stem: 'What would we expect an editorial board of an academic journal to exhibit in view of its important responsibilities?', options: ['A) Insight.', 'B) Expertise.', 'C) Integrity.', 'D) Diversity.'], answer: -1, analysis: '', cause: 'locate' },
    { id: 'r6c2-52', stem: 'What do we learn from the findings of a new study in Nature Neuroscience?', options: ['A) The majority of top psychology and neuroscience journals reflect a variety of voices, experiences, and identities.', 'B) The editorial boards of most psychology and neuroscience journals do influence the direction their field takes.', 'C) The editorial boards of the most important journals in psychology and neuroscience are male-dominated.', 'D) The majority of editors in top psychology and neuroscience journals have relevant backgrounds.'], answer: -1, analysis: '', cause: 'logic' },
    { id: 'r6c2-53', stem: 'What fact does the author highlight concerning the gender differences in editors of psychology journals?', options: ['A) There were quite a few female editors who also distinguished themselves as influential psychology researchers.', 'B) The number of female editors was simply disproportionate to that of women engaged in psychology research.', 'C) The proportion of female editors was increasingly lower at senior levels.', 'D) There were few female editors who could move up to senior positions.'], answer: -1, analysis: '', cause: 'locate' },
    { id: 'r6c2-54', stem: 'What can we infer from the conclusion drawn by the team of the new study on the basis of their findings?', options: ['A) Women views are underrepresented in the editorial boards of top psychology and neuroscience journals.', 'B) Male editors of top psychology and neuroscience journals tend to be biased against their female colleagues.', 'C) Male researchers have enough representation in the editorial boards to ensure their publications.', 'D) Female editors have to struggle to get women research articles published in academic journals.'], answer: -1, analysis: '', cause: 'logic' },
    { id: 'r6c2-55', stem: 'What does the author suggest we do instead of simply blaming the inequality of editorial boards on tradition?', options: ['A) Strike a balance between male and female editors.', 'B) Increase women employment in senior positions.', 'C) Enlarge the body of female academics.', 'D) Implement overall structural reforms.'], answer: -1, analysis: '', cause: 'logic' },
  ],
}

const trans6: TransItem = {
  id: 'real-t-cet6-202312-1',
  level: 'cet6',
  source:
    '在中国，随着老龄化社会的到来，养老受到普遍关注。人们谈论最多的是应当采取什么样的养老模式。多数人认为，养老模式需要多元化。可以通过政府引导和社会参与，建立更多更好的养老服务机构，改进社区服务中心，鼓励居家自助养老，还可以推行家庭养老与社会养老相结合的模式。随着政府和社会对养老服务事业投入的持续增加，养老设施将不断升级，服务质量逐步改进，老年人的生活将会更加方便舒适、健康快乐。',
  sample: '（真题参考译文待补）',
  chunks: [],
  culture: [],
  tips: [],
}

export const REAL_PAPERS: RealPaper[] = [
  {
    id: 'real-cet4-202312-1',
    level: 'cet4',
    title: '四级真题 · 2023年12月第1套',
    year: '2023.12',
    source: 'wamich/english-exem-md (GPL v2)',
    writing: writing4,
    cloze: cloze4,
    match: match4,
    careful1: careful4a,
    careful2: careful4b,
    translation: trans4,
    answerPending: true,
  },
  {
    id: 'real-cet6-202312-1',
    level: 'cet6',
    title: '六级真题 · 2023年12月第1套',
    year: '2023.12',
    source: 'wamich/english-exem-md (GPL v2)',
    writing: writing6,
    cloze: cloze6,
    match: match6,
    careful1: careful6a,
    careful2: careful6b,
    translation: trans6,
    answerPending: true,
  },
]

export function realPapersFor(level: 'cet4' | 'cet6'): RealPaper[] {
  return REAL_PAPERS.filter((p) => p.level === level)
}
