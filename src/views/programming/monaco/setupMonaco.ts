// 先注册 worker，再加载 monaco 主包（顺序不能反）
import '@/views/programming/monaco/monacoEnv'
import {
  resolveCompletionInsert,
  suggestCompletions,
  wordPrefixAt,
} from '@/domains/programming/localrun/completions'
import { scriptBlockAt } from '@/views/programming/monaco/vueSfc'
import * as monaco from 'monaco-editor'

let ready = false

function toSnippet(insert: string): string {
  const at = insert.indexOf('|')
  if (at < 0) return insert
  return `${insert.slice(0, at)}$0${insert.slice(at + 1)}`
}

function staticCompletionProvider(languageId: string): monaco.languages.CompletionItemProvider {
  return {
    triggerCharacters: ['<', '/', '.', ...Array.from('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$')],
    provideCompletionItems(model, position) {
      const path = model.uri.path.replace(/^\//, '') || `index.${languageId === 'vue' ? 'vue' : 'html'}`
      const full = model.getValue()
      const offset = model.getOffsetAt(position)

      // Vue：在 <script> 内交给 TS/JS worker，这里只处理模板区静态补全
      if (languageId === 'vue' && scriptBlockAt(full, offset)) {
        return { suggestions: [] }
      }

      const { prefix, start } = wordPrefixAt(full, offset)
      if (!prefix) return { suggestions: [] }

      const startPos = model.getPositionAt(start)
      const range = new monaco.Range(startPos.lineNumber, startPos.column, position.lineNumber, position.column)
      // 显式传 languageId，避免 .vue 被路径误判后拿不到 template 等标签
      const items = suggestCompletions(path, prefix, languageId)
      const Kind = monaco.languages.CompletionItemKind
      const suggestions: monaco.languages.CompletionItem[] = items.map((item, i) => {
        const raw = resolveCompletionInsert(item, full, start, offset)
        const insertText = toSnippet(raw)
        const kind =
          item.kind === 'snippet'
            ? Kind.Snippet
            : item.htmlTag
              ? Kind.Property
              : item.kind === 'api'
                ? Kind.Function
                : Kind.Keyword
        return {
          label: item.label,
          kind,
          detail: item.detail || item.kind,
          insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
          sortText: String(i).padStart(2, '0'),
        }
      })
      return { suggestions }
    },
  }
}

/** .vue 的 <script> 区：抽到虚拟 js/ts 模型，用 TS worker 做真类型补全 */
function registerVueScriptCompletions() {
  const provider: monaco.languages.CompletionItemProvider = {
    triggerCharacters: ['.', '"', "'", '`', '/', '@', '<', '#'],
    async provideCompletionItems(model, position) {
      const full = model.getValue()
      const offset = model.getOffsetAt(position)
      const block = scriptBlockAt(full, offset)
      if (!block) return { suggestions: [] }

      const rel = offset - block.start
      const ext = block.lang === 'typescript' ? 'ts' : 'js'
      const uri = monaco.Uri.parse(`file:///${model.uri.path.replace(/^\//, '')}.__script.${ext}`)

      let virt = monaco.editor.getModel(uri)
      if (!virt) {
        virt = monaco.editor.createModel(block.content, block.lang, uri)
      } else if (virt.getValue() !== block.content) {
        virt.setValue(block.content)
      }

      try {
        const getWorker =
          block.lang === 'typescript'
            ? await monaco.languages.typescript.getTypeScriptWorker()
            : await monaco.languages.typescript.getJavaScriptWorker()
        const worker = await getWorker(uri)
        const info = await worker.getCompletionsAtPosition(uri.toString(), rel)
        if (!info?.entries?.length) return { suggestions: [] }

        const Kind = monaco.languages.CompletionItemKind
        const word = model.getWordUntilPosition(position)
        const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn)

        const suggestions: monaco.languages.CompletionItem[] = info.entries.slice(0, 40).map(
          (entry: { name: string; kind?: string; sortText?: string }, i: number) => {
            let kind = Kind.Property
            const k = (entry.kind || '').toLowerCase()
            if (k.includes('method') || k.includes('function')) kind = Kind.Method
            else if (k.includes('class')) kind = Kind.Class
            else if (k.includes('var') || k.includes('let') || k.includes('const') || k.includes('property'))
              kind = Kind.Variable
            else if (k.includes('keyword')) kind = Kind.Keyword
            else if (k.includes('module')) kind = Kind.Module

            return {
              label: entry.name,
              kind,
              detail: entry.kind,
              insertText: entry.name,
              range,
              sortText: `${entry.sortText || ''}${String(i).padStart(3, '0')}`,
            }
          },
        )
        return { suggestions }
      } catch {
        return { suggestions: [] }
      }
    },
  }

  monaco.languages.registerCompletionItemProvider('vue', provider)
}

function registerVueLanguage() {
  monaco.languages.register({ id: 'vue', extensions: ['.vue'], aliases: ['Vue', 'vue'] })

  monaco.languages.setLanguageConfiguration('vue', {
    comments: { blockComment: ['<!--', '-->'] },
    brackets: [
      ['<!--', '-->'],
      ['<', '>'],
      ['{', '}'],
      ['(', ')'],
      ['[', ']'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: "'", close: "'" },
      { open: '"', close: '"' },
      { open: '`', close: '`' },
      { open: '<!--', close: '-->' },
    ],
    surroundingPairs: [
      { open: "'", close: "'" },
      { open: '"', close: '"' },
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '<', close: '>' },
    ],
  })

  // 轻量着色：标签 / 注释 / 字符串；script 内关键字靠补全不靠完整语法高亮
  monaco.languages.setMonarchTokensProvider('vue', {
    defaultToken: '',
    tokenPostfix: '.vue',
    tokenizer: {
      root: [
        [/<!--/, 'comment', '@comment'],
        [/(<)(script)(\b[^>]*)(>)/, ['delimiter', 'tag', 'attribute.value', { token: 'delimiter', next: '@script' }]],
        [/(<)(style)(\b[^>]*)(>)/, ['delimiter', 'tag', 'attribute.value', { token: 'delimiter', next: '@style' }]],
        [/(<\/?)([a-zA-Z][\w:.-]*)/, ['delimiter', 'tag']],
        [/[a-zA-Z_:][\w:.-]*(?=\s*=)/, 'attribute.name'],
        [/[=]/, 'delimiter'],
        [/"([^"]*)"/, 'attribute.value'],
        [/'([^']*)'/, 'attribute.value'],
        [/[{}()[\]]/, 'delimiter'],
        [/[^<{]+/, ''],
      ],
      comment: [
        [/-->/, 'comment', '@pop'],
        [/[^-]+/, 'comment'],
        [/./, 'comment'],
      ],
      script: [
        [/<\/script\s*>/, { token: 'tag', next: '@pop' }],
        [/\/\/.*$/, 'comment'],
        [/\/\*/, 'comment', '@scriptComment'],
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/'([^'\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@scriptStringDq'],
        [/'/, 'string', '@scriptStringSq'],
        [/`/, 'string', '@scriptStringTq'],
        [
          /\b(const|let|var|function|return|if|else|for|while|import|export|from|async|await|class|new|this|true|false|null|undefined|typeof|instanceof)\b/,
          'keyword',
        ],
        [/\b\d+(\.\d+)?\b/, 'number'],
        [/[{}()[\];,.]/, 'delimiter'],
        [/[a-zA-Z_$][\w$]*/, 'identifier'],
      ],
      scriptComment: [
        [/\*\//, 'comment', '@pop'],
        [/./, 'comment'],
      ],
      scriptStringDq: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, 'string', '@pop'],
      ],
      scriptStringSq: [
        [/[^\\']+/, 'string'],
        [/\\./, 'string.escape'],
        [/'/, 'string', '@pop'],
      ],
      scriptStringTq: [
        [/[^\\`$]+/, 'string'],
        [/\\./, 'string.escape'],
        [/\$\{/, { token: 'delimiter', next: '@script' }],
        [/`/, 'string', '@pop'],
      ],
      style: [
        [/<\/style\s*>/, { token: 'tag', next: '@pop' }],
        [/./, ''],
      ],
    },
  })

  registerVueScriptCompletions()
  monaco.languages.registerCompletionItemProvider('vue', staticCompletionProvider('vue'))
}

function registerHtmlTagCompletions() {
  monaco.languages.registerCompletionItemProvider('html', staticCompletionProvider('html'))
}

/** 仅在编程页动态 import 后调用：配置 TS/JS 语言服务 */
export function setupMonaco() {
  if (ready) return monaco
  ready = true

  registerVueLanguage()
  registerHtmlTagCompletions()

  const compilerOptions: monaco.languages.typescript.CompilerOptions = {
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    lib: ['es2020', 'dom', 'dom.iterable'],
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    noEmit: true,
    esModuleInterop: true,
    allowJs: true,
    checkJs: true,
    jsx: monaco.languages.typescript.JsxEmit.React,
    allowSyntheticDefaultImports: true,
    baseUrl: 'file:///',
  }

  const diagnostics: monaco.languages.typescript.DiagnosticsOptions = {
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
  }

  monaco.languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions)
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions(diagnostics)
  monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true)

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    ...compilerOptions,
    strict: false,
  })
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(diagnostics)
  monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true)

  monaco.editor.defineTheme('app-soft', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
      { token: 'keyword', foreground: '166534' },
      { token: 'string', foreground: 'a16207' },
      { token: 'number', foreground: 'b45309' },
      { token: 'tag', foreground: '166534' },
      { token: 'attribute.name', foreground: '0f766e' },
      { token: 'attribute.value', foreground: 'a16207' },
      { token: 'identifier', foreground: '0f172a' },
    ],
    colors: {
      'editor.background': '#f8fafc',
      'editor.foreground': '#0f172a',
      'editorLineNumber.foreground': '#94a3b8',
      'editorLineNumber.activeForeground': '#166534',
      'editor.selectionBackground': '#bbf7d0',
      'editor.lineHighlightBackground': '#ecfdf5',
      'editorSuggestWidget.background': '#0f172a',
      'editorSuggestWidget.foreground': '#f8fafc',
      'editorSuggestWidget.selectedBackground': '#166534',
      'editorSuggestWidget.highlightForeground': '#86efac',
      'editorSuggestWidget.border': '#334155',
    },
  })

  monaco.editor.defineTheme('app-soft-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '94a3b8', fontStyle: 'italic' },
      { token: 'keyword', foreground: '86efac' },
      { token: 'string', foreground: 'fde68a' },
      { token: 'number', foreground: 'fdba74' },
      { token: 'tag', foreground: '86efac' },
      { token: 'attribute.name', foreground: '5eead4' },
      { token: 'attribute.value', foreground: 'fde68a' },
      { token: 'identifier', foreground: 'e2e8f0' },
    ],
    colors: {
      'editor.background': '#0f172a',
      'editor.foreground': '#e2e8f0',
      'editorLineNumber.foreground': '#64748b',
      'editorLineNumber.activeForeground': '#86efac',
      'editor.selectionBackground': '#14532d',
      'editor.lineHighlightBackground': '#14532d55',
      'editorSuggestWidget.background': '#020617',
      'editorSuggestWidget.foreground': '#e2e8f0',
      'editorSuggestWidget.selectedBackground': '#166534',
      'editorSuggestWidget.border': '#334155',
    },
  })

  return monaco
}

export function pathToUri(path: string): monaco.Uri {
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '')
  return monaco.Uri.parse(`file:///${normalized}`)
}

export function languageForPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'ts' || ext === 'tsx') return 'typescript'
  if (ext === 'js' || ext === 'jsx' || ext === 'mjs' || ext === 'cjs') return 'javascript'
  if (ext === 'json') return 'json'
  if (ext === 'css' || ext === 'scss' || ext === 'less') return 'css'
  if (ext === 'html' || ext === 'htm' || ext === 'xml' || ext === 'svg') return 'html'
  if (ext === 'vue') return 'vue'
  if (ext === 'md') return 'markdown'
  return 'javascript'
}
