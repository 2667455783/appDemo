import type { DomainManifest } from '@/domains/types'

export const medicalManifest: DomainManifest = {
  id: 'medical',
  name: '医药',
  shortName: '医药',
  enabled: true,
  hasContent: false,
  levels: [
    { id: 'basic', label: '基础' },
    { id: 'exam', label: '执考向' },
  ],
  tabs: [
    { id: 'learn', label: '学习', route: '/d/medical/learn', icon: 'learn' },
    { id: 'practice', label: '练习', route: '/d/medical/practice', icon: 'practice' },
  ],
  homeShortcuts: [
    { label: '学习', desc: '术语与课程筹备中', route: '/d/medical/learn' },
    { label: '练习', desc: '题库筹备中', route: '/d/medical/practice' },
  ],
  homePhaseText: () => '医药学习内容筹备中，敬请期待。',
  reminderHint: '到点提醒学习，进程关掉也能弹',
  buildTodayTasks: (ctx) => [
    {
      id: 'med-coming',
      title: '内容筹备中',
      desc: '医药术语与题库即将上线',
      minutes: 0,
      route: '/d/medical/learn',
      done: ctx.doneIds.has('med-coming'),
    },
  ],
}
