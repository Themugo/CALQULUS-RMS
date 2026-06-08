import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell, Check, CreditCard, FileText, UserPlus, AlertTriangle,
  Clock, Wrench, MessageSquare, Zap, LucideIcon
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Badge } from "@/shared/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/shared/lib/utils";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
  action_url: string | null;
  priority: string;
}

const TYPE_ICON: Record<string, { icon: LucideIcon; bg: string }> = {
  payment:     { icon: CreditCard,     bg: "bg-emerald-100 text-emerald-600" },
  maintenance: { icon: Wrench,         bg: "bg-blue-100 text-blue-600" },
  notice:      { icon: FileText,       bg: "bg-purple-100 text-purple-600" },
  alert:       { icon: AlertTriangle,  bg: "bg-amber-100 text-amber-600" },
  reminder:    { icon: Clock,          bg: "bg-slate-100 text-slate-600" },
  broadcast:   { icon: MessageSquare,  bg: "bg-indigo-100 text-indigo-600" },
  info:        { icon: Bell,           bg: "bg-slate-100 text-slate-600" },
};

export function NotificationsDropdown() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["in-app-notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("in_app_notifications")
        .select("id, title, body, type, is_read, created_at, action_url, priority")
        .eq("user_id", user!.id)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data || []) as Notification[];
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // poll every 30s
  });

  const unread = notifications.filter(n => !n.is_read).length;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from("in_app_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["in-app-notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase
        .from("in_app_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("user_id", user!.id)
        .eq("is_read", false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["in-app-notifications"] }),
  });

  const handleClick = (notif: Notification) => {
    if (!notif.is_read) markRead.mutate(notif.id);
    if (notif.action_url) navigate(notif.action_url);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 touch-manipulation">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
          <p className="text-sm font-semibold">
            Notifications
            {unread > 0 && <Badge variant="destructive" className="ml-2 text-xs h-4 px-1">{unread}</Badge>}
          </p>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground hover:text-foreground gap-1"
              onClick={() => markAllRead.mutate()}>
              <Check className="h-3 w-3" />Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Bell className="h-7 w-7 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map(notif => {
              const cfg = TYPE_ICON[notif.type] ?? TYPE_ICON.info;
              const Icon = cfg.icon;
              return (
                <div
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={cn(
                    "flex items-start gap-3 px-3 py-3 cursor-pointer border-b border-border/50 last:border-0 transition-colors",
                    notif.is_read ? "hover:bg-muted/40" : "bg-primary/5 hover:bg-primary/10",
                    notif.action_url ? "cursor-pointer" : "cursor-default"
                  )}
                >
                  <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", cfg.bg)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 justify-between">
                      <p className={cn("text-xs font-medium truncate", !notif.is_read && "font-semibold")}>
                        {notif.title}
                      </p>
                      {!notif.is_read && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
