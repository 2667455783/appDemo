<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { APPEARANCE_OPTIONS, THEME_PRESETS, type AppearancePref } from '@/data/themes'
import { useThemeStore } from '@/stores/theme'

const router = useRouter()
const theme = useThemeStore()
const customHex = ref(theme.hex)

watch(
  () => theme.hex,
  (h) => {
    customHex.value = h
  },
)

const selectedId = computed(() => theme.current.id)

function onCustomInput(e: Event) {
  const v = (e.target as HTMLInputElement).value
  customHex.value = v
  theme.selectCustom(v)
}

function onCustomHex() {
  theme.selectCustom(customHex.value)
}

function pickAppearance(id: AppearancePref) {
  theme.setAppearance(id)
}

function appearanceHint(id: AppearancePref, hint: string) {
  if (id !== 'system') return hint
  return `${hint}（当前${theme.resolvedAppearanceLabel}）`
}
</script>

<template>
  <div class="page full">
    <PageHeader title="外观" subtle="背景模式和主题色都在这里调" @back="router.back()" />

    <p class="section-h">背景</p>
    <button
      v-for="o in APPEARANCE_OPTIONS"
      :key="o.id"
      class="option mode"
      :class="{ on: theme.appearance === o.id }"
      type="button"
      @click="pickAppearance(o.id)"
    >
      <span class="preview-chip" :class="o.id" aria-hidden="true">
        <span class="dot" />
        <span class="bar" />
      </span>
      <span>
        <span class="mode-name">{{ o.name }}</span>
        <span class="page-sub">{{ appearanceHint(o.id, o.hint) }}</span>
      </span>
    </button>

    <p class="section-h">主题色</p>
    <div class="card now">
      <p class="muted">当前主题</p>
      <div class="now-row">
        <span class="swatch lg" :style="{ background: theme.hex }" />
        <div>
          <p class="now-name">{{ theme.current.name }}</p>
          <p class="page-sub">{{ theme.hex.toUpperCase() }} · {{ theme.appearanceLabel }}</p>
        </div>
      </div>
      <div class="preview">
        <button class="btn primary sm" type="button">主按钮</button>
        <button class="chip on" type="button">选中</button>
        <button class="chip" type="button">默认</button>
      </div>
    </div>

    <p class="section-h">预设</p>
    <div class="preset-grid">
      <button
        v-for="p in THEME_PRESETS"
        :key="p.id"
        class="option preset"
        :class="{ on: selectedId === p.id }"
        type="button"
        @click="theme.selectPreset(p.id)"
      >
        <span class="swatch" :style="{ background: p.hex }" />
        <span class="preset-name">{{ p.name }}</span>
      </button>
    </div>

    <p class="section-h">自定义</p>
    <div class="card custom">
      <label class="picker">
        <span class="swatch lg" :style="{ background: customHex }" />
        <input :value="theme.hex" type="color" @input="onCustomInput" />
        <span>点色块选色</span>
      </label>
      <div class="field" style="margin-top: 12px">
        <label>色值</label>
        <input v-model="customHex" maxlength="7" placeholder="#1F4D3A" @change="onCustomHex" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.now-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 0 12px;
}
.now-name {
  font-family: var(--serif);
  font-size: 22px;
}
.swatch {
  display: inline-block;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid var(--line);
  flex-shrink: 0;
}
.swatch.lg {
  width: 36px;
  height: 36px;
}
.preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.preset-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.preset-grid .option + .option {
  margin-top: 0;
}
.preset {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
}
.preset-name {
  font-weight: 700;
}
.custom {
  margin-top: 0;
}
.picker {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  position: relative;
}
.picker input[type='color'] {
  position: absolute;
  left: 0;
  width: 36px;
  height: 36px;
  opacity: 0;
  cursor: pointer;
}
.mode {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
}
.mode-name {
  display: block;
  font-weight: 700;
}
.preview-chip {
  width: 48px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--line);
  padding: 6px 7px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex-shrink: 0;
}
.preview-chip.light {
  background: #f3eee4;
}
.preview-chip.dark {
  background: #161512;
  border-color: #3f3c36;
}
.preview-chip.system {
  background: linear-gradient(90deg, #f3eee4 50%, #161512 50%);
}
.preview-chip .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--forest);
}
.preview-chip .bar {
  height: 5px;
  border-radius: 99px;
  background: var(--forest);
  opacity: 0.35;
}
</style>
