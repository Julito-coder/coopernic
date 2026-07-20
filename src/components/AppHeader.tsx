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
import {
  ChevronDown,
  ShieldCheck,
  Crown,
  User,
  LogIn,
  LogOut,
  Home,
  Users as UsersIcon,
  MessageSquare,
  Wallet,
  CalendarDays,
  MoreHorizontal,
  BarChart3,
  Building2,
  Shield,
} from "lucide-react";

type NavItem = {
  to: string;
  label: string;
  short: string;
  icon: typeof Home;
  roles: Role[];
  primary: boolean; // true = shown in mobile bottom bar
};

const NAV: NavItem[] = [
  { to: "/", label: "Accueil", short: "Accueil", icon: Home, roles: ["superadmin", "gestionnaire", "membre"], primary: true },
  { to: "/annuaire", label: "Annuaire", short: "Annuaire", icon: UsersIcon, roles: ["superadmin", "gestionnaire", "membre"], primary: true },
  { to: "/messages", label: "Messages", short: "Messages", icon: MessageSquare, roles: ["superadmin", "gestionnaire", "membre"], primary: true },
  { to: "/cagnottes", label: "Cagnottes", short: "Cagnottes", icon: Wallet, roles: ["superadmin", "gestionnaire", "membre"], primary: true },
  { to: "/evenements", label: "Évènements", short: "Events", icon: CalendarDays, roles: ["superadmin", "gestionnaire", "membre"], primary: true },
  { to: "/recos", label: "Stats", short: "Stats", icon: BarChart3, roles: ["superadmin", "gestionnaire", "membre"], primary: false },
  { to: "/club", label: "Mon club", short: "Club", icon: Building2, roles: ["superadmin", "gestionnaire"], primary: false },
  { to: "/admin", label: "Super Admin", short: "Admin", icon: Shield, roles: ["superadmin"], primary: false },
];

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
  const effectiveDisplayName = mounted ? session.displayName : "Membre";
  const items = NAV.filter((n) => n.roles.includes(effectiveRole));
  const primaryItems = items.filter((i) => i.primary).slice(0, 5);
  const overflowItems = items.filter((i) => !i.primary);
  const RoleIcon = ROLE_META[effectiveRole].icon;
  const members = allMembers();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:h-16 md:px-6">
          <Link to="/" className="group flex items-center gap-2.5">
            <img
              src={logoMark}
              alt="Coopernic"
              className="h-9 w-9 rounded-[10px] object-cover ring-1 ring-border transition-transform group-hover:scale-105"
            />
            <div className="leading-tight">
              <div className="font-display text-[16px] font-extrabold tracking-tight text-foreground">
                coopern<span className="text-accent">i</span>c
              </div>
              <div className="hidden text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground sm:block">
                Échangez · Collaborez · Développez
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
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

          <ProfileMenu
            effectiveRole={effectiveRole}
            effectiveDisplayName={effectiveDisplayName}
            RoleIcon={RoleIcon}
            members={members}
            realUserEmail={real.user?.email ?? null}
          />
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="grid grid-cols-6">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="group flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium text-muted-foreground transition-colors"
                activeProps={{ className: "flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold text-foreground" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                <Icon className="h-5 w-5 group-[.active]:text-accent" />
                <span>{item.short}</span>
              </Link>
            );
          })}
          {overflowItems.length > 0 && (
            <MoreMenu items={overflowItems} />
          )}
        </div>
      </nav>
    </>
  );
}

function MoreMenu({ items }: { items: NavItem[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium text-muted-foreground">
        <MoreHorizontal className="h-5 w-5" />
        <span>Plus</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-56">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={item.to} asChild>
              <Link to={item.to} className="flex items-center gap-2">
                <Icon className="h-4 w-4" /> {item.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProfileMenu({
  effectiveRole,
  effectiveDisplayName,
  RoleIcon,
  members,
  realUserEmail,
}: {
  effectiveRole: Role;
  effectiveDisplayName: string;
  RoleIcon: typeof User;
  members: ReturnType<typeof allMembers>;
  realUserEmail: string | null;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2 text-left transition-colors hover:bg-secondary md:py-1.5 md:pl-2 md:pr-3">
        <div className={`flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold ring-1 ring-border ${ROLE_META[effectiveRole].tone} md:h-8 md:w-8`}>
          <RoleIcon className="h-4 w-4 text-accent" />
        </div>
        <div className="hidden leading-tight md:block">
          <div className="text-xs font-semibold text-foreground">{effectiveDisplayName}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {ROLE_META[effectiveRole].label}
          </div>
        </div>
        <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
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
        {realUserEmail ? (
          <DropdownMenuItem onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" /> Se déconnecter ({realUserEmail})
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <Link to="/login"><LogIn className="mr-2 h-4 w-4" /> Connexion réelle</Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
