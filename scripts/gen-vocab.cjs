// 临时脚本：从 ECDICT csv 生成四六级词汇 json
// 用完即删
const fs = require('fs')
const path = require('path')
const readline = require('readline')

const SRC = path.join(process.env.TEMP || '/tmp', 'ecdict.csv')
const OUT = path.join(process.cwd(), 'src', 'data', 'vocab.json')

// CSV 行解析：处理带引号的字段
function parseLine(line) {
  const fields = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (c === ',' && !inQ) {
      fields.push(cur); cur = ''
    } else cur += c
  }
  fields.push(cur)
  return fields
}

// pos 形如 "n:40/v:54" -> 取首个词性
function posShort(pos) {
  if (!pos) return ''
  const first = pos.split('/')[0]
  const m = first.match(/^([a-z]+):/)
  return m ? m[1] + '.' : ''
}

function freqTag(bnc, frq) {
  const r = bnc || frq || 99999
  if (r <= 3000) return 'must'
  if (r <= 8000) return 'high'
  return 'mid'
}

async function main() {
  const stream = fs.createReadStream(SRC, 'utf8')
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })
  const header = await new Promise((res) => {
    rl.once('line', (l) => res(parseLine(l)))
  })
  const idx = {}
  header.forEach((h, i) => (idx[h] = i))
  const iWord = idx['word'], iPho = idx['phonetic'], iTrans = idx['translation'],
    iPos = idx['pos'], iTag = idx['tag'], iBnc = idx['bnc'], iFrq = idx['frq']

  const out = []
  let n = 0
  for await (const line of rl) {
    if (!line.trim()) continue
    const f = parseLine(line)
    const tag = f[iTag] || ''
    const is4 = /\bcet4\b/.test(tag)
    const is6 = /\bcet6\b/.test(tag)
    if (!is4 && !is6) continue
    const word = (f[iWord] || '').trim()
    if (!word || /\s/.test(word)) continue // 跳过短语
    let level = is4 && is6 ? 'both' : is4 ? 'cet4' : 'cet6'
    const trans = (f[iTrans] || '').replace(/\\n/g, '；').split('\n')[0].trim()
    if (!trans) continue
    out.push({
      id: 'ec-' + n,
      word,
      phonetic: (f[iPho] || '').trim(),
      pos: posShort(f[iPos]),
      meaning: trans,
      example: '',
      exampleCn: '',
      level,
      freq: freqTag(parseInt(f[iBnc]) || 0, parseInt(f[iFrq]) || 0),
    })
    n++
  }
  fs.writeFileSync(OUT, JSON.stringify(out), 'utf8')
  console.log('total', out.length)
  console.log('cet4', out.filter(x => x.level === 'cet4' || x.level === 'both').length)
  console.log('cet6', out.filter(x => x.level === 'cet6' || x.level === 'both').length)
  console.log('written', OUT)
}

main().catch((e) => { console.error(e); process.exit(1) })
