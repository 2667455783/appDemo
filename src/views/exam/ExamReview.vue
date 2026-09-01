<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { useUserStore } from '@/stores/user'
import { todayISO } from '@/utils/storage'

const router = useRouter()
const user = useUserStore()

const parts = ['写作', '听力', '阅读仔细', '阅读匹配', '选词填空', '翻译']
const form = reactive({
  hardParts: [...(user.examMemory?.hardParts ?? [])] as string[],
  writingPrompt: user.examMemory?.writingPrompt ?? '',
  transTopic: user.examMemory?.transTopic ?? '',
  estimated: user.examMemory?.estimated ?? 425,
})

const scores = reactive({
  listening: user.officialScore?.listening ?? 160,
  reading: user.officialScore?.reading ?? 160,
  writingTrans: user.officialScore?.writingTrans ?? 120,
})

const officialTotal = computed(() => scores.listening + scores.reading + scores.writingTrans)
const passed = computed(() => (user.officialScore?.total ?? 0) >= 425)
const daysToNext = computed(() => {
  const d = user.daysLeft
  return d > 0 ? d : 180
})

function toggle(part: string) {
  if (form.hardParts.includes(part)) form.hardParts = form.hardParts.filter((p) => p !== part)
  else form.hardParts = [...form.hardParts, part]
}

function saveMemory() {
  user.saveMemory({
    submitted: true,
    submittedAt: new Date().toISOString(),
    hardParts: form.hardParts,
    writingPrompt: form.writingPrompt,
    transTopic: form.transTopic,
    estimated: Number(form.estimated) || 0,
  })
}

function saveScore() {
  user.saveOfficial({
    listening: Number(scores.listening) || 0,
    reading: Number(scores.reading) || 0,
    writingTrans: Number(scores.writingTrans) || 0,
    total: officialTotal.value,
    date: todayISO(),
  })
}
</script>

<template>
  <div class="page full">
    <PageHeader title="正式考试复盘" subtle="出考场 2 小时内先记，查分后再校准" @back="router.back()" />

    <p class="section-h">1. 出考场记忆卡</p>
    <p class="page-sub">勾选当场觉得难的部分，趁记忆还在。</p>
    <div class="chips" style="margin: 8px 0">
      <button v-for="p in parts" :key="p" class="chip" :class="{ on: form.hardParts.includes(p) }" type="button" @click="toggle(p)">
        {{ p }}
      </button>
    </div>
    <div class="field">
      <label>默写作文题目</label>
      <input v-model="form.writingPrompt" placeholder="还记得指令里的关键词吗" />
    </div>
    <div class="field" style="margin-top: 8px">
      <label>翻译主题</label>
      <input v-model="form.transTopic" placeholder="例如 乡村振兴 / 校园创新" />
    </div>
    <div class="field" style="margin-top: 8px">
      <label>对答案估分（回忆版请自行标注可信度）</label>
      <input v-model.number="form.estimated" type="number" min="0" max="710" />
    </div>
    <button class="btn primary block" style="margin-top: 10px" type="button" @click="saveMemory">保存记忆卡</button>
    <p v-if="user.examMemory?.submitted" class="page-sub">已保存 {{ user.examMemory.submittedAt.slice(0, 16).replace('T', ' ') }}</p>

    <p class="section-h">2. 查分后校准</p>
    <div class="field">
      <label>听力</label>
      <input v-model.number="scores.listening" type="number" />
    </div>
    <div class="field" style="margin-top: 8px">
      <label>阅读</label>
      <input v-model.number="scores.reading" type="number" />
    </div>
    <div class="field" style="margin-top: 8px">
      <label>写译合计</label>
      <input v-model.number="scores.writingTrans" type="number" />
    </div>
    <p class="page-sub" style="margin: 8px 0">官方总分 {{ officialTotal }}</p>
    <button class="btn gold block" type="button" @click="saveScore">写入官方分并刷新弱项</button>

    <template v-if="user.officialScore">
      <p class="section-h">3. 下一轮决策</p>
      <div v-if="passed" class="card">
        <p>已过线。转为「保持包」：高频词 + 每周 1 听 1 读，不必再狂刷套卷。</p>
        <button class="btn ghost block" style="margin-top: 10px" type="button" @click="router.push('/train/vocab')">打开保持包</button>
      </div>
      <div v-else class="card">
        <p>未过线。距下次考试按 {{ daysToNext }} 天排期，直接吃本场弱项：{{ form.hardParts.join('、') || '以官方听力/阅读更低的一项为主' }}。</p>
        <button class="btn ghost block" style="margin-top: 10px" type="button" @click="router.push('/diagnosis/plan')">去补漏计划</button>
      </div>
    </template>
  </div>
</template>
