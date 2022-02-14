import { defineConfig } from 'tsup'

export default defineConfig({
  dts: true,
  entry: ['src/index.ts'],
  splitting: false,
  sourcemap: true,
  clean: true,
  noExternal: ['find-up', 'configstore', 'ora']
})
