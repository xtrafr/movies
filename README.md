<h1 align="center">MovieFY</h1>

<p align="center">
  A fast, personal place to discover movies, series, and anime.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite" alt="Vite 8">
  <img src="https://img.shields.io/badge/License-MIT-2ea44f?style=flat-square" alt="MIT license">
</p>

<p align="center">
  <a href="#screenshots">Screenshots</a> | <a href="#features">Features</a> | <a href="#quick-start">Quick start</a> | <a href="#deployment">Deployment</a>
</p>

MovieFY is a responsive React app for searching and exploring TMDB titles, managing a device-local library, and opening third-party playback sources inside a custom player shell. No account is required.

## Screenshots

<p align="center">
  <img src="public/screenshots/landing.png" alt="MovieFY landing page" width="100%">
</p>

<p align="center">
  <img src="public/screenshots/catalog.png" alt="MovieFY discovery catalog" width="72%">
  <img src="public/screenshots/mobile.png" alt="MovieFY mobile catalog" width="24%">
</p>

## Features

- Search movies, TV shows, and anime with TMDB metadata
- Browse trending, popular, top-rated, and newly released titles
- Filter by media type and genre with a custom sort menu
- Five numbered playback sources in a simple custom player shell
- Automatic provider health checks, error detection, and timeout fallback
- Popup-restricted embeds on providers that support the browser sandbox
- Season and episode selectors for TV shows
- My List and watch history stored on the device
- Lightweight Firefox rendering fallbacks for systems without hardware acceleration
- Responsive layouts for desktop and phone screens
- Privacy-friendly Umami page views, performance data, and selected UI events through a same-origin proxy

## Quick start

You need Node.js 18 or newer and a free [TMDB API key](https://www.themoviedb.org/settings/api).

```bash
git clone https://github.com/xtrafr/movies.git
cd movies
npm install
copy .env.example .env
npm run dev
```

Set your key in `.env`:

```env
VITE_TMDB_API_KEY=your_tmdb_api_key
```

Vite will print the local address, normally [http://localhost:5173](http://localhost:5173).

## Playback

MovieFY does not host video files. It embeds independent providers that accept TMDB IDs. Availability, subtitles, quality controls, and player events vary by provider and region.

| Source | Role |
| --- | --- |
| VidPhantom | Primary source |
| VidKing | Episode support |
| 2Embed | Backup source |
| VidZee | High-quality backup |
| VidCore | Last fallback while the provider is unreliable |

Every playback session starts on source 1. MovieFY checks that source through `/api/player-health` and advances in order only when the automatically selected source returns an error page or cannot be reached. A numbered source selected manually is respected instead of being overridden by the preflight check. Real iframe load errors and provider-reported playback failures can still trigger fallback.

Sources 1 and 5 support a browser sandbox that blocks popups and top-window navigation. Sources 2, 3, and 4 explicitly reject any sandboxed iframe, so MovieFY loads those sources in compatibility mode. The web platform does not provide a separate permission that both hides the sandbox from the provider and blocks `window.open`.

## Tech stack

| Layer | Technology |
| --- | --- |
| UI | React 19 and plain CSS |
| Build | Vite 8 |
| Routing | React Router 7 |
| Motion | Framer Motion |
| Icons | Lucide React |
| Metadata | TMDB API |
| Analytics | Self-hosted Umami through `/app-data` |

## Project structure

```text
src/
  components/     cards, navigation, discovery controls, docs, player
  hooks/          app state and browser-specific behavior
  lib/            storage, playback, and utility modules
  pages/          landing and discovery routes
  styles/         global, landing, catalog, docs, and player styles
public/
  screenshots/    README previews
```

## Analytics

The tracker loads from `/app-data/script.js` and sends data back through the same path. Development uses the Vite proxy and production uses the external rewrite in `vercel.json`. Keeping the tracker on the site's own origin follows Umami's recommended server-level proxy approach and makes simple hostname-based blocking less likely.

Update the website ID in `index.html` if you deploy your own copy. Update the proxy destination in both `vite.config.js` and `vercel.json` if you use another Umami host.

## Deployment

### Vercel

1. Import the repository in Vercel.
2. Add `VITE_TMDB_API_KEY` to the project environment variables.
3. Deploy.

The included `vercel.json` provides SPA routing and the same-origin analytics proxy.

### Static hosting

```bash
npm run build
```

The production files are written to `dist/`. Hosts without server functions and platform rewrites need equivalents for the player health endpoint, SPA fallback, and `/app-data` proxy. A plain static host cannot provide those server-side checks and proxies by itself.

## Commands

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

## Legal

MovieFY is not affiliated with TMDB or any embedded playback provider. This product uses the TMDB API but is not endorsed or certified by TMDB. You are responsible for following the laws and provider terms that apply in your region.

## License

MIT
