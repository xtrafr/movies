import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { handleAccountRequest } from './server/accountAuth.js'
import { checkPlayerSource } from './server/playerHealth.js'
import { requestTmdb } from './server/tmdbProxy.js'

const accountPlugin = (env) => ({
  name: 'moviefy-account-api',
  configureServer(server) {
    server.middlewares.use('/api/account', async (request, response) => {
      let body = ''
      for await (const chunk of request) {
        body += chunk
        if (body.length > 8192) {
          response.statusCode = 413
          response.setHeader('Content-Type', 'application/json')
          response.end(JSON.stringify({ error: 'Request is too large.' }))
          return
        }
      }
      request.body = body
      await handleAccountRequest(request, response, env)
    })
  },
})

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

const tmdbProxyPlugin = (apiKey) => ({
  name: 'moviefy-tmdb-proxy',
  configureServer(server) {
    server.middlewares.use('/api/tmdb', async (request, response) => {
      if (request.method !== 'GET') {
        response.statusCode = 405
        response.setHeader('Allow', 'GET')
        response.setHeader('Content-Type', 'application/json')
        response.end(JSON.stringify({ error: 'Method not allowed' }))
        return
      }

      const url = new URL(request.url, 'http://localhost')
      const result = await requestTmdb({
        endpoint: url.searchParams.get('path'),
        apiKey,
      })
      response.statusCode = result.status
      response.setHeader('Content-Type', result.contentType)
      response.end(result.body)
    })
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const supabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabasePublishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY
    || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || ''
  const tmdbApiKey = env.TMDB_API_KEY || env.VITE_TMDB_API_KEY || ''

  return {
    plugins: [react(), playerHealthPlugin(), tmdbProxyPlugin(tmdbApiKey), accountPlugin(env)],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(supabasePublishableKey),
    },
    server: {
      proxy: {
        '/app-data': {
          target: 'https://umami.tail824e95.ts.net',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/app-data/, ''),
        }
      }
    }
  }
})
