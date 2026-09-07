import { build } from "esbuild";
import { mkdir, mkdtemp, readFile, readdir, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { buildHistoryCard, buildHomeIndex } from "./lib/homeIndex.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = process.env.ACL_CONTENT_OUTPUT ? path.resolve(process.env.ACL_CONTENT_OUTPUT) : ROOT;
const temporary = await mkdtemp(path.join(tmpdir(), "acl-home-index-"));
try {
  const bundle = await build({ entryPoints: [path.join(ROOT, "src/lib/content.js")], bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
  const runtimePath = path.join(temporary, "content.mjs");
  await writeFile(runtimePath, bundle.outputFiles[0].text);
  const content = await import(pathToFileURL(runtimePath));
  const { popGundemiArticles: articles } = await import(pathToFileURL(path.join(ROOT, "src/data/popGundemi.js")));
  const home = buildHomeIndex(content, articles[0]);
  await mkdir(path.join(OUTPUT, "src/data"), { recursive: true });
  await writeFile(path.join(OUTPUT, "src/data/homeIndex.json"), JSON.stringify(home));
  await writeFile(path.join(OUTPUT, "src/data/siteStats.json"), JSON.stringify({ totalPosts: content.totalPosts }));
  const cardDirectory = path.join(OUTPUT, "public/data/cards");
  await mkdir(cardDirectory, { recursive: true });
  const expected = new Set(content.allPosts.map((post) => `${post.slug}.json`));
  const stale = (await readdir(cardDirectory)).filter((filename) => filename.endsWith(".json") && !expected.has(filename));
  await Promise.all(stale.map((filename) => unlink(path.join(cardDirectory, filename))));
  await Promise.all(content.allPosts.map((post) => writeFile(path.join(cardDirectory, `${post.slug}.json`), JSON.stringify(buildHistoryCard(post, content)))));
  const json = JSON.stringify(home);
  console.log(`Generated home index: ${Buffer.byteLength(json)} bytes / ${gzipSync(json).length} bytes gzip; ${content.totalPosts} lazy history cards.`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
