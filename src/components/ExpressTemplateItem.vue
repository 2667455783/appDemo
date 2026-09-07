<script setup lang="ts">
import { contentFavIds, paragraphFavId, phraseFavId } from '@/data/templates'
import { useTemplateFavStore } from '@/stores/templateFav'
import type { ExpressTemplate } from '@/types'

const props = defineProps<{
  item: ExpressTemplate
  opened: boolean
  favOnly: boolean
}>()

const emit = defineEmits<{ toggle: [] }>()

const fav = useTemplateFavStore()

function visiblePhrases() {
  const phrases = props.item.phrases ?? []
  if (!props.favOnly) return phrases
  return phrases.filter((p) => fav.isFav(phraseFavId(props.item.id, p.no)))
}

function visibleParas() {
  const rows = props.item.paragraphs.map((text, index) => ({ text, index }))
  if (!props.favOnly) return rows
  return rows.filter((row) => fav.isFav(paragraphFavId(props.item.id, row.index)))
}
</script>

<template>
  <article class="card tpl-card">
    <button class="tpl-head" type="button" @click="emit('toggle')">
      <div>
        <span class="tag">{{ item.tag }}</span>
        <span v-if="fav.hasAny(contentFavIds(item))" class="fav-dot" aria-hidden="true">★</span>
        <p class="tpl-title">{{ item.title }}</p>
        <p class="page-sub">{{ item.summary }}</p>
      </div>
      <span class="muted">{{ opened ? '收起' : '展开' }}</span>
    </button>

    <div v-if="opened" class="tpl-body">
      <template v-if="item.phrases?.length">
        <div v-for="p in visiblePhrases()" :key="p.no" class="phrase">
          <span class="no">{{ p.no }}.</span>
          <div class="pair">
            <p class="en">{{ p.en }}</p>
            <p class="zh">{{ p.zh }}</p>
          </div>
          <button
            class="fav-btn"
            type="button"
            :class="{ on: fav.isFav(phraseFavId(item.id, p.no)) }"
            :aria-label="fav.isFav(phraseFavId(item.id, p.no)) ? '取消收藏' : '收藏'"
            :aria-pressed="fav.isFav(phraseFavId(item.id, p.no))"
            @click.stop="fav.toggle(phraseFavId(item.id, p.no))"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 3.6 14.7 9l6 .5-4.6 4.1 1.4 5.8L12 16.7 6.5 19.4l1.4-5.8L3.3 9.5l6-.5L12 3.6Z"
                :fill="fav.isFav(phraseFavId(item.id, p.no)) ? 'currentColor' : 'none'"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      </template>
      <template v-else>
        <div v-for="row in visibleParas()" :key="row.index" class="para-row">
          <p class="passage para">{{ row.text }}</p>
          <button
            class="fav-btn"
            type="button"
            :class="{ on: fav.isFav(paragraphFavId(item.id, row.index)) }"
            :aria-label="fav.isFav(paragraphFavId(item.id, row.index)) ? '取消收藏' : '收藏'"
            :aria-pressed="fav.isFav(paragraphFavId(item.id, row.index))"
            @click.stop="fav.toggle(paragraphFavId(item.id, row.index))"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 3.6 14.7 9l6 .5-4.6 4.1 1.4 5.8L12 16.7 6.5 19.4l1.4-5.8L3.3 9.5l6-.5L12 3.6Z"
                :fill="fav.isFav(paragraphFavId(item.id, row.index)) ? 'currentColor' : 'none'"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      </template>
    </div>
  </article>
</template>

<style scoped>
.tpl-card {
  margin-top: 12px;
}
.tpl-head {
  display: flex;
  width: 100%;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
  color: inherit;
}
.tpl-title {
  margin: 8px 0 4px;
  font-weight: 700;
}
.fav-dot {
  margin-left: 6px;
  color: var(--gold);
  font-size: 12px;
  vertical-align: 1px;
}
.tpl-body {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--line, #e8e2d6);
}
.para-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 10px;
}
.para-row:last-child {
  margin-bottom: 0;
}
.para {
  flex: 1;
  min-width: 0;
  margin: 0;
  white-space: pre-line;
}
.phrase {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  align-items: flex-start;
}
.phrase:last-child {
  margin-bottom: 0;
}
.no {
  flex-shrink: 0;
  width: 28px;
  font-size: 13px;
  font-weight: 700;
  color: var(--forest);
  padding-top: 2px;
}
.pair {
  flex: 1;
  min-width: 0;
}
.en {
  margin: 0;
  line-height: 1.5;
  font-weight: 600;
}
.zh {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--ink-soft);
  line-height: 1.45;
}
.fav-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  margin-top: -4px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.fav-btn.on {
  color: var(--gold);
}
.fav-btn:active {
  background: var(--gold-soft);
}
</style>
