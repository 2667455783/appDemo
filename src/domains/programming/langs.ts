import type { ProgLangId, ProgLangMeta } from '@/domains/programming/types'

export const PROG_LANGS: ProgLangMeta[] = [
  {
    id: 'javascript',
    label: 'JS',
    mode: 'local',
    hint: '在沙箱中执行，console.log 会显示在下方输出区。',
  },
  {
    id: 'python',
    label: 'Python',
    mode: 'local',
    hint: '首次运行会加载 Pyodide（约十几 MB，走国内镜像），之后本会话可复用。',
  },
  {
    id: 'vue',
    label: 'Vue',
    mode: 'preview',
    hint: '单文件片段预览：写 template + script setup，页面内编译渲染。',
  },
  {
    id: 'react',
    label: 'React',
    mode: 'preview',
    hint: '写 JSX 组件，本地 Babel 转译 + React 运行时预览。',
  },
  {
    id: 'java',
    label: 'Java',
    mode: 'remote',
    hint: '需云端沙箱，当前可编辑示例；正式运行即将接入。',
  },
  {
    id: 'c',
    label: 'C',
    mode: 'remote',
    hint: '需云端沙箱，当前可编辑示例；正式运行即将接入。',
  },
  {
    id: 'cpp',
    label: 'C++',
    mode: 'remote',
    hint: '需云端沙箱，当前可编辑示例；正式运行即将接入。',
  },
]

export const SAMPLES: Record<ProgLangId, string> = {
  javascript: `// 试试改数字或加几行 console.log
function fib(n) {
  if (n < 2) return n
  return fib(n - 1) + fib(n - 2)
}

console.log('fib(10) =', fib(10))
console.log('hello from JS')
`,

  python: `# 试试 print / 简单运算
def fib(n: int) -> int:
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

print("fib(10) =", fib(10))
print("hello from Python")
`,

  vue: `<template>
  <div class="box">
    <h2>{{ title }}</h2>
    <p>点击了 {{ count }} 次</p>
    <button type="button" @click="onInc">+1</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const title = ref('Vue 预览')
const count = ref(0)
function onInc() {
  count.value = count.value + 1
}
</script>

<style>
.box { font-family: sans-serif; padding: 16px; }
button {
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  background: #1f4d3a;
  color: #fff;
}
</style>
`,

  react: `function App() {
  const [count, setCount] = React.useState(0)
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 16 }}>
      <h2>React 预览</h2>
      <p>点击了 {count} 次</p>
      <button
        onClick={() => setCount((c) => c + 1)}
        style={{
          padding: '8px 14px',
          border: 'none',
          borderRadius: 8,
          background: '#1f4d3a',
          color: '#fff',
        }}
      >
        +1
      </button>
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(<App />)
`,

  java: `public class Main {
  public static void main(String[] args) {
    System.out.println("hello from Java");
    System.out.println("fib(10) = " + fib(10));
  }

  static int fib(int n) {
    if (n < 2) return n;
    return fib(n - 1) + fib(n - 2);
  }
}
`,

  c: `#include <stdio.h>

int fib(int n) {
  if (n < 2) return n;
  return fib(n - 1) + fib(n - 2);
}

int main(void) {
  printf("hello from C\\n");
  printf("fib(10) = %d\\n", fib(10));
  return 0;
}
`,

  cpp: `#include <iostream>
using namespace std;

int fib(int n) {
  if (n < 2) return n;
  return fib(n - 1) + fib(n - 2);
}

int main() {
  cout << "hello from C++" << endl;
  cout << "fib(10) = " << fib(10) << endl;
  return 0;
}
`,
}

export function getLangMeta(id: ProgLangId): ProgLangMeta {
  return PROG_LANGS.find((l) => l.id === id) ?? PROG_LANGS[0]!
}
