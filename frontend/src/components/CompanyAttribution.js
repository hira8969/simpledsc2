import React from "react";
import { SITE } from "@/lib/site";

/**
 * Reusable Company Attribution Component
 * Centrally renders parent company branding (TSMTX SOLUTIONS PRIVATE LIMITED)
 * across Header, Footer, Dashboards, Login pages, and Invoices.
 *
 * Variants:
 *  - "header": Subtle pill next to the logo in the website navbar
 *  - "footer": Clear platform description statement in the footer
 *  - "sidebar": Subtle attribution for customer & admin sidebars
 *  - "subtle": Muted text for login & registration cards
 *  - "badge": Inline pill badge
 *  - "invoice": Official corporate attribution for invoices
 */
export function CompanyAttribution({ variant = "header", className = "" }) {
  if (variant === "header") {
    return (
      <span
        data-testid="header-company-attribution"
        className={`hidden md:inline-flex items-center rounded-full bg-purple-50/90 border border-purple-200/80 px-2.5 py-0.5 text-[10px] font-semibold text-purple-700 tracking-wide select-none ${className}`}
        title={SITE.companyAttribution}
      >
        A Product of {SITE.companyLegalName}
      </span>
    );
  }

  if (variant === "footer") {
    return (
      <p
        data-testid="footer-company-attribution"
        className={`text-sm text-slate-400 leading-relaxed ${className}`}
      >
        {SITE.companyFooterStatement}
      </p>
    );
  }

  if (variant === "sidebar") {
    return (
      <div
        data-testid="sidebar-company-attribution"
        className={`text-center pt-3 border-t border-slate-100 ${className}`}
      >
        <p className="text-[10px] text-slate-400 font-medium tracking-tight">
          {SITE.companyAttributionPowered}
        </p>
      </div>
    );
  }

  if (variant === "subtle") {
    return (
      <p
        data-testid="subtle-company-attribution"
        className={`text-center text-xs text-slate-400 ${className}`}
      >
        {SITE.companyAttributionPowered}
      </p>
    );
  }

  if (variant === "badge") {
    return (
      <span
        data-testid="badge-company-attribution"
        className={`inline-flex items-center rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700 ${className}`}
      >
        {SITE.companyAttribution}
      </span>
    );
  }

  if (variant === "invoice") {
    return (
      <p
        data-testid="invoice-company-attribution"
        className={`text-xs text-slate-500 font-medium ${className}`}
      >
        SimpleDSC is a digital signature platform by {SITE.companyLegalName}
      </p>
    );
  }

  return (
    <span className={`text-xs text-slate-500 ${className}`}>
      {SITE.companyAttribution}
    </span>
  );
}

export default CompanyAttribution;
