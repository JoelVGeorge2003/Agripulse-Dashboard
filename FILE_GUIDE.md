# Key file guide

- `frontend/src/pages/DashboardPage.tsx` — coordinates dashboard data and selected-state state.
- `frontend/src/components/TopPanel.tsx` — clock and five commodity cards.
- `frontend/src/components/AgricultureMap.tsx` — interactive U.S. crop map.
- `frontend/src/components/StateProductionChart.tsx` — selected-state crop bar graph.
- `frontend/src/components/WeatherImpactPanel.tsx` — weather and crop-impact panel.
- `frontend/src/components/ChatPanel.tsx` — database-grounded chat interface.
- `backend/src/services/dashboardService.ts` — builds the top cards and map summaries.
- `backend/src/services/stateService.ts` — aggregates state production.
- `backend/src/services/weatherService.ts` — fetches and caches Open-Meteo data.
- `backend/src/services/chatService.ts` — forwards chat to FastAPI and stores exchanges.
- `backend/src/services/usdaNassService.ts` — synchronises official USDA observations.
- `intelligence/app/chat_service.py` — safe context retrieval and optional Ollama generation.
- `intelligence/app/weather_impact.py` — crop-specific weather risk scoring.
- `database/schema.prisma` — relational database model.
- `database/seed/seed.ts` — idempotent demo data for five crops and 50 states.
- `docker-compose.yml` — PostgreSQL, FastAPI, Node, and frontend deployment.
