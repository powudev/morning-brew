import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// 整合測試:打真實的本機 Supabase(需先 supabase start),與單元測試分開執行
// (不用 mergeConfig:它會把 include 陣列合併,導致單元測試也被跑進來)
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    include: ["tests/integration/**/*.integration.test.ts"],
    environment: "node",
    // 共用同一個本機資料庫,檔案依序執行
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
