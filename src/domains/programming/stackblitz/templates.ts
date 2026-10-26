export type StarterId = 'vue' | 'react' | 'html'

export type StarterProject = {
  title: string
  description?: string
  files: Record<string, string>
}

export const STARTERS: { id: StarterId; label: string; desc: string }[] = [
  { id: 'vue', label: 'Vue 3', desc: 'Vite + Vue 3（含 script setup）' },
  { id: 'react', label: 'React', desc: 'Vite + React 单页项目' },
  { id: 'html', label: 'HTML', desc: '纯静态页面，即开即预览' },
]

/** 本地运行用的最小可运行文件树（不依赖 StackBlitz） */
export function buildStarterProject(id: StarterId): StarterProject {
  switch (id) {
    case 'vue':
      return {
        title: 'Vue 3 Starter',
        description: '学习宝典 · Vue 3 + Vite 练习项目',
        files: {
          'package.json': JSON.stringify(
            {
              name: 'vue-starter',
              private: true,
              version: '0.0.0',
              type: 'module',
              scripts: {
                dev: 'vite',
                build: 'vite build',
                preview: 'vite preview',
              },
              dependencies: {
                vue: '^3.5.13',
              },
              devDependencies: {
                '@vitejs/plugin-vue': '^5.2.1',
                vite: '^5.4.11',
              },
            },
            null,
            2,
          ),
          'vite.config.js': `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
})
`,
          'index.html': `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vue Starter</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"><\/script>
  </body>
</html>
`,
          'src/main.js': `import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
`,
          'src/App.vue': `<script setup>
import { ref } from 'vue'

const count = ref(0)
function onInc() {
  count.value += 1
}
</script>

<template>
  <main class="wrap">
    <h1>Vue 3 项目</h1>
    <p>Vue 3 + script setup，点绿色按钮计数。</p>
    <button type="button" @click="onInc">点了 {{ count }} 次</button>
  </main>
</template>

<style>
.wrap { font-family: system-ui, sans-serif; padding: 24px; }
button {
  padding: 8px 14px;
  border: 0;
  border-radius: 8px;
  background: #1f4d3a;
  color: #fff;
  cursor: pointer;
}
</style>
`,
        },
      }
    case 'react':
      return {
        title: 'React Starter',
        description: '学习宝典 · React + Vite 练习项目',
        files: {
          'package.json': JSON.stringify(
            {
              name: 'react-starter',
              private: true,
              version: '0.0.0',
              type: 'module',
              scripts: {
                dev: 'vite',
                build: 'vite build',
                preview: 'vite preview',
              },
              dependencies: {
                react: '^18.3.1',
                'react-dom': '^18.3.1',
              },
              devDependencies: {
                '@vitejs/plugin-react': '^4.3.4',
                vite: '^5.4.11',
              },
            },
            null,
            2,
          ),
          'vite.config.js': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`,
          'index.html': `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React Starter</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"><\/script>
  </body>
</html>
`,
          'src/main.jsx': `import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(<App />)
`,
          'src/App.jsx': `import React, { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>React 项目</h1>
      <p>Vite + React，改代码后点重新运行。</p>
      <button
        type="button"
        onClick={() => setCount((c) => c + 1)}
        style={{
          padding: '8px 14px',
          border: 0,
          borderRadius: 8,
          background: '#1f4d3a',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        点了 {count} 次
      </button>
    </main>
  )
}
`,
        },
      }
    case 'html':
    default:
      return {
        title: 'HTML Starter',
        description: '学习宝典 · 静态页练习',
        files: {
          'index.html': `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>HTML Starter</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <main>
      <h1>Hello HTML</h1>
      <p>改代码后点重新运行。</p>
      <button id="btn" type="button">点我</button>
    </main>
    <script src="script.js"><\/script>
  </body>
</html>
`,
          'styles.css': `body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #f3eee4;
  color: #1c1915;
}
main { padding: 24px; }
button {
  padding: 8px 14px;
  border: 0;
  border-radius: 8px;
  background: #1f4d3a;
  color: #fff;
}
`,
          'script.js': `document.getElementById('btn')?.addEventListener('click', () => {
  alert('跑起来了！')
})
`,
        },
      }
  }
}

export function defaultOpenFile(id: StarterId): string {
  if (id === 'vue') return 'src/App.vue'
  if (id === 'react') return 'src/App.jsx'
  return 'index.html'
}
