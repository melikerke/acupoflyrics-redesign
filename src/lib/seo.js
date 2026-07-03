import { useEffect } from "react";
import { ORIGIN } from "./paths";

function setMeta(name, content, attr = "name") {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href) {
  if (!href) return;
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function setJsonLd(id, data) {
  const old = document.getElementById(id);
  if (old) old.remove();
  if (!data) return;
  const el = document.createElement("script");
  el.id = id;
  el.type = "application/ld+json";
  el.textContent = JSON.stringify(data);
  document.head.appendChild(el);
}

// One hook for every page's SEO: title, description, canonical, OpenGraph,
// a BreadcrumbList, and an optional page-specific structured-data object.
//
// `breadcrumbs`: [{ name, path }] ordered root → current.
export function useSeo({
  title,
  description,
  path,
  image,
  type = "website",
  breadcrumbs = [],
  jsonLd = null,
}) {
  useEffect(() => {
    if (!title) return;
    const url = path ? `${ORIGIN}${path}` : undefined;
    document.title = title;
    setMeta("description", description);
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", type, "property");
    if (url) setMeta("og:url", url, "property");
    if (image) setMeta("og:image", image, "property");
    setMeta("twitter:card", image ? "summary_large_image" : "summary");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    if (image) setMeta("twitter:image", image);
    setCanonical(url);

    setJsonLd(
      "apl-breadcrumbs",
      breadcrumbs.length
        ? {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: breadcrumbs.map((b, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: b.name,
              item: `${ORIGIN}${b.path}`,
            })),
          }
        : null,
    );
    setJsonLd("apl-structured-data", jsonLd);
    // Re-run whenever the serialisable inputs change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path, image, type, JSON.stringify(breadcrumbs), JSON.stringify(jsonLd)]);
}
