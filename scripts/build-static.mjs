/** Copia el sitio estático a dist/ para Vercel */
import { cpSync, mkdirSync, readdirSync, statSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const OUT = join(ROOT, "dist");
const SKIP = new Set(["node_modules", ".git", ".vercel", "dist", "test-results", ".playwright", "scripts"]);

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(src)) {
    if (SKIP.has(name)) continue;
    const from = join(src, name);
    const to = join(dest, name);
    if (statSync(from).isDirectory()) copyDir(from, to);
    else cpSync(from, to);
  }
}

mkdirSync(OUT, { recursive: true });
copyDir(ROOT, OUT);
console.log("Static site ready in dist/");
