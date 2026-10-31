import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { generate } from "./generate-tokens.mjs";

test("generates CSS and Dart tokens from the same source", () => {
  const { css, dart } = generate(
    readFileSync(new URL("../design/tokens.json", import.meta.url), "utf8"),
  );

  assert.match(css, /--canvas:\s*#F5F5F7/);
  assert.match(css, /--blue:\s*#007AFF/);
  assert.match(css, /--radius-lg:\s*20px/);
  assert.match(css, /--ease-out:\s*cubic-bezier\(0\.23, 1, 0\.32, 1\)/);
  assert.match(dart, /static const canvas = Color\(0xFFF5F5F7\)/);
  assert.match(dart, /static const blue = Color\(0xFF007AFF\)/);
  assert.match(dart, /static const lg = 20\.0/);
  assert.match(dart, /static const easeOut = Cubic\(0\.23, 1, 0\.32, 1\)/);
});
