import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://sayan@localhost:5432/baranda_test";

export default defineConfig({
  plugins: [swc.vite()],
  test: {
    environment: "node",
    include: ["test/**/*.spec.ts", "test/**/*.e2e-spec.ts"],
    pool: "forks",
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: "test",
      PORT: "3002",
      DATABASE_URL: testDatabaseUrl,
      REDIS_URL: "redis://localhost:6379",
      JWT_ACCESS_SECRET: "test-access-secret-please-change-0123456789",
      JWT_REFRESH_PEPPER: "test-refresh-pepper-please-change-0123456789",
      MFA_ENCRYPTION_KEY: "dGVzdC1tZmEtZW5jcnlwdGlvbi1rZXktMzItYnl0ZXM=",
      WEB_ORIGIN: "http://localhost:3001",
      DEMO_PASSWORD: "demo1234",
    },
  },
});
