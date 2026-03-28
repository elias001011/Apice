import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'))
const displayVersion = version.replace(/\.0$/, '')

copyFileSync(join(root, 'Icon.svg'), join(root, 'public', 'Icon.svg'))

const swPath = join(root, 'public', 'sw.js')
let sw = readFileSync(swPath, 'utf-8')
sw = sw.replace(/const CACHE_NAME = ['"][^'"]+['"]/, `const CACHE_NAME = 'apice-pwa-v${displayVersion}'`)
writeFileSync(swPath, sw)

const manifestPath = join(root, 'public', 'manifest.webmanifest')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
manifest.version = displayVersion
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
