import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { AdminAuthProvider } from "@/context/AdminAuthContext";
import { AgentAuthProvider } from "@/context/AgentAuthContext";
import { PurchaseProvider } from "@/context/PurchaseContext";
import { OtpAuthModal } from "@/components/OtpAuthModal";
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicLayout from "@/components/PublicLayout";
import Home from "@/pages/Home";
import Products from "@/pages/Products";
import ProductDetail from "@/pages/ProductDetail";
import UseCases from "@/pages/UseCases";
import Pricing from "@/pages/Pricing";
import About from "@/pages/About";
import Resources from "@/pages/Resources";
import Contact from "@/pages/Contact";
import Partner from "@/pages/Partner";
import AgentLogin from "@/pages/AgentLogin";
import AgentDashboard from "@/pages/AgentDashboard";
import ClientLogin from "@/pages/ClientLogin";
import Faqs from "@/pages/Faqs";
import Legal from "@/pages/Legal";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminCustomers from "@/pages/admin/AdminCustomers";
import AdminDocuments from "@/pages/admin/AdminDocuments";
import AdminDSCs from "@/pages/admin/AdminDSCs";
import AdminCatalog from "@/pages/admin/AdminCatalog";
import AdminLeads from "@/pages/admin/AdminLeads";
import AdminPartners from "@/pages/admin/AdminPartners";
import AdminPayments from "@/pages/admin/AdminPayments";
import AdminSupport from "@/pages/admin/AdminSupport";
import AdminNotifications from "@/pages/admin/AdminNotifications";
import AdminSystem from "@/pages/admin/AdminSystem";
import "@/App.css";

function ReferralTracker() {
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("sd_agent_ref", ref.trim().toUpperCase());
    }
  }, [location]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ReferralTracker />
      <AdminAuthProvider>
        <AgentAuthProvider>
          <AuthProvider>
            <PurchaseProvider>
              <OtpAuthModal />
              <Toaster position="top-center" richColors />
              <Routes>
                {/* Public Storefront Routes */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/products/:slug" element={<ProductDetail />} />
                  <Route path="/use-cases" element={<UseCases />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/resources" element={<Resources />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/partner" element={<Partner agent />} />
                  <Route path="/faqs" element={<Faqs />} />
                  <Route path="/terms" element={<Legal type="terms" />} />
                  <Route path="/privacy" element={<Legal type="privacy" />} />
                  <Route path="/refund" element={<Legal type="refund" />} />
                </Route>

                {/* Authentication Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/agent/login" element={<AgentLogin />} />
                <Route path="/client/login" element={<ClientLogin />} />

                {/* Protected Admin Routes: /admin and /admin/* */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute role="admin">
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminDashboard />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="customers" element={<AdminCustomers />} />
                  <Route path="users" element={<AdminCustomers />} />
                  <Route path="documents" element={<AdminDocuments />} />
                  <Route path="dscs" element={<AdminDSCs />} />
                  <Route path="catalog" element={<AdminCatalog />} />
                  <Route path="products" element={<AdminCatalog />} />
                  <Route path="leads" element={<AdminLeads />} />
                  <Route path="partners" element={<AdminPartners />} />
                  <Route path="agents" element={<AdminPartners />} />
                  <Route path="payments" element={<AdminPayments />} />
                  <Route path="support" element={<AdminSupport />} />
                  <Route path="notifications" element={<AdminNotifications />} />
                  <Route path="system" element={<AdminSystem />} />
                  <Route path="settings" element={<AdminSystem />} />
                </Route>

                {/* Protected Agent Routes: /agent and /agent/* */}
                <Route
                  path="/agent"
                  element={
                    <ProtectedRoute role="agent">
                      <AgentDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/agent/*"
                  element={
                    <ProtectedRoute role="agent">
                      <AgentDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Protected Client Routes: /client and /client/* */}
                <Route
                  path="/client"
                  element={
                    <ProtectedRoute role="client">
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/client/*"
                  element={
                    <ProtectedRoute role="client">
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Backwards Compatibility for Old Dashboard URLs */}
                <Route path="/dashboard" element={<Navigate to="/client" replace />} />
                <Route path="/dashboard/*" element={<Navigate to="/client" replace />} />

                {/* 404 Catch-All */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PurchaseProvider>
          </AuthProvider>
        </AgentAuthProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
