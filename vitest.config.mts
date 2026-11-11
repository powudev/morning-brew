import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**", "tests/e2e/**", "tests/integration/**", "supabase/**", ".next/**", "out/**"],
    setupFiles: ["./vitest.setup.ts"],
    env: { __NEXT_TRAILING_SLASH: "true" },
  },
});
