<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { WRITING_TEMPLATES, fillTemplateParagraphs } from '@/data/templates'
import { useStudyStore } from '@/stores/study'
import { useUserStore } from '@/stores/user'
import type { ExpressTemplate } from '@/types'

const router = useRouter()
const user = useUserStore()
const study = useStudyStore()

const templates = WRITING_TEMPLATES
const tplId = ref(templates[0]?.id ?? '')
const tpl = computed(() => templates.find((t) => t.id === tplId.value) ?? templates[0]!)
const values = reactive<Record<string, string>>({})
const mode = ref<'fill' | 'result'>('fill')

watch(
  tpl,
  (t: ExpressTemplate) => {
    mode.value = 'fill'
    for (const key of Object.keys(values)) delete values[key]
    for (const s of t.slots ?? []) values[s.key] = ''
  },
  { immediate: true },
)

const filled = computed(() => fillTemplateParagraphs(tpl.value.paragraphs, values))

function submit() {
  mode.value = 'result'
  user.markStudy()
  study.completeTask('writing')
  study.completeTask('final-write')
}
</script>

<template>
  <div class="page full">
    <PageHeader title="套模板练习" subtle="填空生成成稿 · 内容为原创范文骨架" @back="router.back()" />

    <div class="chips">
      <button
        v-for="t in templates"
        :key="t.id"
        class="chip"
        :class="{ on: t.id === tpl.id }"
        type="button"
        @click="tplId = t.id"
      >
        {{ t.tag }}
      </button>
    </div>

    <p class="t-title" style="margin-top: 12px">{{ tpl.title }}</p>
    <p class="page-sub">{{ tpl.summary }}</p>

    <template v-if="mode === 'fill'">
      <div v-if="tpl.roles?.length" class="roles">
        <span v-for="r in tpl.roles" :key="r" class="tag">{{ r }}</span>
      </div>
      <div v-for="s in tpl.slots ?? []" :key="s.key" class="field" style="margin-top: 10px">
        <label>{{ s.label }}{{ s.hint ? ` · ${s.hint}` : '' }}</label>
        <input v-model="values[s.key]" :placeholder="s.label" />
      </div>
      <button class="btn primary block" style="margin-top: 16px" type="button" @click="submit">生成成稿</button>
    </template>

    <template v-else>
      <p class="section-h">你的成稿</p>
      <div class="card">
        <p v-for="(p, i) in filled" :key="i" class="para">{{ p }}</p>
      </div>
      <template v-if="tpl.sampleEssay">
        <p class="section-h">参考范文（原创）</p>
        <div class="card">
          <p class="para">{{ tpl.sampleEssay }}</p>
        </div>
      </template>
      <div class="grid2" style="margin-top: 12px">
        <button class="btn ghost" type="button" @click="mode = 'fill'">继续改</button>
        <button class="btn primary" type="button" @click="router.replace('/writing')">回写作</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.t-title {
  font-weight: 700;
  font-size: 15px;
}
.roles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.para {
  line-height: 1.65;
  margin-bottom: 10px;
  white-space: pre-wrap;
}
</style>
