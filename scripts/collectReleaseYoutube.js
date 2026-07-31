import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const INPUT = "/tmp/acupoflyrics-release-batch-2026-07-31.json";
const args = new Set(process.argv.slice(2));
const singlesOnly = args.has("--singles");
const data = JSON.parse(await readFile(INPUT, "utf8"));
const tracks = singlesOnly ? data.tracks.filter((track) => track.kind === "single") : data.tracks;

function stripVtt(text) {
  const output = [];
  let previous = "";
  for (const raw of text.split(/\r?\n/)) {
    if (!raw || raw === "WEBVTT" || /^(Kind|Language):/.test(raw) || raw.includes("-->")) continue;
    const line = raw
      .replace(/<\d\d:\d\d:\d\d\.\d+>/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
    if (!line || line === previous) continue;
    previous = line;
    output.push(line);
  }
  return output.join("\n");
}

function searchQuery(track) {
  const artists = track.artists.slice(0, 2).map((artist) => artist.name).join(" ");
  return `${artists} ${track.name} official audio`;
}

async function collect(track) {
  const dir = await mkdtemp(join(tmpdir(), "acl-youtube-"));
  try {
    await execFileAsync("yt-dlp", [
      "--skip-download",
      "--write-info-json",
      "--write-subs",
      "--write-auto-subs",
      "--sub-langs", "en-orig,ko-orig,ja-orig,es-orig,fr-orig,tr-orig,pt-orig,en,ko,ja,es,fr,tr,pt",
      "--sub-format", "vtt",
      "--no-playlist",
      "--match-filter", "duration < 900",
      "-o", `${dir}/%(id)s.%(ext)s`,
      `ytsearch1:${searchQuery(track)}`,
    ], { maxBuffer: 20 * 1024 * 1024, timeout: 90_000 });
    const files = await readdir(dir);
    const infoFile = files.find((file) => /^[\w-]+\.info\.json$/.test(file));
    if (!infoFile) return null;
    const info = JSON.parse(await readFile(join(dir, infoFile), "utf8"));
    const subtitleFiles = files.filter((file) => file.endsWith(".vtt"));
    const captions = [];
    for (const file of subtitleFiles) {
      const language = file.replace(/\.vtt$/, "").split(".").slice(1).join(".");
      const text = stripVtt(await readFile(join(dir, file), "utf8"));
      if (text) captions.push({ language, text });
    }
    return {
      id: info.id,
      url: info.webpage_url || `https://www.youtube.com/watch?v=${info.id}`,
      title: info.title,
      channel: info.channel || info.uploader,
      duration: info.duration,
      captions,
    };
  } catch (error) {
    return { error: error.message.split("\n")[0] };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

let cursor = 0;
async function worker() {
  while (cursor < tracks.length) {
    const index = cursor;
    cursor += 1;
    const track = tracks[index];
    track.youtube = await collect(track);
    console.log(`${index + 1}/${tracks.length} ${track.artists[0]?.name} — ${track.name}: ${track.youtube?.captions?.length ? "altyazı" : "video"}`);
  }
}

await Promise.all(Array.from({ length: Math.min(5, tracks.length) }, () => worker()));
await writeFile(INPUT, `${JSON.stringify(data, null, 2)}\n`, "utf8");
const withCaptions = tracks.filter((track) => track.youtube?.captions?.length).length;
console.log(JSON.stringify({ processed: tracks.length, withCaptions, output: INPUT }, null, 2));
