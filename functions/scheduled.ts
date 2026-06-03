import { createD1Db } from "../server/db-neon";
import { DatabaseStorage } from "../server/storage";

interface Env {
  DB: D1Database;
}

export const onScheduled: ExportedHandlerScheduledHandler<Env> = async (event, env, ctx) => {
  const db = createD1Db(env.DB);
  const storage = new DatabaseStorage(db);

  try {
    const found = await storage.detectAndRecordAbandonedCarts(60);
    if (found > 0) {
      console.log(`[cron] Detected ${found} abandoned cart(s)`);
    }
  } catch (err) {
    console.error("[cron] Abandoned cart scan failed:", err);
  }
};
