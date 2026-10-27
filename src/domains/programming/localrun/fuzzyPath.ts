/** 路径模糊匹配：支持 about/about.vue、about.vue、abt 等 */

export type FuzzyHit = { path: string; score: number }

function normalize(q: string) {
  return q.trim().replace(/\\/g, '/').toLowerCase()
}

function fuzzyScore(path: string, query: string): number {
  const p = path.toLowerCase()
  const q = normalize(query)
  if (!q) return 0
  if (p === q) return 10_000
  if (p.endsWith('/' + q) || p.endsWith(q)) return 8_000 - p.length
  if (p.includes(q)) {
    const at = p.indexOf(q)
    return 6_000 - at - (p.length - q.length)
  }

  let pi = 0
  let score = 0
  let streak = 0
  let last = -2
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi]!
    let found = -1
    for (let j = pi; j < p.length; j++) {
      if (p[j] === ch) {
        found = j
        break
      }
    }
    if (found < 0) return -1
    if (found === last + 1) {
      streak++
      score += 12 + streak * 4
    } else {
      streak = 0
      score += 4
    }
    if (found === 0 || p[found - 1] === '/' || p[found - 1] === '.' || p[found - 1] === '-' || p[found - 1] === '_') {
      score += 18
    }
    last = found
    pi = found + 1
  }
  const leaf = p.includes('/') ? p.slice(p.lastIndexOf('/') + 1) : p
  if (leaf.startsWith(q)) score += 80
  return score - p.length * 0.2
}

export function fuzzyFindPaths(paths: string[], query: string, limit = 40): FuzzyHit[] {
  const q = normalize(query)
  if (!q) return []
  const hits: FuzzyHit[] = []
  for (const path of paths) {
    const score = fuzzyScore(path, q)
    if (score < 0) continue
    hits.push({ path, score })
  }
  hits.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
  return hits.slice(0, limit)
}
