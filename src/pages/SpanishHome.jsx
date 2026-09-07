import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SpanishShell from "../components/site/SpanishShell";
import PageHero from "../components/site/PageHero";
import { Grid, Section } from "../components/site/ui";
import { spanishHome, translations } from "../lib/translationVariants";
import { spotifyImageUrl } from "../lib/images";
import { useSeo } from "../lib/seo";

const searchable = (value) => value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es");

export default function SpanishHome() {
  const [query, setQuery] = useState("");
  const location = useLocation();
  const input = useRef(null);
  useEffect(() => {
    if (location.hash === "#buscar") {
      input.current?.focus();
      input.current?.scrollIntoView({ block: "center" });
    }
  }, [location.hash, location.key]);
  useSeo({ ...spanishHome, locale: "es", image: translations[0]?.cover });
  const matches = translations.filter((item) => searchable(`${item.song} ${item.artist}`).includes(searchable(query.trim())));
  return <SpanishShell>
    <PageHero variant="topic" bg={translations[0]?.cover} collage={translations.slice(0, 6).map((item) => item.cover)} kicker="En español" title="Letras traducidas" titleSerif description="Encuentra la traducción al español de tus canciones favoritas." stats={[{ value: translations.length, label: "traducciones", icon: "note" }]} />
    <Section title="Canciones" kicker="En español">
      <div className="spanish-search">
        <label htmlFor="buscar">Buscar por canción o artista</label>
        <input ref={input} id="buscar" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Canción o artista" />
      </div>
      <p role="status">{matches.length} {matches.length === 1 ? "canción" : "canciones"}{query && (matches.length === 1 ? " encontrada" : " encontradas")}</p>
      <Grid min={170}>{matches.map((item) => <Link to={item.path} className="acl-cover-card" key={item.slug}>
        <img src={spotifyImageUrl(item.cover, 300)} alt={`${item.artist} — ${item.song}`} width="300" height="300" loading="lazy" decoding="async" />
        <strong>{item.song}</strong><span>{item.artist}</span><small>{item.readingMinutes} min de lectura · Español</small>
      </Link>)}</Grid>
      {!matches.length && <p>No encontramos esa canción. Prueba con otro título o artista.</p>}
    </Section>
  </SpanishShell>;
}
