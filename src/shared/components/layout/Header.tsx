import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Settings, LogOut, User, ChevronDown, Menu, Moon, Sun,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/AuthContext";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { GlobalSearch } from "./GlobalSearch";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onMenuClick?: () => void;
}

export function Header({ title, subtitle, actions, onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isManager, isTenant, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [fullName, setFullName] = useState<string>("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, photo_url")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setFullName(data.full_name || "");
        setPhotoUrl(data.photo_url || null);
      }
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const roleLabel = isManager ? "Manager" : isTenant ? "Tenant" : "User";

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center justify-between border-b transition-all duration-200 px-4 md:px-6 lg:px-8 gap-3",
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-border shadow-sm"
          : "bg-background border-transparent"
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Button
          variant="ghost" size="icon"
          className="lg:hidden touch-manipulation h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="font-heading text-lg md:text-xl font-semibold text-foreground truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate hidden sm:block">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
        <div className="hidden sm:flex items-center gap-2">{actions}</div>

        <GlobalSearch />
        <NotificationsDropdown />

        {/* Dark mode toggle */}
        <Button
          variant="ghost" size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 pl-2 pr-3 h-9 rounded-full hover:bg-muted/50 transition-colors touch-manipulation"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={photoUrl || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                  {getInitials(fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-medium text-foreground leading-tight">{fullName || "User"}</p>
                <p className="text-[11px] text-muted-foreground">{roleLabel}</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden lg:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-1">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{fullName || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer py-2.5" onClick={() => navigate("/settings")}>
              <Settings className="mr-2.5 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer py-2.5" onClick={() => navigate("/settings")}>
              <User className="mr-2.5 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive py-2.5" onClick={handleLogout}>
              <LogOut className="mr-2.5 h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}


