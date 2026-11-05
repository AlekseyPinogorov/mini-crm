import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Security tests talk to the local Supabase over HTTP.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
