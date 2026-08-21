import assert from "node:assert/strict";
import test from "node:test";
import { reconcilePosts } from "./reconcileAiStudioModels.js";

function post(overrides = {}) {
  return {
    slug: "ornek-sarki-turkce-ceviri",
    title: "Kullanıcının Başlığı",
    excerpt: "Kullanıcının özeti",
    blocks: [
      { original: true, label: "Verse 1: Artist", lines: ["Original line"] },
      { original: false, label: "Verse 1: Artist", lines: ["Eski hedef"], custom: "koru" },
    ],
    annotations: { Eski: "Kullanıcıdaki eski açıklama" },
    ...overrides,
  };
}

test("yalnız target satırlarını ve ham yanıttaki açıklamaları değiştirir", () => {
  const current = [post()];
  const before = structuredClone(current);
  const input = [{
    navIndex: 4,
    turnId: "turn-123",
    slug: current[0].slug,
    model: [
      "Model 10:47 AM",
      "Ön açıklama",
      "[Verse 1: Artist]",
      "Yeni hedef dize¹",
      "||| ¹*“Kaynak ifade”: Modelin yazdığı açıklama.*",
      "",
      "Analiz: Serbest metin",
    ],
  }];

  const { posts, reports } = reconcilePosts(input, current);
  assert.deepEqual(current, before, "çağıranın mevcut verisi mutate edilmemeli");
  assert.equal(posts[0].title, before[0].title);
  assert.equal(posts[0].excerpt, before[0].excerpt);
  assert.deepEqual(posts[0].blocks[0], before[0].blocks[0]);
  assert.deepEqual(posts[0].blocks[1], {
    original: false,
    label: "Verse 1: Artist",
    lines: ["Yeni hedef dize"],
    custom: "koru",
  });
  assert.deepEqual(posts[0].annotations, {
    "Yeni hedef dize": "“Kaynak ifade”: Modelin yazdığı açıklama.",
  });
  assert.equal(reports[0].changedTargetBlocks, 1);
  assert.equal(reports[0].annotations, 1);
});

test("İngilizce açıklama dilinde numaralı AI Studio notlarını doğrudan kullanır", () => {
  const current = [post({
    slug: "ornek-sarki-english-translation",
    languages: { original: "tr", translation: "en", annotations: "en" },
  })];
  const model = `
[Verse 1]
I came back to you ¹

ÇEVİRİ NOTLARI / TRANSLATION NOTES

¹ I came back (Geri geldim)

TR: Türkçe açıklama.

EN: Exact English explanation from the model.
`;
  const { posts } = reconcilePosts([{ slug: current[0].slug, model }], current);
  assert.deepEqual(posts[0].annotations, {
    "I came back": "Exact English explanation from the model.",
  });
});

test("kıta sayısı veya sırası uyuşmazsa tüm batch'i yazmadan reddeder", () => {
  const current = [post(), post({ slug: "ikinci-sarki-turkce-ceviri" })];
  const before = structuredClone(current);
  const input = [
    { slug: current[0].slug, model: "[Verse 1]\nGeçerli hedef" },
    { slug: current[1].slug, model: "[Chorus]\nYanlış yapı" },
  ];
  assert.throws(
    () => reconcilePosts(input, current),
    /2\. kıta|kıta başlığı uyuşmuyor|ikinci-sarki-turkce-ceviri/,
  );
  assert.deepEqual(current, before);
});

test("hedefte birebir bulunmayan işaretsiz açıklama anahtarını reddeder", () => {
  const current = [post()];
  const input = [{
    slug: current[0].slug,
    model: "[Verse 1]\nYeni hedef\n||| “Modelde var ama hedefte yok”: Açıklama",
  }];
  assert.throws(() => reconcilePosts(input, current), /birebir bulunamadı/);
});

test("manifest map, null koruma ve kaynak gloss temizliğini güvenli uygular", () => {
  const current = [post({
    blocks: [
      { original: true, label: "Verse 1", lines: ["Source phrase (Oh)"] },
      { original: false, label: "Verse 1", lines: ["Eski birinci hedef"] },
      { original: true, label: "Chorus", lines: ["Original chorus"] },
      { original: false, label: "Chorus", lines: ["Kullanıcının korunacak hedefi"] },
    ],
  })];
  const raw = [{
    navIndex: 230,
    model: "[Verse 1]\nYeni hedef (Source phrase) (Oh) (Benimsin) (Veda)",
  }];
  const manifest = {
    230: { slug: current[0].slug, translationMap: [0, null] },
  };
  const { posts, reports } = reconcilePosts(raw, current, { manifest });
  assert.deepEqual(posts[0].blocks[1].lines, ["Yeni hedef (Oh) (Benimsin) (Veda)"]);
  assert.deepEqual(posts[0].blocks[3].lines, ["Kullanıcının korunacak hedefi"]);
  assert.equal(reports[0].partial, true);
  assert.equal(reports[0].preservedTargetBlocks, 1);
  assert.deepEqual(reports[0].unusedModelStanzas, []);
});

test("manifestte girdisi olmayan kayıt ancak unavailable nedeniyle kabul edilir", () => {
  const current = [post()];
  const raw = [{ navIndex: 1, model: "[Verse 1]\nYeni hedef" }];
  const manifest = {
    1: { slug: current[0].slug },
    2: { slug: "eksik-sarki-turkce-ceviri" },
  };
  assert.throws(
    () => reconcilePosts(raw, current, { manifest }),
    /navIndex girdilerde yok; unavailable nedeni belirtilmeli/,
  );
  manifest[2].unavailable = "AI Studio model yanıtı yok.";
  const { reports } = reconcilePosts(raw, current, { manifest });
  assert.deepEqual(reports.map(({ status, slug }) => ({ status, slug })), [
    { status: "reconciled", slug: current[0].slug },
    { status: "unavailable", slug: "eksik-sarki-turkce-ceviri" },
  ]);
});

test("tamamı parantez içindeki vokal/adlib dizesini source ile aynı olsa da korur", () => {
  const current = [post({
    blocks: [
      { original: true, label: "Outro", lines: ["(Ooh, source echo)"] },
      { original: false, label: "Outro", lines: ["Eski hedef"] },
    ],
  })];
  const { posts } = reconcilePosts([{
    slug: current[0].slug,
    model: "[Outro]\n(Ooh, source echo)",
  }], current);
  assert.deepEqual(posts[0].blocks[1].lines, ["(Ooh, source echo)"]);
});

test("inline vokal ve ad-lib parantezlerini gloss sanıp silmez", () => {
  for (const target of [
    "Hey, yeah (Ow!)",
    "Yanında kimse kalmadı (Ew!)",
    "Çok yalnız kalacaksın (Haha!)",
    "Kulüpte! (Ha-ha-ha...)",
    "İtiraf et, yalan yok! (Rr, pow!)",
  ]) {
    const current = [post()];
    const { posts } = reconcilePosts([{
      slug: current[0].slug,
      model: `[Verse 1]\n${target}`,
    }], current);
    assert.deepEqual(posts[0].blocks[1].lines, [target]);
  }

  for (const [original, target, preserveParentheticals] of [
    ["Some promo (FLO), yeah", "Biraz reklam arası (FLO), evet!", ["FLO"]],
    ["Turn it up on the speakers (Speaker)", "Sesi ver hoparlörlere! (Speaker)", ["Speaker"]],
    ["We struggle every day", "Hep bir çabalama içindeyiz... (Ah be, ne çok çektiniz!)", []],
  ]) {
    const current = [post({
      blocks: [
        { original: true, label: "Verse 1", lines: [original] },
        { original: false, label: "Verse 1", lines: ["Eski hedef"] },
      ],
    })];
    const { posts } = reconcilePosts([{
      slug: current[0].slug,
      model: `[Verse 1]\n${target}`,
      preserveParentheticals,
    }], current);
    assert.deepEqual(posts[0].blocks[1].lines, [target]);
  }

  const current = [post({
    blocks: [
      { original: true, label: "Verse 1", lines: ["Play for keeps"] },
      { original: false, label: "Verse 1", lines: ["Eski hedef"] },
    ],
  })];
  const { posts } = reconcilePosts([{
    slug: current[0].slug,
    model: "[Verse 1]\nCiddi oynamak (for keeps)",
  }], current);
  assert.deepEqual(posts[0].blocks[1].lines, ["Ciddi oynamak"]);
});

test("manifest annotation hint yalnız hedefte birebir varsa popup anahtarı olur", () => {
  const current = [post()];
  const raw = [{
    navIndex: 42,
    model: "[Verse 1]\nTam güvenli hedef ifade\n||| “Source idiom”: Model açıklaması.",
  }];
  const manifest = {
    42: { slug: current[0].slug, annotationKeyHints: ["güvenli hedef"] },
  };
  const { posts } = reconcilePosts(raw, current, { manifest });
  assert.deepEqual(posts[0].annotations, { "güvenli hedef": "“Source idiom”: Model açıklaması." });

  manifest[42].annotationKeyHints = ["modelde olmayan hedef"];
  assert.throws(
    () => reconcilePosts(raw, current, { manifest }),
    /manifest hint hedef metinde birebir bulunamadı/,
  );
});

test("hedef metin değişince türetilmiş okuma süresini yeniden hesaplar", () => {
  const longTarget = Array.from({ length: 240 }, (_, index) => `kelime${index}`).join(" ");
  const current = [post({ reading_time: 1 })];
  const { posts, reports } = reconcilePosts([{
    slug: current[0].slug,
    model: `[Verse 1]\n${longTarget}`,
  }], current);
  assert.equal(posts[0].reading_time, 1);
  assert.equal(reports[0].readingTimeChanged, false);

  const longerTarget = Array.from({ length: 320 }, (_, index) => `uzun${index}`).join(" ");
  const second = reconcilePosts([{
    slug: current[0].slug,
    model: `[Verse 1]\n${longerTarget}`,
  }], current);
  assert.equal(second.posts[0].reading_time, 2);
  assert.equal(second.reports[0].readingTimeChanged, true);
});
