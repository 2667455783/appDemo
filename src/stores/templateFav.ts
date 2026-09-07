import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { loadState, saveState } from '@/utils/storage'

type TemplateFavState = { ids: string[] }

function readSaved(): string[] {
  const saved = loadState<TemplateFavState>('templateFav', { ids: [] })
  return Array.isArray(saved.ids) ? saved.ids.filter((id) => typeof id === 'string') : []
}

export const useTemplateFavStore = defineStore('templateFav', () => {
  const ids = ref<string[]>(readSaved())
  const idSet = computed(() => new Set(ids.value))

  function persist() {
    saveState<TemplateFavState>('templateFav', { ids: ids.value })
  }

  function isFav(id: string) {
    return idSet.value.has(id)
  }

  function toggle(id: string) {
    if (idSet.value.has(id)) {
      ids.value = ids.value.filter((x) => x !== id)
    } else {
      ids.value = [...ids.value, id]
    }
    persist()
  }

  function hasAny(keys: string[]) {
    const s = idSet.value
    return keys.some((k) => s.has(k))
  }

  return { ids, isFav, toggle, hasAny }
})
