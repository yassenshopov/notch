import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    environmentMatchGlobs: [
      ["tests/hooks/**", "jsdom"],
      ["tests/components/**", "jsdom"],
    ],
    coverage: {
      provider: "v8",
      all: false,
      reporter: ["text", "json-summary"],
      thresholds: {
        lines: 55,
        functions: 50,
        branches: 45,
        statements: 55,
      },
    },
  },
})