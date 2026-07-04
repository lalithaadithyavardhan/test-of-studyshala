// migrations.js — no-op for AsyncStorage (no schema needed)
//
// Note: the old cache-tier fields (`cachedAt`, expiry-related bookkeeping)
// are no longer written by the app. Any old records still carrying them are
// harmless — they're just ignored — so no cleanup migration is needed.
export const runMigrations = async () => {
  // AsyncStorage needs no migration
  return Promise.resolve();
};