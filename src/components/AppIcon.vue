<script setup lang="ts">
import { computed } from 'vue'
import home from '@/assets/icons/home.svg?raw'
import book from '@/assets/icons/book.svg?raw'
import edit from '@/assets/icons/edit.svg?raw'
import safety from '@/assets/icons/safety.svg?raw'
import plusSquare from '@/assets/icons/plus-square.svg?raw'
import user from '@/assets/icons/user.svg?raw'
import left from '@/assets/icons/left.svg?raw'
import right from '@/assets/icons/right.svg?raw'
import sound from '@/assets/icons/sound.svg?raw'
import star from '@/assets/icons/star.svg?raw'
import starFilled from '@/assets/icons/star-filled.svg?raw'
import setting from '@/assets/icons/setting.svg?raw'
import appstore from '@/assets/icons/appstore.svg?raw'
import search from '@/assets/icons/search.svg?raw'
import down from '@/assets/icons/down.svg?raw'
import folder from '@/assets/icons/folder.svg?raw'
import folderOpen from '@/assets/icons/folder-open.svg?raw'
import fork from '@/assets/icons/fork.svg?raw'
import close from '@/assets/icons/close.svg?raw'
import copy from '@/assets/icons/copy.svg?raw'
import fileSearch from '@/assets/icons/file-search.svg?raw'
import deleteIcon from '@/assets/icons/delete.svg?raw'
import reload from '@/assets/icons/reload.svg?raw'
import cloudDownload from '@/assets/icons/cloud-download.svg?raw'
import file from '@/assets/icons/file.svg?raw'
import fileText from '@/assets/icons/file-text.svg?raw'
import code from '@/assets/icons/code.svg?raw'
import html5 from '@/assets/icons/html5.svg?raw'
import fileMarkdown from '@/assets/icons/file-markdown.svg?raw'
import fileImage from '@/assets/icons/file-image.svg?raw'
import fileZip from '@/assets/icons/file-zip.svg?raw'
import fileUnknown from '@/assets/icons/file-unknown.svg?raw'
import fileJs from '@/assets/icons/file-js.svg?raw'
import fileCss from '@/assets/icons/file-css.svg?raw'
import fileTs from '@/assets/icons/file-ts.svg?raw'
import fileVue from '@/assets/icons/file-vue.svg?raw'
import fileJson from '@/assets/icons/file-json.svg?raw'
import fileScss from '@/assets/icons/file-scss.svg?raw'

/**
 * 图标来源：
 * - 通用：Ant Design Icons（阿里 / iconfont 同系）
 * - 文件类型：vscode-icons（JS/CSS/TS/Vue 等可辨识后缀图标）
 * 禁止在业务里手绘 path。
 */
export type AppIconName =
  | 'home'
  | 'book'
  | 'edit'
  | 'safety'
  | 'plus-square'
  | 'user'
  | 'left'
  | 'right'
  | 'sound'
  | 'star'
  | 'star-filled'
  | 'setting'
  | 'appstore'
  | 'search'
  | 'down'
  | 'folder'
  | 'folder-open'
  | 'fork'
  | 'close'
  | 'copy'
  | 'file-search'
  | 'delete'
  | 'reload'
  | 'cloud-download'
  | 'file'
  | 'file-text'
  | 'code'
  | 'html5'
  | 'file-markdown'
  | 'file-image'
  | 'file-zip'
  | 'file-unknown'
  | 'file-js'
  | 'file-css'
  | 'file-ts'
  | 'file-vue'
  | 'file-json'
  | 'file-scss'

const registry: Record<AppIconName, string> = {
  home,
  book,
  edit,
  safety,
  'plus-square': plusSquare,
  user,
  left,
  right,
  sound,
  star,
  'star-filled': starFilled,
  setting,
  appstore,
  search,
  down,
  folder,
  'folder-open': folderOpen,
  fork,
  close,
  copy,
  'file-search': fileSearch,
  delete: deleteIcon,
  reload,
  'cloud-download': cloudDownload,
  file,
  'file-text': fileText,
  code,
  html5,
  'file-markdown': fileMarkdown,
  'file-image': fileImage,
  'file-zip': fileZip,
  'file-unknown': fileUnknown,
  'file-js': fileJs,
  'file-css': fileCss,
  'file-ts': fileTs,
  'file-vue': fileVue,
  'file-json': fileJson,
  'file-scss': fileScss,
}

const props = withDefaults(
  defineProps<{
    name: AppIconName
    size?: number | string
    label?: string
    color?: string
  }>(),
  { size: 18 },
)

const sizePx = computed(() => {
  const s = props.size
  return typeof s === 'number' ? `${s}px` : /^\d+$/.test(s) ? `${s}px` : s
})

const svgHtml = computed(() => {
  const raw = registry[props.name]
  if (!raw) return ''
  const size = typeof props.size === 'number' ? String(props.size) : props.size
  let html = raw.trim()
  if (/\swidth=/.test(html)) {
    html = html.replace(/\swidth="[^"]*"/, ` width="${size}"`)
  } else {
    html = html.replace('<svg', `<svg width="${size}"`)
  }
  if (/\sheight=/.test(html)) {
    html = html.replace(/\sheight="[^"]*"/, ` height="${size}"`)
  } else {
    html = html.replace('<svg', `<svg height="${size}"`)
  }
  if (!/\saria-hidden=/.test(html) && !props.label) {
    html = html.replace('<svg', '<svg aria-hidden="true"')
  }
  if (props.label) {
    html = html.replace('<svg', `<svg role="img" aria-label="${props.label}"`)
  }
  return html
})
</script>

<template>
  <span
    class="app-icon"
    :style="{ width: sizePx, height: sizePx, color: color || undefined }"
    v-html="svgHtml"
  />
</template>

<style scoped>
.app-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  flex-shrink: 0;
  color: inherit;
}
.app-icon :deep(svg) {
  display: block;
}
</style>
