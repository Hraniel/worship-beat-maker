import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Pricing from "./pages/Pricing";
import Install from "./pages/Install";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import PackDetail from "./pages/PackDetail";
import SharedSetlist from "./pages/SharedSetlist";
import VapidGenerator from "./pages/VapidGenerator";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const CACHE_VERSION_KEY = 'app_cache_version';

// Checks if admin has bumped cache version; if so, reload to clear SW/caches
const CacheVersionGuard = () => {
  useEffect(() => {
    supabase
      .from('landing_config')
      .select('config_value')
      .eq('config_key', 'app_cache_version')
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const remote = data.config_value;
        const local = localStorage.getItem(CACHE_VERSION_KEY);
        if (local !== null && local !== remote) {
          localStorage.setItem(CACHE_VERSION_KEY, remote);
          window.location.reload();
        } else if (local === null) {
          localStorage.setItem(CACHE_VERSION_KEY, remote);
        }
      });
  }, []);
  return null;
};


const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <CacheVersionGuard />
          <Routes>
            {/* Public routes — no auth context needed, load instantly */}
            <Route path="/s/:token" element={<SharedSetlist />} />
            <Route path="/install" element={<Install />} />
            <Route path="/vapid-generator" element={<VapidGenerator />} />

            {/* All other routes — wrapped in auth/subscription providers */}
            <Route path="*" element={
              <AuthProvider>
                <SubscriptionProvider>
                  <Toaster />
                  <Sonner />
                  <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/store/:packId" element={<ProtectedRoute><PackDetail /></ProtectedRoute>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </SubscriptionProvider>
              </AuthProvider>
            } />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

