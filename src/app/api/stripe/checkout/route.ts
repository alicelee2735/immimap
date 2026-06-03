import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

function localePath(locale: string, path: string) {
  return locale === "en" ? path : `/${locale}${path}`;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const locale = String(formData.get("locale") ?? "en");
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_DONATION_PRICE_ID;

  if (!secretKey || !priceId) {
    return NextResponse.json(
      { error: "Stripe donation checkout is not configured." },
      { status: 500 },
    );
  }

  const stripe = new Stripe(secretKey);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const donatePath = localePath(locale, "/donate");
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}${donatePath}?success=true`,
    cancel_url: `${baseUrl}${donatePath}`,
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL." },
      { status: 500 },
    );
  }

  return NextResponse.redirect(session.url, 303);
}
