import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { usdaNassService } from "./services/usdaNassService.js";

const server = app.listen(env.PORT, () => {
  console.log(`AgriPulse API running at http://localhost:${env.PORT}`);
});

let syncTimer: NodeJS.Timeout | undefined;
if (env.NASS_API_KEY) {
  const syncUsda = () => {
    void usdaNassService
      .sync()
      .then((result) => console.log(result.message))
      .catch((error: unknown) => console.error("Scheduled USDA sync failed", error));
  };

  syncUsda();
  if (env.SYNC_INTERVAL_MINUTES > 0) {
    const intervalMs = env.SYNC_INTERVAL_MINUTES * 60 * 1000;
    syncTimer = setInterval(syncUsda, intervalMs);
    syncTimer.unref();
  }
}

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received. Closing AgriPulse API.`);
  if (syncTimer) clearInterval(syncTimer);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
