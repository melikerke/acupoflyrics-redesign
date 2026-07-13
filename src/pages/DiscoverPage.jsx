import { useState } from "react";
import { Link } from "react-router-dom";
import {
  albumIndex,
  allPosts,
  artistCollections,
  collections,
  genreGroups,
  metricsFor,
  moodGroups,
  newReleases,
  recentlyUpdated,
  totalPosts,
} from "../lib/content";
import { discoverPath, songPath } from "../lib/paths";
import { LIGHT_THEME } from "../lib/theme";
import { useSeo } from "../lib/seo";
import SiteShell from "../components/site/SiteShell";
import PageHero from "../components/site/PageHero";
import { Grid, Icon, Section, Shelf } from "../components/site/ui";
import { AlbumCard, ArtistCard, CollectionCard, GenreCard, MoodCard, SongCard } from "../components/site/cards";

const topAlbums = [...albumIndex].sort((a, b) => b.tracks.length - a.tracks.length).slice(0, 12);
const heroCovers = newReleases.slice(0, 6).map((p) => p.cover);

export default function DiscoverPage() {
  const [random, setRandom] = useState(() => allPosts[Math.floor(Math.random() * allPosts.length)]);
  const shuffle = () => setRandom(allPosts[Math.floor(Math.random() * allPosts.length)]);
  const rm = metricsFor(random);

  useSeo({
    title: "Keşfet — Şarkı Çevirilerini Mood, Tür, Albüm ve Sanatçıya Göre Gezin | acupoflyrics",
    description: `acupoflyrics arşivindeki ${totalPosts} Türkçe şarkı çevirisini keşfet: trend olanlar, en yeniler, sanatçılar, albümler, koleksiyonlar, türler ve mood'lar.`,
    path: discoverPath(),
    image: heroCovers[0],
    breadcrumbs: [
      { name: "Ana sayfa", path: "/" },
      { name: "Keşfet", path: discoverPath() },
    ],
  });

  return (
    <SiteShell theme={LIGHT_THEME} wide>
      <PageHero
        variant="topic"
        bg={heroCovers[0]}
        collage={heroCovers}
        kicker="Keşfet"
        title="Ne dinlediğini değil, ne hissettiğini ara."
        titleSerif
        description={`${totalPosts} çeviri; trend olanlardan koleksiyonlara, mood'lardan albümlere kadar her şey tek tek seçildi. Buradan başla.`}
        stats={[
          { value: totalPosts, label: "çeviri", icon: "note" },
          { value: artistCollections.length, label: "sanatçı", icon: "user" },
          { value: albumIndex.length, label: "albüm", icon: "disc" },
        ]}
      />

      <Section title="En yeniler" id="newest">
        <Shelf>
          {newReleases.map((post) => <SongCard key={post.slug} post={post} />)}
        </Shelf>
      </Section>

      <Section title="Sanatçılar" kicker="Premium sayfalar" id="artists">
        <Grid min={140}>
          {artistCollections.map((a) => <ArtistCard key={a.slug} artist={a} />)}
        </Grid>
      </Section>

      <Section title="Albümler" id="albums">
        <Grid min={170}>
          {topAlbums.map((a) => <AlbumCard key={a.slug} album={a} />)}
        </Grid>
      </Section>

      <Section title="Yıllara göre" kicker="Çıkış yılına göre arşiv" id="collections">
        <Grid min={220}>
          {collections.map((c) => <CollectionCard key={c.slug} collection={c} />)}
        </Grid>
      </Section>

      <Section title="Türler" id="genres">
        <Grid min={150}>
          {genreGroups.map((g) => <GenreCard key={g.slug} genre={g} />)}
        </Grid>
      </Section>

      <Section title="Mood'a göre" id="moods">
        <Grid min={150}>
          {moodGroups.map((m) => <MoodCard key={m.slug} mood={m} />)}
        </Grid>
      </Section>

      <Section title="Son güncellenenler" id="updated">
        <Shelf>
          {recentlyUpdated.map((post) => <SongCard key={post.slug} post={post} />)}
        </Shelf>
      </Section>

      <Section title="Rastgele keşif" kicker="Şansını dene">
        <div className="site-random">
          <div>
            <span className="site-kicker">No. {random.no} · {random.artist}</span>
            <h3 className="font-serif">{random.song}</h3>
            <p>{rm.readingTime} dk okuma · İçine düşmek için bir tık uzakta.</p>
            <div className="site-hero-actions" style={{ marginTop: 20 }}>
              <Link className="site-btn" to={songPath(random)}><Icon name="arrow" size={15} /> Çeviriyi oku</Link>
              <button className="site-btn-ghost" type="button" onClick={shuffle}><Icon name="shuffle" size={15} /> Yeniden</button>
            </div>
          </div>
          <Link to={songPath(random)} className="site-random-cover">
            <img src={random.cover} alt={`${random.artist} — ${random.song}`} />
          </Link>
        </div>
      </Section>
    </SiteShell>
  );
}
