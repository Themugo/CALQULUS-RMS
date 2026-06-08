import { Suspense } from "react";
import { Toaster } from "@/shared/components/ui/toaster";
import { Toaster as Sonner } from "@/shared/components/ui/sonner";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DesktopInstallBanner } from "@/shared/components/ui/desktop-install-banner";
import { MobileInstallBanner } from "@/shared/components/ui/mobile-install-banner";
import { PushNotificationPrompt } from "@/shared/components/ui/push-notification-prompt";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, type AppRole } from "@/features/auth/AuthContext";
import { ViewOnlyProvider } from "@/shared/contexts/ViewOnlyContext";
import { ThemeProvider } from "@/shared/contexts/ThemeContext";
import ProtectedRoute from "@/shared/components/ProtectedRoute";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { PageLoader } from "@/shared/components/PageLoader";
import {
  roleRouteConfigs,
  publicRoutes,
  adminDomainRoutes,
  authOnlyRoutes,
  fallbackRoutes,
  type RouteDef,
} from "@/app/routes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ── Route rendering helpers ─────────────────────────────────────────
const LazyRoute = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

const renderRoute = (route: RouteDef, allowedRoles?: AppRole[]) => {
  if (route.redirect) {
    return <Route key={route.path} path={route.path} element={<Navigate to={route.redirect} replace />} />;
  }
  if (!route.element) return null;

  const element = (
    <LazyRoute>
      <route.element />
    </LazyRoute>
  );

  if (route.protected && allowedRoles) {
    return (
      <Route
        key={route.path}
        path={route.path}
        element={<ProtectedRoute allowedRoles={allowedRoles}>{element}</ProtectedRoute>}
      />
    );
  }

  return <Route key={route.path} path={route.path} element={element} />;
};

// ── Role-based route renderer ───────────────────────────────────────
const RoleRoutes = ({ role, allowedRoles, wrapper }: {
  role: string;
  allowedRoles: AppRole[];
  wrapper?: string;
}) => {
  const config = roleRouteConfigs.find(c => c.role === role);
  if (!config) return null;

  const routes = config.routes.map(r => renderRoute(r, allowedRoles));

  const content = <Routes>{routes}</Routes>;

  if (wrapper === "viewOnly") {
    return <ViewOnlyProvider>{content}</ViewOnlyProvider>;
  }

  return content;
};

// ── Main route dispatcher ───────────────────────────────────────────
const AppRoutes = () => {
  const { user, loading, userRole } = useAuth();
  const isAdminDomain = window.location.hostname.startsWith("admin.");
  const recoveryHash =
    window.location.hash.includes("type=recovery") ||
    window.location.hash.includes("access_token=");
  if (recoveryHash && window.location.pathname !== "/reset-password") {
    return (
      <Navigate
        to={`/reset-password${window.location.search}${window.location.hash}`}
        replace
      />
    );
  }

  if (loading) return <PageLoader />;

  // User logged in but role not yet resolved
  if (user && !userRole) {
    return <Routes>{authOnlyRoutes.map(r => renderRoute(r))}</Routes>;
  }

  // Webhost — allow from any domain (not just admin.* subdomain)
  if (userRole?.role === "webhost") {
    return <RoleRoutes role="webhost" allowedRoles={["webhost"]} />;
  }

  // Submanager
  if (userRole?.role === "submanager") {
    return <RoleRoutes role="submanager" allowedRoles={["submanager"]} wrapper="viewOnly" />;
  }

  // Landlord
  if (userRole?.role === "landlord") {
    return <RoleRoutes role="landlord" allowedRoles={["landlord"]} />;
  }

  // Tenant
  if (userRole?.role === "tenant") {
    return <RoleRoutes role="tenant" allowedRoles={["tenant"]} />;
  }

  // Agency (pending/rejected)
  if (userRole?.role === "agency" && userRole.approval_status !== "approved") {
    return <RoleRoutes role="manager-pending" allowedRoles={["agency"]} />;
  }

  // Agency (approved)
  if (userRole?.role === "agency" && userRole.approval_status === "approved") {
    return <RoleRoutes role="agency" allowedRoles={["agency"]} />;
  }

  // Manager (pending/rejected)
  if (userRole?.role === "manager" && userRole.approval_status !== "approved") {
    return <RoleRoutes role="manager-pending" allowedRoles={["manager"]} />;
  }

  // Manager (approved)
  if (userRole?.role === "manager" && userRole.approval_status === "approved") {
    return <RoleRoutes role="manager" allowedRoles={["manager"]} />;
  }

  // Not logged in
  if (!user) {
    const routes = isAdminDomain ? adminDomainRoutes : publicRoutes;
    return <Routes>{routes.map(r => renderRoute(r))}</Routes>;
  }

  // Fallback
  return <Routes>{fallbackRoutes.map(r => renderRoute(r))}</Routes>;
};

// ── App root ────────────────────────────────────────────────────────
const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system">
      <TooltipProvider>
        <ErrorBoundary fallback={null}>
          <Toaster />
        </ErrorBoundary>
        <ErrorBoundary fallback={null}>
          <Sonner />
        </ErrorBoundary>
        <ErrorBoundary fallback={null}>
          <DesktopInstallBanner />
        </ErrorBoundary>
        <ErrorBoundary fallback={null}>
          <MobileInstallBanner />
        </ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <ErrorBoundary fallback={null}>
              <PushNotificationPrompt />
            </ErrorBoundary>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
