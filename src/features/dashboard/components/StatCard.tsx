import { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: "primary" | "accent" | "success" | "warning" | "destructive";
}

const iconColorMap = {
  primary: "bg-gradient-to-br from-primary/20 to-primary/10 text-primary border-primary/20",
  accent: "bg-gradient-to-br from-accent/20 to-accent/10 text-accent border-accent/20",
  success: "bg-gradient-to-br from-green-500/20 to-green-500/10 text-green-600 border-green-500/20",
  warning: "bg-gradient-to-br from-amber-500/20 to-amber-500/10 text-amber-600 border-amber-500/20",
  destructive: "bg-gradient-to-br from-red-500/20 to-red-500/10 text-red-600 border-red-500/20",
};

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "accent",
}: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-white via-white to-slate-50/50 p-4 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] animate-fade-in touch-manipulation backdrop-blur-sm">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-slate-100/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      <div className="relative flex items-start justify-between gap-3">
        <div className="space-y-1.5 sm:space-y-2 min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-semibold text-muted-foreground/80 uppercase tracking-wide">{title}</p>
          <p className="font-heading text-2xl sm:text-3xl font-bold text-card-foreground truncate tracking-tight">{value}</p>
          {change && (
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "h-1.5 w-1.5 rounded-full",
                changeType === "positive" && "bg-green-500",
                changeType === "negative" && "bg-red-500",
                changeType === "neutral" && "bg-slate-400"
              )} />
              <p
                className={cn(
                  "text-xs sm:text-sm font-medium line-clamp-2",
                  changeType === "positive" && "text-green-600",
                  changeType === "negative" && "text-red-600",
                  changeType === "neutral" && "text-muted-foreground"
                )}
              >
                {change}
              </p>
            </div>
          )}
        </div>
        <div className={cn("rounded-xl border p-2.5 sm:p-3 flex-shrink-0 shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:scale-105", iconColorMap[iconColor])}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>
    </div>
  );
}
