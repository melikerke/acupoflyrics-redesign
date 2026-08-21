import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POSTS_PATH = path.join(ROOT, "src/data/posts.json");
const POSTS_MIRROR_PATH = path.join(ROOT, "data/content/posts.json");
const FOOTNOTE_MARKS = /[¹²³⁴⁵⁶⁷⁸⁹⁰]+/g;
const UI_CHROME_LINE = /^(?:edit|more_vert|thumb_up|thumb_down|\d+(?:\.\d+)?s)$/i;
const ADLIB_TOKEN = String.raw`(?:ah+|ayy+|eh+|ew+|(?:ha){2,}|ha+|hey+|huh+|nah|ooh+|oh+|ow+|pow+|rr+|uh+|woo(?:-hoo)?|woah+|yeah+|what|meow)`;
const PRESERVED_ADLIBS = new RegExp(
  String.raw`^${ADLIB_TOKEN}(?:[,.!?…'\s-]+${ADLIB_TOKEN})*[.!?…]*$`,
  "i",
);
const KNOWN_SOURCE_GLOSSES = new Set([
  "adicto", "collapse", "desperate measures", "editing point", "for keeps",
  "fucked up royally", "go hard", "going mia", "greed", "i got it bad for you",
  "ideals", "kite", "lean", "lost my jeong sin", "masterpiece", "me wrong",
  "mine", "miss", "no fade out", "no more", "o gi", "one hundred", "pretend",
  "rewind", "run it", "sandlot", "seollem", "string", "stuck on you", "tag",
  "trained me", "you read",
]);
const TURKISH_HINTS = new Set([
  "artik", "ask", "bana", "ben", "beni", "benim", "benimsin", "bir", "biz",
  "bu", "degil", "diye", "evet", "gibi", "hadi", "hayir", "icin", "ile",
  "kalbim", "sana", "sen", "seni", "senin", "simdi", "tutuldum", "uzaklara",
]);
const ENGLISH_HINTS = new Set([
  "a", "an", "and", "are", "at", "back", "bad", "be", "for", "from", "get",
  "got", "in", "is", "it", "me", "my", "no", "of", "on", "out", "the", "to",
  "up", "we", "with", "without", "you", "your",
]);

function markerText(value) {
  return String(value || "")
    .trim()
    .replace(/^#{1,6}\s*/, "")
    .toLocaleLowerCase("tr-TR");
}

function isAnalysisMarker(value) {
  return /^(?:analiz|analysis)(?:\s*:.*)?$/.test(markerText(value));
}

function isNotesMarker(value) {
  return /^(?:çeviri\s+notları|translation\s+notes)(?:\s*\/\s*(?:çeviri\s+notları|translation\s+notes))?\s*:?.*$/.test(markerText(value));
}

function modelText(value) {
  if (Array.isArray(value)) return value.map((line) => String(line ?? "")).join("\n");
  if (typeof value === "string") return value;
  throw new Error("model alanı string veya satır dizisi olmalı.");
}

function stripTurnChrome(value) {
  const lines = modelText(value).replace(/\r/g, "").split("\n");
  while (["edit", "more_vert", ""].includes((lines[0] || "").trim())) lines.shift();
  if (/^(?:User|Model)\s+\d{1,2}:\d{2}\s*[AP]M$/i.test((lines[0] || "").replace(/[\u202f\u00a0]/g, " ").trim())) {
    lines.shift();
  }
  while (!(lines[0] || "").trim()) lines.shift();
  return lines.join("\n").trim();
}

function normalizeSection(value) {
  return String(value || "")
    .toLocaleLowerCase("en-US")
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sectionKey(value) {
  const structural = String(value || "").split(":", 1)[0];
  return normalizeSection(structural)
    .replace(/\s+rap section$/, "")
    .replace(/^chorus \d+$/, "chorus");
}

function normalizedWords(value, locale = "en-US") {
  return String(value || "")
    .toLocaleLowerCase(locale)
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSourceGloss(content, originalContext, targetLanguage, preserveParentheticals = []) {
  const clean = String(content || "").trim();
  if (!clean || PRESERVED_ADLIBS.test(clean)) return false;
  if (targetLanguage === "tr" && /[çğıöşüİ]/i.test(clean)) return false;
  const normalized = normalizedWords(clean, targetLanguage === "tr" ? "tr-TR" : "en-US");
  const preserved = preserveParentheticals.map((value) => normalizedWords(value, "en-US"));
  if (normalized && preserved.includes(normalized)) return false;
  const original = normalizedWords(originalContext, "en-US");
  if (normalized && (` ${original} `).includes(` ${normalized} `)) return true;
  if (targetLanguage === "en") return /[çğıöşüİ]/i.test(clean) || /[\uac00-\ud7a3\p{Script=Han}]/u.test(clean);
  if (/[\uac00-\ud7a3\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(clean)) return true;
  if (KNOWN_SOURCE_GLOSSES.has(normalized)) return true;
  const words = normalized.split(" ").filter(Boolean);
  if (words.some((word) => TURKISH_HINTS.has(word))) return false;
  if (words.some((word) => ENGLISH_HINTS.has(word))) return true;
  return false;
}

function cleanTargetLine(value, { originalContext, targetLanguage, preserveParentheticals = [] }) {
  const withoutFootnote = String(value || "").replace(FOOTNOTE_MARKS, "").trim();
  if (/^\([^)]*\)$/.test(withoutFootnote)) return withoutFootnote;
  return withoutFootnote
    .replace(/\s*\(([^)]*\p{L}[^)]*)\)/gu, (whole, content) => (
      isSourceGloss(content, originalContext, targetLanguage, preserveParentheticals) ? "" : whole
    ))
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parseTargetStanzas(model) {
  const body = stripTurnChrome(model);
  const lines = body.split("\n");
  const firstHeading = lines.findIndex((line) => /^\s*\[[^\n]+]\s*$/.test(line));
  if (firstHeading < 0) throw new Error("ilk [Kıta] başlığı bulunamadı.");

  const stanzas = [];
  const inlineNotes = [];
  let current = null;
  let stopIndex = lines.length;
  const flush = () => {
    if (!current) return;
    stanzas.push(current);
    current = null;
  };

  for (let index = firstHeading; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (isAnalysisMarker(line) || isNotesMarker(line) || UI_CHROME_LINE.test(line)) {
      stopIndex = index;
      break;
    }
    const heading = line.match(/^\[(.+)]$/);
    if (heading) {
      flush();
      current = { section: heading[1].trim(), lines: [] };
      continue;
    }
    if (!current || !line) continue;
    if (line.startsWith("|||")) {
      inlineNotes.push(line);
      continue;
    }
    current.lines.push(line);
  }
  flush();
  if (!stanzas.length) throw new Error("model yanıtında hedef kıta bulunamadı.");
  return { body, lines, stanzas, inlineNotes, stopIndex };
}

function lyricPairs(post) {
  if (!Array.isArray(post.blocks) || !post.blocks.length) {
    throw new Error("post.blocks boş veya geçersiz.");
  }
  const pairs = [];
  for (let index = 0; index < post.blocks.length; index += 2) {
    const original = post.blocks[index];
    const target = post.blocks[index + 1];
    if (!original?.original || !target || target.original !== false) {
      throw new Error(`blocks yapısı ${index}. indiste original/target çifti değil.`);
    }
    if (!Array.isArray(original.lines) || !Array.isArray(target.lines)) {
      throw new Error(`blocks yapısındaki ${index / 2 + 1}. çiftin lines alanı geçersiz.`);
    }
    pairs.push({ originalIndex: index, targetIndex: index + 1, original, target });
  }
  return pairs;
}

function translationMapFor(item, stanzas, pairs) {
  if (item.translationMap == null) {
    if (stanzas.length !== pairs.length) {
      throw new Error(`kıta sayısı uyuşmuyor (model ${stanzas.length}, post ${pairs.length}); explicit translationMap gerekli.`);
    }
    return pairs.map((_, index) => index);
  }
  if (!Array.isArray(item.translationMap) || item.translationMap.length !== pairs.length) {
    throw new Error(`translationMap uzunluğu post kıta sayısıyla eşleşmeli (${item.translationMap?.length ?? "geçersiz"}/${pairs.length}).`);
  }
  return item.translationMap.map((sourceIndex, index) => {
    if (sourceIndex == null) return null;
    if (!Number.isInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= stanzas.length) {
      throw new Error(`translationMap[${index}] geçersiz model kıta indisi: ${sourceIndex}`);
    }
    return sourceIndex;
  });
}

function assertStanzaStructure(stanzas, pairs, translationMap) {
  for (let index = 0; index < pairs.length; index += 1) {
    const sourceIndex = translationMap[index];
    if (sourceIndex == null) continue;
    const modelSection = sectionKey(stanzas[sourceIndex].section);
    const postSection = sectionKey(pairs[index].target.label || pairs[index].original.label);
    if (!modelSection || !postSection || modelSection !== postSection) {
      throw new Error(`${index + 1}. kıta başlığı uyuşmuyor (model[${sourceIndex}] "${stanzas[sourceIndex].section}", post "${pairs[index].target.label || pairs[index].original.label || ""}").`);
    }
  }
}

function trimMarkdown(value) {
  return String(value || "")
    .replace(FOOTNOTE_MARKS, "")
    .replace(/^\s*[-*#]+\s*/, "")
    .replace(/^\*+|\*+$/g, "")
    .trim();
}

function annotationCandidates(heading, rawNote) {
  const candidates = [];
  const add = (value) => {
    const clean = trimMarkdown(value).replace(/^['"“”]+|['"“”]+$/g, "").trim();
    if (clean.length >= 3 && clean.length <= 120 && !candidates.includes(clean)) candidates.push(clean);
  };
  add(heading);
  for (const part of String(heading || "").split(/\s*[/|]\s*/)) add(part);
  for (const match of String(rawNote || "").matchAll(/["“”']([^"“”']{2,120})["“”']/g)) add(match[1]);
  for (const match of String(heading || "").matchAll(/\(([^)]{2,120})\)/g)) add(match[1]);
  add(String(heading || "").replace(/\s*\([^)]*\)\s*$/, ""));
  return candidates.sort((a, b) => b.length - a.length);
}

function actualTargetMatch(candidate, targetText) {
  const escaped = String(candidate || "")
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
  if (!escaped) return null;
  return targetText.match(new RegExp(escaped, "iu"))?.[0] || null;
}

function annotationFromParts({ heading, text, raw, fallbackWord = null }, targetText, context) {
  const word = (fallbackWord && targetText.includes(fallbackWord) ? fallbackWord : null)
    || annotationCandidates(heading, raw)
      .map((candidate) => actualTargetMatch(candidate, targetText))
      .find(Boolean);
  if (!word) throw new Error(`${context}: açıklama anahtarı hedef metinde birebir bulunamadı ("${heading}").`);
  const cleanText = trimMarkdown(text);
  if (!cleanText) throw new Error(`${context}: açıklama metni boş.`);
  return { word, text: cleanText };
}

function parseInlineAnnotations(lines, targetText, footnoteTargets, keyHints = []) {
  if (!Array.isArray(keyHints)) throw new Error("annotationKeyHints dizi olmalı.");
  if (keyHints.slice(lines.length).some(Boolean)) {
    throw new Error(`annotationKeyHints sayısı satır içi açıklama sayısını aşıyor (${keyHints.length}/${lines.length}).`);
  }
  return lines.map((rawLine, index) => {
    const marker = rawLine.match(/^\|\|\|\s*([¹²³⁴⁵⁶⁷⁸⁹⁰]+)/)?.[1] || null;
    const raw = trimMarkdown(rawLine.replace(/^\|\|\|\s*/, ""));
    const colon = raw.indexOf(":");
    if (colon < 1) throw new Error(`satır içi açıklama ${index + 1}: ':' ile ayrılmış başlık bulunamadı.`);
    const heading = raw.slice(0, colon).trim();
    const hintedWord = keyHints[index] == null ? null : actualTargetMatch(keyHints[index], targetText);
    if (keyHints[index] != null && !hintedWord) {
      throw new Error(`satır içi açıklama ${index + 1}: manifest hint hedef metinde birebir bulunamadı ("${keyHints[index]}").`);
    }
    return annotationFromParts({
      heading,
      text: raw,
      raw,
      fallbackWord: (marker ? footnoteTargets.get(marker) : null) || hintedWord,
    }, targetText, `satır içi açıklama ${index + 1}`);
  });
}

function numberedNoteSections(lines, markerIndex) {
  if (markerIndex < 0) return [];
  const sections = [];
  let current = null;
  const flush = () => {
    if (current) sections.push(current);
    current = null;
  };
  for (const rawLine of lines.slice(markerIndex + 1)) {
    const line = rawLine.trim();
    if (UI_CHROME_LINE.test(line)) break;
    const heading = line.match(/^[¹²³⁴⁵⁶⁷⁸⁹⁰\d]+[.)]?\s+(.+)$/);
    if (heading) {
      flush();
      current = { heading: heading[1].trim(), lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  flush();
  return sections;
}

function paragraphForLanguage(lines, language) {
  const wanted = language === "en" ? "EN" : "TR";
  const paragraphs = { EN: [], TR: [] };
  let active = null;
  for (const line of lines) {
    const marker = line.match(/^(EN|TR):\s*(.*)$/i);
    if (marker) {
      active = marker[1].toUpperCase();
      if (marker[2]) paragraphs[active].push(marker[2].trim());
    } else if (active && line) {
      paragraphs[active].push(line);
    }
  }
  return paragraphs[wanted].join(" ").trim();
}

function parseNumberedAnnotations(parsed, targetText, language) {
  const markerIndex = parsed.lines.findIndex((line) => isNotesMarker(line));
  if (markerIndex < 0) return [];
  const sections = numberedNoteSections(parsed.lines, markerIndex);
  if (!sections.length) throw new Error("Çeviri Notları bölümü var ancak numaralı açıklama bulunamadı.");
  return sections.map((section, index) => {
    const text = paragraphForLanguage(section.lines, language);
    if (!text) throw new Error(`numaralı açıklama ${index + 1}: ${language.toUpperCase()} metni bulunamadı.`);
    return annotationFromParts({
      heading: section.heading,
      text,
      raw: `${section.heading}\n${section.lines.join("\n")}`,
    }, targetText, `numaralı açıklama ${index + 1}`);
  });
}

function annotationsFromModel(parsed, targetText, language, keyHints) {
  const annotations = [
    ...parseInlineAnnotations(parsed.inlineNotes, targetText, parsed.footnoteTargets, keyHints),
    ...parseNumberedAnnotations(parsed, targetText, language),
  ];
  const byWord = new Map();
  for (const annotation of annotations) {
    const key = annotation.word.toLocaleLowerCase(language === "en" ? "en-US" : "tr-TR");
    const existing = byWord.get(key);
    if (existing && existing.text !== annotation.text) {
      throw new Error(`"${annotation.word}" için çelişen iki açıklama bulundu.`);
    }
    if (!existing) byWord.set(key, annotation);
  }
  return [...byWord.values()];
}

function manifestByNav(value) {
  if (!value) return new Map();
  const entries = Array.isArray(value)
    ? value
    : Array.isArray(value.items)
      ? value.items
      : Object.entries(value).map(([navIndex, entry]) => ({ navIndex, ...(typeof entry === "string" ? { slug: entry } : entry) }));
  const result = new Map();
  for (const [index, entry] of entries.entries()) {
    if (!entry || typeof entry !== "object" || entry.navIndex == null) {
      throw new Error(`Manifest ${index + 1}. öğesinde navIndex eksik.`);
    }
    const key = String(entry.navIndex);
    if (result.has(key)) throw new Error(`Manifestte yinelenen navIndex: ${key}`);
    result.set(key, entry);
  }
  return result;
}

function inputItems(value, manifest) {
  const items = Array.isArray(value) ? value : value?.items;
  if (!Array.isArray(items) || !items.length) {
    throw new Error("Girdi boş; JSON bir dizi veya { items: [...] } olmalı.");
  }
  const manifestEntries = manifestByNav(manifest);
  const seen = new Set();
  const seenManifestNav = new Set();
  const normalizedItems = items.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`${index + 1}. girdi öğesi geçersiz.`);
    const manifestEntry = item.navIndex == null ? null : manifestEntries.get(String(item.navIndex));
    if (item.navIndex != null) {
      const navKey = String(item.navIndex);
      if (seenManifestNav.has(navKey)) throw new Error(`Girdide yinelenen navIndex: ${navKey}`);
      seenManifestNav.add(navKey);
    }
    if (item.slug && manifestEntry?.slug && item.slug !== manifestEntry.slug) {
      throw new Error(`${item.navIndex}: girdi slug ile manifest slug çelişiyor (${item.slug}/${manifestEntry.slug}).`);
    }
    const slug = String(item.slug || manifestEntry?.slug || "").trim();
    if (!slug) throw new Error(`${index + 1}. girdi öğesinde slug eksik.`);
    if (seen.has(slug)) throw new Error(`Girdide yinelenen slug: ${slug}`);
    seen.add(slug);
    const model = modelText(item.model);
    if (!model.trim()) throw new Error(`${slug}: model yanıtı boş.`);
    return {
      ...manifestEntry,
      ...item,
      slug,
      model,
      translationMap: item.translationMap ?? manifestEntry?.translationMap,
    };
  });
  for (const [navIndex, entry] of manifestEntries) {
    if (!seenManifestNav.has(navIndex) && !entry.unavailable) {
      throw new Error(`Manifestteki ${navIndex} navIndex girdilerde yok; unavailable nedeni belirtilmeli.`);
    }
  }
  return normalizedItems;
}

function targetLanguage(post) {
  return post.languages?.annotations || post.languages?.translation || "tr";
}

function applyOne(posts, item) {
  const matches = posts.filter((post) => post.slug === item.slug);
  if (matches.length !== 1) throw new Error(`post slug eşleşmesi tekil değil (${matches.length}).`);
  const post = matches[0];
  const pairs = lyricPairs(post);
  const parsed = parseTargetStanzas(item.model);
  const translationMap = translationMapFor(item, parsed.stanzas, pairs);
  assertStanzaStructure(parsed.stanzas, pairs, translationMap);
  const language = targetLanguage(post);
  const footnoteTargets = new Map();
  const mappedTargets = pairs.map((pair, index) => {
    const sourceIndex = translationMap[index];
    if (sourceIndex == null) return null;
    const originalContext = pair.original.lines.join("\n");
    if (!parsed.stanzas[sourceIndex].lines.length) {
      throw new Error(`${index + 1}. hedef kıta [${parsed.stanzas[sourceIndex].section}] boş; korumak için translationMap'e null yazın.`);
    }
    return parsed.stanzas[sourceIndex].lines.map((rawLine) => {
      const clean = cleanTargetLine(rawLine, {
        originalContext,
        targetLanguage: language,
        preserveParentheticals: item.preserveParentheticals || [],
      });
      if (!clean) throw new Error(`${index + 1}. kıtada gloss temizliği sonrası boş hedef dize kaldı.`);
      for (const marker of rawLine.match(FOOTNOTE_MARKS) || []) {
        const existing = footnoteTargets.get(marker);
        if (existing && existing !== clean) throw new Error(`${marker} açıklama işareti birden fazla hedef dizede kullanılmış.`);
        footnoteTargets.set(marker, clean);
      }
      return clean;
    });
  });
  const effectiveTargets = mappedTargets.map((lines, index) => lines || pairs[index].target.lines);
  const targetText = effectiveTargets.flat().join("\n");
  const annotations = annotationsFromModel(
    { ...parsed, footnoteTargets },
    targetText,
    language,
    item.annotationKeyHints || [],
  );
  const originalBefore = JSON.stringify(post.blocks.filter((block) => block.original));
  const targetIndexes = new Map(pairs.map((pair, index) => [pair.targetIndex, index]));
  const beforeTarget = pairs.map((pair) => pair.target.lines);
  const beforeAnnotations = post.annotations || {};
  const beforeReadingTime = post.reading_time;

  post.blocks = post.blocks.map((block, index) => {
    const stanzaIndex = targetIndexes.get(index);
    const lines = stanzaIndex == null ? null : mappedTargets[stanzaIndex];
    return !lines ? block : { ...block, lines: [...lines] };
  });
  post.annotations = Object.fromEntries(annotations.map(({ word, text }) => [word, text]));
  const wordCount = post.blocks
    .flatMap((block) => block.lines || [])
    .join(" ")
    .split(/\s+/)
    .filter(Boolean)
    .length;
  post.reading_time = Math.max(1, Math.round(wordCount / 200));
  if (JSON.stringify(post.blocks.filter((block) => block.original)) !== originalBefore) {
    throw new Error("güvenlik denetimi: original bloklar değişti.");
  }

  return {
    slug: item.slug,
    navIndex: item.navIndex ?? null,
    turnId: item.turnId ?? null,
    modelSha256: createHash("sha256").update(item.model).digest("hex"),
    modelStanzas: parsed.stanzas.length,
    appliedTargetLines: mappedTargets.reduce((sum, lines) => sum + (lines?.length || 0), 0),
    annotations: annotations.length,
    changedTargetBlocks: beforeTarget.filter((lines, index) => (
      mappedTargets[index] && JSON.stringify(lines) !== JSON.stringify(mappedTargets[index])
    )).length,
    preservedTargetBlocks: translationMap.filter((sourceIndex) => sourceIndex == null).length,
    partial: translationMap.some((sourceIndex) => sourceIndex == null),
    unusedModelStanzas: parsed.stanzas
      .map((_, index) => index)
      .filter((index) => !translationMap.includes(index)),
    annotationsChanged: JSON.stringify(beforeAnnotations) !== JSON.stringify(post.annotations),
    readingTimeChanged: beforeReadingTime !== post.reading_time,
  };
}

export function reconcilePosts(rawInput, currentPosts, { manifest = null } = {}) {
  const items = inputItems(rawInput, manifest);
  const manifestEntries = manifestByNav(manifest);
  const inputNavIndexes = new Set(items.map((item) => String(item.navIndex)).filter((value) => value !== "undefined"));
  const posts = structuredClone(currentPosts);
  const reports = [];
  const failures = [];
  for (const item of items) {
    if (item.skip) {
      reports.push({
        slug: item.slug,
        navIndex: item.navIndex ?? null,
        turnId: item.turnId ?? null,
        status: "skipped",
        reason: String(item.skip),
      });
      continue;
    }
    try {
      reports.push({ status: "reconciled", ...applyOne(posts, item) });
    } catch (error) {
      failures.push(`${item.slug}: ${error.message}`);
    }
  }
  if (failures.length) {
    throw new Error(`Reconcile doğrulaması başarısız; hiçbir dosya yazılmadı:\n- ${failures.join("\n- ")}`);
  }
  for (const [navIndex, entry] of manifestEntries) {
    if (!inputNavIndexes.has(navIndex) && entry.unavailable) {
      reports.push({
        slug: entry.slug,
        navIndex: Number(navIndex),
        turnId: null,
        status: "unavailable",
        reason: String(entry.unavailable),
      });
    }
  }
  reports.sort((left, right) => {
    const leftNav = Number.isFinite(Number(left.navIndex)) ? Number(left.navIndex) : Number.MAX_SAFE_INTEGER;
    const rightNav = Number.isFinite(Number(right.navIndex)) ? Number(right.navIndex) : Number.MAX_SAFE_INTEGER;
    return leftNav - rightNav;
  });
  return { posts, reports };
}

async function writeAtomic(filePath, contents) {
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, contents, "utf8");
  await rename(temporary, filePath);
}

function option(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function options(name) {
  const prefix = `--${name}=`;
  return process.argv
    .filter((argument) => argument.startsWith(prefix))
    .map((argument) => argument.slice(prefix.length));
}

async function main() {
  const inputPaths = options("input");
  const positionalInput = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
  if (!inputPaths.length && positionalInput) inputPaths.push(positionalInput);
  if (!inputPaths.length) {
    throw new Error("Kullanım: node scripts/reconcileAiStudioModels.js --input=/path/recovered.json [--input=/path/part2.json ...] [--manifest=/path/nav-slug.json] [--write] [--report=/tmp/report.json]");
  }
  const sourceBefore = await readFile(POSTS_PATH, "utf8");
  const rawInputs = await Promise.all(inputPaths.map(async (inputPath) => (
    JSON.parse(await readFile(path.resolve(process.cwd(), inputPath), "utf8"))
  )));
  const rawInput = rawInputs.flatMap((value, index) => {
    const items = Array.isArray(value) ? value : value?.items;
    if (!Array.isArray(items) || !items.length) {
      throw new Error(`${inputPaths[index]}: girdi boş; JSON bir dizi veya { items: [...] } olmalı.`);
    }
    return items;
  });
  const manifestPath = option("manifest");
  const manifest = manifestPath
    ? JSON.parse(await readFile(path.resolve(process.cwd(), manifestPath), "utf8"))
    : null;
  const currentPosts = JSON.parse(sourceBefore);
  const { posts, reports } = reconcilePosts(rawInput, currentPosts, { manifest });
  console.table(reports);

  const reportPath = option("report");
  if (reportPath) {
    await writeAtomic(path.resolve(process.cwd(), reportPath), `${JSON.stringify(reports, null, 2)}\n`);
  }
  if (!process.argv.includes("--write")) {
    console.log("Doğrulama tamamlandı; dry-run olduğu için veri dosyaları değiştirilmedi.");
    return;
  }
  const reconciledCount = reports.filter((report) => report.status === "reconciled").length;
  if (!reconciledCount) {
    console.log("Yazılabilir kayıt yok; veri dosyaları değiştirilmedi.");
    return;
  }
  if (await readFile(POSTS_PATH, "utf8") !== sourceBefore) {
    throw new Error("posts.json doğrulama sırasında değişti; güncel kullanıcı değişikliklerini korumak için yazma iptal edildi.");
  }
  const output = `${JSON.stringify(posts, null, 2)}\n`;
  if (existsSync(POSTS_MIRROR_PATH)) await writeAtomic(POSTS_MIRROR_PATH, output);
  await writeAtomic(POSTS_PATH, output);
  console.log(`${reconciledCount} postun hedef blokları, açıklamaları ve türetilmiş okuma süresi güncellendi.`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
