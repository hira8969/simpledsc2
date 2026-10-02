import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { AdminAuthProvider } from "@/context/AdminAuthContext";
import { AgentAuthProvider } from "@/context/AgentAuthContext";
import { PurchaseProvider } from "@/context/PurchaseContext";
import { OtpAuthModal } from "@/components/OtpAuthModal";
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
import Faqs from "@/pages/Faqs";
import Legal from "@/pages/Legal";
import Dashboard from "@/pages/Dashboard";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminCustomers from "@/pages/admin/AdminCustomers";
import AdminDocuments from "@/pages/admin/AdminDocuments";
import AdminDSCs from "@/pages/admin/AdminDSCs";
import AdminCatalog from "@/pages/admin/AdminCatalog";
import AdminLeads from "@/pages/admin/AdminLeads";
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
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/products/:slug" element={<ProductDetail />} />
                  <Route path="/use-cases" element={<UseCases />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/resources" element={<Resources />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/partner" element={<Navigate to="/agent" replace />} />
                  <Route path="/agent" element={<Partner agent />} />
                  <Route path="/faqs" element={<Faqs />} />
                  <Route path="/terms" element={<Legal type="terms" />} />
                  <Route path="/privacy" element={<Legal type="privacy" />} />
                  <Route path="/refund" element={<Legal type="refund" />} />
                </Route>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/agent/login" element={<AgentLogin />} />
                <Route path="/agent/dashboard" element={<AgentDashboard />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="customers" element={<AdminCustomers />} />
                  <Route path="documents" element={<AdminDocuments />} />
                  <Route path="dscs" element={<AdminDSCs />} />
                  <Route path="catalog" element={<AdminCatalog />} />
                  <Route path="leads" element={<AdminLeads />} />
                  <Route path="system" element={<AdminSystem />} />
                </Route>
              </Routes>
            </PurchaseProvider>
          </AuthProvider>
        </AgentAuthProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
