# 🔥 EmarkNews Phoenix v7

AI-powered real-time news aggregator with multi-source RSS feeds.

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. Run locally:
```bash
npm start
```

## Railway Deployment

1. Connect to GitHub
2. Add Redis database
3. Deploy

## API Endpoints

- `GET /health` - Health check
- `GET /api/news/:section` - Get news (world, kr, tech, etc.)
- `GET /api/currency` - Get exchange rates
- `GET /api/youtube/:section` - Get YouTube videos

## Tech Stack

- Node.js 18+
- Express.js
- Redis (caching)
- Railway (deployment)
