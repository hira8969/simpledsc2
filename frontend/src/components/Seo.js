import { useEffect } from "react";

const PRIMARY_ORIGIN = "https://www.simpldsc.com";
const DEFAULT_IMAGE = `${PRIMARY_ORIGIN}/logo.png`;
const DEFAULT_SITE_NAME = "SimpleDSC";

function upsertTag(selector, createFn, updateFn) {
  let el = document.querySelector(selector);
  if (!el) {
    el = createFn();
    document.head.appendChild(el);
  }
  updateFn(el);
}

function upsertName(name, content) {
  if (content == null) return;
  upsertTag(
    `meta[name="${name}"]`,
    () => {
      const el = document.createElement("meta");
      el.setAttribute("name", name);
      return el;
    },
    (el) => el.setAttribute("content", content)
  );
}

function upsertProp(prop, content) {
  if (content == null) return;
  upsertTag(
    `meta[property="${prop}"]`,
    () => {
      const el = document.createElement("meta");
      el.setAttribute("property", prop);
      return el;
    },
    (el) => el.setAttribute("content", content)
  );
}

function upsertCanonical(href) {
  if (!href) return;
  upsertTag(
    'link[rel="canonical"]',
    () => {
      const el = document.createElement("link");
      el.setAttribute("rel", "canonical");
      return el;
    },
    (el) => el.setAttribute("href", href)
  );
}

function upsertSchema(id, schemaObject) {
  const selector = `script#${id}[type="application/ld+json"]`;
  if (!schemaObject) {
    const existing = document.querySelector(selector);
    if (existing) existing.remove();
    return;
  }

  upsertTag(
    selector,
    () => {
      const el = document.createElement("script");
      el.setAttribute("type", "application/ld+json");
      el.setAttribute("id", id);
      return el;
    },
    (el) => {
      el.textContent = JSON.stringify(schemaObject);
    }
  );
}

export function buildCanonicalUrl(pathOrUrl) {
  if (!pathOrUrl) {
    if (typeof window !== "undefined") {
      const path = window.location.pathname.toLowerCase();
      return path === "/" || path === "" ? `${PRIMARY_ORIGIN}/` : `${PRIMARY_ORIGIN}${path.replace(/\/$/, "")}`;
    }
    return `${PRIMARY_ORIGIN}/`;
  }

  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    try {
      const url = new URL(pathOrUrl);
      const path = url.pathname.toLowerCase();
      return path === "/" || path === "" ? `${PRIMARY_ORIGIN}/` : `${PRIMARY_ORIGIN}${path.replace(/\/$/, "")}`;
    } catch {
      return PRIMARY_ORIGIN;
    }
  }

  const cleanPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  const lowerPath = cleanPath.toLowerCase();
  return lowerPath === "/" ? `${PRIMARY_ORIGIN}/` : `${PRIMARY_ORIGIN}${lowerPath.replace(/\/$/, "")}`;
}

/**
 * Enhanced Per-Page SEO Component
 * Supports:
 * - Titles & descriptions with search-intent focus
 * - Authoritative canonical URLs on https://www.simpldsc.com
 * - Open Graph & Twitter Cards
 * - Robots indexing directives
 * - BreadcrumbList and Custom JSON-LD Schema markup injection
 */
export function Seo({
  title,
  description,
  image,
  canonical,
  index = true,
  type = "website",
  breadcrumbs,
  schema,
}) {
  useEffect(() => {
    // 1. Document Title
    if (title) {
      document.title = title;
    }

    // 2. Canonical URL
    const canon = buildCanonicalUrl(canonical);
    upsertCanonical(canon);

    // 3. Meta Description & Robots
    if (description) {
      upsertName("description", description);
    }
    upsertName(
      "robots",
      index
        ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        : "noindex, nofollow"
    );

    // 4. Open Graph Tags
    upsertProp("og:site_name", DEFAULT_SITE_NAME);
    upsertProp("og:type", type);
    upsertProp("og:url", canon);
    upsertProp("og:locale", "en_IN");
    if (title) upsertProp("og:title", title);
    if (description) upsertProp("og:description", description);

    const fullImage = image
      ? image.startsWith("http")
        ? image
        : `${PRIMARY_ORIGIN}${image.startsWith("/") ? image : `/${image}`}`
      : DEFAULT_IMAGE;
    upsertProp("og:image", fullImage);

    // 5. Twitter / X Cards
    upsertName("twitter:card", "summary_large_image");
    if (title) upsertName("twitter:title", title);
    if (description) upsertName("twitter:description", description);
    upsertName("twitter:image", fullImage);

    // 6. Breadcrumbs Schema
    if (breadcrumbs && Array.isArray(breadcrumbs) && breadcrumbs.length > 0) {
      const breadcrumbList = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((crumb, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          name: crumb.name,
          item: crumb.url.startsWith("http") ? crumb.url : `${PRIMARY_ORIGIN}${crumb.url.startsWith("/") ? crumb.url : `/${crumb.url}`}`,
        })),
      };
      upsertSchema("seo-breadcrumb-schema", breadcrumbList);
    } else {
      upsertSchema("seo-breadcrumb-schema", null);
    }

    // 7. Custom JSON-LD Schema (e.g., Product, FAQPage, Service)
    if (schema) {
      upsertSchema("seo-page-schema", schema);
    } else {
      upsertSchema("seo-page-schema", null);
    }

    return () => {
      // Clean up dynamic schemas on unmount
      upsertSchema("seo-breadcrumb-schema", null);
      upsertSchema("seo-page-schema", null);
    };
  }, [title, description, image, canonical, index, type, breadcrumbs, schema]);

  return null;
}
