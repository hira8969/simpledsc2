/**
 * Post-build Static Route Generator for SimpleDSC (https://www.simpldsc.com)
 * Generates SEO-optimized static HTML files for all public canonical routes
 * so search engine bots (Googlebot, Bingbot, DuckDuckGo) and social crawlers
 * receive fully formed, crawlable HTML with complete meta tags, Open Graph,
 * Twitter cards, JSON-LD structured data, and semantic fallbacks.
 */

const fs = require("fs");
const path = require("path");

const BUILD_DIR = path.resolve(__dirname, "../build");
const PRIMARY_ORIGIN = "https://www.simpldsc.com";
const DEFAULT_IMAGE = `${PRIMARY_ORIGIN}/logo.png`;

const ROUTES = [
  {
    path: "/",
    title: "SimpleDSC – Digital Signatures, Made Simple | Official Website",
    description: "Discover SimpleDSC, a digital signature platform designed to simplify your digital document and signature workflow. Explore our services and solutions.",
    heading: "Your Trusted Digital Signature Partner in India",
    breadcrumbs: [{ name: "Home", url: "/" }],
    schema: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": "https://www.simpldsc.com/#webpage",
      url: "https://www.simpldsc.com/",
      name: "SimpleDSC – Digital Signatures, Made Simple | Official Website",
      description: "Discover SimpleDSC, a digital signature platform designed to simplify your digital document and signature workflow. Explore our services and solutions.",
      isPartOf: { "@id": "https://www.simpldsc.com/#website" },
      about: { "@id": "https://www.simpldsc.com/#organization" },
    },
    semanticHtml: `
      <header>
        <p>CCA-Compliant · Paperless eKYC · Pan India Service</p>
        <h1>Your Trusted Digital Signature Partner in India</h1>
        <p>Get your Digital Signature Certificate quickly, securely and conveniently. Class 3, DGFT, eTender & MCA DSCs delivered fast on certified cryptographic USB tokens.</p>
        <nav aria-label="Main Navigation">
          <a href="/products">View DSC Products</a> | <a href="/pricing">Pricing Plans</a> | <a href="/use-cases">Use Cases</a> | <a href="/faqs">FAQs</a> | <a href="/contact">Contact Us</a>
        </nav>
      </header>
      <main>
        <section>
          <h2>One DSC. Multiple Possibilities.</h2>
          <ul>
            <li><strong>Company Registration:</strong> Incorporate private limited, LLP and OPC entities and sign MCA-21 SPICe+ forms.</li>
            <li><strong>GST Filing:</strong> Register for GST and file monthly returns securely with a legally valid Class 3 DSC.</li>
            <li><strong>Income Tax e-Filing:</strong> Digitally sign and submit income tax returns for individuals and businesses.</li>
            <li><strong>MCA Filings:</strong> Submit ROC forms, DIN applications and annual compliance with ease.</li>
            <li><strong>eTender Participation:</strong> Bid on government tenders, GeM procurement and CPPP portals.</li>
            <li><strong>Document Signing:</strong> Legally sign PDFs, agreements and commercial invoices.</li>
          </ul>
        </section>
        <section>
          <h2>Popular Digital Signature Certificates</h2>
          <ul>
            <li><a href="/products/class-3-dsc">Class 3 Individual DSC</a> - ₹1,999 (Income Tax, GST, MCA & ROC)</li>
            <li><a href="/products/etender-dsc">Class 3 eTender DSC</a> - ₹2,499 (GeM, CPPP, Railways & Defense)</li>
            <li><a href="/products/dgft-dsc">DGFT Digital Signature (Import / Export)</a> - ₹2,499 (IEC & ICEGATE Customs)</li>
            <li><a href="/products/mca-dsc">MCA / ROC Director DSC</a> - ₹1,999 (SPICe+, DIR-3 KYC & ROC)</li>
            <li><a href="/products/document-signer-dsc">Document Signer Certificate</a> - ₹3,999 (Automated Bulk Invoicing)</li>
            <li><a href="/products/class-2-dsc">Class 3 Organization DSC</a> - ₹1,799 (Corporate Authorized Signatory)</li>
          </ul>
        </section>
      </main>
    `,
  },
  {
    path: "/products",
    title: "Digital Signature Certificates (DSC) – Buy Online | SimpleDSC",
    description: "Browse and buy Class 3, DGFT, eTender, MCA, and Document Signer Digital Signature Certificates online with secure cryptographic USB tokens and fast eKYC across India.",
    heading: "Our DSC Products",
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Products", url: "/products" },
    ],
    semanticHtml: `
      <header>
        <h1>Our DSC Products</h1>
        <p>Choose from our complete range of Digital Signature Certificates issued through CCA-licensed Certifying Authorities with high-security crypto USB tokens.</p>
      </header>
      <main>
        <ul>
          <li><h3><a href="/products/class-3-dsc">Class 3 Individual DSC</a></h3><p>Price: ₹1,999 · Validity: 1 Year · Ideal for ITR, MCA-21, GST & PDF signing on ePass2003 token.</p></li>
          <li><h3><a href="/products/etender-dsc">Class 3 eTender DSC</a></h3><p>Price: ₹2,499 · Validity: 1 Year · Dual certificate (Signing + Encryption) on Watchdata ProxKey dongle for GeM & CPPP.</p></li>
          <li><h3><a href="/products/dgft-dsc">DGFT Digital Signature (Import / Export)</a></h3><p>Price: ₹2,499 · Validity: 1 Year · Pre-mapped IEC code on mToken crypto key for ICEGATE & DGFT licensing.</p></li>
          <li><h3><a href="/products/mca-dsc">MCA / ROC Director DSC</a></h3><p>Price: ₹1,999 · Validity: 1 Year · Director & partner DSC for SPICe+ incorporation, DIR-3 KYC & ROC filing.</p></li>
          <li><h3><a href="/products/document-signer-dsc">Document Signer Certificate (Bulk / Automated)</a></h3><p>Price: ₹3,999 · Validity: 1 Year · Enterprise certificate for automated bulk PDF signing on Innait hardware module.</p></li>
          <li><h3><a href="/products/class-2-dsc">Class 3 Organization DSC (Signing + Token)</a></h3><p>Price: ₹1,799 · Validity: 1 Year · Blue cryptographic token for corporate banking and organization signing.</p></li>
        </ul>
      </main>
    `,
  },
  {
    path: "/products/class-3-dsc",
    title: "Class 3 Digital Signature Certificate (Individual) | SimpleDSC",
    description: "Buy Class 3 Individual Digital Signature Certificate online in India. Pre-loaded on certified high-security ePass2003 USB crypto token for ITR filing, MCA-21, and GST.",
    image: `${PRIMARY_ORIGIN}/img/epass2003-token.png`,
    heading: "Class 3 Individual DSC",
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Products", url: "/products" },
      { name: "Class 3 Individual DSC", url: "/products/class-3-dsc" },
    ],
    schema: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Class 3 Individual DSC",
      description: "India's most trusted Class 3 Digital Signature Certificate. Pre-loaded on a certified high-security USB crypto token for ITR filing, MCA-21, GST portal, trademark filings, and digital PDF signing.",
      image: `${PRIMARY_ORIGIN}/img/epass2003-token.png`,
      category: "Class 3 DSC",
      brand: { "@type": "Brand", name: "ePass2003" },
      offers: {
        "@type": "Offer",
        price: 1999,
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        url: "https://www.simpldsc.com/products/class-3-dsc",
        seller: { "@type": "Organization", name: "SimpleDSC" },
      },
    },
    semanticHtml: `
      <article>
        <h1>Class 3 Individual DSC</h1>
        <p>India's most trusted Class 3 Digital Signature Certificate. Pre-loaded on a certified high-security USB crypto token for ITR filing, MCA-21, GST portal, trademark filings, and digital PDF signing.</p>
        <p><strong>Price:</strong> ₹1,999 (incl. GST · 1 Year Validity)</p>
        <h2>Features</h2>
        <ul>
          <li>FIPS 140-2 Level 3 Cryptographic USB Token</li>
          <li>CCA Govt of India Approved & Legally Valid</li>
          <li>Paperless Aadhaar & PAN eKYC in 15 Minutes</li>
          <li>Valid for Income Tax, GST, MCA & ROC Filings</li>
          <li>Instant Video Verification & Free Cloud Backup</li>
        </ul>
        <h2>Required Documents</h2>
        <p>PAN Card, Aadhaar Card, Photograph, Address Proof</p>
      </article>
    `,
  },
  {
    path: "/products/etender-dsc",
    title: "Class 3 eTender DSC (Signing & Encryption) | SimpleDSC",
    description: "Buy combo Class 3 eTender Digital Signature Certificate on Watchdata ProxKey USB dongle. Required for GeM portal, CPPP, defense, and government procurement bids.",
    image: `${PRIMARY_ORIGIN}/img/proxkey-token.png`,
    heading: "Class 3 eTender DSC",
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Products", url: "/products" },
      { name: "Class 3 eTender DSC", url: "/products/etender-dsc" },
    ],
    schema: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Class 3 eTender DSC",
      description: "High-security combo Digital Signature Certificate engineered for government e-tendering. Includes Signing and Encryption certificates on a Watchdata PROXKey USB dongle for GeM, CPPP, defense, and PSU bids.",
      image: `${PRIMARY_ORIGIN}/img/proxkey-token.png`,
      category: "eTender DSC",
      brand: { "@type": "Brand", name: "Watchdata ProxKey" },
      offers: {
        "@type": "Offer",
        price: 2499,
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        url: "https://www.simpldsc.com/products/etender-dsc",
        seller: { "@type": "Organization", name: "SimpleDSC" },
      },
    },
    semanticHtml: `
      <article>
        <h1>Class 3 eTender DSC</h1>
        <p>High-security combo Digital Signature Certificate engineered for government e-tendering. Includes Signing and Encryption certificates on a Watchdata PROXKey USB dongle for GeM, CPPP, defense, and PSU bids.</p>
        <p><strong>Price:</strong> ₹2,499 (incl. GST · 1 Year Validity)</p>
        <h2>Features</h2>
        <ul>
          <li>Dual Certificate: Class 3 Signing + Encryption</li>
          <li>Watchdata PROXKey FIPS 140-2 Crypto Dongle</li>
          <li>100% Compatible with GeM, CPPP & IREPS Railways</li>
          <li>State Tender Portals & Defense Procurement Ready</li>
          <li>Dedicated Technical Setup & Priority Support</li>
        </ul>
      </article>
    `,
  },
  {
    path: "/products/dgft-dsc",
    title: "DGFT Digital Signature Certificate for Exporters & Importers | SimpleDSC",
    description: "Get DGFT Digital Signature Certificate with IEC code mapping on certified mToken crypto key for online licensing on DGFT portal and ICEGATE customs clearance.",
    image: `${PRIMARY_ORIGIN}/img/mtoken-blue.png`,
    heading: "DGFT Digital Signature (Import / Export)",
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Products", url: "/products" },
      { name: "DGFT Digital Signature", url: "/products/dgft-dsc" },
    ],
    schema: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "DGFT Digital Signature (Import / Export)",
      description: "Specially configured Digital Signature for Indian exporters and importers. Pre-mapped with your IEC code on a certified mToken crypto key for quick DGFT licensing and ICEGATE customs clearance.",
      image: `${PRIMARY_ORIGIN}/img/mtoken-blue.png`,
      category: "DGFT DSC",
      brand: { "@type": "Brand", name: "mToken" },
      offers: {
        "@type": "Offer",
        price: 2499,
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        url: "https://www.simpldsc.com/products/dgft-dsc",
        seller: { "@type": "Organization", name: "SimpleDSC" },
      },
    },
    semanticHtml: `
      <article>
        <h1>DGFT Digital Signature (Import / Export)</h1>
        <p>Specially configured Digital Signature for Indian exporters and importers. Pre-mapped with your IEC code on a certified mToken crypto key for quick DGFT licensing and ICEGATE customs clearance.</p>
        <p><strong>Price:</strong> ₹2,499 (incl. GST · 1 Year Validity)</p>
      </article>
    `,
  },
  {
    path: "/products/mca-dsc",
    title: "MCA / ROC Director Digital Signature Certificate | SimpleDSC",
    description: "Class 3 Digital Signature Certificate for Company Directors and Partners. Pre-configured for SPICe+ company incorporation, DIN KYC, and ROC annual filings.",
    image: `${PRIMARY_ORIGIN}/img/mtoken-purple.png`,
    heading: "MCA / ROC Director DSC",
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Products", url: "/products" },
      { name: "MCA / ROC Director DSC", url: "/products/mca-dsc" },
    ],
    schema: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "MCA / ROC Director DSC",
      description: "Designed specifically for Company Directors and Partners. Seamlessly submit ROC annual returns, DIR-3 KYC, DIN approvals, and SPICe+ incorporation forms on the Ministry of Corporate Affairs portal.",
      image: `${PRIMARY_ORIGIN}/img/mtoken-purple.png`,
      category: "MCA DSC",
      brand: { "@type": "Brand", name: "mToken" },
      offers: {
        "@type": "Offer",
        price: 1999,
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        url: "https://www.simpldsc.com/products/mca-dsc",
        seller: { "@type": "Organization", name: "SimpleDSC" },
      },
    },
    semanticHtml: `
      <article>
        <h1>MCA / ROC Director DSC</h1>
        <p>Designed specifically for Company Directors and Partners. Seamlessly submit ROC annual returns, DIR-3 KYC, DIN approvals, and SPICe+ incorporation forms on the Ministry of Corporate Affairs portal.</p>
        <p><strong>Price:</strong> ₹1,999 (incl. GST · 1 Year Validity)</p>
      </article>
    `,
  },
  {
    path: "/products/document-signer-dsc",
    title: "Document Signer Certificate – Automated Bulk PDF Signing | SimpleDSC",
    description: "Organizational Document Signer Certificate for automated bulk PDF signing, ERP integration, Tally / SAP invoicing, and GST e-invoicing compliance.",
    image: `${PRIMARY_ORIGIN}/img/innait-token.png`,
    heading: "Document Signer Certificate (Bulk / Automated)",
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Products", url: "/products" },
      { name: "Document Signer Certificate", url: "/products/document-signer-dsc" },
    ],
    schema: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Document Signer Certificate (Bulk / Automated)",
      description: "Heavy-duty organizational certificate for automated, high-volume digital signing. Integrates directly with ERPs, invoicing pipelines, and accounting software for tamper-proof corporate document signing.",
      image: `${PRIMARY_ORIGIN}/img/innait-token.png`,
      category: "Document Signer DSC",
      brand: { "@type": "Brand", name: "Innait" },
      offers: {
        "@type": "Offer",
        price: 3999,
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        url: "https://www.simpldsc.com/products/document-signer-dsc",
        seller: { "@type": "Organization", name: "SimpleDSC" },
      },
    },
    semanticHtml: `
      <article>
        <h1>Document Signer Certificate (Bulk / Automated)</h1>
        <p>Heavy-duty organizational certificate for automated, high-volume digital signing. Integrates directly with ERPs, invoicing pipelines, and accounting software for tamper-proof corporate document signing.</p>
        <p><strong>Price:</strong> ₹3,999 (incl. GST · 1 Year Validity)</p>
      </article>
    `,
  },
  {
    path: "/products/class-2-dsc",
    title: "Class 3 Organization Digital Signature Certificate | SimpleDSC",
    description: "Class 3 Organization Named Digital Signature Certificate on blue cryptographic USB token for corporate banking, GST return signing, and corporate compliance.",
    image: `${PRIMARY_ORIGIN}/img/blue-token.png`,
    heading: "Class 3 Organization DSC (Signing + Token)",
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Products", url: "/products" },
      { name: "Class 3 Organization DSC", url: "/products/class-2-dsc" },
    ],
    schema: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Class 3 Organization DSC (Signing + Token)",
      description: "Authenticates both the individual representative and the company name. Includes a premium blue cryptographic USB token, ideal for corporate banking, GST return signing, and legal compliance.",
      image: `${PRIMARY_ORIGIN}/img/blue-token.png`,
      category: "Class 2 DSC",
      brand: { "@type": "Brand", name: "ePass2003" },
      offers: {
        "@type": "Offer",
        price: 1799,
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        url: "https://www.simpldsc.com/products/class-2-dsc",
        seller: { "@type": "Organization", name: "SimpleDSC" },
      },
    },
    semanticHtml: `
      <article>
        <h1>Class 3 Organization DSC (Signing + Token)</h1>
        <p>Authenticates both the individual representative and the company name. Includes a premium blue cryptographic USB token, ideal for corporate banking, GST return signing, and legal compliance.</p>
        <p><strong>Price:</strong> ₹1,799 (incl. GST · 1 Year Validity)</p>
      </article>
    `,
  },
  {
    path: "/pricing",
    title: "Digital Signature Certificate Pricing & Plans | SimpleDSC",
    description: "Explore transparent pricing for Class 3, DGFT, eTender, MCA, and Document Signer Digital Signature Certificates in India. Includes cryptographic USB tokens with no hidden charges.",
    heading: "DSC Pricing Plans",
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Pricing", url: "/pricing" },
    ],
    semanticHtml: `
      <header>
        <h1>DSC Pricing Plans</h1>
        <p>Transparent pricing for all Digital Signature Certificates. All plans include government-approved FIPS cryptographic USB tokens and paperless eKYC processing.</p>
      </header>
      <main>
        <ul>
          <li><strong>Class 3 Individual DSC:</strong> ₹1,999 (1 Year)</li>
          <li><strong>Class 3 eTender DSC:</strong> ₹2,499 (1 Year)</li>
          <li><strong>DGFT DSC (Import/Export):</strong> ₹2,499 (1 Year)</li>
          <li><strong>MCA / ROC Director DSC:</strong> ₹1,999 (1 Year)</li>
          <li><strong>Document Signer DSC:</strong> ₹3,999 (1 Year)</li>
          <li><strong>Organization DSC:</strong> ₹1,799 (1 Year)</li>
        </ul>
      </main>
    `,
  },
  {
    path: "/use-cases",
    title: "Digital Signature Certificate Use Cases & Applications | SimpleDSC",
    description: "Explore verified use cases for Digital Signature Certificates (DSC) in India: Company Registration, MCA-21, GST Filing, Income Tax e-Filing, GeM eTendering, and Document Signing.",
    heading: "One DSC. Multiple Possibilities.",
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Use Cases", url: "/use-cases" },
    ],
    semanticHtml: `
      <header>
        <h1>One DSC. Multiple Possibilities.</h1>
        <p>A single Digital Signature Certificate unlocks dozens of regulatory and enterprise signing applications across India.</p>
      </header>
      <main>
        <section>
          <h2>Primary Compliance Applications</h2>
          <ul>
            <li><strong>Company Registration & SPICe+:</strong> Incorporate private limited companies, LLPs, and OPC entities directly on the MCA portal.</li>
            <li><strong>GST Filing:</strong> Legally required for businesses and LLPs to authenticate GST returns and registrations.</li>
            <li><strong>Income Tax e-Filing:</strong> Mandatory for audited individuals, directors, and corporate entities submitting ITR.</li>
            <li><strong>eTender & GeM:</strong> Dual signing and encryption certificate for bidding on central and state e-procurement portals.</li>
            <li><strong>DGFT & Customs:</strong> ICEGATE shipping bills and DGFT export/import incentive applications.</li>
            <li><strong>Digital Document Signing:</strong> PDF contract signing, commercial agreements, and vendor invoices.</li>
          </ul>
        </section>
      </main>
    `,
  },
  {
    path: "/faqs",
    title: "Digital Signature FAQs – Frequently Asked Questions | SimpleDSC",
    description: "Find answers to common questions about Digital Signature Certificates in India: eKYC verification, required documents, USB crypto tokens, and portal compliance.",
    heading: "Frequently Asked Questions",
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "FAQs", url: "/faqs" },
    ],
    schema: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is a DSC?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A Digital Signature Certificate (DSC) is the electronic equivalent of a physical signature, legally valid under the IT Act 2000, used to sign documents and authenticate identity online.",
          },
        },
        {
          "@type": "Question",
          name: "Which DSC do I need?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "It depends on your purpose. Class 3 Individual is ideal for ITR, GST and ROC. eTender DSC (Signing + Encryption) is required for GeM and government tenders. DGFT is needed for import/export IEC mapping.",
          },
        },
        {
          "@type": "Question",
          name: "What documents are required?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Typically PAN card, Aadhaar card, a passport photograph, and address proof for individuals. Organizations need additional incorporation documents and authorization letters.",
          },
        },
        {
          "@type": "Question",
          name: "How long does processing take?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Most Class 3 DSCs are processed within a few hours to 24 hours after successful paperless eKYC and video verification.",
          },
        },
        {
          "@type": "Question",
          name: "Can I use DSC for GST and Income Tax?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, a Class 3 Individual DSC is fully compliant and accepted across the GST portal, Income Tax e-Filing, and MCA-21.",
          },
        },
      ],
    },
    semanticHtml: `
      <header>
        <h1>Frequently Asked Questions</h1>
        <p>Answers to common questions about Digital Signature Certificates, eKYC verification, and token hardware.</p>
      </header>
      <main>
        <dl>
          <dt><strong>What is a DSC?</strong></dt>
          <dd>A Digital Signature Certificate (DSC) is the electronic equivalent of a physical signature, legally valid under the IT Act 2000, used to sign documents and authenticate identity online.</dd>
          <dt><strong>Which DSC do I need?</strong></dt>
          <dd>It depends on your purpose. Class 3 Individual is for ITR and GST. eTender is for GeM and government tenders. DGFT is for exporters/importers.</dd>
          <dt><strong>What documents are required?</strong></dt>
          <dd>PAN card, Aadhaar card, photograph, and mobile linked with Aadhaar for instant OTP verification.</dd>
          <dt><strong>How long does processing take?</strong></dt>
          <dd>Processing typically takes from a few hours to 24 hours following eKYC completion.</dd>
        </dl>
      </main>
    `,
  },
  {
    path: "/about",
    title: "About SimpleDSC – Trusted Digital Signature Partner in India",
    description: "Learn about SimpleDSC, a digital-first platform providing fast, secure, paperless Digital Signature Certificate (DSC) assistance across India.",
    heading: "Enabling a Secure and Digital India",
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "About Us", url: "/about" },
    ],
    semanticHtml: `
      <header>
        <p>About SimpleDSC</p>
        <h1>Enabling a Secure and Digital India</h1>
        <p>SimpleDSC is a digital-first platform focused on making Digital Signature Certificates simple, secure and accessible for professionals, businesses and government users across India.</p>
      </header>
      <main>
        <section>
          <h2>Our Core Pillars</h2>
          <ul>
            <li><strong>Secure Process:</strong> End-to-end encrypted eKYC and private document handling.</li>
            <li><strong>Digital Verification:</strong> Paperless Aadhaar and video-based identity verification.</li>
            <li><strong>Customer Support:</strong> Responsive assistance to guide you through token setup and software drivers.</li>
            <li><strong>Pan India Service:</strong> Serving individuals, CAs, tax professionals and enterprises across the nation.</li>
          </ul>
        </section>
      </main>
    `,
  },
  {
    path: "/resources",
    title: "DSC Resources, Token Drivers & Setup Guides | SimpleDSC",
    description: "Access official setup guides, cryptographic token driver downloads (ePass2003, ProxKey, mToken), and troubleshooting resources for your Digital Signature Certificate.",
    heading: "DSC Resources & Setup Guides",
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Resources", url: "/resources" },
    ],
    semanticHtml: `
      <header>
        <h1>DSC Resources & Setup Guides</h1>
        <p>Step-by-step guides and driver information to help you install, configure, and sign documents with your USB crypto token.</p>
      </header>
      <main>
        <ul>
          <li><strong>DSC User Guide:</strong> Complete walkthrough of using your digital signature certificate for PDF signing and portal logins.</li>
          <li><strong>Token Installation Guide:</strong> How to install USB token drivers for ePass2003, Watchdata ProxKey, and mToken.</li>
          <li><strong>Troubleshooting:</strong> Resolving common Java, browser, and certificate detection issues.</li>
        </ul>
      </main>
    `,
  },
  {
    path: "/contact",
    title: "Contact SimpleDSC – Customer Support & Office Details",
    description: "Contact SimpleDSC customer support for digital signature inquiries, order assistance, and token verification. Office: Bhubaneswar, Odisha. Phone: +91-7992999947.",
    heading: "Get in Touch with SimpleDSC",
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Contact", url: "/contact" },
    ],
    semanticHtml: `
      <header>
        <h1>Get in Touch with SimpleDSC</h1>
        <p>We are here to help you with your DSC orders, renewal, and technical setup.</p>
      </header>
      <main>
        <section>
          <h2>Office Location</h2>
          <p>Mallick Complex, Plot No. A/69, Kharavela Nagar, Unit 3, Bhubaneswar, Odisha – 751001</p>
          <p><strong>Phone:</strong> +91 7992999947 / +91 7992777799</p>
          <p><strong>Email:</strong> support@simpldsc.in</p>
          <p><strong>Business Hours:</strong> Monday – Saturday, 10:00 AM – 7:00 PM IST</p>
        </section>
      </main>
    `,
  },
  {
    path: "/partner",
    title: "Partner With SimpleDSC – Become a DSC Agent / Associate",
    description: "Join the SimpleDSC Partner & Agent program. Earn attractive commissions by providing Digital Signature Certificates to your clients with fast paperless eKYC.",
    heading: "Become a SimpleDSC Partner",
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Partner Program", url: "/partner" },
    ],
    semanticHtml: `
      <header>
        <h1>Become a SimpleDSC Partner</h1>
        <p>Empower your tax, accounting, or legal consultancy by offering DSC services directly to your clients with transparent tracking and high commission margins.</p>
      </header>
    `,
  },
  {
    path: "/terms",
    title: "Terms and Conditions | SimpleDSC",
    description: "Read the SimpleDSC terms and conditions for Digital Signature Certificate registration assistance, verification, and payment processing.",
    heading: "Terms & Conditions",
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Terms & Conditions", url: "/terms" },
    ],
    semanticHtml: `
      <article>
        <h1>Terms & Conditions</h1>
        <p>By using SimpleDSC, you agree to our terms. SimpleDSC operates as a registration assistance platform for CCA-licensed Certifying Authorities.</p>
      </article>
    `,
  },
  {
    path: "/privacy",
    title: "Privacy Policy – Data Protection & Security | SimpleDSC",
    description: "Learn how SimpleDSC protects your personal information and eKYC documents. We maintain end-to-end encryption and strict data confidentiality.",
    heading: "Privacy Policy",
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Privacy Policy", url: "/privacy" },
    ],
    semanticHtml: `
      <article>
        <h1>Privacy Policy</h1>
        <p>SimpleDSC collects identity details and documents solely to process DSC applications through Certifying Authorities. We never sell your personal data.</p>
      </article>
    `,
  },
  {
    path: "/refund",
    title: "Refund & Cancellation Policy | SimpleDSC",
    description: "Understand SimpleDSC's refund and cancellation policies for digital signature certificate orders and verification services.",
    heading: "Refund Policy",
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Refund Policy", url: "/refund" },
    ],
    semanticHtml: `
      <article>
        <h1>Refund Policy</h1>
        <p>Refunds may be requested before application submission to the Certifying Authority. Once a certificate is issued, professional and CA fees are non-refundable.</p>
      </article>
    `,
  },
  // Application & Auth Routes (pre-rendered SPA shells to guarantee 200 OK on Vercel)
  {
    path: "/admin",
    title: "Admin Portal | SimpleDSC",
    description: "SimpleDSC Admin Management Portal.",
    noindex: true,
  },
  {
    path: "/admin/login",
    title: "Admin Login | SimpleDSC",
    description: "SimpleDSC Admin Login Portal.",
    noindex: true,
  },
  {
    path: "/client",
    title: "Client Portal | SimpleDSC",
    description: "SimpleDSC Client Portal.",
    noindex: true,
  },
  {
    path: "/client/login",
    title: "Client Login | SimpleDSC",
    description: "SimpleDSC Client Login.",
    noindex: true,
  },
  {
    path: "/agent",
    title: "Agent Portal | SimpleDSC",
    description: "SimpleDSC Agent Portal.",
    noindex: true,
  },
  {
    path: "/agent/login",
    title: "Agent Login | SimpleDSC",
    description: "SimpleDSC Agent Login.",
    noindex: true,
  },
];

function upsertTagRegex(html, regex, replacementTag, fallbackBeforeTag = "</head>") {
  if (regex.test(html)) {
    return html.replace(regex, replacementTag);
  }
  return html.replace(fallbackBeforeTag, `  ${replacementTag}\n${fallbackBeforeTag}`);
}

function buildRouteHtml(templateHtml, route) {
  let html = templateHtml;
  const canonicalUrl = `${PRIMARY_ORIGIN}${route.path === "/" ? "/" : route.path}`;
  const ogImage = route.image || DEFAULT_IMAGE;

  // 1. Update Title
  html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(route.title)}</title>`);

  // 2. Update Description
  html = upsertTagRegex(
    html,
    /<meta\s+name=["']description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(route.description)}"/>`
  );

  // 2b. Robots Noindex for Private Routes
  if (route.noindex) {
    html = upsertTagRegex(
      html,
      /<meta\s+name=["']robots["']\s+content=["'].*?["']\s*\/?>/i,
      `<meta name="robots" content="noindex, nofollow"/>`
    );
  }

  // 3. Update Canonical URL
  html = upsertTagRegex(
    html,
    /<link\s+rel=["']canonical["']\s+href=["'].*?["']\s*\/?>/i,
    `<link rel="canonical" href="${canonicalUrl}"/>`
  );

  // 4. Update Open Graph
  html = upsertTagRegex(
    html,
    /<meta\s+property=["']og:title["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtml(route.title)}"/>`
  );
  html = upsertTagRegex(
    html,
    /<meta\s+property=["']og:description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtml(route.description)}"/>`
  );
  html = upsertTagRegex(
    html,
    /<meta\s+property=["']og:url["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="og:url" content="${canonicalUrl}"/>`
  );
  html = upsertTagRegex(
    html,
    /<meta\s+property=["']og:image["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta property="og:image" content="${ogImage}"/>`
  );

  // 5. Update Twitter Cards
  html = upsertTagRegex(
    html,
    /<meta\s+name=["']twitter:title["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta name="twitter:title" content="${escapeHtml(route.title)}"/>`
  );
  html = upsertTagRegex(
    html,
    /<meta\s+name=["']twitter:description["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta name="twitter:description" content="${escapeHtml(route.description)}"/>`
  );
  html = upsertTagRegex(
    html,
    /<meta\s+name=["']twitter:image["']\s+content=["'].*?["']\s*\/?>/i,
    `<meta name="twitter:image" content="${ogImage}"/>`
  );

  // 6. Inject Schema & Breadcrumbs
  const additionalSchemas = [];
  if (route.breadcrumbs && route.breadcrumbs.length > 0) {
    additionalSchemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: route.breadcrumbs.map((b, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: b.name,
        item: `${PRIMARY_ORIGIN}${b.url.startsWith("/") ? b.url : `/${b.url}`}`,
      })),
    });
  }
  if (route.schema) {
    additionalSchemas.push(route.schema);
  }

  if (additionalSchemas.length > 0) {
    const schemaTag = additionalSchemas
      .map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`)
      .join("\n    ");
    html = html.replace("</head>", `    ${schemaTag}\n  </head>`);
  }

  // 7. Inject Semantic Pre-rendered Content into #root (only on static subpages, keeping root index.html clean as SPA shell)
  if (route.semanticHtml && route.path !== "/") {
    const semanticFallback = `\n    <div class="seo-crawler-prerender" style="display:contents;">\n${route.semanticHtml}\n    </div>\n  `;
    html = html.replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${semanticFallback}</div>`);
  }

  return html;
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function run() {
  const templatePath = path.join(BUILD_DIR, "index.html");
  if (!fs.existsSync(templatePath)) {
    console.error("❌ Error: build/index.html not found. Run craco build first.");
    process.exit(1);
  }

  let templateHtml = fs.readFileSync(templatePath, "utf8");
  // Ensure template starts with an empty #root
  templateHtml = templateHtml.replace(/<div id="root">[\s\S]*?<\/div>/i, '<div id="root"></div>');
  // Strip previous dynamic Breadcrumb and Product schemas so they don't duplicate
  templateHtml = templateHtml.replace(/<script type="application\/ld\+json">\{"@context":"https:\/\/schema.org","@type":(?:(?!WebSite|Organization).)*?<\/script>/gis, '');

  console.log(`🚀 Starting static page generation for ${ROUTES.length} canonical routes...`);

  let count = 0;
  for (const route of ROUTES) {
    const pageHtml = buildRouteHtml(templateHtml, route);
    let targetFile;

    if (route.path === "/") {
      targetFile = path.join(BUILD_DIR, "index.html");
    } else {
      const routeDir = path.join(BUILD_DIR, route.path.replace(/^\//, ""));
      fs.mkdirSync(routeDir, { recursive: true });
      targetFile = path.join(routeDir, "index.html");
    }

    fs.writeFileSync(targetFile, pageHtml, "utf8");
    count++;
    console.log(`  ✓ Generated: ${route.path} -> ${path.relative(BUILD_DIR, targetFile)}`);
  }

  console.log(`\n✅ Successfully generated ${count} SEO-prerendered public routes in build directory.`);
}

run();
