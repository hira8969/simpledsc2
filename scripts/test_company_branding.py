"""
Test Suite for TSMTX SOLUTIONS PRIVATE LIMITED Company Branding Throughout SimpleDSC.
Verifies Header, Footer, About, Legal pages, Dashboards, and Invoices.
"""
import os
import sys

def test_branding_configuration():
    print("\n[TEST 1] Testing Centralized Site Configuration in site.js...")
    with open("frontend/src/lib/site.js", "r", encoding="utf-8") as f:
        content = f.read()
    assert 'companyLegalName: "TSMTX SOLUTIONS PRIVATE LIMITED"' in content
    assert 'companyAttribution: "A Product of TSMTX SOLUTIONS PRIVATE LIMITED"' in content
    assert 'companyAttributionPowered: "Powered by TSMTX SOLUTIONS PRIVATE LIMITED"' in content
    assert 'companyFooterStatement: "SimpleDSC is a digital signature service platform by TSMTX SOLUTIONS PRIVATE LIMITED."' in content
    print("  ✓ site.js central branding keys verified")

def test_no_legacy_placeholders():
    print("\n[TEST 2] Verifying Zero Occurrences of Legacy Company Placeholders...")
    legacy_terms = ["YSMTX", "ysmtx"]
    matched = []
    for root, dirs, files in os.walk("frontend/src"):
        for f in files:
            if f.endswith((".js", ".jsx")):
                p = os.path.join(root, f)
                with open(p, "r", encoding="utf-8") as fp:
                    c = fp.read()
                    for term in legacy_terms:
                        if term in c:
                            matched.append((p, term))
    assert len(matched) == 0, f"Found legacy company references: {matched}"
    print("  ✓ 0 legacy company placeholders found across frontend/src")

def test_component_integrations():
    print("\n[TEST 3] Testing Component Integrations...")
    # Navbar
    with open("frontend/src/components/Navbar.js", "r", encoding="utf-8") as f:
        nav = f.read()
    assert "CompanyAttribution" in nav
    print("  ✓ Navbar integrates CompanyAttribution")

    # Footer
    with open("frontend/src/components/Footer.js", "r", encoding="utf-8") as f:
        footer = f.read()
    assert "CompanyAttribution" in footer
    assert "TSMTX SOLUTIONS PRIVATE LIMITED" in footer or "{SITE.companyLegalName}" in footer
    print("  ✓ Footer integrates CompanyAttribution and copyright")

    # About
    with open("frontend/src/pages/About.js", "r", encoding="utf-8") as f:
        about = f.read()
    assert "{SITE.companyLegalName}" in about or "TSMTX SOLUTIONS PRIVATE LIMITED" in about
    assert "Corporate Overview" in about
    print("  ✓ About page integrates dedicated corporate overview")

    # Legal
    with open("frontend/src/pages/Legal.js", "r", encoding="utf-8") as f:
        legal = f.read()
    assert "{SITE.companyLegalName}" in legal
    print("  ✓ Legal pages reflect TSMTX SOLUTIONS PRIVATE LIMITED in Terms, Privacy, Refund")

    # Dashboards
    with open("frontend/src/pages/Dashboard.js", "r", encoding="utf-8") as f:
        dash = f.read()
    assert "CompanyAttribution" in dash
    print("  ✓ Customer Dashboard integrates CompanyAttribution")

    with open("frontend/src/pages/admin/AdminLayout.js", "r", encoding="utf-8") as f:
        admin_layout = f.read()
    assert "CompanyAttribution" in admin_layout
    print("  ✓ Admin Dashboard integrates CompanyAttribution")

    # Invoices
    with open("frontend/src/components/InvoiceModal.js", "r", encoding="utf-8") as f:
        inv = f.read()
    assert "{SITE.companyLegalName}" in inv
    print("  ✓ InvoiceModal integrates TSMTX SOLUTIONS PRIVATE LIMITED")

if __name__ == "__main__":
    print("=" * 65)
    print("RUNNING TSMTX SOLUTIONS BRANDING VERIFICATION TEST SUITE")
    print("=" * 65)
    test_branding_configuration()
    test_no_legacy_placeholders()
    test_component_integrations()
    print("\n" + "=" * 65)
    print("ALL BRANDING TESTS PASSED (100% OK)")
    print("=" * 65)
