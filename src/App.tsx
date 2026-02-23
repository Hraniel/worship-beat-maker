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
import Help from "./pages/Help";
import MyTickets from "./pages/MyTickets";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLoadingScreen from "@/components/AppLoadingScreen";
import { useAppReloadGuard } from "@/hooks/useAppReloadGuard";

const CACHE_VERSION_KEY = 'app_cache_version';

// Global cache guard — runs for all visitors (no auth needed)
const CacheVersionGuard = () => {
  useEffect(() => {
    // Initial check
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

    // Realtime listener for immediate updates
    const channel = supabase
      .channel('global_cache_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'landing_config', filter: "config_key=eq.app_cache_version" },
        (payload: any) => {
          const newVersion = payload.new?.config_value;
          const local = localStorage.getItem(CACHE_VERSION_KEY);
          if (newVersion && local !== newVersion) {
            localStorage.setItem(CACHE_VERSION_KEY, newVersion);
            window.location.reload();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);
  return null;
};

// Per-user cache guard — runs after auth is available
const UserCacheVersionGuard = () => {
  const { user } = useAuth();
  useEffect(() => {
    if (!user?.id) return;
    const userKey = `user_cache_version_${user.id}`;

    // Initial check
    supabase
      .from('landing_config')
      .select('config_value')
      .eq('config_key', userKey)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const remote = data.config_value;
        const local = localStorage.getItem(userKey);
        if (local !== null && local !== remote) {
          localStorage.setItem(userKey, remote);
          window.location.reload();
        } else if (local === null) {
          localStorage.setItem(userKey, remote);
        }
      });

    // Realtime listener for immediate per-user updates
    const channel = supabase
      .channel(`user_cache_realtime_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'landing_config', filter: `config_key=eq.${userKey}` },
        (payload: any) => {
          const newVersion = payload.new?.config_value;
          const local = localStorage.getItem(userKey);
          if (newVersion && local !== newVersion) {
            localStorage.setItem(userKey, newVersion);
            window.location.reload();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);
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

// Wraps the /app route: shows loading screen on return after 2+ min
const AppGate = ({ children }: { children: React.ReactNode }) => {
  const { showLoading, dismiss } = useAppReloadGuard();
  if (showLoading) return <AppLoadingScreen onDone={dismiss} />;
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
                  <UserCacheVersionGuard />
                  <Toaster />
                  <Sonner />
                  <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/app" element={<ProtectedRoute><AppGate><Index /></AppGate></ProtectedRoute>} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
                    <Route path="/my-tickets" element={<ProtectedRoute><MyTickets /></ProtectedRoute>} />
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

