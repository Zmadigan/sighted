import type { Metadata } from "next";
import { ContactLine, LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy · Sighted" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="November 6, 2026">
      <p>
        Sighted (&ldquo;we&rdquo;) is a wildlife journal. This policy explains what we collect, why, and the choices
        you have. We don&apos;t sell your personal information.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> your email address, display name and a securely hashed password.
        </li>
        <li>
          <strong>Your sightings:</strong> the animal, date, notes, photos you add, and the map location you choose.
        </li>
        <li>
          <strong>Approximate location for Bird of the Week:</strong> rounded to an area of about 100 km. We don&apos;t
          store your exact position for this.
        </li>
        <li>
          <strong>Usage:</strong> how many AI identifications you&apos;ve used, and a one-way hash of your internet
          connection&apos;s IP address used only to prevent abuse of free identifications.
        </li>
        <li>
          <strong>Payments:</strong> handled by Stripe. We never see or store your full card number.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run your journal, life list, map, goals and year in review.</li>
        <li>To identify animals: photos you choose to identify are sent to our AI provider (Anthropic&apos;s Claude) to get a result, along with the date and an approximate location (rounded to about 1 km) when known, so it can tell apart species that look alike. The location comes from the photo itself, or from your device if you&apos;ve already allowed Sighted to use your location.</li>
        <li>To manage subscriptions, send password-reset emails, and keep the service secure.</li>
      </ul>

      <h2>What friends can see</h2>
      <p>
        If you add friends, they can see your display name, your sightings (including photos and notes) and your
        counts on the leaderboard. They can <strong>never</strong> see where a sighting happened, and they can&apos;t see
        sightings you mark &ldquo;Keep private&rdquo;.
      </p>

      <h2>Services we rely on</h2>
      <ul>
        <li>Vercel (hosting and photo storage), Neon (database), Anthropic (AI identification), Stripe (payments), Resend (email).</li>
        <li>Maps use OpenStreetMap tiles, which are loaded from OpenStreetMap&apos;s servers.</li>
      </ul>
      <p>These providers only process data as needed to provide their service to us.</p>

      <h2>Keeping and deleting your data</h2>
      <p>
        We keep your data while your account exists. You can delete your account at any time from the{" "}
        <strong>Account</strong> page. That permanently deletes your profile, sightings, photos, goals, friends and
        reactions, and cancels any subscription.
      </p>

      <h2>Children</h2>
      <p>Sighted isn&apos;t intended for children under 13, and we don&apos;t knowingly collect their information.</p>

      <h2>Contact</h2>
      <ContactLine lead="Questions or requests about your data?" />
    </LegalPage>
  );
}
