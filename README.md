# Climate Capital

An interactive multiplayer game that tests climate investing skills using real events from 2015–2025.

## Overview

Players manage a $100M portfolio across 8 rounds, each based on a real period in climate finance history — from the Paris Agreement to the second Trump era. Choose from 22 investable assets spanning equities, ETFs, green bonds, infrastructure, carbon credits, and thematic funds.

## Features

- **22 investable assets** across 6 asset classes, with prices based on real historical performance
- **8 rounds** covering major climate events: Paris Agreement, Trump Shock, ESG Boom, COVID, IRA, and more
- **Multiplayer** — host a game and share the code for others to join
- **Trading interface** with position limits (40% max per asset) and lock periods for infrastructure assets
- **Leaderboard** updated each round
- **7 awards** at game end (Climate Capital Champion, Pure Alpha, Carbon Baron, Stranded Asset, Steady Hand, Greenwash Detector, Contrarian)
- **Educational content** — briefings before each round and takeaways after, with prediction questions
- **Portfolio chart** showing performance over the full decade

## Tech Stack

- **Backend:** Express.js (Node 20)
- **Frontend:** React 18 + Tailwind CSS + shadcn/ui
- **Charts:** Recharts
- **Animations:** Framer Motion
- **State:** In-memory (no database required)
- **Build:** Vite + esbuild

## Local Development

```bash
npm install
npm run dev
```

The app runs on port 5000.

## Deploy to Heroku

1. Create a new Heroku app from the dashboard
2. Connect it to this GitHub repository
3. Set the config var: `NPM_CONFIG_PRODUCTION=false`
4. Enable automatic deploys from `main` branch, or trigger a manual deploy
5. The app will build and start automatically

The `Procfile` and `heroku-postbuild` script handle the rest.

## Game Data

All asset prices, round briefings, takeaways, and prediction questions are defined in `shared/gameData.ts`. Asset prices are normalised to a $100 starting value and track real historical performance of their real-world counterparts.

## License

MIT
