# Free portfolio deployment

AgriPulse is configured for Vercel (React), two Render web services (Express and FastAPI), and Supabase PostgreSQL.

## Required secrets

Never commit these values. Add them in the provider dashboards.

- Both Render services: `DATABASE_URL` — Supabase session-pooler PostgreSQL URL.
- API service: `FRONTEND_ORIGIN`, `NASS_API_KEY`, and `GATS_API_KEY`.
- Vercel: `VITE_API_BASE_URL=https://agripulse-api-joel.onrender.com/api`.

## Order

1. Create a Supabase project and copy its session-pooler connection string.
2. Import the repository as a Render Blueprint using `render.yaml` and enter requested secrets.
3. Import the repository in Vercel and add `VITE_API_BASE_URL`.
4. Set the Render API service's `FRONTEND_ORIGIN` to the final Vercel origin and redeploy it.
5. Apply migrations and seed once using the Supabase URL:

   ```bash
   DATABASE_URL="..." npm run db:deploy
   DATABASE_URL="..." npm run db:seed
   ```

The free deployment uses the deterministic, database-grounded Copilot fallback because a local Ollama server is not reachable from Render. Risk scoring, recommendations, RAG retrieval, citations, and answer-confidence evaluation remain available.
