import { Seo } from "@/components/Seo";
import { SITE } from "@/lib/site";
import { ShieldCheck, Building2, Phone, Mail, MapPin } from "lucide-react";

const CONTENT = {
  terms: {
    title: "Terms & Conditions",
    seoTitle: "Terms and Conditions | SimpleDSC – TSMTX SOLUTIONS PRIVATE LIMITED",
    seoDesc: "Read the SimpleDSC terms and conditions for Digital Signature Certificate registration assistance, verification, and payment processing provided by TSMTX SOLUTIONS PRIVATE LIMITED.",
    path: "/terms",
    intro: `These Terms and Conditions govern the access and use of the SimpleDSC platform (www.simpldsc.com), operated and provided by ${SITE.companyLegalName} ("Company", "we", "us", or "our").`,
    body: [
      [
        "1. Entity & Platform Agreement",
        `SimpleDSC is an online digital signature facilitation service platform provided by ${SITE.companyLegalName}. By accessing, browsing, or placing an order on SimpleDSC, you acknowledge that you are entering into a legally binding agreement with ${SITE.companyLegalName}. SimpleDSC operates as a registration assistance and facilitation portal for CCA-licensed Certifying Authorities.`
      ],
      [
        "2. Scope of Services",
        "We facilitate the end-to-end application, documentation, eKYC verification guidance, and token fulfillment for Digital Signature Certificates (DSC) across Class 3, eTender, DGFT, and Organization categories. Final statutory certificate generation and cryptographic signing are executed directly by licensed Certifying Authorities under the IT Act, 2000."
      ],
      [
        "3. Applicant Responsibilities",
        "Applicants must submit accurate, authentic, and unexpired identification documents (PAN, Aadhaar/ID, Passport, Organization Proof). Submitting false, forged, or altered documentation is a punishable offense under Indian law and results in immediate application cancellation without refund."
      ],
      [
        "4. Payments & Billing",
        `All commercial transactions, invoicing, and service fees on SimpleDSC are billed by ${SITE.companyLegalName}. Payments are processed securely via Cashfree Payments and official payment gateways. Prices displayed include applicable Goods and Services Tax (GST) unless explicitly noted.`
      ],
      [
        "5. Limitation of Liability",
        `${SITE.companyLegalName} shall not be held liable for statutory rejections, regulatory portal downtime (e.g., MCA, Income Tax, GST, eProcurement), or delays caused by incorrect applicant information or Certifying Authority verification schedules.`
      ],
      [
        "6. Governing Law & Jurisdiction",
        "These terms shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or related to platform services shall be subject to the exclusive jurisdiction of the competent courts in Odisha, India."
      ],
    ],
  },
  privacy: {
    title: "Privacy Policy",
    seoTitle: "Privacy Policy – Data Protection & Security | SimpleDSC",
    seoDesc: "Learn how TSMTX SOLUTIONS PRIVATE LIMITED protects your personal information and eKYC documents on SimpleDSC with bank-grade encryption.",
    path: "/privacy",
    intro: `This Privacy Policy outlines how ${SITE.companyLegalName} ("Company", "we", "our") collects, uses, stores, and safeguards your personal data when using SimpleDSC (www.simpldsc.com).`,
    body: [
      [
        "1. Data Controller & Legal Entity",
        `${SITE.companyLegalName} is the legal owner and operator of SimpleDSC and acts as the data custodian for information collected through this platform in compliance with the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.`
      ],
      [
        "2. Information We Collect",
        "We collect applicant personal information including full name, mobile number, email address, PAN card number, date of birth, address, and verification identity documents solely to process statutory DSC applications."
      ],
      [
        "3. Purpose of Collection",
        "Your personal information is used exclusively for identity verification, document validation, payment processing, customer support, and transmission to government-licensed Certifying Authorities for certificate issuance. We do NOT sell, rent, or trade your data to third-party marketing firms."
      ],
      [
        "4. Data Security & Storage",
        "All uploaded documents and customer records are protected with bank-grade SSL/TLS 256-bit encryption in transit and rest. Access is strictly restricted to certified verification personnel with role-based access controls and comprehensive audit logging."
      ],
      [
        "5. Disclosure to Certifying Authorities",
        "To fulfill your application under the Information Technology Act 2000, necessary identity details are transmitted securely to your chosen licensed Certifying Authority (such as eMudhra, Capricorn, VSign, or Pantasign) for statutory verification."
      ],
      [
        "6. Data Rights & Contact",
        `You may review, update, or request data retention status by writing to our designated grievance officer at ${SITE.email} or by post to ${SITE.companyLegalName}, ${SITE.address}.`
      ],
    ],
  },
  refund: {
    title: "Refund & Cancellation Policy",
    seoTitle: "Refund & Cancellation Policy | SimpleDSC – TSMTX SOLUTIONS PRIVATE LIMITED",
    seoDesc: "Understand the SimpleDSC refund, cancellation and return policies for DSC orders processed by TSMTX SOLUTIONS PRIVATE LIMITED.",
    path: "/refund",
    intro: `This Refund and Cancellation Policy applies to all digital signature certificate orders placed on SimpleDSC, provided and fulfilled by ${SITE.companyLegalName}.`,
    body: [
      [
        "1. Cancellation Before Processing",
        `Refunds may be requested if the cancellation request is submitted before your documentation is transmitted to or approved by the Certifying Authority. To cancel an order, submit your request to ${SITE.email} or call ${SITE.phone} with your Order ID.`
      ],
      [
        "2. Non-Refundable Statutory Fees",
        "Once a Digital Signature Certificate has been approved, generated, or downloaded onto a cryptographic USB token, statutory government charges, certifying authority fees, and professional processing expenses cannot be refunded or recalled."
      ],
      [
        "3. Hardware & Token Replacement",
        "If a physical USB token (ePass2003, ProxKey, mToken) arrives damaged or defective, we provide a free replacement token upon inspection within 7 days of delivery."
      ],
      [
        "4. Refund Settlement Timeline",
        "Approved refund requests are credited back to the original payment source (UPI account, Debit/Credit Card, or Net Banking) via our official payment gateway within 5 to 7 business days."
      ],
      [
        "5. Contact Support for Refunds",
        `For assistance with cancellations or refund inquiries, please contact our support team at ${SITE.phone} / ${SITE.phone2} or email ${SITE.email}. Business hours: ${SITE.hoursNote}.`
      ],
    ],
  },
};

export default function Legal({ type }) {
  const c = CONTENT[type] || CONTENT.terms;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <Seo
        title={c.seoTitle}
        description={c.seoDesc}
        canonical={c.path}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: c.title, url: c.path },
        ]}
      />

      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 border border-purple-100 mb-3">
          <Building2 className="h-3.5 w-3.5" />
          <span>{SITE.companyLegalName}</span>
        </div>
        <h1 className="responsive-compact-title font-display text-3xl sm:text-4xl font-extrabold text-navy-900">
          {c.title}
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-500">
          Platform: <strong>SimpleDSC</strong> (www.simpldsc.com) · Legal Entity: <strong>{SITE.companyLegalName}</strong>
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          Last revised: {SITE.policyLastUpdated} · Document version {SITE.policyVersion}
        </p>
      </div>

      {/* Introduction */}
      {c.intro && (
        <div className="my-6 rounded-2xl bg-slate-50 border border-slate-200/80 p-4 sm:p-5 text-sm text-slate-700 leading-relaxed">
          {c.intro}
        </div>
      )}

      {/* Policy Sections */}
      <div className="mt-8 space-y-7">
        {c.body.map(([h, p]) => (
          <div key={h} className="rounded-xl p-1">
            <h2 className="font-display text-lg font-bold text-navy-950">{h}</h2>
            <p className="mt-2 text-slate-600 leading-relaxed text-sm sm:text-base">{p}</p>
          </div>
        ))}
      </div>

      {/* Disclaimer & Registered Office Box */}
      <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-800">
          <ShieldCheck className="h-4 w-4" />
          <span>Statutory Disclaimer & Corporate Contact</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          SimpleDSC is a digital signature service platform provided by <strong>{SITE.companyLegalName}</strong>. SimpleDSC is an independent registration assistance portal that facilitates application, verification guidance, and token dispatch for CCA-licensed Certifying Authorities under the IT Act, 2000.
        </p>
        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-purple-600 shrink-0" />
            <span>{SITE.address}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-purple-600 shrink-0" />
            <a href={`mailto:${SITE.emailHref}`} className="hover:text-purple-700 font-medium">{SITE.email}</a>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-purple-600 shrink-0" />
            <span>Tel: {SITE.phone} / {SITE.phone2}</span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-purple-600 shrink-0" />
            <span>Entity: {SITE.companyLegalName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
