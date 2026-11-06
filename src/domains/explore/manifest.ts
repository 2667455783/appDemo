import type { DomainManifest } from '@/domains/types'

export const exploreManifest: DomainManifest = {
  id: 'explore',
  name: '拓展',
  shortName: '拓展',
  enabled: true,
  hasContent: true,
  levels: [{ id: 'open', label: '开放对话' }],
  tabs: [{ id: 'chat', label: '拓展', route: '/d/explore/chat', icon: 'chat' }],
  homeShortcuts: [{ label: '开始对话', desc: '输入问题，和拓展助手多轮交流', route: '/d/explore/chat' }],
  homePhaseText: () => '在拓展里直接提问，助手会记住本次对话上下文。',
  reminderHint: '到点提醒学习，进程关掉也能弹',
  buildTodayTasks: (ctx) => [
    {
      id: 'explore-chat',
      title: '和拓展助手对话',
      desc: '输入内容即可提问，支持追问',
      minutes: 10,
      route: '/d/explore/chat',
      done: ctx.doneIds.has('explore-chat'),
    },
  ],
}
