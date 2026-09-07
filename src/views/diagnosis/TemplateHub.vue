<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import ExpressTemplateItem from '@/components/ExpressTemplateItem.vue'
import PageHeader from '@/components/PageHeader.vue'
import { TEMPLATE_BY_CATEGORY, contentFavIds } from '@/data/templates'
import { useTemplateFavStore } from '@/stores/templateFav'
import { TEMPLATE_CATEGORY_LABEL, type TemplateCategory } from '@/types'

const FAV_GROUPS: TemplateCategory[] = ['writing', 'phrases']

const router = useRouter()
const fav = useTemplateFavStore()
const category = ref<TemplateCategory>('writing')
const openId = ref<string | null>(null)
const onlyFav = ref(false)
const openFavCat = ref<TemplateCategory | null>('writing')

const allInCategory = computed(() => TEMPLATE_BY_CATEGORY[category.value])

const list = computed(() => allInCategory.value)

function favCountOf(c: TemplateCategory) {
  return TEMPLATE_BY_CATEGORY[c].reduce(
    (n, t) => n + contentFavIds(t).filter((id) => fav.isFav(id)).length,
    0,
  )
}

const totalFavCount = computed(() => favCountOf('writing') + favCountOf('phrases'))

const favGroups = computed(() =>
  FAV_GROUPS.map((key) => ({
    key,
    label: TEMPLATE_CATEGORY_LABEL[key],
    count: favCountOf(key),
    list: TEMPLATE_BY_CATEGORY[key].filter((t) => fav.hasAny(contentFavIds(t))),
  })),
)

function toggle(id: string) {
  openId.value = openId.value === id ? null : id
}

function toggleFavCat(c: TemplateCategory) {
  openFavCat.value = openFavCat.value === c ? null : c
  openId.value = null
}

function browseCategory(c: TemplateCategory) {
  onlyFav.value = false
  category.value = c
  openId.value = null
}

function enterFav() {
  onlyFav.value = true
  openId.value = null
  openFavCat.value = favCountOf('writing') ? 'writing' : favCountOf('phrases') ? 'phrases' : 'writing'
}
</script>

<template>
  <div class="page full">
    <PageHeader title="模板管理" subtle="作文模板 · 必背短句" @back="router.back()" />

    <div class="chips">
      <button
        v-for="(label, key) in TEMPLATE_CATEGORY_LABEL"
        :key="key"
        class="chip"
        :class="{ on: !onlyFav && category === key }"
        type="button"
        @click="browseCategory(key as TemplateCategory)"
      >
        {{ label }}
      </button>
      <button class="chip" :class="{ on: onlyFav }" type="button" @click="enterFav">
        已收藏{{ totalFavCount ? ` ${totalFavCount}` : '' }}
      </button>
    </div>

    <template v-if="!onlyFav">
      <p v-if="!list.length" class="page-sub" style="margin-top: 16px">该分类暂无内容。</p>
      <ExpressTemplateItem
        v-for="t in list"
        :key="t.id"
        :item="t"
        :opened="openId === t.id"
        :fav-only="false"
        @toggle="toggle(t.id)"
      />
    </template>

    <template v-else>
      <article v-for="g in favGroups" :key="g.key" class="card group-card">
        <button class="tpl-head" type="button" @click="toggleFavCat(g.key)">
          <div>
            <p class="tpl-title">{{ g.label }}</p>
            <p class="page-sub">{{ g.count ? `${g.count} 条收藏` : '暂无收藏' }}</p>
          </div>
          <span class="muted">{{ openFavCat === g.key ? '收起' : '展开' }}</span>
        </button>
        <div v-if="openFavCat === g.key" class="tpl-body">
          <p v-if="!g.list.length" class="page-sub">该分类还没有收藏内容。</p>
          <ExpressTemplateItem
            v-for="t in g.list"
            :key="t.id"
            :item="t"
            :opened="openId === t.id"
            :fav-only="true"
            @toggle="toggle(t.id)"
          />
        </div>
      </article>
    </template>
  </div>
</template>

<style scoped>
.group-card {
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
  margin: 0 0 4px;
  font-weight: 700;
}
.tpl-body {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--line, #e8e2d6);
}
.tpl-body :deep(.tpl-card:first-child) {
  margin-top: 0;
}
</style>
