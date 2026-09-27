import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  use: {
    baseURL: process.env.HB_TEST_BASE_URL || "http://127.0.0.1:3000",
    headless: true,
  },
  webServer: {
    command: process.env.HB_TEST_SERVER_COMMAND || "npm run dev",
    url: process.env.HB_TEST_BASE_URL || "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
  ],
});
