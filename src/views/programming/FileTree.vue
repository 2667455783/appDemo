<script setup lang="ts">
import { computed, defineComponent, h, ref, watch, type PropType } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { fileTreeIconFor } from '@/utils/fileTreeIcon'

export type TreeNode = {
  name: string
  path: string
  dir: boolean
  children?: TreeNode[]
}

const props = withDefaults(
  defineProps<{
    paths: string[]
    rootLabel?: string
    selected?: string
    expandTo?: string
  }>(),
  { rootLabel: 'PROJECT', selected: '', expandTo: '' },
)

const emit = defineEmits<{ select: [path: string] }>()

const openDirs = ref<Set<string>>(new Set(['']))

function buildTree(paths: string[]): TreeNode[] {
  type Draft = { name: string; path: string; dir: boolean; kids: Map<string, Draft> }
  const root: Draft = { name: '', path: '', dir: true, kids: new Map() }

  for (const raw of paths) {
    const parts = raw.split('/').filter(Boolean)
    if (!parts.length) continue
    let cur = root
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]!
      const isLast = i === parts.length - 1
      const path = parts.slice(0, i + 1).join('/')
      let next = cur.kids.get(name)
      if (!next) {
        next = { name, path, dir: !isLast, kids: new Map() }
        cur.kids.set(name, next)
      } else if (!isLast) {
        next.dir = true
      }
      cur = next
    }
  }

  const toNodes = (d: Draft): TreeNode[] =>
    [...d.kids.values()]
      .sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name, 'en'))
      .map((x) => ({
        name: x.name,
        path: x.path,
        dir: x.dir,
        children: x.dir ? toNodes(x) : undefined,
      }))

  return toNodes(root)
}

const tree = computed(() => buildTree(props.paths))

function expandAncestors(path: string) {
  if (!path) return
  const next = new Set(openDirs.value)
  next.add('')
  const parts = path.split('/').filter(Boolean)
  for (let i = 1; i <= parts.length; i++) {
    const seg = parts.slice(0, i).join('/')
    // 文件本身不作为目录展开
    if (i < parts.length || !props.paths.includes(path)) next.add(seg)
  }
  const parent = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
  next.add(parent)
  openDirs.value = next
}

watch(
  () => [props.expandTo, props.selected, props.paths.join('\0')] as const,
  () => {
    const s = new Set<string>([''])
    openDirs.value = s
    expandAncestors(props.expandTo || props.selected || '')
    for (const n of tree.value) {
      if (n.dir) {
        const n2 = new Set(openDirs.value)
        n2.add(n.path)
        openDirs.value = n2
      }
    }
  },
  { immediate: true },
)

function toggleDir(path: string) {
  const s = new Set(openDirs.value)
  if (s.has(path)) s.delete(path)
  else s.add(path)
  openDirs.value = s
}

function onPick(node: TreeNode) {
  if (node.dir) {
    toggleDir(node.path)
    return
  }
  emit('select', node.path)
}

const Branch = defineComponent({
  name: 'FileTreeBranch',
  props: {
    nodes: { type: Array as PropType<TreeNode[]>, required: true },
    depth: { type: Number, required: true },
  },
  setup(branchProps) {
    const renderNodes = (nodes: TreeNode[], depth: number): ReturnType<typeof h>[] =>
      nodes.map((node) => {
        const open = openDirs.value.has(node.path)
        const on = !node.dir && props.selected === node.path
        const ico = fileTreeIconFor(node.name, node.dir, open)
        const row = h(
          'button',
          {
            type: 'button',
            class: ['ft-row', { on, dir: node.dir }],
            style: { paddingLeft: `${10 + depth * 14}px` },
            title: node.path,
            onClick: () => onPick(node),
          },
          [
            node.dir
              ? h(
                  AppIcon,
                  {
                    name: 'right',
                    size: 10,
                    class: ['ft-chev', { open }],
                    color: 'var(--muted)',
                  },
                )
              : h('span', { class: 'ft-chev spacer' }),
            h(AppIcon, {
              name: ico.name,
              size: 14,
              color: ico.color,
              class: 'ft-ico',
            }),
            h('span', { class: 'ft-name' }, node.name),
          ],
        )
        if (!node.dir || !node.children?.length) return h('li', { key: node.path }, [row])
        return h('li', { key: node.path }, [
          row,
          open ? h('ul', { class: 'ft-list' }, renderNodes(node.children, depth + 1)) : null,
        ])
      })

    return () => renderNodes(branchProps.nodes, branchProps.depth)
  },
})

const rootIco = computed(() => fileTreeIconFor(props.rootLabel, true, openDirs.value.has('')))
</script>

<template>
  <div class="ft">
    <button type="button" class="ft-row root" @click="toggleDir('')">
      <AppIcon
        name="right"
        :size="10"
        class="ft-chev"
        :class="{ open: openDirs.has('') }"
        color="var(--muted)"
      />
      <AppIcon :name="rootIco.name" :size="14" :color="rootIco.color" class="ft-ico" />
      <span class="ft-name">{{ rootLabel }}</span>
      <span class="ft-count">{{ paths.length }}</span>
    </button>

    <ul v-show="openDirs.has('')" class="ft-list">
      <Branch :nodes="tree" :depth="0" />
    </ul>
  </div>
</template>

<style scoped>
.ft {
  font-size: 12px;
  color: var(--ink);
  user-select: none;
}

.ft-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  font: inherit;
}

.ft-row:hover {
  background: color-mix(in srgb, var(--forest) 8%, transparent);
}

.ft-row.on {
  background: color-mix(in srgb, var(--forest) 16%, transparent);
  color: var(--forest);
  font-weight: 600;
}

.ft-row.root {
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 11px;
  color: var(--ink-soft);
  margin-bottom: 2px;
}

.ft-chev {
  width: 10px;
  flex-shrink: 0;
  transition: transform 0.12s ease;
}

.ft-chev.open {
  transform: rotate(90deg);
}

.ft-chev.spacer {
  width: 10px;
  flex-shrink: 0;
  visibility: hidden;
}

.ft-ico {
  flex-shrink: 0;
}

.ft-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ft-count {
  flex-shrink: 0;
  font-size: 10px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.ft-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.ft :deep(.ft-list) {
  list-style: none;
  margin: 0;
  padding: 0;
}

.ft :deep(.ft-row) {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  height: 28px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  font-size: 12px;
}

.ft :deep(.ft-row:hover) {
  background: color-mix(in srgb, var(--forest) 8%, transparent);
}

.ft :deep(.ft-row.on) {
  background: color-mix(in srgb, var(--forest) 16%, transparent);
  color: var(--forest);
  font-weight: 600;
}

.ft :deep(.ft-chev) {
  width: 10px;
  flex-shrink: 0;
  transition: transform 0.12s ease;
}

.ft :deep(.ft-chev.open) {
  transform: rotate(90deg);
}

.ft :deep(.ft-chev.spacer) {
  width: 10px;
  flex-shrink: 0;
  visibility: hidden;
}

.ft :deep(.ft-ico) {
  flex-shrink: 0;
}

.ft :deep(.ft-name) {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
