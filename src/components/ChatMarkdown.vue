<script setup lang="ts">
import { computed } from 'vue'
import { parseChatMarkdown } from '@/services/chatMarkdown'

const props = defineProps<{ text: string }>()
const parts = computed(() => parseChatMarkdown(props.text))
</script>

<template>
  <span class="md">
    <template v-for="(p, i) in parts" :key="i">
      <pre v-if="p.t === 'pre'" class="md-pre"><code>{{ p.v }}</code></pre>
      <code v-else-if="p.t === 'code'" class="md-code">{{ p.v }}</code>
      <strong v-else-if="p.t === 'bold'">{{ p.v }}</strong>
      <template v-else>{{ p.v }}</template>
    </template>
  </span>
</template>

<style scoped>
.md {
  display: block;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.md-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.92em;
  background: color-mix(in srgb, var(--ink) 8%, var(--paper-2));
  border-radius: 6px;
  padding: 0 4px;
}
.md-pre {
  margin: 8px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--ink) 8%, var(--paper-2));
  overflow-x: auto;
  white-space: pre-wrap;
}
.md-pre code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}
</style>
