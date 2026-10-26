import type { RunResult } from '@/domains/programming/types'

/**
 * 在无 allow-same-origin 的 iframe 中执行 JS，通过 postMessage 回收 console。
 */
export function runJavaScript(code: string, timeoutMs = 4000): Promise<RunResult> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('sandbox', 'allow-scripts')
    iframe.style.cssText = 'position:fixed;left:-9999px;width:0;height:0;border:0;opacity:0'
    document.body.appendChild(iframe)

    const logs: string[] = []
    let settled = false

    const finish = (result: RunResult) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      iframe.remove()
      resolve(result)
    }

    const onMessage = (ev: MessageEvent) => {
      if (ev.source !== iframe.contentWindow) return
      const data = ev.data as { channel?: string; type?: string; line?: string; message?: string }
      if (data?.channel !== 'prog-js-runner') return
      if (data.type === 'log' && typeof data.line === 'string') {
        logs.push(data.line)
        return
      }
      if (data.type === 'done') {
        finish({ ok: true, kind: 'text', output: logs.join('\n') || '(无输出)' })
        return
      }
      if (data.type === 'error') {
        finish({
          ok: false,
          kind: 'text',
          output: [logs.join('\n'), data.message || '运行错误'].filter(Boolean).join('\n'),
        })
      }
    }

    window.addEventListener('message', onMessage)

    const timer = window.setTimeout(() => {
      finish({ ok: false, kind: 'text', output: `执行超时（>${timeoutMs}ms）` })
    }, timeoutMs)

    const srcdoc = `<!DOCTYPE html><html><body><script>
(function () {
  var CH = 'prog-js-runner';
  function send(payload) {
    parent.postMessage(Object.assign({ channel: CH }, payload), '*');
  }
  function fmt(args) {
    return Array.prototype.map.call(args, function (a) {
      try {
        if (typeof a === 'string') return a;
        if (a instanceof Error) return a.stack || a.message;
        return JSON.stringify(a);
      } catch (e) {
        return String(a);
      }
    }).join(' ');
  }
  ;['log','info','warn','error','debug'].forEach(function (level) {
    console[level] = function () {
      send({ type: 'log', line: fmt(arguments) });
    };
  });
  window.onerror = function (msg) {
    send({ type: 'error', message: String(msg) });
    return true;
  };
  window.addEventListener('unhandledrejection', function (e) {
    send({ type: 'error', message: String(e.reason) });
  });
  try {
    (0, eval)(${JSON.stringify(code)});
    send({ type: 'done' });
  } catch (err) {
    send({ type: 'error', message: err && err.stack ? err.stack : String(err) });
  }
})();
<\/script></body></html>`

    iframe.srcdoc = srcdoc
  })
}
