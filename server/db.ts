// DEPRECATED: The project now targets Cloudflare Pages + D1.
// For local development, use `npm run pages:dev` (wrangler) which provides
// a local D1 instance and the same bindings as production.
//
// This file is kept as a stub so legacy imports still type-check during the
// migration. The Express server entry point (server/index.ts) is no longer
// the deployment target.
throw new Error(
  "server/db.ts is no longer used. Run the app with `npm run pages:dev` (Cloudflare Pages + D1)."
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pool: any = null;
