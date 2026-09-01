<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { GRAMMAR_CARDS } from '@/data/grammar'
import { useStudyStore } from '@/stores/study'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const study = useStudyStore()
const user = useUserStore()
const idx = ref(0)
const pick = ref<number | null>(null)
const revealed = ref(false)
const card = ref(GRAMMAR_CARDS[0]!)

function choose(i: number) {
  if (revealed.value) return
  pick.value = i
  revealed.value = true
  const q = card.value.question
  if (i !== q.answer) {
    study.recordPracticeError({
      skill: 'writing',
      subtype: 'grammar',
      question: q.stem,
      userAnswer: q.options[i] ?? '',
      correctAnswer: q.options[q.answer] ?? '',
      analysis: q.analysis,
      cause: q.cause,
    })
  } else {
    study.boostRadar('writeGrammar', 4)
  }
  user.markStudy()
}

function next() {
  idx.value = (idx.value + 1) % GRAMMAR_CARDS.length
  card.value = GRAMMAR_CARDS[idx.value]!
  pick.value = null
  revealed.value = false
}
</script>

<template>
  <div class="page full">
    <PageHeader :title="card.title" subtle="只覆盖写译会扣分的点，不是系统语法课" @back="router.back()" />
    <div class="card">
      <p>{{ card.point }}</p>
      <p class="page-sub" style="margin-top: 8px">{{ card.example }}</p>
    </div>
    <p style="font-weight: 700; margin: 14px 0 8px">{{ card.question.stem }}</p>
    <button
      v-for="(o, i) in card.question.options"
      :key="o"
      class="option"
      :class="{
        on: pick === i && !revealed,
        right: revealed && i === card.question.answer,
        wrong: revealed && pick === i && i !== card.question.answer,
      }"
      type="button"
      @click="choose(i)"
    >
      {{ o }}
    </button>
    <p v-if="revealed" class="page-sub" style="margin-top: 8px">{{ card.question.analysis }}</p>
    <button v-if="revealed" class="btn primary block" style="margin-top: 14px" type="button" @click="next">下一张</button>
  </div>
</template>
