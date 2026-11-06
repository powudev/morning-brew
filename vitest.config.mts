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
    exclude: ["node_modules/**", "tests/e2e/**", "supabase/**", ".next/**", "out/**"],
    // 預設 node;元件測試檔頂端加 `// @vitest-environment jsdom`
    setupFiles: ["./vitest.setup.ts"],
    // 與 next.config.ts 的 trailingSlash: true 一致(next/link 在測試環境讀這個變數)
    env: { __NEXT_TRAILING_SLASH: "true" },
  },
});
