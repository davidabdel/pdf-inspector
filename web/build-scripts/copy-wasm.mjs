import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(
  __dirname,
  "..",
  "node_modules",
  "@firecrawl",
  "pdf-inspector-wasm",
  "pdf_inspector_wasm_bg.wasm",
);
const destDir = join(__dirname, "..", "public");
const dest = join(destDir, "pdf_inspector_wasm_bg.wasm");

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`Copied wasm binary to ${dest}`);
