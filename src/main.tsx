import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initGlobalErrorCatcher } from "@/shared/lib/errorLogger";
import { initSentry } from "@/shared/lib/sentry";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";

// Catch all unhandled errors and log them to Supabase activity_logs.
// View errors: SELECT * FROM activity_logs WHERE action LIKE 'error:%' ORDER BY created_at DESC;
initGlobalErrorCatcher();

// Lazy-init Sentry — fire-and-forget. Sentry only loads if VITE_SENTRY_DSN
// is set at build time; otherwise this resolves immediately to a no-op.
// We deliberately do NOT await it so it never blocks first paint.
initSentry();

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const rootEl = document.getElementById("root")!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  import("./shared/components/EnvWarning").then(({ default: EnvWarning }) => {
    createRoot(rootEl).render(
      <React.StrictMode>
        <EnvWarning />
      </React.StrictMode>
    );
  });
} else {
  createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
