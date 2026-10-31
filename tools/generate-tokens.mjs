import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toKebab = (value) =>
  value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

const toCamel = (value) => {
  const camel = value.replace(/-([a-z0-9])/g, (_, character) =>
    character.toUpperCase(),
  );
  return /^\d/.test(camel) ? `r${camel}` : camel;
};

const toArgb = (value) => {
  const rgba = value.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i,
  );

  if (rgba) {
    const [red, green, blue] = rgba.slice(1, 4).map(Number);
    const alpha = Math.round(
      (rgba[4] === undefined ? 1 : Number(rgba[4])) * 255,
    );
    const hex = (channel) =>
      channel.toString(16).padStart(2, "0").toUpperCase();
    return `0x${hex(alpha)}${hex(red)}${hex(green)}${hex(blue)}`;
  }

  if (/^#[0-9a-f]{6}$/i.test(value)) {
    return `0xFF${value.slice(1).toUpperCase()}`;
  }

  if (/^#[0-9a-f]{8}$/i.test(value)) {
    return `0x${value.slice(1).toUpperCase()}`;
  }

  throw new Error(`Unsupported color value: ${value}`);
};

const numberFromDimension = (value) => {
  const match = String(value).match(/^(-?[\d.]+)/);
  if (!match) {
    throw new Error(`Unsupported dimension value: ${value}`);
  }
  const number = Number(match[1]);
  return Number.isInteger(number) ? `${number}.0` : String(number);
};

const cubicFromCss = (value) => {
  const match = value.match(
    /^cubic-bezier\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)$/,
  );
  if (!match) {
    throw new Error(`Unsupported easing value: ${value}`);
  }
  return `Cubic(${match.slice(1).join(", ")})`;
};

const durationFromCss = (value) => {
  const match = value.match(/^(\d+)ms$/);
  if (!match) {
    throw new Error(`Unsupported duration value: ${value}`);
  }
  return `Duration(milliseconds: ${match[1]})`;
};

export function generate(tokensJson) {
  const tokens = JSON.parse(tokensJson);

  for (const section of ["color", "space", "radius", "shadow", "motion"]) {
    if (!tokens[section]) {
      throw new Error(`Missing token section: ${section}`);
    }
  }

  const lightColors = Object.entries(tokens.color)
    .map(([key, value]) => `  --${toKebab(key)}: ${value.light};`)
    .join("\n");

  const darkColors = Object.entries(tokens.color)
    .map(([key, value]) => `  --${toKebab(key)}: ${value.dark};`)
    .join("\n");

  const spaces = Object.entries(tokens.space)
    .map(([key, value]) => `  --space-${key}: ${value};`)
    .join("\n");

  const radii = Object.entries(tokens.radius)
    .map(([key, value]) => `  --radius-${key}: ${value};`)
    .join("\n");

  const shadows = Object.entries(tokens.shadow)
    .map(([key, value]) => `  --shadow-${key}: ${value};`)
    .join("\n");

  const motion = Object.entries(tokens.motion)
    .map(([key, value]) => `  --${toKebab(key)}: ${value};`)
    .join("\n");

  const css = `/* Generated from design/tokens.json. Do not edit by hand. */
:root {
${lightColors}
${spaces}
${radii}
${shadows}
${motion}
}

.dark {
${darkColors}
}
`;

  const lightDart = Object.entries(tokens.color)
    .map(
      ([key, value]) =>
        `  static const ${toCamel(key)} = Color(${toArgb(value.light)});`,
    )
    .join("\n");

  const darkDart = Object.entries(tokens.color)
    .map(
      ([key, value]) =>
        `  static const ${toCamel(key)}Dark = Color(${toArgb(value.dark)});`,
    )
    .join("\n");

  const dartSpaces = Object.entries(tokens.space)
    .map(
      ([key, value]) =>
        `  static const s${key} = ${numberFromDimension(value)};`,
    )
    .join("\n");

  const dartRadii = Object.entries(tokens.radius)
    .map(
      ([key, value]) =>
        `  static const ${toCamel(key)} = ${numberFromDimension(value)};`,
    )
    .join("\n");

  const dartMotion = Object.entries(tokens.motion)
    .map(([key, value]) => {
      if (value.startsWith("cubic-bezier(")) {
        return `  static const ${toCamel(key)} = ${cubicFromCss(value)};`;
      }
      return `  static const ${toCamel(key)} = ${durationFromCss(value)};`;
    })
    .join("\n");

  const dart = `// Generated from design/tokens.json. Do not edit by hand.
import 'package:flutter/animation.dart';

abstract final class AppColors {
${lightDart}
${darkDart}
}

abstract final class AppSpace {
${dartSpaces}
}

abstract final class AppRadius {
${dartRadii}
}

abstract final class AppMotion {
${dartMotion}
}
`;

  return { css, dart };
}

const isMain =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const source = readFileSync(join(root, "design/tokens.json"), "utf8");
  const { css, dart } = generate(source);

  const cssPath = join(root, "apps/web/src/styles/tokens.css");
  const dartPath = join(root, "apps/teacher_app/lib/design/tokens.dart");

  mkdirSync(dirname(cssPath), { recursive: true });
  mkdirSync(dirname(dartPath), { recursive: true });
  writeFileSync(cssPath, css);
  writeFileSync(dartPath, dart);

  console.log(`wrote ${cssPath}`);
  console.log(`wrote ${dartPath}`);
}
