"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, ClipboardList, BarChart3, Users } from "lucide-react";

const adminItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/cuestionarios", label: "Cuestionarios", icon: ClipboardList },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/reportes", label: "Reportes", icon: BarChart3 },
];

const usuarioItems = [
  { href: "/usuario/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/usuario/cuestionarios", label: "Cuestionarios", icon: ClipboardList },
];

interface Props {
  role: "admin" | "usuario";
}

export function NavLinks({ role }: Props) {
  const pathname = usePathname();
  const items = role === "admin" ? adminItems : usuarioItems;

  return (
    <nav className="flex items-center gap-0.5">
      {items.map(({ href, label, icon: Icon }) => {
        const isActive =
          pathname === href || (href.split("/").length > 2 && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
