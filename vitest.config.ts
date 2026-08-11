import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // e2e/ holds Playwright specs, which vitest's default glob would pick up.
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
  },
});
