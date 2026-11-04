import { randomBytes } from "node:crypto";

import argon2 from "argon2";

export const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$pOAoYzwUkUkEW9v9HtwkUw$aKNRjyntF/+vSRWkTl1lzksJPkSNqI5b+ndoBs7Fw2E";

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(
  stored: string | null,
  plain: string,
): Promise<boolean> {
  try {
    return await argon2.verify(stored ?? DUMMY_HASH, plain);
  } catch {
    return false;
  }
}

export function needsRehash(stored: string): boolean {
  try {
    return argon2.needsRehash(stored, ARGON2_OPTIONS);
  } catch {
    return true;
  }
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
