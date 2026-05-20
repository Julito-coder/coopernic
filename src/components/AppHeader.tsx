import { Link } from "@tanstack/react-router";
import logoMark from "@/assets/coopernic-mark.png";

const navItems = [
  { to: "/", label: "Accueil" },
  { to: "/annuaire", label: "Annuaire" },
  { to: "/messages", label: "Messages" },
  { to: "/recos", label: "Stats" },
] as const;

export function AppHeader() {
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
            <div className="font-display text-[17px] font-extrabold tracking-tight text-primary">
              coopern<span className="text-accent">i</span>c
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Échangez · Collaborez · Développez
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{
                className:
                  "rounded-md px-4 py-2 text-sm font-semibold text-foreground bg-secondary",
              }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden text-right md:block">
            <div className="text-sm font-semibold text-foreground">Amélie R.</div>
            <div className="text-xs text-muted-foreground">Cercle Vendôme</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-accent shadow-sm ring-1 ring-border">
            AR
          </div>
        </div>
      </div>
    </header>
  );
}
