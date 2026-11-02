import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { identifyAnimal, IdentifyError } from "@/lib/identify";
import { getCurrentUser } from "@/lib/session";
import { FREE_MONTHLY_LIMIT, recordIdentification, remainingIdentifications } from "@/lib/usage";

// Give Claude time to look at the photo (Vercel's default can be shorter).
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in again." }, { status: 401 });

  const remaining = await remainingIdentifications(user.id, user.plan);
  if (remaining === 0) {
    return NextResponse.json(
      {
        error: "limit",
        message: `You've used all ${FREE_MONTHLY_LIMIT} free identifications this month. Upgrade to Sighted Pro for unlimited IDs, or wait until your free IDs reset on the 1st.`,
      },
      { status: 402 },
    );
  }

  const body = (await request.json().catch(() => null)) as { image?: unknown } | null;
  if (!body || typeof body.image !== "string") {
    return NextResponse.json({ error: "No photo was received." }, { status: 400 });
  }
  if (body.image.length > 5_000_000) {
    return NextResponse.json({ error: "That photo is too large. Please try a smaller one." }, { status: 413 });
  }

  try {
    const result = await identifyAnimal(body.image);
    await recordIdentification(user.id);
    return NextResponse.json({
      result,
      remaining: remaining === null ? null : remaining - 1,
    });
  } catch (error) {
    if (error instanceof IdentifyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Lots of people are identifying right now. Please try again in a minute." }, { status: 503 });
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Claude API error", error.status, error.message);
      return NextResponse.json({ error: "The identification service had a problem. Please try again." }, { status: 502 });
    }
    console.error("Identify failed", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
