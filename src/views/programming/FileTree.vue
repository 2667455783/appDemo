<script setup lang="ts">
import { computed, defineComponent, h, ref, watch, type PropType } from 'vue'

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

function iconKind(node: TreeNode): string {
  if (node.dir) return 'dir'
  const n = node.name.toLowerCase()
  if (n.endsWith('.vue')) return 'vue'
  if (/\.(tsx|jsx|ts|js|mjs|cjs)$/.test(n)) return 'js'
  if (n.endsWith('.json')) return 'json'
  if (n.endsWith('.html') || n.endsWith('.htm')) return 'html'
  if (/\.(css|scss|sass|less)$/.test(n)) return 'css'
  if (n.endsWith('.md')) return 'md'
  return 'file'
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
              ? h('span', { class: ['ft-chev', { open }] }, '▸')
              : h('span', { class: 'ft-chev spacer' }, '·'),
            h('span', { class: ['ft-ico', iconKind(node)], 'aria-hidden': 'true' }),
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
</script>

<template>
  <div class="ft">
    <button type="button" class="ft-row root" @click="toggleDir('')">
      <span class="ft-chev" :class="{ open: openDirs.has('') }">▸</span>
      <span class="ft-ico dir" aria-hidden="true" />
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
  font-size: 10px;
  line-height: 1;
  color: var(--muted);
  transition: transform 0.12s ease;
}

.ft-chev.open {
  transform: rotate(90deg);
}

.ft-chev.spacer {
  visibility: hidden;
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

.ft-ico {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  border-radius: 3px;
  background: #90a4ae;
  opacity: 0.9;
}

.ft-ico.dir {
  background: #e8c36a;
  clip-path: polygon(0 20%, 40% 20%, 50% 0, 100% 0, 100% 100%, 0 100%);
  border-radius: 0;
}

.ft-ico.vue {
  background: #41b883;
}
.ft-ico.js {
  background: #f0db4f;
}
.ft-ico.json {
  background: #8bc34a;
}
.ft-ico.html {
  background: #e44d26;
}
.ft-ico.css {
  background: #264de4;
}
.ft-ico.md {
  background: #42a5f5;
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
  font-size: 10px;
  color: var(--muted);
  transition: transform 0.12s ease;
}

.ft :deep(.ft-chev.open) {
  transform: rotate(90deg);
}

.ft :deep(.ft-chev.spacer) {
  visibility: hidden;
}

.ft :deep(.ft-name) {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ft :deep(.ft-ico) {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  border-radius: 3px;
  background: #90a4ae;
  opacity: 0.9;
}

.ft :deep(.ft-ico.dir) {
  background: #e8c36a;
  clip-path: polygon(0 20%, 40% 20%, 50% 0, 100% 0, 100% 100%, 0 100%);
  border-radius: 0;
}
.ft :deep(.ft-ico.vue) {
  background: #41b883;
}
.ft :deep(.ft-ico.js) {
  background: #f0db4f;
}
.ft :deep(.ft-ico.json) {
  background: #8bc34a;
}
.ft :deep(.ft-ico.html) {
  background: #e44d26;
}
.ft :deep(.ft-ico.css) {
  background: #264de4;
}
.ft :deep(.ft-ico.md) {
  background: #42a5f5;
}
</style>
