// Minimal .env reader — avoids a dotenv dependency for two scripts. Next loads .env
// on its own; this is only for things run with bare node.
import { readFileSync } from 'node:fs'

export function loadEnv(url = new URL('../.env', import.meta.url)) {
  try {
    for (const line of readFileSync(url, 'utf8').split('\n')) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    /* no .env, rely on the real environment */
  }
}
