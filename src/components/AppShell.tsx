import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, UserCircle, LogOut, Church, IdCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/id-card", label: "My ID Card", icon: IdCard },
  { to: "/members", label: "Members", icon: Users },
  { to: "/profile", label: "My Profile", icon: UserCircle },
] as const;

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="px-6 py-6 border-b border-sidebar-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: "var(--gradient-gold)" }}>
            <Church className="w-5 h-5 text-ink" />
          </div>
          <div>
            <div className="font-display text-lg leading-none">Sanctuary</div>
            <div className="text-xs opacity-60 mt-1">Church Management</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-gold"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <Button variant="ghost" onClick={signOut} className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent">
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border px-6 py-5 flex items-center justify-between bg-card">
          <h1 className="font-display text-2xl md:text-3xl">{title}</h1>
          <Button variant="ghost" size="sm" onClick={signOut} className="md:hidden">
            <LogOut className="w-4 h-4" />
          </Button>
        </header>
        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full">{children}</div>
      </main>
    </div>
  );
}