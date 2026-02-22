# Twitch Miner Frontend — Docker-UI

> Dieser Branch (`lightweight`) ist auf das Docker-basierte Backend ausgerichtet.
> Das Frontend verwaltet Docker-basierte [TwitchDropsMiner](https://github.com/rangermix/TwitchDropsMiner)-Instanzen
> und proxied die eingebettete Miner-Web-UI authentifiziert durch das Backend.

[![Live](https://img.shields.io/badge/Live-miner.noxiousgaming.eu-9147ff)](https://miner.noxiousgaming.eu)

## Features

- Multi-User mit JWT-Authentifizierung (Login, Registration, Admin-Panel)
- Instanz-Verwaltung: Docker-Container starten/stoppen per Klick
- **Miner-Web-UI**: Authentifizierter Proxy-Zugriff auf die eingebettete Miner-Oberfläche (`/instances/{id}/ui`)
- Live Docker-Logs via SSE
- Angular 21, Signals, OnPush, Standalone Components, openapi-typescript

## Ecosystem

| Komponente | Beschreibung | Link |
|---|---|---|
| **Backend API** | Multi-User FastAPI-Orchestrator | [twicht-miner-api](https://github.com/CptObvs/twich-miner-api) (Branch: `lightweight`) |
| **Miner Engine** | TwitchDropsMiner Docker-Image | [rangermix/TwitchDropsMiner](https://github.com/rangermix/TwitchDropsMiner) |

## Quick Start

```bash
npm install
npm run gen-api   # API-Schema aus openapi.json generieren
npm start         # Dev-Server auf http://localhost:4200
```

## API-Schema aktualisieren

```bash
# Neue openapi.json vom Produktions-Backend holen
curl -s https://miner.noxiousgaming.eu/api/openapi.json > openapi.json
npm run gen-api
npm run format
```

## Build

```bash
npm run build     # Produktions-Build nach dist/
```

## Proxy-UI

Wenn eine Instanz läuft, erscheint ein "Open Miner UI"-Button.
Der Klick öffnet `https://miner.noxiousgaming.eu/api/instances/{id}/ui?token=<jwt>` im neuen Tab.
Das Backend setzt dabei ein Session-Cookie sodass alle Assets (CSS, JS, WebSocket) ohne Token-Wiederholung laden.
