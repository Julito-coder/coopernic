import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/cagnottes/return")({
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
    pot_id: typeof search.pot_id === "string" ? search.pot_id : undefined,
  }),
  component: CheckoutReturn,
  head: () => ({ meta: [{ title: "Paiement confirmé" }] }),
});

function CheckoutReturn() {
  const { session_id, pot_id } = Route.useSearch();
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        {session_id ? (
          <>
            <h1 className="text-2xl font-bold">Merci pour ta participation 🎉</h1>
            <p className="text-muted-foreground">
              Ton paiement est en cours de confirmation. Tu verras le statut « Payé » sur la
              cagnotte dès réception.
            </p>
          </>
        ) : (
          <h1 className="text-2xl font-bold">Aucune session de paiement</h1>
        )}
        <Link
          to="/cagnottes"
          className="inline-block px-4 py-2 rounded bg-primary text-primary-foreground"
        >
          Retour aux cagnottes
        </Link>
        {pot_id && <p className="text-xs text-muted-foreground">Ref pot : {pot_id}</p>}
      </div>
    </div>
  );
}
