import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useAgentAuth } from "@/context/AgentAuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, User, LogOut, LayoutDashboard } from "lucide-react";
import { track } from "@/lib/analytics";

const NAV = [
  { label: "Home", to: "/" },
  { label: "Products", to: "/products" },
  { label: "Use Cases", to: "/use-cases" },
  { label: "Pricing", to: "/pricing" },
  { label: "About", to: "/about" },
  { label: "Resources", to: "/resources" },
];

export function Navbar() {
  const { user, requireAuth, logout } = useAuth();
  const { agent } = useAgentAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const getDsc = () => {
    track("get_dsc_click");
    requireAuth(() => nav("/client"));
  };
  const active = (to) => loc.pathname === to;

  return (
    <header className={`sticky top-0 z-40 border-b transition-all ${scrolled ? "glass-nav border-purple-100/70 shadow-sm" : "bg-white border-transparent"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" data-testid="nav-logo-link" className="shrink-0"><Logo /></Link>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-1">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active(n.to)
                    ? "text-purple-700 bg-purple-50"
                    : "text-navy-800 hover:text-purple-700 hover:bg-purple-50/60"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {agent && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => nav("/agent")}
                className="hidden sm:inline-flex text-xs font-bold border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100 rounded-xl h-9"
              >
                Agent Portal ({agent.agentCode})
              </Button>
            )}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger data-testid="nav-account-btn" className="hidden sm:flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-800 outline-none">
                  <User className="h-4 w-4" /> {user.name?.split(" ")[0] || "Account"}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => nav("/client")} data-testid="nav-dashboard-link">
                    <LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} data-testid="nav-logout-btn">
                    <LogOut className="h-4 w-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" data-testid="nav-login-btn" onClick={() => requireAuth()} className="hidden sm:inline-flex text-navy-800">
                Login
              </Button>
            )}
            <Button data-testid="nav-get-dsc-btn" onClick={getDsc} className="min-h-11 bg-gradient-to-r from-purple-700 to-navy-800 hover:from-purple-800 text-white rounded-xl px-4 sm:px-5">
              Get DSC
            </Button>

            {/* Mobile Navigation Drawer */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger data-testid="nav-mobile-menu-btn" className="xl:hidden flex h-11 w-11 items-center justify-center rounded-xl text-navy-800 hover:bg-purple-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600">
                <Menu className="h-6 w-6" />
              </SheetTrigger>
              <SheetContent side="right" className="w-[calc(100vw-2rem)] max-w-80 overflow-y-auto overscroll-contain">
                <div className="mt-6 flex flex-col gap-1">
                  {NAV.map((n) => (
                    <Link
                      key={n.to}
                      to={n.to}
                      onClick={() => setMobileOpen(false)}
                      data-testid={`mnav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
                      className={`flex min-h-11 items-center px-3 py-2.5 rounded-lg font-medium transition-colors ${
                        active(n.to)
                          ? "text-purple-700 bg-purple-50 font-semibold"
                          : "text-navy-800 hover:bg-purple-50"
                      }`}
                    >
                      {n.label}
                    </Link>
                  ))}
                  {agent && (
                    <Link
                      to="/agent"
                      onClick={() => setMobileOpen(false)}
                      className="flex min-h-11 items-center justify-between rounded-lg bg-purple-50 px-3 py-2.5 font-bold text-purple-700"
                    >
                      <span>Agent Portal</span>
                      <span className="text-xs bg-purple-200 px-2 py-0.5 rounded font-mono font-bold text-purple-900">{agent.agentCode}</span>
                    </Link>
                  )}
                  {user && (
                    <Link
                      to="/client"
                      onClick={() => setMobileOpen(false)}
                      className="flex min-h-11 items-center rounded-lg px-3 py-2.5 font-semibold text-purple-700"
                    >
                      Dashboard
                    </Link>
                  )}
                  {user ? (
                    <button
                      onClick={() => {
                        logout();
                        setMobileOpen(false);
                      }}
                      className="min-h-11 rounded-lg px-3 py-2.5 text-left font-medium text-rose-600"
                    >
                      Logout
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        requireAuth();
                        setMobileOpen(false);
                      }}
                      className="min-h-11 rounded-lg px-3 py-2.5 text-left font-semibold text-purple-700"
                    >
                      Login
                    </button>
                  )}
                  <Button
                    data-testid="mobile-nav-get-dsc-btn"
                    onClick={() => { setMobileOpen(false); getDsc(); }}
                    className="mt-2 min-h-11 w-full rounded-xl bg-gradient-to-r from-purple-700 to-navy-800 text-white"
                  >
                    Get Your DSC
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
