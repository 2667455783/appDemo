import type { DomainManifest } from '@/domains/types'

export const programmingManifest: DomainManifest = {
  id: 'programming',
  name: '编程',
  shortName: '编程',
  enabled: true,
  hasContent: false,
  levels: [
    { id: 'beginner', label: '入门' },
    { id: 'intermediate', label: '进阶' },
  ],
  tabs: [
    { id: 'learn', label: '学习', route: '/d/programming/learn', icon: 'learn' },
    { id: 'practice', label: '练习', route: '/d/programming/practice', icon: 'practice' },
  ],
  homeShortcuts: [
    { label: '学习', desc: '知识点筹备中', route: '/d/programming/learn' },
    { label: '练习', desc: '刷题筹备中', route: '/d/programming/practice' },
  ],
  homePhaseText: () => '编程学习内容筹备中，敬请期待。',
  reminderHint: '到点提醒学习，进程关掉也能弹',
  buildTodayTasks: (ctx) => [
    {
      id: 'prog-coming',
      title: '内容筹备中',
      desc: '编程知识点与练习即将上线',
      minutes: 0,
      route: '/d/programming/learn',
      done: ctx.doneIds.has('prog-coming'),
    },
  ],
}
