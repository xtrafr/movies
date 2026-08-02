import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { checkPlayerSource } from './server/playerHealth.js'

const playerHealthPlugin = () => ({
  name: 'moviefy-player-health',
  configureServer(server) {
    server.middlewares.use('/api/player-health', async (request, response) => {
      const url = new URL(request.url, 'http://localhost')
      const result = await checkPlayerSource({
        serverId: url.searchParams.get('server'),
        type: url.searchParams.get('type'),
        id: url.searchParams.get('id'),
        season: Number(url.searchParams.get('season') || 1),
        episode: Number(url.searchParams.get('episode') || 1),
      })
      response.setHeader('Content-Type', 'application/json')
      response.end(JSON.stringify(result))
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), playerHealthPlugin()],
  server: {
    proxy: {
      '/app-data': {
        target: 'https://umami.tail824e95.ts.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/app-data/, ''),
      }
    }
  }
})
