import { existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

function removeApks(dir) {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      removeApks(full)
      continue
    }
    if (name.toLowerCase().endsWith('.apk')) {
      rmSync(full, { force: true })
    }
  }
}

removeApks(resolve('dist'))
removeApks(resolve('android/app/src/main/assets'))
