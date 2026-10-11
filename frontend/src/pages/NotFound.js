import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Seo } from "@/components/Seo";
import { Home, ArrowLeft, ShieldAlert } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between" data-testid="not-found-page">
      <Seo title="Page Not Found (404) | SimplDSC" index={false} />

      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/"><Logo /></Link>
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

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-16 flex items-center justify-center">
        <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">404 Error</p>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-navy-900">Page Not Found</h1>
          <p className="mt-2 text-sm text-slate-500">
            The page or route you are looking for does not exist or has been moved.
          </p>

          <div className="mt-6 space-y-2.5">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="w-full rounded-xl border-slate-200 h-10 text-xs font-semibold"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Go Back
            </Button>
            <Button
              onClick={() => navigate("/")}
              className="w-full bg-gradient-to-r from-purple-700 to-navy-900 text-white rounded-xl h-10 text-xs font-semibold shadow-sm"
            >
              <Home className="h-4 w-4 mr-1.5" /> Go to Home
            </Button>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-4 text-xs font-medium text-purple-700">
            <Link to="/client" className="hover:underline">Client Portal</Link>
            <span className="text-slate-300">•</span>
            <Link to="/agent" className="hover:underline">Agent Portal</Link>
            <span className="text-slate-300">•</span>
            <Link to="/admin" className="hover:underline">Admin Portal</Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} SimplDSC Technologies. All rights reserved.
      </footer>
    </div>
  );
}
