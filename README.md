# Twitch Miner Frontend

Modern Angular frontend for managing Twitch Channel Points Miner instances.

## Features

- 🎮 Manage multiple miner instances
- 📊 Real-time log streaming via SSE
- 👥 User management & admin panel
- 🔐 JWT authentication

## Tech Stack

Angular 21 • TypeScript • Tailwind CSS v4

## Quick Start

```bash
npm install
npm start          # Dev server on :4200
npm run build      # Production build
npm run gen-api    # Generate API types from OpenAPI
```

## Production

```bash
npm run build
serve -s dist/twitch-miner-frontend/browser -l 7000
```

Backend API: `http://noxiousgaming.eu:8000`
