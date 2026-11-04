import { Logger } from "@nestjs/common";

import { createApp } from "./app.setup";
import { loadEnv } from "./config/env";

async function bootstrap() {
  const env = loadEnv();
  const app = await createApp();
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  new Logger("Bootstrap").log(
    `Baranda API listening on http://0.0.0.0:${env.PORT}/v1`,
  );
}

if (require.main === module) {
  bootstrap().catch((error: unknown) => {
    new Logger("Bootstrap").error(
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  });
}
