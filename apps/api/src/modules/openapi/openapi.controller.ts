import { Controller, Get } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { Public } from "../../common/authz/current-user";
import { notFound } from "../../common/errors/api-error";
import { OpenApiDocumentHolder } from "./openapi-document.holder";

@ApiExcludeController()
@Controller()
export class OpenApiController {
  constructor(private readonly holder: OpenApiDocumentHolder) {}

  @Public()
  @Get("openapi.json")
  document() {
    const document = this.holder.get();
    if (!document) throw notFound("The OpenAPI document");
    return document;
  }
}
