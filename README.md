# AgriPulse

AgriPulse is a full-stack U.S. agricultural commodity dashboard built with the same service split used by SafetyRouteAI:

- **Frontend:** React, TypeScript, Vite, React Router, plain CSS, React Simple Maps
- **API gateway:** Node.js, Express, TypeScript, Zod, Prisma
- **Intelligence service:** Python, FastAPI, asyncpg, optional Ollama
- **Database:** PostgreSQL
- **External data:** USDA NASS Quick Stats for crop statistics and Open-Meteo for state-level weather

The dashboard contains:

1. A live clock and date panel.
2. Five featured crop cards with latest stored price, price change, annual U.S. production volume, and production year.
3. An interactive U.S. map. Every state displays its two-letter abbreviation and leading tracked crop.
4. A state production bar graph that updates when a state is selected.
5. A weather panel with current conditions, seven-day forecast, and a crop-impact risk signal.
6. A database-grounded AI chatbot that retrieves bounded agricultural context from PostgreSQL before generating an answer.

> The included seed data is clearly marked as demo data. The interface refreshes automatically, but actual price freshness depends on the configured data source. USDA NASS price observations are periodic rather than exchange-tick quotes. Connect a licensed market feed if intraday futures pricing is required.

## Architecture

```text
Browser
  └── React + TypeScript + Vite
        └── Fetch service layer
              └── Node.js + Express API gateway
                    ├── Route
                    ├── Controller
                    ├── Service
                    ├── Repository
                    └── PostgreSQL through Prisma

Node gateway
  ├── USDA NASS synchronisation
  ├── Open-Meteo weather fetch and cache
  └── FastAPI intelligence client

FastAPI intelligence service
  ├── Safe SQL templates through asyncpg
  ├── Weather-impact scoring
  ├── Bounded database context builder
  └── Optional Ollama /api/chat call
```

The LLM never receives database credentials and does not generate unrestricted SQL. The intelligence service uses predefined repository queries to collect relevant price and production records.

## Folder structure

```text
agripulse-dashboard/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── styles/
│   │   ├── types/
│   │   └── utils/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── Dockerfile
│   └── package.json
├── intelligence/
│   ├── app/
│   │   ├── chat_service.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── repositories.py
│   │   └── weather_impact.py
│   ├── Dockerfile
│   └── requirements.txt
├── shared/
│   └── src/index.ts
├── database/
│   ├── migrations/
│   ├── seed/seed.ts
│   └── schema.prisma
├── docker-compose.yml
└── package.json
```

## Quick start with Docker

Requirements:

- Docker Desktop
- Optional: Ollama running on the host for LLM-generated responses
- Optional: USDA NASS API key for official data synchronisation

Create a root `.env` file when using Docker Compose:

```bash
cp .env.example .env
```

```env
ADMIN_API_KEY=change-me
NASS_API_KEY=
SYNC_INTERVAL_MINUTES=0
OLLAMA_MODEL=llama3.2:3b
```

Start the full application:

```bash
docker compose up --build
```

Open:

- Dashboard: `http://localhost:5173`
- Node API: `http://localhost:3000/api/health`
- FastAPI docs: `http://localhost:8000/docs`

The backend container applies the committed Prisma migration and runs the idempotent seed automatically.

## Local development

### 1. Start PostgreSQL

```bash
docker compose up -d postgres
```

### 2. Configure environments

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp intelligence/.env.example intelligence/.env
```

### 3. Install Node dependencies

```bash
npm install
```

### 4. Prepare the database

```bash
npm run db:generate
npm run db:deploy
npm run db:seed
```

### 5. Install and run the FastAPI service

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r intelligence/requirements.txt
npm run dev:intelligence
```

### 6. Run the frontend and Node gateway

```bash
npm run dev
```

Development URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Intelligence service: `http://localhost:8000`

## Ollama setup

The intelligence service falls back to a deterministic database summary when Ollama is unavailable.

To enable a local model:

```bash
ollama pull llama3.2:3b
ollama serve
```

Configure `intelligence/.env`:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
```

## USDA NASS synchronisation

Place the API key in `backend/.env`:

```env
NASS_API_KEY=your_key
ADMIN_API_KEY=your-admin-key
```

Run a synchronisation:

```bash
curl -X POST http://localhost:3000/api/admin/sync/usda \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your-admin-key" \
  -d '{"commodities":["corn","soybeans","wheat","sorghum","barley"]}'
```

The service requests national monthly `PRICE RECEIVED` observations and annual state `PRODUCTION` records, normalises the responses, and upserts them through the repository layer.

## Main API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Database-backed health check |
| GET | `/api/dashboard/overview` | Five crop cards and all state map summaries |
| GET | `/api/states` | State-level top crop summaries |
| GET | `/api/states/:code` | Crop production graph data for one state |
| GET | `/api/weather/:code` | Weather, forecast, and crop-impact signal |
| POST | `/api/chat` | Database-grounded chatbot response |
| GET | `/api/commodities` | Commodity catalogue |
| GET | `/api/prices/latest` | Latest stored price observations |
| POST | `/api/admin/sync/usda` | Protected USDA data synchronisation |

Success response:

```json
{
  "success": true,
  "data": {},
  "message": "Request completed successfully"
}
```

Error response:

```json
{
  "success": false,
  "message": "A clear error message"
}
```

## Example chatbot request

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the dominant crop in Iowa and how much was produced?",
    "stateCode": "IA"
  }'
```

The Node gateway validates the request, sends it to FastAPI, FastAPI retrieves safe database context, optionally calls Ollama, and Node stores the exchange in PostgreSQL.

## Data flow

### Dashboard load

```text
React DashboardPage
  → dashboardApi.getOverview()
  → GET /api/dashboard/overview
  → DashboardController
  → DashboardService
  → Commodity / Price / Production repositories
  → Prisma
  → PostgreSQL
```

### State selection

```text
User clicks a state
  → GET /api/states/:code
  → state production graph updates
  → GET /api/weather/:code
  → Open-Meteo forecast is fetched and cached
  → FastAPI weather analysis scores crop impact
  → weather panel updates
  → selected state is passed into chatbot context
```

### Chat request

```text
User question
  → POST /api/chat
  → Node validation and chat service
  → FastAPI /chat
  → safe repository queries against PostgreSQL
  → optional Ollama answer generation
  → citations and as-of date returned
  → exchange persisted in PostgreSQL
```

## Production build

```bash
npm run build
npm start
```

For a complete containerised production-style deployment:

```bash
docker compose up --build -d
```

## Security controls

- Database credentials and API keys stay on backend services.
- Zod validates Node API input.
- Pydantic validates FastAPI input.
- Helmet, CORS, rate limiting, and request body limits are enabled.
- Centralised Express error handling avoids exposing stack traces in production.
- The chatbot uses bounded repository queries rather than LLM-generated SQL.
- `.env`, build folders, and `node_modules` are ignored by Git.

## Data limitations

- Demo seed values are not official statistics.
- State-level weather uses a representative coordinate, not individual field coordinates.
- Weather impact is a decision-support signal, not a farm-level agronomic diagnosis.
- USDA NASS data is periodic. Intraday commodity futures require a separate licensed market-data provider.
