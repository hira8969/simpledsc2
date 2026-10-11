import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useAgentAuth } from "@/context/AgentAuthContext";
import { useAuth } from "@/context/AuthContext";
import AccessDenied from "@/components/AccessDenied";

export default function ProtectedRoute({ role, children }) {
  const location = useLocation();
  const { admin, loading: adminLoading } = useAdminAuth();
  const { agent, loading: agentLoading } = useAgentAuth();
  const { user, loading: clientLoading } = useAuth();

  // If the target role's auth state is still loading, show loading screen
  const isTargetLoading =
    (role === "admin" && adminLoading) ||
    (role === "agent" && agentLoading) ||
    (role === "client" && clientLoading);

  if (isTargetLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Verifying session...</p>
        </div>
      </div>
    );
  }

  // 1. ADMIN ROUTE PROTECTION
  if (role === "admin") {
    if (admin) {
      return children;
    }
    // Check if authenticated with wrong role
    if (agent) {
      return <AccessDenied requiredRole="admin" currentRole="agent" />;
    }
    if (user) {
      return <AccessDenied requiredRole="admin" currentRole="client" />;
    }
    // Unauthenticated: redirect to Admin login
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  // 2. AGENT ROUTE PROTECTION
  if (role === "agent") {
    if (agent) {
      return children;
    }
    // Check if authenticated with wrong role
    if (admin) {
      return <AccessDenied requiredRole="agent" currentRole="admin" />;
    }
    if (user) {
      return <AccessDenied requiredRole="agent" currentRole="client" />;
    }
    // Unauthenticated: redirect to Agent login
    return <Navigate to="/agent/login" replace state={{ from: location }} />;
  }

  // 3. CLIENT ROUTE PROTECTION
  if (role === "client") {
    if (user) {
      return children;
    }
    // Check if authenticated with wrong role
    if (admin) {
      return <AccessDenied requiredRole="client" currentRole="admin" />;
    }
    if (agent) {
      return <AccessDenied requiredRole="client" currentRole="agent" />;
    }
    // Unauthenticated: redirect to Client login
    return <Navigate to="/client/login" replace state={{ from: location }} />;
  }

  return children;
}
