import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/set-password")({
  head: () => ({ meta: [{ title: "Définir mon mot de passe — Coopernic" }] }),
  component: SetPasswordPage,
});

function SetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // After clicking the email link, Supabase puts a recovery session in URL hash.
    // The client picks it up automatically. We just check if a session exists.
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setReady(true);
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("8 caractères minimum.");
      return;
    }
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    // Activate the member record if applicable
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("members")
        .update({ activated_at: new Date().toISOString() })
        .eq("id", user.id)
        .is("activated_at", null);
    }
    toast.success("Mot de passe défini. Bienvenue !");
    navigate({ to: "/" });
  }

  if (!ready) return null;

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center px-6 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-display">Définis ton mot de passe</CardTitle>
          <CardDescription>
            {hasSession
              ? "Choisis un mot de passe pour activer ton compte Coopernic."
              : "Lien invalide ou expiré. Redemande un email depuis la page de connexion."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasSession ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pw">Mot de passe</Label>
                <Input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw2">Confirmer</Label>
                <Input id="pw2" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "…" : "Valider"}
              </Button>
            </form>
          ) : (
            <Button className="w-full" onClick={() => navigate({ to: "/login" })}>
              Aller à la connexion
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
