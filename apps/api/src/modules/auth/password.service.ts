import { Injectable } from "@nestjs/common";

import {
  hashPassword,
  needsRehash,
  verifyPassword,
} from "../../common/security/password-hash";

@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return hashPassword(plain);
  }

  verify(stored: string | null, plain: string): Promise<boolean> {
    return verifyPassword(stored, plain);
  }

  needsRehash(stored: string): boolean {
    return needsRehash(stored);
  }
}
