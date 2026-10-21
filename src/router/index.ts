import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/welcome', component: () => import('@/views/Onboarding.vue'), meta: { tab: false, public: true } },
    { path: '/', component: () => import('@/views/Home.vue'), meta: { tab: true } },
    { path: '/vocab', component: () => import('@/views/vocab/VocabHub.vue'), meta: { tab: true } },
    { path: '/vocab/wrong', component: () => import('@/views/vocab/VocabWrongBook.vue'), meta: { tab: false } },
    { path: '/writing', component: () => import('@/views/writing/WritingHub.vue'), meta: { tab: true } },
    { path: '/writing/fill', component: () => import('@/views/writing/TemplateFill.vue'), meta: { tab: false } },
    { path: '/train', redirect: '/vocab' },
    { path: '/train/vocab', component: () => import('@/views/vocab/VocabPractice.vue'), meta: { tab: false } },
    {
      path: '/train/dictionary',
      component: () => import('@/views/vocab/VocabDictionary.vue'),
      meta: { tab: false },
    },
    {
      path: '/train/dictionary/:id',
      component: () => import('@/views/vocab/VocabDetail.vue'),
      meta: { tab: false },
    },
    { path: '/train/listening', component: () => import('@/views/listening/ListeningPractice.vue'), meta: { tab: false } },
    { path: '/train/reading', component: () => import('@/views/reading/ReadingHub.vue'), meta: { tab: false } },
    {
      path: '/train/reading/:kind',
      component: () => import('@/views/reading/ReadingPractice.vue'),
      meta: { tab: false },
    },
    { path: '/train/writing', component: () => import('@/views/writing/WritingPractice.vue'), meta: { tab: false } },
    {
      path: '/train/translation',
      component: () => import('@/views/translation/TranslationPractice.vue'),
      meta: { tab: false },
    },
    { path: '/train/grammar', component: () => import('@/views/grammar/GrammarPractice.vue'), meta: { tab: false } },
    {
      path: '/train/templates',
      component: () => import('@/views/diagnosis/TemplateHub.vue'),
      meta: { tab: false },
    },
    { path: '/mock', component: () => import('@/views/MockList.vue'), meta: { tab: false } },
    { path: '/translate', component: () => import('@/views/Translate.vue'), meta: { tab: false } },
    { path: '/mock/:id/report', component: () => import('@/views/mock/MockReport.vue'), meta: { tab: false } },
    { path: '/mock/:id', component: () => import('@/views/mock/MockExam.vue'), meta: { tab: false } },
    { path: '/diagnosis', redirect: '/' },
    { path: '/diagnosis/errors', component: () => import('@/views/diagnosis/ErrorBook.vue'), meta: { tab: false } },
    { path: '/diagnosis/plan', component: () => import('@/views/diagnosis/GapPlan.vue'), meta: { tab: false } },
    { path: '/exam-review', component: () => import('@/views/exam/ExamReview.vue'), meta: { tab: false } },
    { path: '/profile/edit', component: () => import('@/views/profile/EditProfile.vue'), meta: { tab: false } },
    { path: '/profile/voices', component: () => import('@/views/profile/VoiceManage.vue'), meta: { tab: false } },
    { path: '/profile/settings', component: () => import('@/views/profile/Settings.vue'), meta: { tab: false } },
    { path: '/profile/reminder', component: () => import('@/views/profile/Reminder.vue'), meta: { tab: false } },
    { path: '/profile/theme', component: () => import('@/views/profile/ThemeManage.vue'), meta: { tab: false } },
    { path: '/profile/appearance', redirect: '/profile/theme' },
    { path: '/profile/version', component: () => import('@/views/profile/VersionControl.vue'), meta: { tab: false } },
    { path: '/profile/docs', component: () => import('@/views/profile/ImportDocs.vue'), meta: { tab: false } },
    { path: '/profile/share', component: () => import('@/views/profile/ShareFriends.vue'), meta: { tab: false } },
    { path: '/profile/about', component: () => import('@/views/profile/About.vue'), meta: { tab: false } },
    { path: '/sprint', component: () => import('@/views/sprint/Sprint.vue'), meta: { tab: false } },
    { path: '/profile', component: () => import('@/views/Profile.vue'), meta: { tab: true } },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  const user = useUserStore()
  if (!user.onboarded && to.meta.public !== true) return '/welcome'
  if (user.onboarded && to.path === '/welcome') return '/'
  return true
})

export default router
