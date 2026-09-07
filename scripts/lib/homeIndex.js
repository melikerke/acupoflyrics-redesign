// Build the original homepage selections once; keep its layout and order intact.
export function buildHomeIndex(content, latestArticle = null) {
  const used = new Set();
  const take = (items, count, fallback = [], seen = used) => {
    const selected = [];
    for (const post of [...items, ...fallback]) {
      if (!post?.slug || seen.has(post.slug)) continue;
      seen.add(post.slug); selected.push(post);
      if (selected.length >= count) break;
    }
    return selected;
  };
  const priority = new Map([["jennie-fallen-angel-turkce-ceviri", 0]]);
  const heroes = [...content.newReleases].sort((a, b) => (priority.get(a.slug) ?? Infinity) - (priority.get(b.slug) ?? Infinity));
  const heroPosts = take(heroes, 5, content.allPosts);
  const risingPost = take([content.newReleases.find((post) => post.slug === "oasis-wonderwall-turkce-ceviri"), ...content.newReleases], 1, content.allPosts)[0];
  const latest = take(content.newReleases, 8, content.allPosts);
  const archiveNewest = take(content.allPosts, 6);
  const archiveUpdated = take(content.recentlyUpdated, 6, content.allPosts);
  const genreShelves = Object.fromEntries([["Pop", content.popShelf], ["Hip Hop", content.rapShelf], ["K-pop", content.kpopShelf], ["Rock", content.rockShelf]].map(([name, items]) => [name, take(items, 8, content.allPosts)]));
  const spotlightPosts = take(content.artistSpotlight.posts, 4, content.allPosts.filter((post) => post.artist === content.artistSpotlight.name));
  const card = (post) => post ? ({
    ...buildHistoryCard(post, content), date: post.date, no: post.no,
    metrics: content.metricsFor(post), firstPair: content.firstPair(post),
    heroPair: post.heroPair, categories: post.categories, category_slugs: post.category_slugs,
    spotify: { albumName: post.spotify?.albumName, trackUrl: post.spotify?.trackUrl },
  }) : null;
  // The original two daily cards change with the visitor's local calendar day.
  const dailyFeatures = Array.from({ length: 31 }, (_, index) => {
    const seen = new Set(used);
    const candidate = content.allPosts[(index + 1) % content.allPosts.length];
    const day = take([candidate], 1, content.allPosts, seen)[0];
    const quotePost = take([candidate], 1, content.allPosts, seen)[0];
    const pair = content.firstPair(quotePost);
    return { day: card(day), quote: { post: card(quotePost), line: pair.tr || pair.en || quotePost.excerpt || quotePost.song, source: pair.en || quotePost.song } };
  });
  return {
    version: 2,
    contentPlan: { heroPosts: heroPosts.map(card), risingPost: card(risingPost), latest: latest.map(card), archiveNewest: archiveNewest.map(card), archiveUpdated: archiveUpdated.map(card), genreShelves: Object.fromEntries(Object.entries(genreShelves).map(([name, items]) => [name, items.map(card)])), spotlight: { slug: content.artistSpotlight.slug, name: content.artistSpotlight.name, bio: content.artistSpotlight.bio, posts: spotlightPosts.map(card) } },
    dailyFeatures,
    moods: content.moodGroups.map(({ slug, name, count, covers }) => ({ slug, name, count, covers: (covers || []).slice(0, 4) })),
    albums: content.albumShelf.slice(0, 8).map((album) => ({ slug: album.slug, name: album.name, artist: album.artist, cover: album.cover, tracks: album.tracks.map((post) => ({ year: content.releaseYear(post) })) })),
    collections: content.collections.slice(0, 12).map((collection) => ({ slug: collection.slug, name: collection.name, count: collection.count || collection.items.length, items: collection.items.slice(0, 4).map(({ slug, cover }) => ({ slug, cover })) })),
    latestArticle: latestArticle ? (({ slug, title, shortTitle, excerpt, summary, artistName, artistSlug, livePanel, image, accent }) => ({ slug, title, shortTitle, excerpt, summary, artistName, artistSlug, livePanel, image, accent }))(latestArticle) : null,
  };
}

export function buildHistoryCard(post, content) {
  return { slug: post.slug, song: post.song, artist: post.artist, cover: post.cover, year: content.releaseYear(post), readingTime: content.metricsFor(post).readingTime };
}
