import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'))

const swPath = join(root, 'public', 'sw.js')
let sw = readFileSync(swPath, 'utf-8')
sw = sw.replace(/const CACHE_NAME = ['"][^'"]+['"]/, `const CACHE_NAME = 'apice-pwa-v${version}'`)
writeFileSync(swPath, sw)

const manifestPath = join(root, 'public', 'manifest.webmanifest')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
manifest.version = version
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
