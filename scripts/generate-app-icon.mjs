#!/usr/bin/env node
/**
 * 从 resources/app-icon-source.jpg 生成 Android 各密度启动图标 + iOS AppIcon
 * 用法：node scripts/generate-app-icon.mjs [源图路径]
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const defaultSrc = join(root, 'resources', 'app-icon-source.jpg')
const src = resolve(process.argv[2] || defaultSrc)
const resRoot = join(root, 'android', 'app', 'src', 'main', 'res')
const iosIconDir = join(root, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset')

const densities = [
  { folder: 'mipmap-mdpi', launcher: 48, foreground: 108 },
  { folder: 'mipmap-hdpi', launcher: 72, foreground: 162 },
  { folder: 'mipmap-xhdpi', launcher: 96, foreground: 216 },
  { folder: 'mipmap-xxhdpi', launcher: 144, foreground: 324 },
  { folder: 'mipmap-xxxhdpi', launcher: 192, foreground: 432 },
]

async function resizeIcon(size) {
  return sharp(src)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer()
}

async function roundMask(size) {
  const r = size / 2
  return Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${r}" cy="${r}" r="${r}" fill="white"/></svg>`,
  )
}

async function main() {
  if (!existsSync(src)) {
    console.error('找不到源图：', src)
    process.exit(1)
  }

  mkdirSync(join(root, 'resources'), { recursive: true })
  if (src !== defaultSrc) {
    copyFileSync(src, defaultSrc)
    console.log('已保存源图到 resources/app-icon-source.jpg')
  }

  for (const d of densities) {
    const dir = join(resRoot, d.folder)
    mkdirSync(dir, { recursive: true })
    const launcher = await resizeIcon(d.launcher)
    const foreground = await resizeIcon(Math.round(d.foreground * 0.82))
    const fgCanvas = await sharp({
      create: {
        width: d.foreground,
        height: d.foreground,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: foreground, gravity: 'centre' }])
      .png()
      .toBuffer()

    const round = await sharp(launcher)
      .composite([{ input: await roundMask(d.launcher), blend: 'dest-in' }])
      .png()
      .toBuffer()

    await sharp(launcher).toFile(join(dir, 'ic_launcher.png'))
    await sharp(round).toFile(join(dir, 'ic_launcher_round.png'))
    await sharp(fgCanvas).toFile(join(dir, 'ic_launcher_foreground.png'))
    console.log(`✓ ${d.folder}`)
  }

  // iOS：单一 1024 图标（Xcode 13+ / Capacitor 默认 AppIcon.appiconset）
  if (existsSync(join(root, 'ios'))) {
    mkdirSync(iosIconDir, { recursive: true })
    const iosName = 'AppIcon-512@2x.png'
    await sharp(src)
      .resize(1024, 1024, { fit: 'cover', position: 'centre' })
      .png()
      .toFile(join(iosIconDir, iosName))
    writeFileSync(
      join(iosIconDir, 'Contents.json'),
      JSON.stringify(
        {
          images: [
            {
              filename: iosName,
              idiom: 'universal',
              platform: 'ios',
              size: '1024x1024',
            },
          ],
          info: { author: 'xcode', version: 1 },
        },
        null,
        2,
      ) + '\n',
    )
    console.log(`✓ iOS ${iosName}`)
  }

  console.log('\n图标已写入 android/app/src/main/res/mipmap-*')
  if (existsSync(join(root, 'ios'))) {
    console.log('图标已写入 ios/App/App/Assets.xcassets/AppIcon.appiconset/')
  }
  console.log('请重新打包：npm run release:apk:local 或 npm run release:ios:prepare')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
