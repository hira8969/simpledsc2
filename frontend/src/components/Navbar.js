import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, MoreVertical, User, LogOut, LayoutDashboard } from "lucide-react";
import { track } from "@/lib/analytics";

const NAV = [
  { label: "Home", to: "/" },
  { label: "Products", to: "/products" },
  { label: "Use Cases", to: "/use-cases" },
  { label: "Pricing", to: "/pricing" },
  { label: "About", to: "/about" },
  { label: "Resources", to: "/resources" },
];
const MORE = [
  { label: "Become a DSC Agent", to: "/agent" },
  { label: "Contact", to: "/contact" },
  { label: "FAQs", to: "/faqs" },
  { label: "Terms & Conditions", to: "/terms" },
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Refund Policy", to: "/refund" },
];

export function Navbar() {
  const { user, requireAuth, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", h); return () => window.removeEventListener("scroll", h);
  }, []);

  const getDsc = () => { track("get_dsc_click"); requireAuth(() => nav("/dashboard")); };
  const active = (to) => loc.pathname === to;

  return (
    <header className={`sticky top-0 z-40 border-b transition-all ${scrolled ? "glass-nav border-purple-100/70 shadow-sm" : "bg-white border-transparent"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" data-testid="nav-logo-link"><Logo /></Link>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active(n.to) ? "text-purple-700 bg-purple-50" : "text-navy-800 hover:text-purple-700 hover:bg-purple-50/60"}`}>
                {n.label}
              </Link>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger data-testid="nav-more-btn" className="px-2 py-2 rounded-lg text-navy-800 hover:bg-purple-50/60 outline-none">
                <MoreVertical className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {MORE.map((m) => (
                  <DropdownMenuItem key={m.to} onClick={() => nav(m.to)} data-testid={`more-${m.label.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "and")}`}>
                    {m.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger data-testid="nav-account-btn" className="hidden sm:flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-800 outline-none">
                  <User className="h-4 w-4" /> {user.name?.split(" ")[0] || "Account"}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => nav("/dashboard")} data-testid="nav-dashboard-link"><LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard</DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} data-testid="nav-logout-btn"><LogOut className="h-4 w-4 mr-2" /> Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" data-testid="nav-login-btn" onClick={() => requireAuth()} className="hidden sm:inline-flex text-navy-800">Login</Button>
            )}
            <Button data-testid="nav-get-dsc-btn" onClick={getDsc} className="bg-gradient-to-r from-purple-700 to-navy-800 hover:from-purple-800 text-white rounded-xl px-5">Get DSC</Button>

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger data-testid="nav-mobile-menu-btn" className="lg:hidden p-2 text-navy-800"><Menu className="h-6 w-6" /></SheetTrigger>
              <SheetContent side="right" className="w-80 overflow-y-auto">
                <div className="mt-6 flex flex-col gap-1">
                  {[...NAV, ...MORE].map((n) => (
                    <Link key={n.to} to={n.to} onClick={() => setMobileOpen(false)}
                      data-testid={`mnav-${n.label.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "and")}`}
                      className="px-3 py-2.5 rounded-lg text-navy-800 hover:bg-purple-50 font-medium">{n.label}</Link>
                  ))}
                  {user && <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 rounded-lg text-purple-700 font-semibold">Dashboard</Link>}
                  {user
                    ? <button onClick={() => { logout(); setMobileOpen(false); }} className="px-3 py-2.5 text-left rounded-lg text-rose-600 font-medium">Logout</button>
                    : <button onClick={() => { requireAuth(); setMobileOpen(false); }} className="px-3 py-2.5 text-left rounded-lg text-purple-700 font-semibold">Login</button>}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
