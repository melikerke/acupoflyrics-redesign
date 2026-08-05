function isEditorialDescription(value) {
  const text = String(value || "").trim();
  return text.length >= 90 && /türkçe|çeviri|şarkı|anlam/i.test(text);
}

export function translationMetaDescription(post) {
  if (!post) return "Aradığın şarkı sözlerini ve Türkçe çevirileri acupoflyrics arşivinde keşfet.";

  if (isEditorialDescription(post.seo?.description)) {
    return post.seo.description.trim();
  }

  return `${post.artist} – ${post.song} şarkı sözleri ve özenli Türkçe çevirisi. Şarkının anlamını, albüm bilgilerini ve satır açıklamalarını keşfet.`;
}
