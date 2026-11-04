import { Module } from "@nestjs/common";

import { OpenApiController } from "./openapi.controller";
import { OpenApiDocumentHolder } from "./openapi-document.holder";

@Module({
  controllers: [OpenApiController],
  providers: [OpenApiDocumentHolder],
  exports: [OpenApiDocumentHolder],
})
export class OpenApiModule {}
