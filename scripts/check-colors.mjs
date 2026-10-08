#!/usr/bin/env node
/**
 * Fails if a themed UI file hard-codes a hex colour (README §6 "no hard-coded
 * colours"). Colours must come from CSS variables so every shop's theme applies.
 *
 * Allowed: the token/theme sources, email templates (email clients need hex),
 * OG image generation, and lines marked `// allow-color: <reason>`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOTS = ["src/components", "src/app", "src/styles"];
const ALLOW_FILES = [
  "src/styles/tokens.css",
  "src/app/globals.css",
  "src/domain/theme/",
  "src/domain/notifications/",
  "opengraph-image",
  "icon.tsx",
];
const HEX = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?\b/;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(tsx|ts|css)$/.test(name) && !/\.test\.tsx?$/.test(name)) yield p;
  }
}

const problems = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const rel = file.split(path.sep).join("/");
    if (ALLOW_FILES.some((a) => rel.includes(a))) continue;
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (line.includes("allow-color")) return;
        // ignore anchors like href="#top" / "#sec-services"
        const cleaned = line.replace(/["'`]#[a-z][\w-]*["'`]/g, "");
        if (HEX.test(cleaned)) problems.push(`${rel}:${i + 1}: ${line.trim()}`);
      });
  }
}

if (problems.length) {
  console.error("Hard-coded colours found (use theme variables instead):\n" + problems.join("\n"));
  process.exit(1);
}
console.log("✓ no hard-coded colours in themed UI");
