import type { DomainManifest, TodayTaskContext } from '@/domains/types'
import type { TodayTask } from '@/types'

function buildTodayTasks(ctx: TodayTaskContext): TodayTask[] {
  const { phase, dueCount, wrongCount, doneIds } = ctx

  if (phase === 'final') {
    return [
      {
        id: 'final-vocab',
        title: '高频词速过',
        desc: dueCount ? `${dueCount} 词待复习` : '巩固已学词',
        minutes: 12,
        route: '/train/vocab',
        done: doneIds.has('final-vocab'),
      },
      {
        id: 'final-wrong',
        title: '错词本清扫',
        desc: wrongCount ? `${wrongCount} 个易错词` : '错词本已清空',
        minutes: 10,
        route: '/vocab/wrong',
        done: doneIds.has('final-wrong'),
      },
      {
        id: 'final-write',
        title: '套一套写作模板',
        desc: '考前只练结构，不写新长文',
        minutes: 12,
        route: '/writing/fill',
        done: doneIds.has('final-write'),
      },
    ]
  }

  return [
    {
      id: 'vocab',
      title: '今日背词',
      desc: dueCount ? `${dueCount} 词待复习` : '开启新一组',
      minutes: 10,
      route: '/train/vocab',
      done: doneIds.has('vocab'),
    },
    {
      id: 'writing',
      title: phase === 'sprint' ? '冲刺：套模板成文' : '套模板练习',
      desc: '填空生成骨架成稿',
      minutes: 12,
      route: '/writing/fill',
      done: doneIds.has('writing'),
    },
    {
      id: 'phrases',
      title: wrongCount ? '复习错词' : '背几条金句',
      desc: wrongCount ? `${wrongCount} 个错词优先` : '开头 / 结尾万能句',
      minutes: 8,
      route: wrongCount ? '/vocab/wrong' : '/train/templates',
      done: doneIds.has('phrases'),
    },
  ]
}

export const englishManifest: DomainManifest = {
  id: 'english',
  name: '英语',
  shortName: '四六级',
  enabled: true,
  hasContent: true,
  levels: [
    { id: 'cet4', label: '英语四级' },
    { id: 'cet6', label: '英语六级' },
  ],
  tabs: [
    { id: 'vocab', label: '单词', route: '/vocab', icon: 'vocab' },
    { id: 'writing', label: '写作', route: '/writing', icon: 'write' },
  ],
  homeShortcuts: [
    { label: '单词', desc: '背词 · 词典 · 错词本', route: '/vocab' },
    { label: '写作', desc: '模板 · 金句 · 套用', route: '/writing' },
  ],
  homePhaseText: (phase) => {
    if (phase === 'final') return '最后 3 天：只过词表与模板，不堆新内容。'
    if (phase === 'sprint') return '冲刺周：每天背词 + 套一套写作模板。'
    return '单词打卡 + 作文脚手架，稳扎稳打。'
  },
  reminderHint: '到点提醒背词，进程关掉也能弹',
  buildTodayTasks,
}
