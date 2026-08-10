// Fails if the PT and EN message catalogs have divergent key sets.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "messages");
const locales = ["pt", "en"];

function flatten(obj, prefix = "") {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === "object" && value !== null
      ? flatten(value, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  );
}

const keySets = locales.map((locale) => ({
  locale,
  keys: new Set(
    flatten(JSON.parse(readFileSync(join(dir, `${locale}.json`), "utf8")))
  ),
}));

let failed = false;
for (const a of keySets) {
  for (const b of keySets) {
    if (a === b) continue;
    const missing = [...a.keys].filter((k) => !b.keys.has(k));
    if (missing.length > 0) {
      failed = true;
      console.error(
        `Keys in ${a.locale}.json missing from ${b.locale}.json:\n  ${missing.join("\n  ")}`
      );
    }
  }
}

if (failed) process.exit(1);
console.log(`Message catalogs in sync (${keySets[0].keys.size} keys).`);
