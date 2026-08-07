import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    {
      name: 'md-as-text',
      transform(code, id) {
        if (!id.endsWith('.md')) return null
        return { code: `export default ${JSON.stringify(code)};`, map: null }
      }
    }
  ]
})
