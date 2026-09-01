<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{ seconds: number; running?: boolean }>()
const emit = defineEmits<{ done: [] }>()

const left = ref(props.seconds)
let timer: number | undefined

const label = computed(() => {
  const m = Math.floor(left.value / 60)
  const s = left.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

function tick() {
  if (props.running === false) return
  if (left.value <= 0) {
    emit('done')
    return
  }
  left.value -= 1
  if (left.value <= 0) emit('done')
}

onMounted(() => {
  timer = window.setInterval(tick, 1000)
})
onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
})
watch(
  () => props.seconds,
  (v) => {
    left.value = v
  },
)
</script>

<template>
  <div class="timer" :class="{ tight: left < 30 }">{{ label }}</div>
</template>

<style scoped>
.timer {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  color: var(--forest);
  font-size: 14px;
}
.tight {
  color: var(--coral);
}
</style>
