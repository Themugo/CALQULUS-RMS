import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { logError } from "@/shared/lib/errorLogger";
import { useAuth } from "@/features/auth/AuthContext";

const NotFound = () => {
  const location = useLocation();
  const { userRole } = useAuth();

  useEffect(() => {
    logError('404', location.pathname);
  }, [location.pathname]);

  const homeLink = () => {
    if (!userRole) return '/landlord';
    switch (userRole.role) {
      case 'tenant': return '/portal';
      case 'landlord': return '/landlord/dashboard';
      case 'webhost': return '/webhost';
      case 'submanager': return '/';
      case 'agency': return '/agency';
      default: return '/';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">
          Page not found: <code className="bg-muted-foreground/10 px-2 py-1 rounded text-sm">{location.pathname}</code>
        </p>
        <a href={homeLink()} className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
