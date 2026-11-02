import type Stripe from "stripe";
import { getStripe, syncSubscription } from "@/lib/stripe";

// Stripe calls this whenever a subscription changes (started, renewed, canceled, payment failed…)
// so the user's plan stays correct even when they aren't on the site.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Webhook not configured", { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object);
      break;
    case "checkout.session.completed": {
      const subscriptionId = event.data.object.subscription;
      if (typeof subscriptionId === "string") {
        await syncSubscription(await getStripe().subscriptions.retrieve(subscriptionId));
      }
      break;
    }
  }

  return Response.json({ received: true });
}
