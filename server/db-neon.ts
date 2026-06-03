// D1 (Cloudflare's SQLite) factory. Kept the filename `db-neon.ts` for
// backward compat with existing imports — exports renamed accordingly.
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@shared/schema";

export function createD1Db(d1: D1Database) {
  return drizzle(d1, { schema });
}

// Back-compat alias used by older imports.
export const createNeonDb = (_unused: string) => {
  throw new Error("Neon driver has been replaced with Cloudflare D1. Use createD1Db(env.DB) instead.");
};

export type D1Db = ReturnType<typeof createD1Db>;
