import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createPotCheckout } from "@/lib/pots.functions";

export function PotEmbeddedCheckout({
  potId,
  returnUrl,
}: {
  potId: string;
  returnUrl: string;
}) {
  const fetchClientSecret = async (): Promise<string> => {
    const res = await createPotCheckout({
      data: { potId, returnUrl, environment: getStripeEnvironment() },
    });
    if (!res.clientSecret) throw new Error("Aucun client secret reçu de Stripe");
    return res.clientSecret;
  };

  return (
    <div id="pot-checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
