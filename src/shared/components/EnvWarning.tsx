import { AlertTriangle, Copy, Check } from "lucide-react";
import { useState } from "react";

export default function EnvWarning() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        'VITE_SUPABASE_URL=https://your-project.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key'
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-amber-500 p-4 flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-white flex-shrink-0" />
          <h1 className="text-white font-bold text-lg">RentFlow — Configuration Required</h1>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            Supabase environment variables are missing. The app cannot connect to the database or authenticate users.
          </p>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Required</p>
            <code className="block text-sm font-mono bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded text-slate-800 dark:text-slate-200">
              VITE_SUPABASE_URL
            </code>
            <code className="block text-sm font-mono bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded text-slate-800 dark:text-slate-200">
              VITE_SUPABASE_PUBLISHABLE_KEY
            </code>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Quick fix</p>
            <ol className="text-sm text-slate-600 dark:text-slate-300 space-y-1 list-decimal list-inside">
              <li>Copy <code className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-1 rounded">.env.example</code> to <code className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-1 rounded">.env.local</code></li>
              <li>Fill in your Supabase project URL and anon key</li>
              <li>Restart the dev server</li>
            </ol>
          </div>

          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {copied ? (
              <><Check className="h-4 w-4 text-green-400" /> Copied!</>
            ) : (
              <><Copy className="h-4 w-4" /> Copy Example Env Template</>
            )}
          </button>

          <p className="text-xs text-center text-slate-400">
            Dev server URL: <code className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-1 rounded">http://localhost:5173</code>
          </p>
        </div>
      </div>
    </div>
  );
}