import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { createApp } from "./app.setup";
import { stableStringify } from "./common/http/stable-json";
import { OpenApiDocumentHolder } from "./modules/openapi/openapi-document.holder";

async function main() {
  const app = await createApp();
  try {
    const document = app.get(OpenApiDocumentHolder).get();
    if (!document) {
      throw new Error("The OpenAPI document was not generated.");
    }
    const routeCount = Object.keys(document.paths ?? {}).length;
    writeFileSync(
      resolve(process.cwd(), "openapi.json"),
      `${stableStringify(document)}\n`,
    );
    console.log(`Wrote openapi.json with ${routeCount} routes.`);
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error("OpenAPI generation failed:", error);
  process.exit(1);
});
