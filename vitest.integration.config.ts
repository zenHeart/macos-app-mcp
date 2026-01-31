import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Include only integration tests
    include: ["playground/integration/**/*.integration.ts"],
    // Set longer timeout for real API calls (60 seconds)
    testTimeout: 60000,
    hookTimeout: 120000, // 2 minutes for cleanup hooks
    // Run tests sequentially to avoid conflicts with macOS apps
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Enable environment variables for testing
    env: {
      MCP_ALLOW_DELETE: "true",
      MCP_ALLOW_UPDATE: "true",
    },
  },
});
