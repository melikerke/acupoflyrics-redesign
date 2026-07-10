import fs from "node:fs";
import path from "node:path";
import posts from "../src/data/posts.json" with { type: "json" };

const SITE_URL = "https://www.acupoflyrics.com";
const REPORT_ROOT = path.join(process.cwd(), "reports", "site-audit");
const REPORT_DIR = path.join(REPORT_ROOT, new Date().toISOString().slice(0, 10));

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function writeCsv(filename, rows) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
  fs.writeFileSync(path.join(REPORT_DIR, filename), csv);
}

function publicPathExists(value) {
  if (!value || /^https?:\/\//i.test(value)) return true;
  const clean = String(value).replace(/^\/+/, "");
  return fs.existsSync(path.join(process.cwd(), "public", clean));
}

function hasTranslation(post) {
  return (post.blocks || []).some((block) => (
    block &&
    block.original === false &&
    Array.isArray(block.lines) &&
    block.lines.some((line) => String(line || "").trim())
  ));
}

function hasOriginalLyrics(post) {
  return (post.blocks || []).some((block) => (
    block &&
    block.original === true &&
    Array.isArray(block.lines) &&
    block.lines.some((line) => String(line || "").trim())
  ));
}

function rowFor(post, issue, detail = "") {
  return [
    post.id,
    post.artist,
    post.song,
    post.title,
    post.slug,
    `${SITE_URL}/${post.slug}/`,
    issue,
    detail,
  ];
}

ensureDir(REPORT_DIR);

const header = ["id", "artist", "song", "title", "slug", "url", "issue", "detail"];

const missingYoutube = posts
  .filter((post) => !String(post.youtubeUrl || "").trim())
  .map((post) => rowFor(post, "youtube_missing", "youtubeUrl alanı boş"));

const imageIssues = posts
  .flatMap((post) => {
    const issues = [];
    const image = post.image || post.cover;
    if (!String(image || "").trim()) {
      issues.push(rowFor(post, "image_missing", "image/cover alanı boş"));
    } else if (!publicPathExists(image)) {
      issues.push(rowFor(post, "image_file_missing", image));
    }
    return issues;
  });

const translationIssues = posts
  .flatMap((post) => {
    const issues = [];
    if (!hasOriginalLyrics(post)) issues.push(rowFor(post, "original_lyrics_missing", "İngilizce/orijinal söz bloğu yok"));
    if (!hasTranslation(post)) issues.push(rowFor(post, "translation_missing", "Türkçe çeviri bloğu yok"));
    return issues;
  });

writeCsv("youtube-linki-olmayanlar.csv", [header, ...missingYoutube]);
writeCsv("gorseli-olmayanlar.csv", [header, ...imageIssues]);
writeCsv("cevirisi-olmayanlar.csv", [header, ...translationIssues]);

const summary = [
  ["metric", "count"],
  ["total_posts", posts.length],
  ["missing_youtube", missingYoutube.length],
  ["image_issues", imageIssues.length],
  ["translation_issues", translationIssues.length],
];

writeCsv("ozet.csv", summary);

console.log(`Audit written to ${REPORT_DIR}`);
console.log(`Total posts: ${posts.length}`);
console.log(`Missing YouTube: ${missingYoutube.length}`);
console.log(`Image issues: ${imageIssues.length}`);
console.log(`Translation issues: ${translationIssues.length}`);
