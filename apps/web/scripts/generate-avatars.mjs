import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createAvatar } from "@dicebear/core";
import { notionists } from "@dicebear/collection";

const root = resolve(process.cwd(), "../..");
const webDir = join(root, "apps/web/public/avatars");
const flutterDir = join(root, "apps/teacher_app/assets/avatars");

mkdirSync(webDir, { recursive: true });
mkdirSync(flutterDir, { recursive: true });

const backgrounds = ["F2F7FF", "EAF7EF", "FFF6E8", "FDF0F0", "F5F2FF"];

for (let index = 1; index <= 36; index += 1) {
  const svg = createAvatar(notionists, {
    seed: `baranda-student-${String(index).padStart(2, "0")}`,
    size: 160,
    backgroundColor: backgrounds,
  })
    .toString()
    .replace(/<metadata[\s\S]*?<\/metadata>/g, "");

  const name = `student-${String(index).padStart(2, "0")}.svg`;
  writeFileSync(join(webDir, name), svg);
  writeFileSync(join(flutterDir, name), svg);
}

const attribution = `Illustrated avatars generated with DiceBear (notionists style).
DiceBear: https://www.dicebear.com
Notionists style by Zoish, licensed CC BY 4.0.
Seed values are synthetic and do not represent real people.
`;

writeFileSync(join(webDir, "ATTRIBUTION.txt"), attribution);
writeFileSync(join(flutterDir, "ATTRIBUTION.txt"), attribution);

console.log(`generated 36 avatars in ${webDir} and ${flutterDir}`);
