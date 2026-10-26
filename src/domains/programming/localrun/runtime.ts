/**
 * 以下脚本以字符串形式注入沙箱 iframe（opaque origin），不能引用外部变量。
 */

/** 最先执行：console / 错误转发给父页面，存储与 process 兜底 */
export const BRIDGE_SCRIPT = `(function () {
  // allow-same-origin 时仍可能改 parent；先钉住真实父窗用于日志
  var __lrOut = window.parent;
  var send = function (type, text, level) {
    try { __lrOut.postMessage({ __localrun: 1, type: type, level: level || '', text: text }, '*') } catch (e) {}
  };
  var fmt = function (a) {
    try {
      if (a instanceof Error) return a.stack || a.message;
      if (typeof a === 'object' && a !== null) return JSON.stringify(a);
      return String(a);
    } catch (e) { return String(a) }
  };
  ['log', 'info', 'warn', 'error', 'debug'].forEach(function (level) {
    var orig = console[level];
    console[level] = function () {
      var args = Array.prototype.slice.call(arguments);
      send('console', args.map(fmt).join(' '), level);
      orig.apply(console, args);
    };
  });
  window.__localrunReport = function (err) { send('error', fmt(err)) };
  addEventListener('error', function (e) { send('error', fmt(e.error || e.message)) });
  addEventListener('unhandledrejection', function (e) { send('error', fmt(e.reason)) });
  ['localStorage', 'sessionStorage'].forEach(function (name) {
    try { window[name].getItem('__probe__') } catch (e) {
      var m = new Map();
      var s = {
        getItem: function (k) { return m.has(k) ? m.get(k) : null },
        setItem: function (k, v) { m.set(k, String(v)) },
        removeItem: function (k) { m.delete(k) },
        clear: function () { m.clear() },
        key: function (i) { return Array.from(m.keys())[i] || null },
        get length() { return m.size }
      };
      try { Object.defineProperty(window, name, { value: s, configurable: true }) } catch (e2) {}
    }
  });
  window.process = window.process || { env: { NODE_ENV: 'development' } };
  window.global = window.global || window;
  // esm.sh 上的 vue-router / pinia 等是 esm-bundler 构建，依赖这些编译期开关
  window.__VUE_OPTIONS_API__ = true;
  window.__VUE_PROD_DEVTOOLS__ = false;
  window.__VUE_PROD_HYDRATION_MISMATCH_DETAILS__ = false;
})();`

/**
 * 在 vendor UMD 之后执行：用全局 Vue / React 生成 ESM 垫片并写入 import map，
 * 保证项目代码和 esm.sh 依赖共用同一个 Vue / React 实例。
 */
export function importMapScript(remote: Record<string, string>): string {
  return `(function () {
  // 逐个 export，避免「巨大解构 / 保留字」导致整个 vue 垫片语法失败
  var ok = function (k) { return /^[A-Za-z_$][\\w$]*$/.test(k) && k !== 'default' };
  var mod = function (expr, obj, extra) {
    var keys = Object.getOwnPropertyNames(obj).filter(ok);
    var lines = ['const M=' + expr + ';', 'export default M;'];
    for (var i = 0; i < keys.length; i++) {
      lines.push('export const ' + keys[i] + '=M[' + JSON.stringify(keys[i]) + '];');
    }
    if (extra) lines.push(extra);
    return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(lines.join('\\n'));
  };
  var imports = ${JSON.stringify(remote)};
  if (window.Vue) imports['vue'] = mod('window.Vue', window.Vue);
  if (window.React) {
    imports['react'] = mod('window.React', window.React);
    var jsx = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(
      'const R=window.React;export const Fragment=R.Fragment;' +
      'export function jsx(t,p,k){return R.createElement(t,k===undefined?p:Object.assign({},p,{key:k}))}' +
      'export const jsxs=jsx;export const jsxDEV=jsx;'
    );
    imports['react/jsx-runtime'] = jsx;
    imports['react/jsx-dev-runtime'] = jsx;
  }
  if (window.ReactDOM) {
    imports['react-dom'] = mod('window.ReactDOM', window.ReactDOM);
    imports['react-dom/client'] = imports['react-dom'];
  }
  var s = document.createElement('script');
  s.type = 'importmap';
  s.textContent = JSON.stringify({ imports: imports });
  document.head.appendChild(s);
})();`
}

/** type=module：按模块 id 执行 CommonJS 代码；Vue/React 优先用 vendor 全局，避免 import map 垫片异常 */
export const MODULE_RUNTIME = `
const MODS = JSON.parse(document.getElementById('__localrun_mods').textContent);
const META = JSON.parse(document.getElementById('__localrun_meta').textContent);
const report = (e) => window.__localrunReport && window.__localrunReport(e);
Object.assign(window.process.env, META.processEnv || {});
const depNs = Object.create(null);
const depErr = Object.create(null);

function globalDep(s) {
  if (s === 'vue' && window.Vue) return window.Vue;
  if (s === 'react' && window.React) return window.React;
  if ((s === 'react-dom' || s === 'react-dom/client') && window.ReactDOM) return window.ReactDOM;
  return null;
}

await Promise.all(META.deps.map(async (s) => {
  try {
    const g = globalDep(s);
    if (g) { depNs[s] = g; return; }
    depNs[s] = await import(s);
  } catch (e) { depErr[s] = e }
}));

const cache = Object.create(null);
const interopNs = (m) => (m && m.__esModule ? m : Object.assign(Object.create(null), m && typeof m === 'object' ? m : {}, { default: m }));
const injectCss = (id, css) => {
  const el = document.createElement('style');
  el.dataset.module = id;
  el.textContent = css;
  document.head.appendChild(el);
};

function depExports(s) {
  if (depErr[s]) throw new Error('依赖加载失败：' + s + '\\n' + (depErr[s].message || depErr[s]));
  const key = 'dep:' + s;
  if (cache[key]) return cache[key].exports;
  const ns = depNs[s];
  if (!ns) throw new Error('依赖未加载：' + s);
  const out = { __esModule: true };
  // getOwnPropertyNames：vendor 全局上部分 API 可能不可枚举
  const names = typeof ns === 'object' && ns
    ? Object.getOwnPropertyNames(ns)
    : [];
  for (const k of names) {
    try { out[k] = ns[k] } catch (e) {}
  }
  if (!('default' in out)) out.default = ns;
  cache[key] = { exports: out };
  return out;
}

function req(id) {
  if (id.startsWith('dep:')) return depExports(id.slice(4));
  if (id.startsWith('depcss:')) return {};
  if (id.startsWith('asset:')) return { __esModule: true, default: id.slice(6) };
  if (id.startsWith('missing:')) throw new Error('找不到模块：' + id.slice(8));
  const hit = cache[id];
  if (hit) return hit.exports;
  const m = MODS[id];
  if (!m) throw new Error('模块未打包：' + id);
  const module = { exports: {} };
  cache[id] = module;
  if (m.css) injectCss(id, m.css);
  switch (m.k) {
    case 'css':
      return module.exports;
    case 'cssmod':
      module.exports = { __esModule: true, default: new Proxy({}, { get: (_, k) => (typeof k === 'string' ? k : undefined) }) };
      return module.exports;
    case 'json':
      module.exports = JSON.parse(m.v);
      return module.exports;
    case 'raw':
      module.exports = { __esModule: true, default: m.v };
      return module.exports;
    case 'err':
      delete cache[id];
      throw new Error('编译错误：' + m.v);
    default: {
      const fn = new Function('require', 'module', 'exports', '__import__', '__vite_env__', '__interop_ns__',
        m.c + '\\n//# sourceURL=localrun:///' + id);
      const dynImport = (s) => Promise.resolve().then(() => interopNs(req(s)));
      fn(req, module, module.exports, dynImport, META.env, interopNs);
      return module.exports;
    }
  }
}

function showError(e) {
  report(e);
  const box = document.createElement('pre');
  box.style.cssText = 'position:fixed;inset:auto 8px 8px 8px;max-height:45%;overflow:auto;margin:0;padding:10px 12px;' +
    'background:#fff4f1;color:#b4442f;border:1px solid #f0c2b6;border-radius:8px;font:12px/1.5 ui-monospace,Consolas,monospace;white-space:pre-wrap;z-index:2147483647';
  box.textContent = (e && (e.stack || e.message)) || String(e);
  document.body.appendChild(box);
}

try {
  for (const entry of META.entries) req(entry);
} catch (e) {
  showError(e);
}
`
