import { useState } from "react";

export function MetaRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="detail-meta-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function youtubeEmbedUrl(url) {
  if (!url) return null;
  const raw = String(url).trim();
  const id =
    raw.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/)?.[1] ||
    raw.match(/[?&]v=([A-Za-z0-9_-]{6,})/)?.[1] ||
    raw.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/)?.[1] ||
    null;
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

export function DetailVideo({ post, embedUrl, onRead, ui, locale }) {
  const [playing, setPlaying] = useState(false);
  if (!embedUrl) return null;
  const youtubeUrl = post.youtubeUrl || post.youtube?.url;
  const videoId = embedUrl.match(/\/embed\/([A-Za-z0-9_-]+)/)?.[1];
  const thumbnail = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : post.cover;
  const facade = (
    <>
      <img src={thumbnail} alt="" loading="lazy" decoding="async" />
      <span aria-hidden><i /></span>
      <strong>{post.youtubeEmbedDisabled ? ui.watchOnYoutube : ui.playVideo}</strong>
    </>
  );
  return (
    <section className="detail-video-section" aria-label={ui.videoAndTranslation} lang={locale}>
      <div className="detail-video-copy">
        <span>Video</span>
        <h2 className="font-serif">{post.song}</h2>
        <p>{ui.videoHint}</p>
        <div className="detail-video-actions">
          <button type="button" onClick={onRead}>{ui.readTranslation}</button>
          {youtubeUrl && (
            <a href={youtubeUrl} target="_blank" rel="noopener noreferrer">{ui.openYoutube}</a>
          )}
        </div>
      </div>
      <div className="detail-video-frame">
        {post.youtubeEmbedDisabled && youtubeUrl ? (
          <a
            className="detail-video-facade"
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${ui.openYoutube}: ${post.artist} - ${post.song}`}
          >
            {facade}
          </a>
        ) : playing ? (
          <iframe
            src={`${embedUrl}?autoplay=1&rel=0`}
            title={`${post.artist} - ${post.song} · ${ui.playVideo}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button
            className="detail-video-facade"
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`${ui.playVideo}: ${post.artist} - ${post.song}`}
          >
            {facade}
          </button>
        )}
      </div>
    </section>
  );
}
