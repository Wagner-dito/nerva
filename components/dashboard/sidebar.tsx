"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  CreditCard,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  TrendingUp,
  Users,
} from "lucide-react";

import { logout } from "@/app/logout/actions";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProfileRole = "owner" | "admin" | "member";

type NavItem = {
  href: Route;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresManage?: boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/dashboard/crm", label: "CRM", icon: KanbanSquare },
  { href: "/dashboard/roi", label: "ROI", icon: TrendingUp },
  { href: "/dashboard/bots", label: "Bots", icon: Bot },
  {
    href: "/dashboard/conversations",
    label: "Conversas",
    icon: MessagesSquare,
  },
  {
    href: "/dashboard/team",
    label: "Equipe",
    icon: Users,
    requiresManage: true,
  },
  {
    href: "/dashboard/billing",
    label: "Faturamento",
    icon: CreditCard,
    requiresManage: true,
  },
];

type SidebarProps = {
  userEmail: string;
  userName: string | null;
  orgName: string | null;
  role: ProfileRole;
};

export function Sidebar({ userEmail, userName, orgName, role }: SidebarProps) {
  const pathname = usePathname();
  const canManage = role === "owner" || role === "admin";
  const visibleItems = navItems.filter(
    (i) => !i.requiresManage || canManage
  );

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border/60 bg-card/40 px-4 py-6">
      <Link href="/dashboard" className="flex items-center gap-2 px-2 pb-8">
        <span className="h-2 w-2 animate-pulse-soft rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
        <Wordmark className="text-base" />
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {visibleItems.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 border-t border-border/60 pt-4">
        <div className="px-2 text-xs">
          <p className="truncate font-medium text-foreground">
            {userName ?? userEmail}
          </p>
          {orgName && (
            <p className="truncate text-muted-foreground">{orgName}</p>
          )}
        </div>
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
          >
            <LogOut />
            Sair
          </Button>
        </form>
      </div>
    </aside>
  );
}
