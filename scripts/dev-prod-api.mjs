import { spawn } from 'node:child_process'

process.env.VITE_API_BASE = process.env.VITE_API_BASE || 'https://tjb666.space'
console.log(`[dev:prod-api] VITE_API_BASE=${process.env.VITE_API_BASE}`)

const child = spawn('npx', ['vite', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
})
child.on('exit', (code) => process.exit(code ?? 0))
