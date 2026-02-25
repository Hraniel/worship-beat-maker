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
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLoadingScreen from "@/components/AppLoadingScreen";
import { useAppReloadGuard } from "@/hooks/useAppReloadGuard";
import { useLocaleSync } from "@/hooks/useLocaleSync";
import { usePrelaunchMode } from "@/hooks/usePrelaunchMode";
import PrelaunchCountdownModal from "@/components/PrelaunchCountdownModal";

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


// Syncs i18n language with profile locale
const LocaleSyncGuard = () => {
  useLocaleSync();
  return null;
};


const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = window.location;
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!user) {
    const returnTo = location.pathname + location.search;
    return <Navigate to={`/auth?redirect=${encodeURIComponent(returnTo)}`} replace />;
  }
  return <>{children}</>;
};

// Wraps the /app route: shows loading screen on return after 2+ min
const AppGate = ({ children }: { children: React.ReactNode }) => {
  const { showLoading, dismiss } = useAppReloadGuard();
  if (showLoading) return <AppLoadingScreen onDone={dismiss} />;
  return <>{children}</>;
};

// Blocks non-admin users during prelaunch
const PrelaunchGate = ({ children }: { children: React.ReactNode }) => {
  const prelaunch = usePrelaunchMode();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user?.id) { setChecking(false); return; }
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .then(({ data }) => {
        const roles = data?.map((r: any) => r.role) || [];
        setIsAdmin(roles.includes('admin') || roles.includes('ceo'));
        setChecking(false);
      });
  }, [user?.id]);

  if (prelaunch.loading || checking) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (prelaunch.enabled && !isAdmin) {
    return <Navigate to="/" replace />;
  }

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
                  <LocaleSyncGuard />
                  <UserCacheVersionGuard />
                  <Toaster />
                  <Sonner />
                  <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/app" element={<ProtectedRoute><PrelaunchGate><AppGate><Index /></AppGate></PrelaunchGate></ProtectedRoute>} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/pricing" element={<ProtectedRoute><PrelaunchGate><Pricing /></PrelaunchGate></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/help" element={<ProtectedRoute><PrelaunchGate><Help /></PrelaunchGate></ProtectedRoute>} />
                    <Route path="/my-tickets" element={<ProtectedRoute><PrelaunchGate><MyTickets /></PrelaunchGate></ProtectedRoute>} />
                    <Route path="/store/:packId" element={<ProtectedRoute><PrelaunchGate><PackDetail /></PrelaunchGate></ProtectedRoute>} />
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

