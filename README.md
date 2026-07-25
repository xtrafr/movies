<h1 align="center">MovieFY</h1>

<p align="center">
  <strong>A cinematic discovery and streaming experience.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#tech-stack">Tech Stack</a> ·
  <a href="#project-structure">Structure</a> ·
  <a href="#api-keys">API Keys</a> ·
  <a href="#deployment">Deployment</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
</p>

---

## What is this?

MovieFY is a movie and TV show discovery app built with React. Search millions of titles powered by [The Movie Database (TMDB)](https://www.themoviedb.org/) API, browse trending content, and stream through multiple embedded video servers — all in a minimal, dark-themed UI with smooth animations.

It started as a weekend project and turned into something genuinely fun to use.

---

## Features

- **Search & Discovery** — Search across movies and TV shows with instant debounced results, or browse what's trending today
- **Multi-Server Streaming** — Switch between 4 embedded video servers (VidPhantom, VidCore, VidKing, 2Embed) with one click
- **TV Episode Navigation** — Season and episode dropdowns for navigating full TV series
- **Infinite Scroll** — Automatically loads more results as you scroll
- **Filter by Type** — Toggle between Movies, TV Shows, or explore everything
- **Responsive Design** — Optimized layout for desktop and mobile devices
- **Animated UI** — Smooth transitions powered by Framer Motion, including a proximity-based text weight effect on the landing page
- **Keyboard Accessible** — Cards and interactive elements support keyboard navigation

---

## Quick Start

You'll need [Node.js](https://nodejs.org/) (v18+) and a [TMDB API key](#api-keys).

```bash
git clone https://github.com/xtrafr/movies.git
cd movies
npm install
```

Create a `.env` file in the project root:

```env
VITE_TMDB_API_KEY=your_tmdb_api_key_here
```

Then run the dev server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and you're in.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [React 19](https://react.dev/) |
| Build Tool | [Vite 8](https://vite.dev/) |
| Styling | Plain CSS (CSS custom properties, glassmorphism) |
| Animation | [Framer Motion](https://www.framer.com/motion/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Routing | [React Router DOM 7](https://reactrouter.com/) |
| Data Source | [TMDB API](https://developer.themoviedb.org/) |
| Hosting | [Vercel](https://vercel.com/) |

---

## Project Structure

```
movies/
├── public/
│   └── website.ico
├── src/
│   ├── components/
│   │   ├── DotGrid.jsx          # Canvas dot animation background
│   │   ├── Hero.jsx             # Search input with debounce
│   │   ├── MovieCard.jsx        # Poster card with hover effects
│   │   ├── Navbar.jsx           # Filter pill navbar (Movies/TV/Explore)
│   │   ├── PlayerOverlay.jsx    # Video player with server switcher & episode nav
│   │   └── VariableProximityText.jsx  # Proximity-based font weight animation
│   ├── pages/
│   │   ├── Landing.jsx          # Marketing landing page
│   │   └── Search.jsx           # Core search & results page
│   ├── App.jsx                  # Router setup
│   ├── App.css                  # Component styles
│   └── index.css                # Global styles & CSS variables
├── index.html
├── vite.config.js
└── package.json
```

---

## API Keys

This app uses [The Movie Database (TMDB) API](https://developer.themoviedb.org/) for all movie and TV show data, search, and metadata.

You **need** a TMDB API key to run this project. Get one for free at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api).

> The TMDB API is free for non-commercial use (up to 40 requests per 10 seconds).

### Video Sources

MovieFY does **not** host any video content. Playback is handled through third-party embed providers:

| Server | URL | Notes |
|--------|-----|-------|
| **VidPhantom** | `vidphantom.com` | Default server |
| **VidCore** | `vidcore.org` | |
| **VidKing** | `vidking.net` | |
| **2Embed** | `2embed.stream` | |

All embed URLs accept TMDB IDs directly — no additional API keys are needed for the video sources.

> **Note:** Video availability depends on the third-party embed services. These services are not affiliated with this project.

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import the repository on [vercel.com](https://vercel.com)
3. Add the environment variable:
   - **Key:** `VITE_TMDB_API_KEY`
   - **Value:** your TMDB API key
4. Deploy

The included `vercel.json` handles configuration automatically.

### Manual

```bash
npm run build
```

The `dist/` folder contains the production build. Serve it with any static file server.

---

## Development

```bash
npm run dev      # Start dev server with HMR
npm run build    # Production build
npm run preview  # Preview production build locally
```

---

## License

MIT
