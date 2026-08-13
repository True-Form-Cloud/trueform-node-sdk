import { readFileSync } from 'node:fs'
import { defineConfig } from 'tsup'

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  define: {
    __TRUEFORM_VERSION__: JSON.stringify(packageJson.version),
  },
})