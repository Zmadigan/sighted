import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { CATEGORIES } from "./categories";

let client: Anthropic | undefined;

const IdentificationSchema = z.object({
  found_animal: z.boolean(),
  message: z.string(),
  common_name: z.string(),
  scientific_name: z.string(),
  category: z.enum(CATEGORIES),
  confidence: z.enum(["high", "medium", "low"]),
  fun_facts: z.array(z.string()),
  range_note: z.string(),
});

/** Where and when the photo was taken (approximate), when known. */
export type PhotoContext = {
  date?: string;
  lat?: number;
  lng?: number;
  /** "photo" = the photo's own GPS data; "device" = where the phone is now (the photo may be older). */
  locationSource?: "photo" | "device";
};

export type Identification =
  | {
      foundAnimal: true;
      commonName: string;
      scientificName: string;
      category: (typeof CATEGORIES)[number];
      confidence: "high" | "medium" | "low";
      funFacts: string[];
      /** e.g. "Common year-round in Ohio." (empty when the location wasn't known) */
      rangeNote: string;
    }
  | { foundAnimal: false; message: string };

const SYSTEM_PROMPT = `You are the identification engine for Sighted, a wildlife journal app used by nature lovers outdoors.
Look at the user's photo and identify the animal in it as specifically as the photo allows (species if possible, otherwise genus or family).

Fill in the fields like this:
- found_animal: true only if a real animal (wild, pet, or farm animal; including birds, insects, fish, reptiles, amphibians, spiders, etc.) is visible and you can make a reasonable identification. false if there is no animal, or the photo is too blurry, dark or distant to tell.
- message: when found_animal is false, a short, kind sentence telling the user why and suggesting how to get a better photo. Otherwise an empty string.
- common_name: the common English name (e.g. "Northern Cardinal").
- scientific_name: the Latin binomial (e.g. "Cardinalis cardinalis"), or genus/family if that is as far as you can go.
- category: one of bird, mammal, reptile_amphibian, insect, fish, other. Use "other" for spiders, crustaceans, mollusks, worms and anything else.
- confidence: high, medium or low — how sure you are of the exact identification.
- fun_facts: 2 or 3 short, surprising, accurate facts about this animal, one sentence each, friendly in tone.
- range_note: only when a location is given, one short friendly sentence on whether this animal is expected there at that time of year, naming the region in plain words (e.g. "Common year-round in central Ohio." or "A winter visitor here, so November is a great time to spot one."). Never repeat the coordinates. Empty string when no location is given.
When found_animal is false, use empty strings, category "other", confidence "low" and an empty fun_facts list.

Using location and date:
The user's message may say roughly where and when the photo was taken. Use it to tell apart species that look alike: prefer the species whose range and season match (for example a Downy vs. Hairy Woodpecker, an Eastern vs. Western Meadowlark, or which crow, gull, sparrow, chipmunk or squirrel lives there), and think about migration and breeding seasons for that month and hemisphere. The photo is still the main evidence: if it clearly shows a species that's unusual for the place or season, name it anyway (it may be a rare visitor, a zoo or pet animal, or an old photo) and set confidence to reflect any doubt. A location described as "the phone's current location" may not be where an older photo was taken, so give it less weight.`;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export class IdentifyError extends Error {}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Plain-words description of where/when, for the AI. */
function describeContext(context: PhotoContext) {
  const lines: string[] = [];
  if (context.lat != null && context.lng != null) {
    const source =
      context.locationSource === "photo"
        ? "from the photo's GPS data"
        : "the phone's current location; the photo may have been taken somewhere else";
    lines.push(`Location: about ${context.lat.toFixed(2)}, ${context.lng.toFixed(2)} (latitude, longitude; ${source}).`);
  }
  if (context.date) {
    const month = MONTHS[Number(context.date.slice(5, 7)) - 1];
    lines.push(`Date: ${context.date}${month ? ` (${month})` : ""}.`);
  }
  return lines.join("\n");
}

export async function identifyAnimal(dataUrl: string, context: PhotoContext = {}): Promise<Identification> {
  const match = /^data:(image\/[a-z]+);base64,(.+)$/.exec(dataUrl);
  const mediaType = match?.[1] as (typeof ALLOWED_TYPES)[number] | undefined;
  if (!match || !mediaType || !ALLOWED_TYPES.includes(mediaType)) {
    throw new IdentifyError("Please upload a JPEG, PNG, WebP or GIF image.");
  }

  client ??= new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    output_config: { effort: "medium", format: betaZodOutputFormat(IdentificationSchema) },
    // If the main model declines a request, let Anthropic retry on a fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: match[2] } },
          { type: "text", text: ["What animal is this?", describeContext(context)].filter(Boolean).join("\n\n") },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    return {
      foundAnimal: false,
      message: "Sorry, we couldn't analyze this photo. Please try a different picture.",
    };
  }

  const result = response.parsed_output;
  if (!result) throw new IdentifyError("We couldn't read the identification. Please try again.");

  if (!result.found_animal || !result.common_name) {
    return {
      foundAnimal: false,
      message:
        result.message ||
        "We couldn't spot an animal in this photo. Try getting a little closer, or a clearer shot.",
    };
  }

  return {
    foundAnimal: true,
    commonName: result.common_name,
    scientificName: result.scientific_name,
    category: result.category,
    confidence: result.confidence,
    funFacts: result.fun_facts.filter(Boolean).slice(0, 3),
    rangeNote: context.lat != null ? result.range_note.trim() : "",
  };
}
