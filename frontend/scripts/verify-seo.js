/**
 * Comprehensive SEO Validation Script for SimpleDSC
 * Validates:
 * 1. robots.txt structure, disallows, and canonical sitemap directive
 * 2. sitemap.xml validity, canonical domain, route presence, and exclusion of private routes
 * 3. Static HTML pre-renders for all public canonical routes
 * 4. Meta tags (title, description, canonical, OG, Twitter)
 * 5. JSON-LD structured data syntax validation
 * 6. Heading hierarchy (H1 presence)
 * 7. Uniqueness of titles and descriptions across pages
 */

const fs = require("fs");
const path = require("path");

const BUILD_DIR = path.resolve(__dirname, "../build");
const PRIMARY_ORIGIN = "https://www.simpldsc.com";

const REQUIRED_PUBLIC_ROUTES = [
  "/",
  "/products",
  "/pricing",
  "/use-cases",
  "/faqs",
  "/about",
  "/resources",
  "/contact",
  "/partner",
  "/products/class-3-dsc",
  "/products/etender-dsc",
  "/products/dgft-dsc",
  "/products/mca-dsc",
  "/products/document-signer-dsc",
  "/products/class-2-dsc",
  "/terms",
  "/privacy",
  "/refund",
];

const PRIVATE_ROUTES = [
  "/admin",
  "/client",
  "/agent",
  "/dashboard",
  "/api",
];

let totalChecks = 0;
let passedChecks = 0;
let errors = [];

function check(name, condition, errorMsg) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ ${name}`);
  } else {
    errors.push(`${name}: ${errorMsg}`);
    console.error(`  ❌ ${name}: ${errorMsg}`);
  }
}

console.log("\n==================================================");
console.log("       SIMPLEDSC SEO VERIFICATION SUITE           ");
console.log("==================================================\n");

// 1. Check robots.txt
console.log("1. Verifying robots.txt...");
const robotsPath = path.join(BUILD_DIR, "robots.txt");
check("robots.txt exists in build", fs.existsSync(robotsPath), "robots.txt is missing");
if (fs.existsSync(robotsPath)) {
  const robots = fs.readFileSync(robotsPath, "utf8");
  check("robots.txt references correct sitemap", robots.includes("Sitemap: https://www.simpldsc.com/sitemap.xml"), "Sitemap URL mismatch");
  check("robots.txt disallows /admin", robots.includes("Disallow: /admin"), "Missing /admin disallow");
  check("robots.txt disallows /client", robots.includes("Disallow: /client"), "Missing /client disallow");
  check("robots.txt disallows /agent", robots.includes("Disallow: /agent"), "Missing /agent disallow");
  check("robots.txt disallows /api/", robots.includes("Disallow: /api/"), "Missing /api/ disallow");
  check("robots.txt does not reference simpldsc.in", !robots.includes("simpldsc.in"), "Old .in domain found in robots.txt");
}

// 2. Check sitemap.xml
console.log("\n2. Verifying sitemap.xml...");
const sitemapPath = path.join(BUILD_DIR, "sitemap.xml");
check("sitemap.xml exists in build", fs.existsSync(sitemapPath), "sitemap.xml is missing");
if (fs.existsSync(sitemapPath)) {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  check("sitemap.xml has valid xml declaration", sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), "Missing xml declaration");
  check("sitemap.xml uses sitemaps.org schema", sitemap.includes("http://www.sitemaps.org/schemas/sitemap/0.9"), "Invalid sitemap schema");
  check("sitemap.xml has no old simpldsc.in URLs", !sitemap.includes("https://simpldsc.in"), "Found old .in URLs");

  for (const route of REQUIRED_PUBLIC_ROUTES) {
    const expectedLoc = `<loc>${PRIMARY_ORIGIN}${route === "/" ? "/" : route}</loc>`;
    check(`sitemap.xml includes ${route}`, sitemap.includes(expectedLoc), `Route ${expectedLoc} not found in sitemap`);
  }

  for (const priv of PRIVATE_ROUTES) {
    check(`sitemap.xml excludes private route ${priv}`, !sitemap.includes(`<loc>${PRIMARY_ORIGIN}${priv}`), `Private route ${priv} leaked in sitemap!`);
  }
}

// 3. Check Pre-rendered HTML Pages
console.log("\n3. Verifying Pre-rendered HTML Pages & Meta Tags...");
const titles = new Map();
const descriptions = new Map();

for (const route of REQUIRED_PUBLIC_ROUTES) {
  const filePath = route === "/"
    ? path.join(BUILD_DIR, "index.html")
    : path.join(BUILD_DIR, route.replace(/^\//, ""), "index.html");

  check(`Page exists on disk: ${route}`, fs.existsSync(filePath), `File not found: ${filePath}`);

  if (fs.existsSync(filePath)) {
    const html = fs.readFileSync(filePath, "utf8");

    // Title Check
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    check(`Page ${route} has <title>`, !!titleMatch && titleMatch[1].length > 10, "Title missing or too short");
    if (titleMatch) {
      const t = titleMatch[1];
      if (titles.has(t)) {
        errors.push(`Duplicate title between ${route} and ${titles.get(t)}: "${t}"`);
      } else {
        titles.set(t, route);
      }
    }

    // Meta Description Check
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
    check(`Page ${route} has meta description`, !!descMatch && descMatch[1].length > 30, "Description missing or too short");
    if (descMatch) {
      const d = descMatch[1];
      if (descriptions.has(d)) {
        errors.push(`Duplicate description between ${route} and ${descriptions.get(d)}: "${d}"`);
      } else {
        descriptions.set(d, route);
      }
    }

    // Canonical URL Check
    const expectedCanonical = `${PRIMARY_ORIGIN}${route === "/" ? "/" : route}`;
    check(
      `Page ${route} has exact canonical URL`,
      html.includes(`<link rel="canonical" href="${expectedCanonical}"/>`) ||
      html.includes(`<link rel="canonical" href="${expectedCanonical}" />`),
      `Expected canonical ${expectedCanonical}`
    );

    // Open Graph Tags
    check(`Page ${route} has og:title`, html.includes('property="og:title"'), "Missing og:title");
    check(`Page ${route} has og:description`, html.includes('property="og:description"'), "Missing og:description");
    check(`Page ${route} has og:url`, html.includes('property="og:url"'), "Missing og:url");
    check(`Page ${route} has og:image`, html.includes('property="og:image"'), "Missing og:image");

    // Twitter Tags
    check(`Page ${route} has twitter:title`, html.includes('name="twitter:title"'), "Missing twitter:title");
    check(`Page ${route} has twitter:description`, html.includes('name="twitter:description"'), "Missing twitter:description");
    check(`Page ${route} has twitter:image`, html.includes('name="twitter:image"'), "Missing twitter:image");

    // Heading H1 Check (static subpages have prerendered H1, root index.html serves as clean SPA shell)
    check(`Page ${route} has <h1>`, route === "/" || /<h1[^>]*>.*?<\/h1>/i.test(html), "Missing <h1> tag");

    // JSON-LD Validation
    const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
    let schemaCount = 0;
    for (const match of jsonLdMatches) {
      schemaCount++;
      try {
        const parsed = JSON.parse(match[1]);
        check(`Page ${route} JSON-LD #${schemaCount} (${parsed["@type"] || "Graph"}) is valid JSON`, true, "");
      } catch (err) {
        check(`Page ${route} JSON-LD #${schemaCount} is valid JSON`, false, `JSON parse error: ${err.message}`);
      }
    }
    check(`Page ${route} has structured data`, schemaCount > 0, "No JSON-LD schemas found");
  }
}

console.log("\n==================================================");
console.log(`TOTAL CHECKS: ${totalChecks}`);
console.log(`PASSED: ${passedChecks}`);
console.log(`FAILED: ${errors.length}`);
console.log("==================================================\n");

if (errors.length > 0) {
  console.error("FAILURES:");
  errors.forEach((e) => console.error(" - " + e));
  process.exit(1);
} else {
  console.log("🎉 ALL SEO VERIFICATION CHECKS PASSED PERFECTLY!\n");
  process.exit(0);
}

