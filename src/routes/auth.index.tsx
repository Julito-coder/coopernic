import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import logoMark from "@/assets/coopernic-mark.png";

export const Route = createFileRoute("/auth/")({
  head: () => ({
    meta: [
      { title: "Connexion — Coopernic" },
      { name: "description", content: "Portail d'accès à ton espace Coopernic. Les identifiants sont fournis par ton club." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data: signIn, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    // Redirection selon le rôle
    let target = "/";
    const uid = signIn.user?.id;
    if (uid) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role, club_id")
        .eq("user_id", uid);
      const list = roles ?? [];
      if (list.some((r) => r.role === "superadmin")) target = "/admin";
      else if (list.some((r) => r.role === "gestionnaire")) target = "/club";
    }
    setLoading(false);
    toast.success("Connecté");
    navigate({ to: target });
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/set-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Email envoyé. Vérifie ta boîte de réception.");
    setMode("login");
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center px-6 py-10">
      <Link to="/" className="mb-6 flex items-center gap-3">
        <img src={logoMark} alt="Coopernic" className="h-12 w-12 rounded-[10px] ring-1 ring-border/60" />
        <div className="font-display text-xl font-extrabold">
          coopern<span className="text-accent">i</span>c
        </div>
      </Link>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-display">
            {mode === "login" ? "Connexion" : "Mot de passe oublié"}
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Accède à ton espace Coopernic avec les identifiants reçus par email."
              : "On t'envoie un lien pour redéfinir ton mot de passe."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Mot de passe</Label>
                <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "…" : "Se connecter"}
              </Button>
              <button
                type="button"
                className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setMode("reset")}
              >
                Mot de passe oublié ?
              </button>
              <p className="pt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
                Pas encore de compte&nbsp;? Les accès Coopernic sont créés par le gestionnaire de ton club. Contacte-le pour recevoir ton invitation par email.
              </p>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">Email</Label>
                <Input id="reset-email" type="email" autoComplete="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "…" : "Envoyer le lien"}
              </Button>
              <button
                type="button"
                className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setMode("login")}
              >
                Revenir à la connexion
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
