import { Link } from "@tanstack/react-router";

const navItems = [
  { to: "/", label: "Accueil" },
  { to: "/annuaire", label: "Annuaire" },
  { to: "/messages", label: "Messages" },
] as const;

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="group flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-transform group-hover:rotate-3">
            <span className="font-display text-lg font-black">C</span>
          </div>
          <div className="leading-tight">
            <div className="font-display text-base font-extrabold tracking-tight text-primary">
              COOPERNIK
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Cercle Vendôme
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
            <div className="text-xs text-muted-foreground">Membre actif</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary text-sm font-bold text-primary-foreground shadow-sm">
            AR
          </div>
        </div>
      </div>
    </header>
  );
}
