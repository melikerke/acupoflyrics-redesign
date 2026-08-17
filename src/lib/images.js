const ALBUM_SIZE_TOKEN = /ab67616d(?:0000b273|00001e02|00004851)/;
const ARTIST_SIZE_TOKEN = /ab676161(?:0000e5eb|00005174|0000f178)/;

// Spotify publishes stable CDN variants for the same artwork. Archive cards
// should not download a 640px cover just to render a 52–190px thumbnail.
export function spotifyImageUrl(source, target = 300) {
  const url = String(source || "");
  if (!url.includes("i.scdn.co/image/")) return url;

  if (ALBUM_SIZE_TOKEN.test(url)) {
    const token = target <= 96 ? "ab67616d00004851" : target <= 320 ? "ab67616d00001e02" : "ab67616d0000b273";
    return url.replace(ALBUM_SIZE_TOKEN, token);
  }

  if (ARTIST_SIZE_TOKEN.test(url)) {
    const token = target <= 180 ? "ab6761610000f178" : target <= 360 ? "ab67616100005174" : "ab6761610000e5eb";
    return url.replace(ARTIST_SIZE_TOKEN, token);
  }

  return url;
}
