# AgriPulse implementation plan

## Architecture

- React/Vite dashboard for presentation and interaction.
- Express/TypeScript API gateway for validation, CORS, public API orchestration, USDA ingestion, and Prisma access.
- FastAPI intelligence service for safe database-grounded chat and crop-weather analysis.
- PostgreSQL as the system of record.
- Optional Ollama model for natural-language generation.

## Dashboard layout

1. Top panel: brand, current date/time, five commodity snapshots.
2. Middle panel: interactive U.S. map and selected-state crop production graph.
3. Bottom-left: current weather, seven-day forecast, crop-impact analysis.
4. Bottom-right: AI analyst grounded in selected-state and commodity records.

## Backend flow

```text
Route → Controller → Service → Repository → Database
```

External APIs are called only from services. Credentials are never exposed to the frontend.

## Implementation order

1. Shared TypeScript contracts.
2. Prisma schema, migration, and 50-state seed.
3. Express state, dashboard, weather, and chat endpoints.
4. FastAPI database repository, weather scorer, and Ollama adapter.
5. React dashboard components and API service layer.
6. Docker deployment and documentation.
7. Syntax and configuration validation.
