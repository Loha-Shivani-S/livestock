import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, LayoutDashboard, LogOut, Menu, Shield, Smartphone, X, FlaskConical, Users } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";

const nav = [
  { to: "/command", icon: LayoutDashboard, key: "nav.command", fallback: "Command" },
  { to: "/report", icon: Smartphone, key: "nav.report", fallback: "Field report" },
  { to: "/register", icon: Shield, key: "nav.register", fallback: "Animal register" },
  { to: "/lab", icon: FlaskConical, key: "nav.lab", fallback: "Lab portal & QR" },
  { to: "/devices", icon: Activity, key: "nav.devices", fallback: "Collars & gateways" },
  { to: "/officers", icon: Users, key: "nav.officers", fallback: "Officer alerts" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const { signOut, user } = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="notranslate sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-ink px-4 text-ink-foreground md:h-screen md:w-64 md:flex-col md:items-stretch md:justify-start md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">{t("app.name")}</span>
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <nav className={`flex-col gap-1 px-2 pb-4 md:flex ${open ? "flex border-b border-border bg-ink" : "hidden"}`}>
          {nav.map((item) => {
            const active = pathname.startsWith(item.to);
            const label = t(item.key) !== item.key ? t(item.key) : item.fallback;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-accent text-accent-foreground" : "text-ink-muted hover:bg-white/10 hover:text-ink-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
          <div className="my-2 h-px bg-white/10" />
          {user && (
            <div className="rounded-md bg-white/5 px-3 py-2 text-xs mb-1">
              <p className="font-semibold text-ink-foreground truncate">
                {user.user_metadata?.full_name || user.email?.split("@")[0] || "Active Officer"}
              </p>
              <p className="text-[11px] text-ink-muted truncate">
                {user.user_metadata?.designation || user.email || "Surveillance Officer"}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={async () => {
              await signOut();
            }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            {t("nav.signout") || "Sign Out"}
          </button>
          <div className="mt-4 px-3">
            <LanguageSwitcher compact />
          </div>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 bg-background p-4 md:p-6">{children}</main>
    </div>
  );
}
