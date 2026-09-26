/**
 * `bun run build` — prebuild client assets for production.
 * Assets land in dist/ with content-hashed names + dist/manifest.json.
 * Old hashed bundles are removed first so dist/ only holds the current build.
 */
import { rmSync } from 'node:fs'
import { buildClientAssets } from '../src/server/assets'

rmSync('dist/assets', { recursive: true, force: true })
await buildClientAssets()
