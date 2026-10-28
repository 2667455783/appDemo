/**
 * 必须在 import 'monaco-editor' 之前执行。
 * ES module 会按依赖顺序先跑本文件，再跑 setupMonaco 里的 monaco 主包。
 */
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

const g = globalThis as unknown as {
  MonacoEnvironment?: { getWorker: (id: string, label: string) => Worker }
}

if (!g.MonacoEnvironment) {
  g.MonacoEnvironment = {
    getWorker(_id: string, label: string) {
      if (label === 'json') return new jsonWorker()
      if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
      if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
      if (label === 'typescript' || label === 'javascript') return new tsWorker()
      return new editorWorker()
    },
  }
}
