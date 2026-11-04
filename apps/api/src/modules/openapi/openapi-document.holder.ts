import { Injectable } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";

@Injectable()
export class OpenApiDocumentHolder {
  private document: OpenAPIObject | null = null;

  set(document: OpenAPIObject): void {
    this.document = document;
  }

  get(): OpenAPIObject | null {
    return this.document;
  }
}
