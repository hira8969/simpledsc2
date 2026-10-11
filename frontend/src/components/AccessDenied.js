import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useAgentAuth } from "@/context/AgentAuthContext";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft, LogOut, Home } from "lucide-react";

export default function AccessDenied({ requiredRole = "admin", currentRole = null }) {
  const navigate = useNavigate();
  const { admin, logout: adminLogout } = useAdminAuth();
  const { agent, logout: agentLogout } = useAgentAuth();
  const { user, logout: clientLogout } = useAuth();

  // Determine effective current role and user label if not explicitly provided
  let effectiveRole = currentRole;
  let identityLabel = "";

  if (!effectiveRole) {
    if (admin) {
      effectiveRole = "admin";
      identityLabel = admin.email || "Administrator";
    } else if (agent) {
      effectiveRole = "agent";
      identityLabel = agent.name ? `${agent.name} (${agent.agentCode || "Agent"})` : "Agent";
    } else if (user) {
      effectiveRole = "client";
      identityLabel = user.name ? `${user.name} (${user.simplDscId || user.mobile || "Client"})` : "Client";
    }
  } else {
    if (effectiveRole === "admin" && admin) {
      identityLabel = admin.email || "Administrator";
    } else if (effectiveRole === "agent" && agent) {
      identityLabel = agent.name ? `${agent.name} (${agent.agentCode || "Agent"})` : "Agent";
    } else if (effectiveRole === "client" && user) {
      identityLabel = user.name ? `${user.name} (${user.simplDscId || user.mobile || "Client"})` : "Client";
    }
  }

  const roleNames = {
    admin: "Admin",
    agent: "Agent",
    client: "Client",
  };

  const portalNames = {
    admin: "Admin Portal",
    agent: "Agent Portal",
    client: "Client Dashboard",
  };

  const dashboardUrls = {
    admin: "/admin",
    agent: "/agent",
    client: "/client",
  };

  const loginUrls = {
    admin: "/admin/login",
    agent: "/agent/login",
    client: "/client/login",
  };

  const handleReturnToDashboard = () => {
    if (effectiveRole && dashboardUrls[effectiveRole]) {
      navigate(dashboardUrls[effectiveRole]);
    } else {
      navigate("/");
    }
  };

  const handleLogoutAndSwitch = () => {
    if (effectiveRole === "admin") adminLogout();
    else if (effectiveRole === "agent") agentLogout();
    else if (effectiveRole === "client") clientLogout();

    const targetLogin = loginUrls[requiredRole] || "/";
    navigate(targetLogin);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between" data-testid="access-denied-page">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="text-xs text-slate-600 hover:text-navy-900"
          >
            <Home className="h-4 w-4 mr-1.5" /> Storefront
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-12 flex items-center justify-center">
        <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 sm:p-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
            <ShieldAlert className="h-9 w-9" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800 mb-3">
            403 Forbidden · Access Denied
          </span>

          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">
            Unauthorized Access
          </h1>

          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            You do not have permission to view the{" "}
            <strong className="text-navy-900">{portalNames[requiredRole] || requiredRole}</strong>.
          </p>

          {effectiveRole && (
            <div className="mt-5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1">
              <p className="text-slate-500 font-medium">Currently signed in as:</p>
              <div className="flex items-center justify-between font-semibold text-navy-900">
                <span className="capitalize">{roleNames[effectiveRole] || effectiveRole} Account</span>
                {identityLabel && <span className="font-mono text-[11px] text-purple-700">{identityLabel}</span>}
              </div>
            </div>
          )}

          <div className="mt-8 space-y-3">
            {effectiveRole && dashboardUrls[effectiveRole] && (
              <Button
                onClick={handleReturnToDashboard}
                data-testid="return-to-dashboard-btn"
                className="w-full h-11 bg-gradient-to-r from-purple-700 to-navy-900 text-white font-semibold rounded-xl shadow-md hover:from-purple-800 hover:to-navy-950 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Return to {portalNames[effectiveRole] || "Dashboard"}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleLogoutAndSwitch}
              data-testid="switch-account-btn"
              className="w-full h-11 border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2"
            >
              <LogOut className="h-4 w-4 text-slate-400" />
              Sign Out & Switch Account
            </Button>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} SimplDSC. Security & Access Control.
      </footer>
    </div>
  );
}
