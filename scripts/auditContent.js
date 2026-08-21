import fs from "node:fs";
import path from "node:path";
import posts from "../src/data/posts.json" with { type: "json" };
import { languageInfo, languagesFor, translationLabel } from "../src/lib/languages.js";

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

function lyricBlocks(post, original) {
  return (post.blocks || []).filter((block) => block?.original === original);
}

function lyricText(post, original) {
  return lyricBlocks(post, original)
    .flatMap((block) => block.lines || [])
    .map((line) => String(line || ""))
    .join("\n");
}

const nativeScriptPattern = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u;
const sourcePlatformPattern = /\b(genius|musixmatch|lyrics?\s*translate)\b/i;
const inlineGlossPattern = /\(([\p{L}][\p{L}\p{N}'’ -]{2,})\)/giu;
const adlibWords = new Set([
  "ah", "ayy", "eh", "fah", "ha", "hey", "hoo", "huh", "la", "mm", "na", "nah", "oh", "ooh",
  "pa", "ra", "ram", "skrrt", "uh", "woo", "woah", "yeah", "yuh",
]);
const knownSourceGlosses = new Set([
  "adicto", "desperate measures", "editing point", "for keeps", "fucked up royally",
  "go hard", "going mia", "greed", "i got it bad for you", "ideals", "kite",
  "lost my jeong sin", "masterpiece", "me wrong", "mine", "o gi", "one hundred",
  "pretend", "rewind", "sandlot", "seollem", "string", "stuck on you", "tag", "you read",
]);

function normalizeGloss(value) {
  return String(value || "")
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasSuspiciousInlineGloss(line, originalContext = "") {
  const matches = [...String(line || "").matchAll(inlineGlossPattern)];
  const original = normalizeGloss(originalContext);
  return matches.some((match) => {
    const content = normalizeGloss(match[1]);
    if (!content || content.split(" ").every((word) => adlibWords.has(word))) return false;
    return knownSourceGlosses.has(content) || (` ${original} `).includes(` ${content} `);
  });
}

function translationQualityIssues(post) {
  const issues = [];
  const blocks = post.blocks || [];
  const languages = languagesFor(post);
  const translationLocale = languageInfo(languages.translation).locale;
  const translation = lyricText(post, false).toLocaleLowerCase(translationLocale);
  const translatedLanguageName = languageInfo(languages.translation).turkishName;

  blocks.forEach((block, blockIndex) => {
    const lines = Array.isArray(block?.lines) ? block.lines : [];
    lines.forEach((rawLine, lineIndex) => {
      const line = String(rawLine || "");
      const location = `${block.label || `blok ${blockIndex + 1}`} / satır ${lineIndex + 1}`;

      if (block.original && nativeScriptPattern.test(line)) {
        issues.push(rowFor(post, "native_script_not_romanized", `${location}: ${line}`));
      }
      if (/^\s*\*[^*]/.test(line) || /\*[^*]+\*/.test(block.label || "")) {
        issues.push(rowFor(post, "markdown_artifact_in_lyrics", `${location}: ${line}`));
      }
      const originalContext = blocks[blockIndex - 1]?.original
        ? (blocks[blockIndex - 1].lines || []).join("\n")
        : "";
      if (!block.original && hasSuspiciousInlineGloss(line, originalContext)) {
        const issue = languages.original === "en"
          ? "english_gloss_inside_translation"
          : "source_gloss_inside_translation";
        issues.push(rowFor(post, issue, `${location}: ${line}`));
      }
      if (!block.original && /(?:\(\d+\)|[¹²³⁴⁵⁶⁷⁸⁹])\s*[.!?…]*$/.test(line)) {
        issues.push(rowFor(post, "footnote_marker_inside_translation", `${location}: ${line}`));
      }
      if (/sözlerin anlamları|çeviri notları/i.test(line)) {
        issues.push(rowFor(post, "editorial_note_inside_lyrics", `${location}: ${line}`));
      }
      if (/\*{3,}|\b\w+\*\w+/u.test(line)) {
        issues.push(rowFor(post, "possible_unnecessary_censorship", `${location}: ${line}`));
      }
    });

    if (block.original && blocks[blockIndex + 1]?.original === false) {
      const translatedLines = blocks[blockIndex + 1].lines || [];
      const difference = Math.abs(lines.length - translatedLines.length);
      if (difference >= 2) {
        issues.push(rowFor(
          post,
          "section_line_count_mismatch",
          `${block.label || `blok ${blockIndex + 1}`}: orijinal ${lines.length}, ${translatedLanguageName} ${translatedLines.length}`,
        ));
      }
    }
  });

  Object.entries(post.annotations || {}).forEach(([key, note]) => {
    if (sourcePlatformPattern.test(String(note || ""))) {
      issues.push(rowFor(post, "source_platform_named_in_annotation", key));
    }
    if (!translation.includes(String(key).toLocaleLowerCase(translationLocale))) {
      issues.push(rowFor(post, "annotation_not_clickable_in_translation", key));
    }
  });

  return issues;
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
    const languages = languagesFor(post);
    if (!hasOriginalLyrics(post)) {
      issues.push(rowFor(post, "original_lyrics_missing", `${languageInfo(languages.original).turkishName}/orijinal söz bloğu yok`));
    }
    if (!hasTranslation(post)) issues.push(rowFor(post, "translation_missing", `${translationLabel(post)} bloğu yok`));
    return issues;
  });

const translationQuality = posts.flatMap(translationQualityIssues);

writeCsv("youtube-linki-olmayanlar.csv", [header, ...missingYoutube]);
writeCsv("gorseli-olmayanlar.csv", [header, ...imageIssues]);
writeCsv("cevirisi-olmayanlar.csv", [header, ...translationIssues]);
writeCsv("ceviri-kalite-sinyalleri.csv", [header, ...translationQuality]);

const summary = [
  ["metric", "count"],
  ["total_posts", posts.length],
  ["missing_youtube", missingYoutube.length],
  ["image_issues", imageIssues.length],
  ["translation_issues", translationIssues.length],
  ["translation_quality_signals", translationQuality.length],
];

writeCsv("ozet.csv", summary);

console.log(`Audit written to ${REPORT_DIR}`);
console.log(`Total posts: ${posts.length}`);
console.log(`Missing YouTube: ${missingYoutube.length}`);
console.log(`Image issues: ${imageIssues.length}`);
console.log(`Translation issues: ${translationIssues.length}`);
console.log(`Translation quality signals: ${translationQuality.length}`);
