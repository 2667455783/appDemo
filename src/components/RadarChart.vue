<script setup lang="ts">
const props = defineProps<{ axes: { label: string; value: number }[] }>()

const size = 220
const cx = 110
const cy = 110
const r = 78

function point(i: number, value: number) {
  const n = Math.max(props.axes.length, 1)
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
  const rr = (Math.min(100, Math.max(0, value)) / 100) * r
  return [cx + rr * Math.cos(angle), cy + rr * Math.sin(angle)] as const
}

function web(scale: number) {
  const n = props.axes.length
  return Array.from({ length: n }, (_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return `${cx + r * scale * Math.cos(angle)},${cy + r * scale * Math.sin(angle)}`
  }).join(' ')
}

function dataPoly() {
  return props.axes.map((a, i) => point(i, a.value).join(',')).join(' ')
}

function labelPos(i: number) {
  const n = Math.max(props.axes.length, 1)
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
  return {
    x: cx + (r + 22) * Math.cos(angle),
    y: cy + (r + 22) * Math.sin(angle),
  }
}
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 220 220" class="radar">
    <polygon v-for="s in [1, 0.66, 0.33]" :key="s" :points="web(s)" fill="none" stroke="var(--line)" stroke-width="1" />
    <polygon :points="dataPoly()" fill="rgba(var(--forest-rgb), 0.22)" stroke="rgb(var(--forest-rgb))" stroke-width="1.6" />
    <text
      v-for="(a, i) in axes"
      :key="a.label"
      :x="labelPos(i).x"
      :y="labelPos(i).y"
      text-anchor="middle"
      dominant-baseline="middle"
      font-size="10"
      fill="var(--ink-soft)"
    >
      {{ a.label }}
    </text>
  </svg>
</template>

<style scoped>
.radar {
  display: block;
  margin: 0 auto;
}
</style>
