import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import logoMark from "@/assets/coopernic-mark.png";
import { useAuth, loginAs, allMembers, type Role } from "@/lib/auth-store";
import { useSession, signOut } from "@/lib/use-session";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ShieldCheck, Crown, User, LogIn, LogOut } from "lucide-react";

const baseNav = [
  { to: "/", label: "Accueil", roles: ["superadmin", "gestionnaire", "membre"] as Role[] },
  { to: "/annuaire", label: "Annuaire", roles: ["superadmin", "gestionnaire", "membre"] as Role[] },
  { to: "/messages", label: "Messages", roles: ["superadmin", "gestionnaire", "membre"] as Role[] },
  { to: "/recos", label: "Stats", roles: ["superadmin", "gestionnaire", "membre"] as Role[] },
  { to: "/club", label: "Mon club", roles: ["superadmin", "gestionnaire"] as Role[] },
  { to: "/admin", label: "Super Admin", roles: ["superadmin"] as Role[] },
] as const;

const ROLE_META: Record<Role, { label: string; icon: typeof User; tone: string }> = {
  superadmin: { label: "Super Admin", icon: ShieldCheck, tone: "text-accent" },
  gestionnaire: { label: "Gestionnaire", icon: Crown, tone: "text-accent" },
  membre: { label: "Membre", icon: User, tone: "text-muted-foreground" },
};

export function AppHeader() {
  const { session } = useAuth();
  const real = useSession();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const effectiveRole: Role = mounted ? session.role : "membre";
  const items = baseNav.filter((n) => n.roles.includes(effectiveRole));
  const RoleIcon = ROLE_META[session.role].icon;
  const members = allMembers();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="group flex items-center gap-3">
          <img
            src={logoMark}
            alt="Coopernic"
            className="h-10 w-10 rounded-[10px] object-cover shadow-sm ring-1 ring-border/60 transition-transform group-hover:scale-105"
          />
          <div className="leading-tight">
            <div className="font-display text-[17px] font-extrabold tracking-tight text-foreground">
              coopern<span className="text-accent">i</span>c
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Échangez · Collaborez · Développez
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{
                className:
                  "rounded-md px-3 py-2 text-sm font-semibold text-foreground bg-secondary",
              }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-border/60 bg-card py-1.5 pl-2 pr-3 text-left transition-colors hover:bg-secondary">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-accent ring-1 ring-border ${ROLE_META[session.role].tone}`}>
              <RoleIcon className="h-4 w-4" />
            </div>
            <div className="hidden leading-tight md:block">
              <div className="text-xs font-semibold text-foreground">{session.displayName}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {ROLE_META[session.role].label}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>Changer de rôle (démo)</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => loginAs("superadmin")}>
              <ShieldCheck className="mr-2 h-4 w-4 text-accent" /> Super Admin
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Crown className="mr-2 h-4 w-4 text-accent" /> Gestionnaire (en tant que…)
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                {members.map((m) => (
                  <DropdownMenuItem key={m.id} onClick={() => loginAs("gestionnaire", m.id)}>
                    {m.firstName} {m.lastName} <span className="ml-1 text-xs text-muted-foreground">· {m.club}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <User className="mr-2 h-4 w-4" /> Membre (en tant que…)
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                {members.map((m) => (
                  <DropdownMenuItem key={m.id} onClick={() => loginAs("membre", m.id)}>
                    {m.firstName} {m.lastName} <span className="ml-1 text-xs text-muted-foreground">· {m.club}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] font-normal text-muted-foreground">
              Switch de démo · l'auth réelle arrive avec Cloud
            </DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
