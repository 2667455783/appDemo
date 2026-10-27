import type { DomainManifest } from '@/domains/types'

export const programmingManifest: DomainManifest = {
  id: 'programming',
  name: '编程',
  shortName: '编程',
  enabled: true,
  hasContent: true,
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
    { label: '练习', desc: '示例练习 / 项目工作台', route: '/d/programming/practice' },
  ],
  homePhaseText: () => '练习 Tab：可进示例练习练语法，或进项目工作台拉 Git 本地运行。',
  reminderHint: '到点提醒学习，进程关掉也能弹',
  buildTodayTasks: (ctx) => [
    {
      id: 'prog-practice',
      title: '打开一个前端项目',
      desc: '进入项目工作台，本地运行 Vue/React 或导入 Git',
      minutes: 20,
      route: '/d/programming/workbench',
      done: ctx.doneIds.has('prog-practice'),
    },
  ],
}
