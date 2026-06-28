// migrations.js — no-op for AsyncStorage (no schema needed)
export const runMigrations = async () => {
  // AsyncStorage needs no migration
  return Promise.resolve();
};
