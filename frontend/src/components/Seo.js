import { useEffect } from "react";

function upsertName(name, content) {
  if (content == null) return;
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}
function upsertProp(prop, content) {
  if (content == null) return;
  let el = document.querySelector(`meta[property="${prop}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("property", prop); document.head.appendChild(el); }
  el.setAttribute("content", content);
}
function upsertCanonical(href) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) { el = document.createElement("link"); el.setAttribute("rel", "canonical"); document.head.appendChild(el); }
  el.setAttribute("href", href);
}

// Per-page SEO: title, meta description, Open Graph, canonical, robots index/no-index.
export function Seo({ title, description, image, canonical, index = true, type = "website" }) {
  useEffect(() => {
    if (title) document.title = title;
    upsertName("description", description);
    upsertName("robots", index ? "index,follow" : "noindex,nofollow");
    upsertProp("og:title", title);
    upsertProp("og:description", description);
    upsertProp("og:type", type);
    if (image) upsertProp("og:image", image);
    const canon = canonical || (typeof window !== "undefined" ? window.location.origin + window.location.pathname : undefined);
    if (canon) upsertProp("og:url", canon);
    if (canon) upsertCanonical(canon);
  }, [title, description, image, canonical, index, type]);
  return null;
}
